import { BacklogView } from './backlog-view';

export default async function ProjectBacklogPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  return <BacklogView projectKey={key} />;
}
