import { notFound } from 'next/navigation';
import WorkspaceShell, { type WorkspaceSection } from '../workspace-shell';

const sections: WorkspaceSection[] = ['pipeline', 'messages', 'insights', 'kpis', 'standards', 'settings'];

export function generateStaticParams() {
  return sections.map((section) => ({ section }));
}

export default async function WorkspaceSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!sections.includes(section as WorkspaceSection)) notFound();
  return <WorkspaceShell section={section as WorkspaceSection} />;
}
