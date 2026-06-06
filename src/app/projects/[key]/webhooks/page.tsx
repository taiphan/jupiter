import { WebhooksView } from './webhooks-view';

export default async function WebhooksPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  return <WebhooksView projectKey={key} />;
}
