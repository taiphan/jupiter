import { SettingsView } from './settings-view';

export default async function ProjectSettingsPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  return <SettingsView projectKey={key} />;
}
