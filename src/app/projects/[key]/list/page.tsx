import { ListView } from './list-view';

interface PageProps {
  params: Promise<{ key: string }>;
}

export default async function ListPage({ params }: PageProps) {
  const { key } = await params;
  return <ListView projectKey={key} />;
}
