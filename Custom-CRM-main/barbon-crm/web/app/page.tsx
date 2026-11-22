'use client';

import { useState } from 'react';
import Link from 'next/link';

type FeatureKey = 'capture' | 'organize' | 'activate' | 'forecast' | 'retain';
type RecordRow = { company: string; domain: string; score: number; status: string; owner: string; color: string };

const features: { key: FeatureKey; number: string; label: string; title: string; copy: string }[] = [
  { key: 'capture', number: '01', label: 'Capture every signal', title: 'A shared system for every relationship.', copy: 'Bring conversations, context, and next steps into one clear record your whole team can trust.' },
  { key: 'organize', number: '02', label: 'Organize your market', title: 'See the whole picture at a glance.', copy: 'Flexible records and views give every workspace the structure it needs without slowing people down.' },
  { key: 'activate', number: '03', label: 'Activate momentum', title: 'Turn context into the next best action.', copy: 'Make follow-ups visible, timely, and easy to complete with a calm daily operating rhythm.' },
  { key: 'forecast', number: '04', label: 'Forecast clearly', title: 'Know what is moving before the meeting.', copy: 'Track pipeline health with simple views that make decisions faster and forecasts more honest.' },
  { key: 'retain', number: '05', label: 'Retain and expand', title: 'Keep good relationships getting better.', copy: 'Preserve the details that matter and give every customer a more thoughtful experience.' },
];

const seedRecords: RecordRow[] = [
  { company: 'Northstar Labs', domain: 'northstarlabs.com', score: 94, status: 'Qualified', owner: 'JD', color: '#d8c6aa' },
  { company: 'Fieldwork Studio', domain: 'fieldwork.studio', score: 86, status: 'In progress', owner: 'AK', color: '#bfd6cf' },
  { company: 'Good Union', domain: 'goodunion.co', score: 78, status: 'New', owner: 'MP', color: '#d3c9e9' },
  { company: 'Morrow House', domain: 'morrowhouse.com', score: 71, status: 'Contacted', owner: 'OG', color: '#efd0bd' },
];

const deals = [
  { name: 'Northstar Labs', value: '$48k', date: 'Dec 12', owner: 'JD', color: '#d8c6aa' },
  { name: 'Good Union', value: '$22k', date: 'Dec 18', owner: 'MP', color: '#d3c9e9' },
  { name: 'Morrow House', value: '$31k', date: 'Jan 04', owner: 'OG', color: '#efd0bd' },
  { name: 'Fieldwork Studio', value: '$18k', date: 'Jan 10', owner: 'AK', color: '#bfd6cf' },
];

function Logo() { return <a className="brand-logo" href="#top" aria-label="Barbon CRM home"><span className="brand-glyph">B</span><span>barbon</span></a>; }
function Arrow() { return <span aria-hidden="true">↗</span>; }

export default function HomePage() {
  const [feature, setFeature] = useState<FeatureKey>('capture');
  const [records, setRecords] = useState(seedRecords);
  const [recordMode, setRecordMode] = useState<'records' | 'pipeline'>('records');
  const [mobileOpen, setMobileOpen] = useState(false);
  const selected = features.find((item) => item.key === feature) ?? features[0];
  const updateCompany = (index: number, company: string) => setRecords((current) => current.map((record, rowIndex) => rowIndex === index ? { ...record, company } : record));

  return (
    <main id="top" className="site-shell">
      <nav className="site-nav" aria-label="Main navigation">
        <Logo />
        <div className={`nav-links ${mobileOpen ? 'nav-links-open' : ''}`}>
          <a href="#platform" onClick={() => setMobileOpen(false)}>Platform <span>⌄</span></a><a href="#workflow" onClick={() => setMobileOpen(false)}>Resources <span>⌄</span></a><a href="#records" onClick={() => setMobileOpen(false)}>Developers</a><a href="#proof" onClick={() => setMobileOpen(false)}>Customers</a><a href="#footer" onClick={() => setMobileOpen(false)}>Pricing</a>
        </div>
        <div className="nav-actions"><button className="button button-secondary">Sign in</button><button className="button button-primary" onClick={() => document.getElementById('platform')?.scrollIntoView({ behavior: 'smooth' })}>Start for free <Arrow /></button></div>
        <button className="menu-button" aria-label="Toggle menu" aria-expanded={mobileOpen} onClick={() => setMobileOpen((open) => !open)}>☰</button>
      </nav>

      <section className="hero section-grid" id="platform"><div className="hero-copy"><span className="eyebrow">A calmer operating system for growth</span><h1>Every relationship.<br /><span>One clear picture.</span></h1><p>Barbon brings your contacts, pipeline, and follow-ups together so your team can move with context and confidence.</p><div className="hero-actions"><Link className="button button-primary button-large" href="/workspace">Explore the workspace <Arrow /></Link><a className="text-link" href="#workflow">See how it works <Arrow /></a></div><div className="hero-note"><span className="status-dot" /> Built for focused teams · mock product preview</div></div><div className="hero-preview" aria-label="Interactive CRM preview"><div className="preview-topbar"><span className="traffic-lights"><i /><i /><i /></span><span>Barbon / All prospects</span><button aria-label="Open preview">···</button></div><div className="preview-body"><aside className="preview-sidebar"><strong>barbon</strong><span className="preview-active">▦ Prospects</span><span>◷ Today</span><span>⌁ Insights</span><span>⚙ Settings</span><div className="preview-user">JD <small>Jordan Davis</small></div></aside><div className="preview-content"><div className="preview-heading"><div><small>Pipeline · 84 active</small><h3>All prospects</h3></div><button className="mini-button">+ Add prospect</button></div><div className="preview-toolbar"><span>⌕ Search records</span><span>All stages ⌄</span><span>Group by ⌄</span></div><div className="mini-table"><div className="mini-row mini-header"><span>Prospect</span><span>ICP score</span><span>Owner</span><span>Status</span></div>{records.slice(0, 3).map((row) => <div className="mini-row" key={row.company}><span><b className="company-mark" style={{ background: row.color }}>{row.company.slice(0, 1)}</b>{row.company}</span><span><b className="score-pill">{row.score}</b></span><span className="owner-avatar">{row.owner}</span><span className="soft-pill">{row.status}</span></div>)}</div></div></div></div></section>

      <section className="workflow section-grid" id="workflow"><div className="section-intro"><span className="eyebrow">Built around your workflow</span><h2>From first signal<br /><span>to next step.</span></h2><p>One connected system for the work behind every meaningful relationship.</p></div><div className="workflow-grid"><div className="feature-list" role="tablist" aria-label="Workflow features">{features.map((item) => <button key={item.key} className={`feature-tab ${feature === item.key ? 'feature-tab-active' : ''}`} role="tab" aria-selected={feature === item.key} onClick={() => setFeature(item.key)}><span>{item.number}</span>{item.label}<Arrow /></button>)}</div><div className="feature-detail" role="tabpanel"><span className="eyebrow">{selected.number} / 05</span><h3>{selected.title}</h3><p>{selected.copy}</p><div className="detail-lines"><span /><span /><span /></div><button className="text-link">Explore {selected.label.toLowerCase()} <Arrow /></button></div></div></section>

      <section className="records-section section-grid" id="records"><div className="section-intro"><span className="eyebrow">One source of truth</span><h2>Records that feel<br /><span>like your business.</span></h2><p>Flexible, connected data that stays useful as your team and relationships grow.</p></div><div className="workspace-window"><div className="workspace-header"><div><small>Workspace / Barbon Photography</small><h3>{recordMode === 'records' ? 'All companies' : 'Deal pipeline'}</h3></div><div className="view-toggle"><button className={recordMode === 'records' ? 'selected' : ''} onClick={() => setRecordMode('records')}>▤ Records</button><button className={recordMode === 'pipeline' ? 'selected' : ''} onClick={() => setRecordMode('pipeline')}>▥ Pipeline</button></div></div>{recordMode === 'records' ? <div className="records-table-wrap"><table className="records-table"><thead><tr><th>Company</th><th>ICP score</th><th>Owner</th><th>Status</th><th>Last activity</th></tr></thead><tbody>{records.map((row, index) => <tr key={row.domain}><td><div className="company-cell"><b className="company-mark" style={{ background: row.color }}>{row.company.slice(0, 1)}</b><div><input aria-label={`Company ${index + 1}`} value={row.company} onChange={(event) => updateCompany(index, event.target.value)} /><small>{row.domain}</small></div></div></td><td><span className={`score-pill ${row.score > 85 ? 'score-high' : ''}`}>{row.score}</span></td><td><span className="owner-avatar">{row.owner}</span></td><td><span className={`soft-pill status-${row.status.toLowerCase().replace(' ', '-')}`}>{row.status}</span></td><td className="muted-cell">Today · 10:{20 + index}</td></tr>)}</tbody></table></div> : <PipelineBoard />}</div></section>

      <section className="metrics-section section-grid" id="proof"><div className="metrics-copy"><span className="eyebrow">Momentum, made visible</span><h2>A better day<br /><span>starts with clarity.</span></h2><p>Give your team the context to spend less time searching and more time building trust.</p><button className="button button-secondary">See the difference <Arrow /></button></div><div className="metrics-grid"><div><strong>38%</strong><span>more follow-ups completed</span></div><div><strong>2.4×</strong><span>faster record review</span></div><div><strong>84</strong><span>active relationships</span></div><div><strong>100%</strong><span>team visibility</span></div></div></section>

      <section className="quote-section"><span className="quote-mark">“</span><blockquote>Barbon gives us the rare feeling that the system is working with us. Everything important is close at hand.</blockquote><div className="quote-person"><span className="person-avatar">JD</span><span><b>Jordan Davis</b><small>Founder, Barbon Photography</small></span></div></section>
      <section className="logo-section"><span className="eyebrow">Trusted by focused teams</span><div className="logo-row"><span>northstar</span><span>fieldwork</span><span>good union</span><span>morrow</span></div><div className="cta-panel"><div><span className="eyebrow">Ready when you are</span><h2>Make every relationship<br />count.</h2></div><button className="button button-primary button-large">Start for free <Arrow /></button></div></section>
      <footer className="site-footer" id="footer"><div className="footer-brand"><Logo /><p>The calm CRM for teams<br />that care about the details.</p></div><div className="footer-links"><div><b>Product</b><a href="#platform">Platform</a><a href="#records">Records</a><a href="#workflow">Workflows</a><a href="#proof">Customers</a></div><div><b>Company</b><a href="#footer">About</a><a href="#footer">Careers</a><a href="#footer">Contact</a><a href="#footer">Manifesto</a></div><div><b>Resources</b><a href="#footer">Help center</a><a href="#footer">Developers</a><a href="#footer">Status</a><a href="#footer">Changelog</a></div></div><div className="footer-bottom"><span>© 2026 Barbon CRM. All rights reserved.</span><span><a href="#footer">Privacy</a><a href="#footer">Terms</a><a href="#footer">Security</a></span></div></footer>
    </main>
  );
}

function PipelineBoard() { const columns = [{ label: 'Qualified', total: '$70k', items: deals.slice(0, 2) }, { label: 'In progress', total: '$49k', items: deals.slice(2, 3) }, { label: 'Proposal', total: '$18k', items: deals.slice(3) }]; return <div className="pipeline-board">{columns.map((column) => <div className="pipeline-column" key={column.label}><div className="pipeline-column-head"><span><i className="stage-dot" />{column.label}</span><b>{column.total}</b></div>{column.items.map((deal) => <article className="deal-card" key={deal.name}><div><b>{deal.name}</b><span>Closes {deal.date}</span></div><div><strong>{deal.value}</strong><span className="owner-avatar">{deal.owner}</span></div></article>)}</div>)}</div>; }
