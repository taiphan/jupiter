import { ReleasesView } from './releases-view';

export default async function ReleasesPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  return <ReleasesView projectKey={key} />;
}
