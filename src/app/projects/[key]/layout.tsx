import { ProjectShell } from './project-shell';

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  return <ProjectShell projectKey={key}>{children}</ProjectShell>;
}
