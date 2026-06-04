import { isTwoFactorEnabled } from './config';

export async function assertTwoFactorFeature(): Promise<void> {
  if (!(await isTwoFactorEnabled())) {
    throw new Error('Two-factor authentication is not enabled');
  }
}
