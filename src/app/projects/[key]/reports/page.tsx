import { ReportsView } from './reports-view';

export default async function ProjectReportsPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  return <ReportsView projectKey={key} />;
}
