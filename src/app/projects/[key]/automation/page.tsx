import { AutomationView } from './automation-view';

export default async function AutomationPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  return <AutomationView projectKey={key} />;
}
