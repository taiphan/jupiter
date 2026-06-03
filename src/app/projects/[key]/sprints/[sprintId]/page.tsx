import { SprintBoardView } from './sprint-board-view';

// Per Next.js 16 page conventions, dynamic segment params arrive as a Promise.
// See `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md`.
export default async function SprintBoardPage({
  params,
}: {
  params: Promise<{ key: string; sprintId: string }>;
}) {
  const { key, sprintId } = await params;
  return <SprintBoardView projectKey={key} sprintId={sprintId} />;
}
