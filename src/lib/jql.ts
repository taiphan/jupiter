/**
 * JQL-lite — a tiny query language over issues.
 *
 * Supported grammar (case-insensitive keywords):
 *   query      := expr (ORDER BY field [ASC|DESC])?
 *   expr       := term (("AND" | "OR") term)*
 *   term       := "(" expr ")" | clause
 *   clause     := field op value
 *   op         := "=" | "!=" | "~" | "!~" | ">" | ">=" | "<" | "<=" | "IN" | "NOT IN"
 *   value      := bareword | "quoted" | (a, b, c)
 *
 * Fields: project, type, status, priority, assignee, reporter, label,
 *         summary, sprint, storypoints, created, updated, key, duedate
 *
 * Functions: currentUser(), unassigned, EMPTY
 */

import type { Issue } from './types';

export interface JqlContext {
  currentUserId?: string;
  /** Resolve a display name / key to an id, e.g. assignee = "Maya Chen". */
  resolveUser: (token: string) => string | undefined;
  resolveProject: (token: string) => string | undefined;
  resolveSprint: (token: string) => string | undefined;
}

type Op = '=' | '!=' | '~' | '!~' | '>' | '>=' | '<' | '<=' | 'in' | 'not in';

interface Clause {
  kind: 'clause';
  field: string;
  op: Op;
  values: string[];
}
interface BinaryNode {
  kind: 'and' | 'or';
  left: Node;
  right: Node;
}
type Node = Clause | BinaryNode;

export interface ParsedQuery {
  where?: Node;
  orderBy?: { field: string; dir: 'asc' | 'desc' };
}

export class JqlError extends Error {}

// ─── Tokenizer ──────────────────────────────────────────────────────────────

type Token =
  | { t: 'word'; v: string }
  | { t: 'string'; v: string }
  | { t: 'op'; v: string }
  | { t: 'lparen' }
  | { t: 'rparen' }
  | { t: 'comma' };

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const ops = ['!=', '>=', '<=', '!~', '=', '~', '>', '<'];

  while (i < input.length) {
    const ch = input[i];
    if (ch === ' ' || ch === '\t' || ch === '\n') {
      i++;
      continue;
    }
    if (ch === '(') { tokens.push({ t: 'lparen' }); i++; continue; }
    if (ch === ')') { tokens.push({ t: 'rparen' }); i++; continue; }
    if (ch === ',') { tokens.push({ t: 'comma' }); i++; continue; }
    if (ch === '"' || ch === "'") {
      const quote = ch;
      let j = i + 1;
      let str = '';
      while (j < input.length && input[j] !== quote) {
        str += input[j];
        j++;
      }
      if (j >= input.length) throw new JqlError('Unterminated string');
      tokens.push({ t: 'string', v: str });
      i = j + 1;
      continue;
    }
    // operators
    const matched = ops.find((op) => input.startsWith(op, i));
    if (matched) {
      tokens.push({ t: 'op', v: matched });
      i += matched.length;
      continue;
    }
    // bareword (until whitespace, paren, comma, or operator char)
    let j = i;
    let word = '';
    while (
      j < input.length &&
      !' \t\n(),"\''.includes(input[j]) &&
      !ops.some((op) => input.startsWith(op, j))
    ) {
      word += input[j];
      j++;
    }
    if (word.length === 0) throw new JqlError(`Unexpected character: ${ch}`);
    // Treat a function call suffix "()" as part of the word, e.g. currentUser()
    if (input.startsWith('()', j)) {
      word += '()';
      j += 2;
    }
    tokens.push({ t: 'word', v: word });
    i = j;
  }
  return tokens;
}

// ─── Parser ─────────────────────────────────────────────────────────────────

export function parseJql(input: string): ParsedQuery {
  const trimmed = input.trim();
  if (!trimmed) return {};

  // Split off ORDER BY
  const orderMatch = /\border\s+by\b/i.exec(trimmed);
  let whereStr = trimmed;
  let orderBy: ParsedQuery['orderBy'];
  if (orderMatch) {
    whereStr = trimmed.slice(0, orderMatch.index).trim();
    const orderStr = trimmed.slice(orderMatch.index + orderMatch[0].length).trim();
    const parts = orderStr.split(/\s+/);
    const field = parts[0]?.toLowerCase();
    const dir = (parts[1]?.toLowerCase() === 'desc' ? 'desc' : 'asc') as 'asc' | 'desc';
    if (field) orderBy = { field, dir };
  }

  let where: Node | undefined;
  if (whereStr) {
    const tokens = tokenize(whereStr);
    const parser = new Parser(tokens);
    where = parser.parseExpr();
    parser.expectEnd();
  }

  return { where, orderBy };
}

class Parser {
  private pos = 0;
  constructor(private tokens: Token[]) {}

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }
  private next(): Token | undefined {
    return this.tokens[this.pos++];
  }
  expectEnd() {
    if (this.pos < this.tokens.length) throw new JqlError('Unexpected trailing input');
  }

  parseExpr(): Node {
    let left = this.parseTerm();
    while (true) {
      const tk = this.peek();
      if (tk?.t === 'word' && (tk.v.toLowerCase() === 'and' || tk.v.toLowerCase() === 'or')) {
        this.next();
        const right = this.parseTerm();
        left = { kind: tk.v.toLowerCase() as 'and' | 'or', left, right };
      } else {
        break;
      }
    }
    return left;
  }

  private parseTerm(): Node {
    const tk = this.peek();
    if (tk?.t === 'lparen') {
      this.next();
      const expr = this.parseExpr();
      const close = this.next();
      if (close?.t !== 'rparen') throw new JqlError('Expected )');
      return expr;
    }
    return this.parseClause();
  }

  private parseClause(): Clause {
    const fieldTk = this.next();
    if (fieldTk?.t !== 'word') throw new JqlError('Expected a field name');
    const field = fieldTk.v.toLowerCase();

    const opTk = this.next();
    let op: Op;
    if (opTk?.t === 'op') {
      op = opTk.v as Op;
    } else if (opTk?.t === 'word' && opTk.v.toLowerCase() === 'in') {
      op = 'in';
    } else if (opTk?.t === 'word' && opTk.v.toLowerCase() === 'not') {
      const inTk = this.next();
      if (inTk?.t !== 'word' || inTk.v.toLowerCase() !== 'in') throw new JqlError('Expected IN after NOT');
      op = 'not in';
    } else {
      throw new JqlError(`Expected operator after "${field}"`);
    }

    // Values
    const values: string[] = [];
    if (op === 'in' || op === 'not in') {
      const open = this.next();
      if (open?.t !== 'lparen') throw new JqlError('Expected ( after IN');
      while (true) {
        const v = this.next();
        if (v?.t === 'word' || v?.t === 'string') values.push(v.v);
        else throw new JqlError('Expected a value in list');
        const sep = this.next();
        if (sep?.t === 'rparen') break;
        if (sep?.t !== 'comma') throw new JqlError('Expected , or ) in list');
      }
    } else {
      const v = this.next();
      if (v?.t === 'word' || v?.t === 'string') values.push(v.v);
      else throw new JqlError(`Expected a value after operator`);
    }

    return { kind: 'clause', field, op, values };
  }
}

// ─── Evaluator ──────────────────────────────────────────────────────────────

function resolveValueToken(field: string, token: string, ctx: JqlContext): string | undefined {
  const lower = token.toLowerCase();
  if (lower === 'currentuser()' || lower === 'currentuser') return ctx.currentUserId;
  if ((field === 'assignee' || field === 'reporter')) {
    if (lower === 'unassigned' || lower === 'empty' || lower === 'null') return '__none';
    return ctx.resolveUser(token) ?? token;
  }
  if (field === 'project') return ctx.resolveProject(token) ?? token;
  if (field === 'sprint') {
    if (lower === 'empty' || lower === 'none') return '__none';
    return ctx.resolveSprint(token) ?? token;
  }
  return token;
}

function fieldValue(issue: Issue, field: string): string | number | undefined | null {
  switch (field) {
    case 'project': return issue.projectId;
    case 'type': return issue.type;
    case 'status': return issue.status;
    case 'priority': return issue.priority;
    case 'assignee': return issue.assigneeId ?? '__none';
    case 'reporter': return issue.reporterId;
    case 'summary': return issue.summary;
    case 'key': return issue.key;
    case 'sprint': return issue.sprintId ?? '__none';
    case 'storypoints': return issue.storyPoints ?? 0;
    case 'duedate':
    case 'due': return issue.dueDate ?? '';
    case 'created': return issue.createdAt;
    case 'updated': return issue.updatedAt;
    case 'label': return issue.labels.join(',');
    default: return undefined;
  }
}

function compare(a: string | number, op: Op, b: string): boolean {
  // Numeric comparison when both look numeric
  const an = typeof a === 'number' ? a : Number(a);
  const bn = Number(b);
  const numeric = !Number.isNaN(an) && !Number.isNaN(bn);

  switch (op) {
    case '=': return String(a).toLowerCase() === b.toLowerCase();
    case '!=': return String(a).toLowerCase() !== b.toLowerCase();
    case '~': return String(a).toLowerCase().includes(b.toLowerCase());
    case '!~': return !String(a).toLowerCase().includes(b.toLowerCase());
    case '>': return numeric ? an > bn : String(a) > b;
    case '>=': return numeric ? an >= bn : String(a) >= b;
    case '<': return numeric ? an < bn : String(a) < b;
    case '<=': return numeric ? an <= bn : String(a) <= b;
    default: return false;
  }
}

function evalClause(issue: Issue, clause: Clause, ctx: JqlContext): boolean {
  const raw = fieldValue(issue, clause.field);
  if (raw === undefined) throw new JqlError(`Unknown field: ${clause.field}`);

  const resolved = clause.values.map((v) => resolveValueToken(clause.field, v, ctx) ?? v);

  if (clause.field === 'label') {
    // label matching against the set
    const labels = issue.labels.map((l) => l.toLowerCase());
    if (clause.op === 'in') return resolved.some((v) => labels.includes(v.toLowerCase()));
    if (clause.op === 'not in') return !resolved.some((v) => labels.includes(v.toLowerCase()));
    if (clause.op === '=') return labels.includes(resolved[0].toLowerCase());
    if (clause.op === '!=') return !labels.includes(resolved[0].toLowerCase());
    if (clause.op === '~') return labels.some((l) => l.includes(resolved[0].toLowerCase()));
    return false;
  }

  if (clause.op === 'in') return resolved.some((v) => compare(raw as string | number, '=', v));
  if (clause.op === 'not in') return !resolved.some((v) => compare(raw as string | number, '=', v));
  return compare(raw as string | number, clause.op, resolved[0]);
}

function evalNode(issue: Issue, node: Node, ctx: JqlContext): boolean {
  if (node.kind === 'clause') return evalClause(issue, node, ctx);
  if (node.kind === 'and') return evalNode(issue, node.left, ctx) && evalNode(issue, node.right, ctx);
  return evalNode(issue, node.left, ctx) || evalNode(issue, node.right, ctx);
}

export function runJql(issues: Issue[], query: ParsedQuery, ctx: JqlContext): Issue[] {
  let result = query.where ? issues.filter((i) => evalNode(i, query.where!, ctx)) : [...issues];

  if (query.orderBy) {
    const { field, dir } = query.orderBy;
    result = [...result].sort((a, b) => {
      const av = fieldValue(a, field) ?? '';
      const bv = fieldValue(b, field) ?? '';
      let cmp: number;
      if (typeof av === 'number' && typeof bv === 'number') cmp = av - bv;
      else cmp = String(av).localeCompare(String(bv));
      return dir === 'desc' ? -cmp : cmp;
    });
  }
  return result;
}

/** Validate a query string, returning an error message if invalid. */
export function validateJql(input: string): string | null {
  try {
    parseJql(input);
    return null;
  } catch (e) {
    return e instanceof JqlError ? e.message : 'Invalid query';
  }
}
