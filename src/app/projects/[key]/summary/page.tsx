import { SummaryView } from './summary-view';

export default async function ProjectSummaryPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  return <SummaryView projectKey={key} />;
}
