'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

export type WorkspaceSection = 'home' | 'pipeline' | 'messages' | 'insights' | 'kpis' | 'standards' | 'settings';

const primaryItems: { id: WorkspaceSection; label: string; icon: string }[] = [
  { id: 'home', label: 'Home', icon: '⌂' },
  { id: 'pipeline', label: 'Pipeline', icon: '▦' },
  { id: 'messages', label: 'Messages', icon: '✉' },
];
const measureItems: { id: WorkspaceSection; label: string; icon: string }[] = [
  { id: 'insights', label: 'Insights', icon: '◒' },
  { id: 'kpis', label: 'KPIs', icon: '◎' },
  { id: 'standards', label: 'Standards', icon: '✓' },
];
const sections = [...primaryItems, ...measureItems];

const prospects = [
  { name: 'Maya Patel', company: 'Northstar Labs', stage: 'Interested', value: '$48,000', owner: 'MP', tone: 'violet', next: 'Reply today' },
  { name: 'Oliver Grant', company: 'Fieldwork Studio', stage: 'Contacted', value: '$18,000', owner: 'OG', tone: 'amber', next: 'Follow up tomorrow' },
  { name: 'Aisha Khan', company: 'Good Union', stage: 'Qualified', value: '$22,000', owner: 'AK', tone: 'green', next: 'Send proposal' },
  { name: 'Daniel Brooks', company: 'Morrow House', stage: 'New', value: '$31,000', owner: 'DB', tone: 'slate', next: 'Qualify this week' },
  { name: 'Sarah Wilson', company: 'Cedar & Co.', stage: 'Interested', value: '$12,500', owner: 'SW', tone: 'violet', next: 'Book a call' },
];

const messages = [
  { initials: 'MP', name: 'Maya Patel', context: 'Northstar Labs · Interested', message: 'That sounds great. Could you send over a few times for next week?', time: '9:42 AM', unread: true },
  { initials: 'AK', name: 'Aisha Khan', context: 'Good Union · Qualified', message: 'Thanks for sharing the examples, the second one is very close to what we need.', time: 'Yesterday', unread: true },
  { initials: 'OG', name: 'Oliver Grant', context: 'Fieldwork Studio · Contacted', message: 'I’ll take a look and get back to you after our team meeting.', time: 'Yesterday', unread: false },
];

function pageTitle(section: WorkspaceSection) {
  return ({ home: 'Good morning, Jordan', pipeline: 'Pipeline', messages: 'Messages', insights: 'Insights', kpis: 'KPIs', standards: 'Standards', settings: 'Workspace settings' })[section];
}

function SidebarLink({ item, active, onClick }: { item: (typeof sections)[number]; active: boolean; onClick?: () => void }) {
  const href = item.id === 'settings' ? '/workspace/settings' : `/workspace#${item.id}`;
  return <a href={href} className={`workspace-nav-link${active ? ' is-active' : ''}`} aria-current={active ? 'location' : undefined} onClick={onClick}><span className="workspace-nav-icon">{item.icon}</span><span>{item.label}</span>{item.id === 'messages' && <span className="workspace-nav-badge">2</span>}</a>;
}

function Metric({ label, value, detail, tone = 'neutral' }: { label: string; value: string; detail: string; tone?: string }) {
  return <article className="workspace-metric"><div className="workspace-muted">{label}</div><strong>{value}</strong><span className={tone === 'positive' ? 'workspace-positive' : 'workspace-muted'}>{detail}</span></article>;
}

function ProspectTable() {
  return <div className="workspace-table-scroll"><table className="workspace-table"><thead><tr><th>Prospect</th><th>Stage</th><th>Value</th><th>Owner</th><th>Next step</th></tr></thead><tbody>{prospects.map((person) => <tr key={person.name}><td><span className="workspace-person"><i>{person.name.split(' ').map((part) => part[0]).join('')}</i><span><b>{person.name}</b><small>{person.company}</small></span></span></td><td><span className={`workspace-pill ${person.tone}`}>{person.stage}</span></td><td>{person.value}</td><td><span className="workspace-owner">{person.owner}</span></td><td className="workspace-muted">{person.next}</td></tr>)}</tbody></table></div>;
}

function HomeContent() {
  return <>
    <div className="workspace-page-heading"><div><p className="workspace-eyebrow">MONDAY · NOVEMBER 22</p><h1>Good morning, Jordan</h1><p>Here’s what needs your attention across Barbon Photography.</p></div><button className="workspace-primary-button">＋ Add prospect</button></div>
    <div className="workspace-metrics"><Metric label="Follow-ups due" value="4" detail="2 need attention today" tone="positive" /><Metric label="Active pipeline" value="$284k" detail="Across 38 prospects" /><Metric label="Reply rate" value="18%" detail="↑ 4% this month" tone="positive" /><Metric label="New prospects" value="12" detail="3 added this week" /></div>
    <div className="workspace-home-grid"><section className="workspace-card"><div className="workspace-card-heading"><div><h2>Today’s focus</h2><p>Conversations closest to momentum.</p></div><a href="/workspace#pipeline">View pipeline →</a></div><div className="workspace-focus-list"><div><span className="workspace-avatar violet">MP</span><span><b>Maya Patel</b><small>Positive reply · Northstar Labs</small></span><span className="workspace-pill green">Reply today</span></div><div><span className="workspace-avatar rose">AK</span><span><b>Aisha Khan</b><small>Follow-up overdue · Good Union</small></span><span className="workspace-pill rose">Overdue</span></div><div><span className="workspace-avatar amber">OG</span><span><b>Oliver Grant</b><small>Proposal review · Fieldwork Studio</small></span><span className="workspace-pill slate">Tomorrow</span></div></div></section>
      <section className="workspace-card workspace-quote"><span className="workspace-muted">TEAM STANDARD</span><h2>Make the next step clear.</h2><p>Every active prospect should have an owner and a dated next action.</p><a href="/workspace#standards">Review standards →</a></section></div>
    <section className="workspace-card workspace-recent"><div className="workspace-card-heading"><div><h2>Pipeline snapshot</h2><p>Your latest active relationships.</p></div><a href="/workspace#pipeline">Open pipeline →</a></div><ProspectTable /></section>
  </>;
}

function PipelineContent() {
  return <><div className="workspace-page-heading"><div><p className="workspace-eyebrow">WORK</p><h1>Pipeline</h1><p>Keep every prospect moving toward a clear next step.</p></div><button className="workspace-primary-button">＋ Add prospect</button></div><div className="workspace-metrics workspace-metrics-three"><Metric label="Total pipeline" value="$284k" detail="38 active prospects" /><Metric label="Qualified" value="$116k" detail="12 prospects" /><Metric label="Closing this month" value="$42k" detail="5 expected wins" tone="positive" /></div><section className="workspace-card workspace-recent"><div className="workspace-card-heading"><div><h2>All prospects</h2><p>Recently updated · sorted by next action</p></div><div className="workspace-toolbar"><input aria-label="Search prospects" placeholder="⌕  Search prospects" /><button>Filter</button></div></div><ProspectTable /></section></>;
}

function MessagesContent() {
  return <><div className="workspace-page-heading"><div><p className="workspace-eyebrow">WORK</p><h1>Messages</h1><p>Conversation history connected to your relationships.</p></div><button className="workspace-primary-button">＋ New message</button></div><section className="workspace-card"><div className="workspace-card-heading"><div><h2>Recent conversations</h2><p>2 unread messages</p></div><button className="workspace-subtle-button">All conversations⌄</button></div><div className="workspace-message-list">{messages.map((message) => <article className={message.unread ? 'unread' : ''} key={message.name}><span className="workspace-avatar violet">{message.initials}</span><div><div className="workspace-message-title"><b>{message.name}</b><small>{message.time}</small></div><small>{message.context}</small><p>{message.message}</p></div>{message.unread && <i aria-label="Unread" />}</article>)}</div></section></>;
}

function InsightsContent() {
  const bars = [42, 62, 48, 75, 56, 88, 68];
  return <><div className="workspace-page-heading"><div><p className="workspace-eyebrow">MEASURE & IMPROVE</p><h1>Insights</h1><p>Understand where momentum is building this month.</p></div><button className="workspace-subtle-button">Last 30 days⌄</button></div><div className="workspace-metrics"><Metric label="Reply rate" value="18%" detail="↑ 4% vs. last month" tone="positive" /><Metric label="Prospects contacted" value="42" detail="of 84 active" /><Metric label="Qualified" value="16" detail="38% of contacts" /><Metric label="Won this month" value="5" detail="$42k closed" tone="positive" /></div><section className="workspace-card workspace-chart-card"><div className="workspace-card-heading"><div><h2>Outreach activity</h2><p>Messages sent and replies received · last 7 days</p></div><span className="workspace-legend"><i /> Sent <i /> Replies</span></div><div className="workspace-chart">{bars.map((height, index) => <div className="workspace-chart-day" key={index}><div className="workspace-bar-pair"><i style={{ height: `${height}%` }} /><i style={{ height: `${height * .38}%` }} /></div><small>{['Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Mon'][index]}</small></div>)}</div></section></>;
}

function KpisContent() {
  return <><div className="workspace-page-heading"><div><p className="workspace-eyebrow">MEASURE & IMPROVE</p><h1>KPIs</h1><p>Track the habits and outcomes that keep outreach consistent.</p></div><button className="workspace-subtle-button">This month⌄</button></div><div className="workspace-kpi-grid">{[{ name: 'New prospects added', value: '12', target: '20', progress: 60, unit: 'prospects' }, { name: 'First messages sent', value: '38', target: '60', progress: 63, unit: 'messages' }, { name: 'Follow-ups completed', value: '24', target: '30', progress: 80, unit: 'follow-ups' }, { name: 'Qualified opportunities', value: '8', target: '10', progress: 80, unit: 'opportunities' }].map((kpi) => <article className="workspace-card workspace-kpi" key={kpi.name}><span className="workspace-muted">{kpi.name}</span><div><strong>{kpi.value}</strong><span> / {kpi.target} {kpi.unit}</span></div><div className="workspace-progress"><i style={{ width: `${kpi.progress}%` }} /></div><small>{kpi.progress}% of monthly target</small></article>)}</div><section className="workspace-card workspace-note"><h2>A useful KPI should lead to an action.</h2><p>Targets are workspace-wide and reviewed weekly. Use Insights to understand why a number changed.</p><a href="/workspace#insights">Explore insights →</a></section></>;
}

function StandardsContent() {
  const standards = [
    { title: 'Every active prospect has an owner', detail: 'Assign one person to keep the relationship moving.', done: true },
    { title: 'Every open record has a next action', detail: 'Add a clear action and due date after each interaction.', done: true },
    { title: 'Log meaningful conversations', detail: 'Keep context available to everyone in the workspace.', done: false },
    { title: 'Review overdue follow-ups each morning', detail: 'Start the day by clearing the highest priority actions.', done: false },
  ];
  return <><div className="workspace-page-heading"><div><p className="workspace-eyebrow">MEASURE & IMPROVE</p><h1>Standards</h1><p>Shared playbooks that make a good customer experience repeatable.</p></div><button className="workspace-primary-button">＋ Add a standard</button></div><section className="workspace-card"><div className="workspace-card-heading"><div><h2>Daily relationship standard</h2><p>4 practices · Updated by Jordan Davis</p></div><span className="workspace-pill green">2 of 4 in place</span></div><div className="workspace-standard-list">{standards.map((standard) => <label key={standard.title}><input type="checkbox" defaultChecked={standard.done} /><span><b>{standard.title}</b><small>{standard.detail}</small></span><span className="workspace-standard-tag">Daily</span></label>)}</div></section><section className="workspace-note"><h2>Make the standard easy to follow.</h2><p>Keep each practice short, observable, and connected to the work your team does every day.</p></section></>;
}

function SettingsContent() {
  return <><div className="workspace-page-heading"><div><p className="workspace-eyebrow">WORKSPACE</p><h1>Workspace settings</h1><p>Manage the shared context and preferences for this team.</p></div></div><section className="workspace-card workspace-setting"><div><b>Workspace name</b><small>Visible to everyone with access.</small></div><strong>Barbon Photography</strong></section><section className="workspace-card workspace-setting"><div><b>Default landing page</b><small>Choose where teammates start their day.</small></div><strong>Home</strong></section></>;
}

function SectionContent({ section }: { section: WorkspaceSection }) {
  switch (section) {
    case 'home': return <HomeContent />;
    case 'pipeline': return <PipelineContent />;
    case 'messages': return <MessagesContent />;
    case 'insights': return <InsightsContent />;
    case 'kpis': return <KpisContent />;
    case 'standards': return <StandardsContent />;
    case 'settings': return <SettingsContent />;
  }
}

export default function WorkspaceShell({ section }: { section: WorkspaceSection }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const [activeSection, setActiveSection] = useState(section === 'settings' ? 'settings' : section);
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (section === 'settings') return;
    const main = mainRef.current;
    if (!main) return;
    const targets = main.querySelectorAll<HTMLElement>('[data-workspace-section]');
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) setActiveSection(visible.target.id as WorkspaceSection);
      entries.filter((entry) => entry.isIntersecting).forEach((entry) => {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { root: main, rootMargin: '-18% 0px -68% 0px', threshold: [0, 0.1, 0.5] });
    targets.forEach((target) => observer.observe(target));
    if (section !== 'home') requestAnimationFrame(() => document.getElementById(section)?.scrollIntoView({ block: 'start' }));
    else if (window.location.hash) requestAnimationFrame(() => document.getElementById(window.location.hash.slice(1))?.scrollIntoView({ block: 'start' }));
    return () => observer.disconnect();
  }, [section]);

  return <div className="workspace-shell">
    <aside className="workspace-sidebar">
      <Link href="/" className="workspace-brand"><span className="workspace-brand-mark">B</span><span><b>barbon</b><small>WORKSPACE</small></span></Link>
      <button className="workspace-switcher"><span className="workspace-switcher-mark">B</span><span><b>Barbon Photography</b><small>Workspace</small></span><span className="workspace-chevron">⌄</span></button>
      <button className="workspace-search">⌕ <span>Search anything</span><kbd>⌘ K</kbd></button>
      <nav className="workspace-nav" aria-label="Workspace navigation"><p>WORK</p>{primaryItems.map((item) => <SidebarLink key={item.id} item={item} active={activeSection === item.id} />)}<p>MEASURE &amp; IMPROVE</p>{measureItems.map((item) => <SidebarLink key={item.id} item={item} active={activeSection === item.id} />)}</nav>
      <div className="workspace-sidebar-bottom"><SidebarLink item={{ id: 'settings', label: 'Settings', icon: '⚙' }} active={activeSection === 'settings'} /><div className="workspace-profile"><span className="workspace-avatar">JD</span><span><b>Jordan Davis</b><small>Workspace owner</small></span><button aria-label="Profile menu">···</button></div></div>
    </aside>
    <main className="workspace-main" ref={mainRef}><header className="workspace-mobile-header"><a href="/workspace#home" className="workspace-brand"><span className="workspace-brand-mark">B</span><b>barbon</b></a><button onClick={() => setMoreOpen((open) => !open)} aria-expanded={moreOpen}>☰</button></header><div className={`workspace-content${section === 'settings' ? ' settings-only' : ''}`}>
      {section === 'settings' ? <SectionContent section="settings" /> : <>
        <section id="home" data-workspace-section className="workspace-module-section"><HomeContent /></section>
        <section id="pipeline" data-workspace-section className="workspace-module-section"><PipelineContent /></section>
        <section id="messages" data-workspace-section className="workspace-module-section"><MessagesContent /></section>
        <section id="insights" data-workspace-section className="workspace-module-section"><InsightsContent /></section>
        <section id="kpis" data-workspace-section className="workspace-module-section"><KpisContent /></section>
        <section id="standards" data-workspace-section className="workspace-module-section"><StandardsContent /></section>
      </>}
    </div></main>
    <nav className="workspace-mobile-nav" aria-label="Mobile workspace navigation">{primaryItems.map((item) => <SidebarLink key={item.id} item={item} active={activeSection === item.id} />)}<button className={moreOpen || measureItems.some((item) => item.id === activeSection) ? 'workspace-nav-link is-active' : 'workspace-nav-link'} onClick={() => setMoreOpen((open) => !open)}><span className="workspace-nav-icon">···</span><span>More</span></button>{moreOpen && <div className="workspace-mobile-more">{measureItems.map((item) => <SidebarLink key={item.id} item={item} active={activeSection === item.id} onClick={() => setMoreOpen(false)} />)}<SidebarLink item={{ id: 'settings', label: 'Settings', icon: '⚙' }} active={activeSection === 'settings'} onClick={() => setMoreOpen(false)} /></div>}</nav>
  </div>;
}
