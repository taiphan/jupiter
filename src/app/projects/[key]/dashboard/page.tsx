import { DashboardView } from './dashboard-view';

export default async function ProjectDashboardPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  return <DashboardView projectKey={key} />;
}
