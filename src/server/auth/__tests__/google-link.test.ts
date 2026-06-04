import { describe, expect, it } from 'vitest';
import { planGoogleAccountLink } from '../google-link';

describe('planGoogleAccountLink', () => {
  it('signs in existing oauth user', () => {
    expect(planGoogleAccountLink('usr_1', 'usr_2')).toEqual({
      action: 'sign_in',
      userId: 'usr_1',
    });
  });

  it('links google to email password user', () => {
    expect(planGoogleAccountLink(undefined, 'usr_email')).toEqual({
      action: 'link',
      userId: 'usr_email',
    });
  });

  it('creates new user when no match', () => {
    expect(planGoogleAccountLink(undefined, undefined)).toEqual({ action: 'create' });
  });
});
