import { BoardConfigView } from './board-config-view';

export default async function BoardConfigPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  return <BoardConfigView projectKey={key} />;
}
