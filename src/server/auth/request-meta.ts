/** Best-effort client metadata from an incoming request. */
export function sessionMetaFromRequest(request?: Request): {
  userAgent: string | null;
  ipAddress: string | null;
} {
  if (!request) return { userAgent: null, ipAddress: null };
  const userAgent = request.headers.get('user-agent')?.slice(0, 512) ?? null;
  const forwarded = request.headers.get('x-forwarded-for');
  const ipAddress =
    (forwarded?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      null)?.slice(0, 64) ?? null;
  return { userAgent, ipAddress };
}
