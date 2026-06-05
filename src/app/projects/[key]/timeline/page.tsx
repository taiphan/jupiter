import { TimelineView } from './timeline-view';

export default async function TimelinePage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  return <TimelineView projectKey={key} />;
}
