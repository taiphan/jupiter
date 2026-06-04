'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DEFAULT_TEST_EMAIL } from '@/lib/auth-config-constants';
import {
  fetchAuthSettingsAdmin,
  saveAuthSettingsAdmin,
  sendTestAuthEmailAdmin,
  type AuthSettingsForm,
} from '@/lib/auth-admin-api';

const inputClass =
  'w-full h-9 px-3 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring';

export function AuthenticationSettingsCard() {
  const [form, setForm] = useState<AuthSettingsForm | null>(null);
  const [smtpPass, setSmtpPass] = useState('');
  const [googleSecret, setGoogleSecret] = useState('');
  const [microsoftSecret, setMicrosoftSecret] = useState('');
  const [githubSecret, setGithubSecret] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    const result = await fetchAuthSettingsAdmin();
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setForm(result.settings);
    setSmtpPass('');
    setGoogleSecret('');
    setMicrosoftSecret('');
    setGithubSecret('');
  };

  useEffect(() => {
    void load();
  }, []);

  const patch = <K extends keyof AuthSettingsForm>(key: K, value: AuthSettingsForm[K]) => {
    setForm((f) => (f ? { ...f, [key]: value } : f));
  };

  const save = async () => {
    if (!form) return;
    setSaving(true);
    setError('');
    setMessage('');
    const result = await saveAuthSettingsAdmin({
      ...form,
      smtpPass: smtpPass || undefined,
      googleClientSecret: googleSecret || undefined,
      microsoftClientSecret: microsoftSecret || undefined,
      githubClientSecret: githubSecret || undefined,
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setForm(result.settings);
    setSmtpPass('');
    setGoogleSecret('');
    setMicrosoftSecret('');
    setGithubSecret('');
    setMessage('Authentication settings saved.');
  };

  const testEmail = async () => {
    setTesting(true);
    setError('');
    setMessage('');
    const result = await sendTestAuthEmailAdmin();
    setTesting(false);
    if (!result.ok) setError(result.message);
    else setMessage(result.message);
  };

  if (loading) return null;
  if (error && !form) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-xs text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }
  if (!form) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Authentication & email</CardTitle>
        <CardDescription>
          Workspace SMTP, Google Sign-In, and security options (admin only). Secrets are stored
          encrypted in the database.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
        {message ? (
          <p className="text-xs text-emerald-600 dark:text-emerald-400">{message}</p>
        ) : null}

        <section className="space-y-3">
          <h3 className="text-sm font-medium">General</h3>
          <Field label="App URL (OAuth redirects)">
            <input
              className={inputClass}
              value={form.appUrl}
              onChange={(e) => patch('appUrl', e.target.value)}
            />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.twoFactorEnabled}
              onChange={(e) => patch('twoFactorEnabled', e.target.checked)}
            />
            Enable two-factor authentication (TOTP)
          </label>
        </section>

        <section className="space-y-3 border-t pt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Email / SMTP</h3>
            <Badge variant="secondary" className="text-[10px]">
              {form.emailProvider}
            </Badge>
          </div>
          <Field label="Provider">
            <select
              className={inputClass}
              value={form.emailProvider}
              onChange={(e) =>
                patch('emailProvider', e.target.value as AuthSettingsForm['emailProvider'])
              }
            >
              <option value="console">Console (log links)</option>
              <option value="gmail">Gmail</option>
              <option value="smtp">Custom SMTP</option>
            </select>
          </Field>
          <Field label="SMTP host">
            <input
              className={inputClass}
              value={form.smtpHost}
              onChange={(e) => patch('smtpHost', e.target.value)}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="SMTP port">
              <input
                type="number"
                className={inputClass}
                value={form.smtpPort}
                onChange={(e) => patch('smtpPort', Number(e.target.value))}
              />
            </Field>
            <Field label="TLS (secure)">
              <label className="flex h-9 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.smtpSecure}
                  onChange={(e) => patch('smtpSecure', e.target.checked)}
                />
                Port 465 / SSL
              </label>
            </Field>
          </div>
          <Field label="SMTP user">
            <input
              className={inputClass}
              value={form.smtpUser}
              onChange={(e) => patch('smtpUser', e.target.value)}
              placeholder={DEFAULT_TEST_EMAIL}
            />
          </Field>
          <Field
            label={`SMTP password ${form.hasSmtpPassword ? '(saved — leave blank to keep)' : ''}`}
          >
            <input
              type="password"
              className={inputClass}
              value={smtpPass}
              onChange={(e) => setSmtpPass(e.target.value)}
              placeholder="Gmail App Password"
              autoComplete="new-password"
            />
          </Field>
          <Field label="From address">
            <input
              className={inputClass}
              value={form.emailFrom}
              onChange={(e) => patch('emailFrom', e.target.value)}
              placeholder={DEFAULT_TEST_EMAIL}
            />
          </Field>
          <Field label="Redirect all auth mail to (testing)">
            <input
              className={inputClass}
              value={form.mailRedirectTo}
              onChange={(e) => patch('mailRedirectTo', e.target.value)}
              placeholder={DEFAULT_TEST_EMAIL}
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Leave empty to send to each user&apos;s real address. Default: {DEFAULT_TEST_EMAIL}
            </p>
          </Field>
          <Field label="Test email recipient">
            <input
              className={inputClass}
              value={form.testEmailTo}
              onChange={(e) => patch('testEmailTo', e.target.value)}
            />
          </Field>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="cursor-pointer"
            disabled={testing || form.emailProvider === 'console'}
            onClick={() => void testEmail()}
          >
            {testing ? 'Sending…' : 'Send test email'}
          </Button>
        </section>

        <section className="space-y-3 border-t pt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Google Sign-In</h3>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.googleAuthEnabled}
                onChange={(e) => patch('googleAuthEnabled', e.target.checked)}
              />
              Enabled
            </label>
          </div>
          <Field label="Client ID">
            <input
              className={inputClass}
              value={form.googleClientId}
              onChange={(e) => patch('googleClientId', e.target.value)}
            />
          </Field>
          <Field
            label={`Client secret ${form.hasGoogleClientSecret ? '(saved — leave blank to keep)' : ''}`}
          >
            <input
              type="password"
              className={inputClass}
              value={googleSecret}
              onChange={(e) => setGoogleSecret(e.target.value)}
              autoComplete="new-password"
            />
          </Field>
          <Field label="Workspace domain (hd) — optional">
            <input
              className={inputClass}
              value={form.googleAllowedHd}
              onChange={(e) => patch('googleAllowedHd', e.target.value)}
              placeholder="yourcompany.com"
            />
          </Field>
          <p className="text-[10px] text-muted-foreground">
            Callback: {form.appUrl}/api/auth/google/callback
          </p>
        </section>

        <section className="space-y-3 border-t pt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Microsoft Sign-In</h3>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.microsoftAuthEnabled}
                onChange={(e) => patch('microsoftAuthEnabled', e.target.checked)}
              />
              Enabled
            </label>
          </div>
          <Field label="Application (client) ID">
            <input
              className={inputClass}
              value={form.microsoftClientId}
              onChange={(e) => patch('microsoftClientId', e.target.value)}
            />
          </Field>
          <Field
            label={`Client secret ${form.hasMicrosoftClientSecret ? '(saved — leave blank to keep)' : ''}`}
          >
            <input
              type="password"
              className={inputClass}
              value={microsoftSecret}
              onChange={(e) => setMicrosoftSecret(e.target.value)}
              autoComplete="new-password"
            />
          </Field>
          <Field label="Tenant ID (use common for multi-tenant)">
            <input
              className={inputClass}
              value={form.microsoftTenantId}
              onChange={(e) => patch('microsoftTenantId', e.target.value)}
              placeholder="common"
            />
          </Field>
          <p className="text-[10px] text-muted-foreground">
            Callback: {form.appUrl}/api/auth/microsoft/callback
          </p>
        </section>

        <section className="space-y-3 border-t pt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">GitHub Sign-In</h3>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.githubAuthEnabled}
                onChange={(e) => patch('githubAuthEnabled', e.target.checked)}
              />
              Enabled
            </label>
          </div>
          <Field label="Client ID">
            <input
              className={inputClass}
              value={form.githubClientId}
              onChange={(e) => patch('githubClientId', e.target.value)}
            />
          </Field>
          <Field
            label={`Client secret ${form.hasGithubClientSecret ? '(saved — leave blank to keep)' : ''}`}
          >
            <input
              type="password"
              className={inputClass}
              value={githubSecret}
              onChange={(e) => setGithubSecret(e.target.value)}
              autoComplete="new-password"
            />
          </Field>
          <p className="text-[10px] text-muted-foreground">
            Callback: {form.appUrl}/api/auth/github/callback
          </p>
        </section>

        <div className="flex gap-2 border-t pt-4">
          <Button
            type="button"
            className="cursor-pointer"
            disabled={saving}
            onClick={() => void save()}
          >
            {saving ? 'Saving…' : 'Save authentication settings'}
          </Button>
          <Button type="button" variant="outline" className="cursor-pointer" onClick={() => void load()}>
            Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <span className="text-[12px] font-medium text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}
