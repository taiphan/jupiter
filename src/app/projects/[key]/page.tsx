import { BoardView } from './board-view';

export default async function ProjectBoardPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  return <BoardView projectKey={key} />;
}
