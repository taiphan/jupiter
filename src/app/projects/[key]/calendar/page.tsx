import { ProjectCalendarView } from './calendar-page-view';

interface PageProps {
  params: Promise<{ key: string }>;
}

export default async function CalendarPage({ params }: PageProps) {
  const { key } = await params;
  return <ProjectCalendarView projectKey={key} />;
}
