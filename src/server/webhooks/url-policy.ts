/** Block SSRF targets: loopback, link-local, and private IPv4 ranges. */
export function isWebhookUrlAllowed(raw: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return false;
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;
  if (parsed.username || parsed.password) return false;

  const host = parsed.hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost')) return false;
  if (host === '0.0.0.0' || host === '::1' || host === '[::1]') return false;

  const v4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const octets = v4.slice(1, 5).map((n) => Number(n));
    if (octets.some((n) => n > 255)) return false;
    const [a, b] = octets;
    if (a === 10) return false;
    if (a === 127) return false;
    if (a === 0) return false;
    if (a === 169 && b === 254) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 168) return false;
  }

  if (host.startsWith('fe80:') || host.startsWith('fc') || host.startsWith('fd')) return false;

  return true;
}
