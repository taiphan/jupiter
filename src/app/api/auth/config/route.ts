import { json } from '@/server/api-helpers';
import { getLoginAuthConfig } from '@/server/auth/login-config';

export async function GET() {
  return json(await getLoginAuthConfig());
}
