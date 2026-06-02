import { FieldsView } from './fields-view';

export default async function ProjectFieldsPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  return <FieldsView projectKey={key} />;
}
