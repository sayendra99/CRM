(() => {
  'use strict';

  const mockProspects = [
    { id: 1, name: 'Maya Patel', handle: '@mayapatelhomes', type: 'Property Investor', stage: 'Interested', source: 'Instagram', tags: ['High value', 'Birmingham'], due: 'Today', initials: 'MP', color: '#8d86f5', last: 'Positive reply · yesterday', note: 'Looking at two refurbishments in Edgbaston. Wants a quote this week.' },
    { id: 2, name: 'Oliver Grant', handle: '@grantandco', type: 'Estate Agent', stage: 'Leads', source: 'Referral', tags: ['Estate agents'], due: 'Tomorrow', initials: 'OG', color: '#e09a6f', last: 'First DM · 2 days ago', note: 'Small independent agency with 12 listings in the pipeline.' },
    { id: 3, name: 'Aisha Khan', handle: '@aishakhaninteriors', type: 'Interior Designer', stage: 'Contacted', source: 'Instagram', tags: ['Designers'], due: 'Overdue', initials: 'AK', color: '#79b7a0', last: 'Follow-up 2 · 6 days ago', note: 'Strong portfolio. Follow up with interiors case study.' },
    { id: 4, name: 'Daniel Brooks', handle: '@brooksspaces', type: 'Architect', stage: 'Unsure', source: 'Networking Event', tags: ['Architecture'], due: 'Friday', initials: 'DB', color: '#d3a05d', last: 'First DM · 5 days ago', note: 'Met at Birmingham Property Meetup.' },
    { id: 5, name: 'Sarah Wilson', handle: '@wilsonstays', type: 'SA Provider', stage: 'Ideal Leads', source: 'Website', tags: ['SA', 'Priority'], due: 'Monday', initials: 'SW', color: '#d87d9d', last: 'Follow-up 1 · 1 week ago', note: 'Runs 18 serviced apartments around the city centre.' },
    { id: 6, name: 'Theo Martin', handle: '@theomartinproperty', type: 'Property Developer', stage: 'Not Ideal', source: 'Instagram', tags: ['Developers'], due: '—', initials: 'TM', color: '#8aa2ca', last: 'Negative reply · 2 weeks ago', note: 'Not a fit right now; keep archived in the reference view.' },
  ];

  const navItems = [
    ['dashboard', '⌂', 'Home'], ['today', '◷', 'Today'], ['pipeline', '▦', 'Pipeline'], ['insights', '◒', 'Insights'], ['messages', '✉', 'Messages'], ['kpis', '◎', 'KPIs'], ['checklist', '✓', 'Standard'], ['automations', 'ϟ', 'Automations'], ['settings', '⚙', 'Settings'],
  ];

  const state = { view: 'dashboard', theme: localStorage.getItem('barbon-prototype-theme') || 'light', drawer: null, composer: null, toast: '', preview: 'ready', selectedWorkspace: 'Barbon Photography', query: '', prospects: mockProspects.map((p) => ({ ...p, tags: [...p.tags] })) };
  const app = document.getElementById('app');
  document.documentElement.dataset.theme = state.theme;

  function esc(value) { return String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c])); }
  function initials(name) { return name.split(' ').map((x) => x[0]).join('').slice(0, 2); }
  function pill(text, tone = 'slate') { return `<span class="pill ${tone}">${esc(text)}</span>`; }
  function button(label, cls = '', action = '', id = '') { return `<button class="button ${cls}" data-action="${action}"${id ? ` data-id="${esc(id)}"` : ''}>${label}</button>`; }
  function iconButton(label, action, title = label, id = '') { return `<button class="icon-button" title="${esc(title)}" aria-label="${esc(title)}" data-action="${action}"${id ? ` data-id="${esc(id)}"` : ''}>${label}</button>`; }
  function activeProspects() { return state.prospects.filter((p) => `${p.name} ${p.handle} ${p.type} ${p.stage} ${p.source}`.toLowerCase().includes(state.query.toLowerCase())); }
  function toneForStage(stage) { return ({ Interested: 'violet', Leads: 'green', Contacted: 'amber', 'Ideal Leads': 'green', Unsure: 'amber', 'Not Ideal': 'rose' })[stage] || 'slate'; }

  function shell(content) {
    app.innerHTML = `<div class="app"><aside class="sidebar">${sidebar()}</aside><main class="main"><div class="mobile-bar"><div class="mobile-brand"><span class="brand-mark">B</span> Barbon CRM</div><div class="inline-actions">${iconButton('⌕', 'focus-search', 'Search')} ${iconButton(state.theme === 'dark' ? '☼' : '☾', 'toggle-theme', 'Toggle theme')}</div></div>${content}</main></div>${mobileNav()}${state.drawer ? drawer(state.drawer) : ''}${state.composer ? composer(state.composer) : ''}<div class="preview-menu"><label class="sr-only" for="preview-state">Preview state</label><select id="preview-state" data-action="preview-state"><option value="ready" ${state.preview === 'ready' ? 'selected' : ''}>Preview: ready</option><option value="loading" ${state.preview === 'loading' ? 'selected' : ''}>Preview: loading</option><option value="empty" ${state.preview === 'empty' ? 'selected' : ''}>Preview: empty</option><option value="error" ${state.preview === 'error' ? 'selected' : ''}>Preview: error</option><option value="denied" ${state.preview === 'denied' ? 'selected' : ''}>Preview: permission denied</option></select></div>${state.toast ? `<div class="toast" role="status">${esc(state.toast)}</div>` : ''}`;
    bind();
  }

  function sidebar() {
    return `<div class="brand"><div class="brand-mark">B</div><div class="brand-copy"><div class="brand-name">Barbon CRM</div><div class="brand-sub">Mock UI prototype</div></div></div><button class="workspace-switcher" data-action="workspace-menu"><span class="workspace-dot">B</span><span class="workspace-meta"><strong>${esc(state.selectedWorkspace)}</strong><span>Workspace</span></span><span class="chevron">⌄</span></button><button class="search-trigger" data-action="focus-search"><span>⌕ &nbsp;Jump to…</span><kbd>⌘ K</kbd></button><div class="nav-label">Workspace</div><nav class="nav" aria-label="Primary navigation">${navItems.map(([id, ico, label]) => `<button class="nav-item ${state.view === id ? 'active' : ''}" data-action="navigate" data-view="${id}"><span class="nav-icon">${ico}</span><span>${label}</span>${id === 'today' ? '<span class="nav-badge">4</span>' : ''}</button>`).join('')}</nav><div class="sidebar-footer"><div class="avatar">JD</div><div class="grow"><strong style="font-size:12px">Jordan Davis</strong><small>Owner · mock account</small></div>${iconButton('⋯', 'profile-menu', 'Profile menu')}</div>`;
  }

  function mobileNav() { return `<nav class="bottom-nav" aria-label="Mobile navigation">${navItems.slice(0, 4).map(([id, ico, label]) => `<button class="${state.view === id ? 'active' : ''}" data-action="navigate" data-view="${id}"><span>${ico}</span>${label}</button>`).join('')}</nav>`; }

  function pageHead(kicker, title, subtitle, actions = '') { return `<header class="page-head"><div><p class="page-kicker">${kicker}</p><h1>${title}</h1><p>${subtitle}</p></div><div class="head-actions"><span class="mock-badge">Mock data only</span>${actions}</div></header>`; }

  function dashboard() {
    return `<div class="content">${pageHead('Monday · 22 November 2026', 'Good morning, Jordan', 'A focused view of the work that moves your pipeline forward.', button('+ New prospect', 'primary', 'new-prospect'))}<div class="grid grid-4"><div class="stat-card"><span class="stat-icon">✦</span><div class="stat-label">Follow-ups due</div><div class="stat-value">4</div><div class="stat-meta">2 overdue · action needed</div></div><div class="stat-card"><span class="stat-icon">↗</span><div class="stat-label">DMs sent this week</div><div class="stat-value">38 <small style="font-size:12px;color:var(--muted);font-weight:600">/ 60</small></div><div class="progress"><span style="width:63%"></span></div></div><div class="stat-card"><span class="stat-icon">◌</span><div class="stat-label">Reply rate</div><div class="stat-value">18%</div><div class="stat-meta">↑ 4% from last week</div></div><div class="stat-card"><span class="stat-icon">♧</span><div class="stat-label">New prospects</div><div class="stat-value">12</div><div class="stat-meta">+3 this week</div></div></div><div class="grid grid-2" style="margin-top:16px"><section class="card"><div class="card-head"><div><h2>Today’s focus</h2><p>Start with the conversations closest to momentum.</p></div>${button('Open Today', 'ghost', 'navigate-today')}</div><div class="list">${state.prospects.filter((p) => ['Today', 'Overdue'].includes(p.due)).slice(0, 4).map((p) => queueRow(p)).join('')}</div></section><section class="quote"><p>“Clarity comes from action, not thought.”</p><small>— Marie Forleo · a small prompt for a consistent day</small></section></div><div class="grid grid-2" style="margin-top:16px"><section class="card"><div class="card-head"><div><h2>Pipeline pulse</h2><p>Active prospects by stage</p></div>${button('View pipeline', 'ghost', 'navigate-pipeline')}</div><div class="card-body">${[['Interested', 8, 'violet'], ['Ideal Leads', 17, 'green'], ['Leads', 31, 'slate'], ['Unsure', 12, 'amber']].map(([label, count, tone]) => `<div style="display:flex;align-items:center;gap:10px;margin:14px 0"><span class="stage-dot" style="background:var(--${tone === 'violet' ? 'accent' : tone})"></span><span class="grow" style="font-size:12px;font-weight:700">${label}</span><strong>${count}</strong><span style="width:90px"><span class="progress" style="margin:0"><span style="width:${count * 2.3}%"></span></span></span></div>`).join('')}</div></section><section class="card"><div class="card-head"><div><h2>Recent activity</h2><p>Across Barbon Photography</p></div>${iconButton('↗', 'navigate-today', 'Open activity')}</div><div class="card-body"><div class="timeline">${activityEvents().slice(0, 3).map((e) => eventMarkup(e)).join('')}</div></div></section></div></div>`;
  }

  function queueRow(p) { return `<div class="list-row"><div class="avatar" style="background:${p.color};color:white">${p.initials}</div><div class="grow"><div class="row-title">${esc(p.name)}</div><div class="row-meta">${esc(p.type)} · ${esc(p.last)}</div></div><div>${p.due === 'Overdue' ? pill('Overdue', 'rose') : pill(p.due, 'amber')}</div>${button('Compose', '', 'compose', p.id)}</div>`; }

  function today() {
    if (state.preview !== 'ready') return `<div class="content">${pageHead('Today', 'Your follow-up queue', 'A prioritized list of conversations to move forward today.')}${stateView()}</div>`;
    const due = activeProspects().filter((p) => ['Today', 'Overdue'].includes(p.due));
    const fresh = activeProspects().filter((p) => p.stage === 'Leads' && p.due === 'Tomorrow');
    return `<div class="content">${pageHead('Today · 4 actions', 'Your follow-up queue', 'A prioritized list of conversations to move forward today.', button('Keyboard shortcuts', '', 'shortcuts'))}<div class="card"><div class="card-head"><div><h2>Due now</h2><p>Overdue first, then today’s follow-ups.</p></div><span class="pill rose">${due.length} conversations</span></div><div class="list">${due.map((p) => queueRow(p)).join('')}</div></div><div class="card" style="margin-top:16px"><div class="card-head"><div><h2>Fresh prospects</h2><p>New conversations ready to start.</p></div><span class="pill slate">${fresh.length} prospects</span></div><div class="list">${fresh.map((p) => queueRow(p)).join('')}</div></div></div>`;
  }

  function pipeline() {
    if (state.preview !== 'ready') return `<div class="content">${pageHead('Pipeline', 'All prospects', 'A calm, dense view of your workspace pipeline.', button('+ Add prospect', 'primary', 'new-prospect'))}${stateView()}</div>`;
    const rows = activeProspects();
    return `<div class="content">${pageHead('Pipeline · 84 active', 'All prospects', 'Filter, scan, and open a record without leaving the table.', button('+ Add prospect', 'primary', 'new-prospect'))}<div class="toolbar"><input id="pipeline-search" class="search-input" value="${esc(state.query)}" placeholder="Search name, handle, type…" aria-label="Search prospects" /><select class="select" aria-label="Filter stage"><option>All stages</option><option>Interested</option><option>Leads</option><option>Ideal Leads</option></select><select class="select" aria-label="Group by"><option>Group by stage</option><option>Group by source</option><option>Group by type</option></select>${button('Import', '', 'toast', 'Import is mock-only in this prototype')}</div><div class="card"><div class="table-wrap"><table class="pipeline-table"><thead><tr><th>Prospect</th><th>Type</th><th>Stage</th><th>Source</th><th>Groups</th><th>Next action</th><th></th></tr></thead><tbody>${rows.map((p) => `<tr data-action="open-drawer" data-id="${p.id}"><td><div style="display:flex;align-items:center;gap:10px"><div class="avatar" style="background:${p.color};color:white">${p.initials}</div><div><strong>${esc(p.name)}</strong><div class="handle">${esc(p.handle)}</div></div></div></td><td>${esc(p.type)}</td><td>${pill(p.stage, toneForStage(p.stage))}</td><td>${esc(p.source)}</td><td><div class="tag-list">${p.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</div></td><td class="${p.due === 'Overdue' ? 'due' : ''}">${esc(p.due)}</td><td>${iconButton('›', 'open-drawer', 'Open prospect', p.id)}</td></tr>`).join('')}</tbody></table>${rows.length === 0 ? stateView('No prospects match your search', 'Try a different name, handle, or stage.') : ''}</div></div></div>`;
  }

  function messages() { return `<div class="content">${pageHead('Message library', 'Write like yourself, consistently', 'Templates are mock-only. Nothing is sent from this prototype.', button('+ New variant', 'primary', 'toast', 'New message variant is mock-only'))}<div class="grid grid-2"><section class="card"><div class="card-head"><div><h2>Property Investor · First DM</h2><p>3 variants · last edited today</p></div>${pill('Active', 'green')}</div><div class="card-body" style="display:grid;gap:12px">${['Hiya {name}, hope you’re well. Saw you’re involved in property and thought I’d reach out.', 'Hi {name}, hope you’re keeping well! Thought I’d drop you a message about professional property photography.', 'Hey {name}! Hope you’re doing well. I specialise in professional property photography and next-day delivery.'].map((text, i) => `<article class="detail"><div style="display:flex;justify-content:space-between;gap:10px"><strong style="font-size:11px">Variant ${i + 1}</strong>${iconButton('⧉', 'toast', 'Copy mock message', 'Copied mock message')}</div><p style="font-size:12px;line-height:1.5;margin:10px 0 0;color:var(--muted)">${text}</p></article>`).join('')}</div></section><section class="card"><div class="card-head"><div><h2>Cadence</h2><p>Preview schedule for this sequence</p></div></div><div class="card-body"><div class="timeline">${['First DM · Day 0', 'Follow-up 1 · Day 3', 'Follow-up 2 · Day 8', 'Follow-up 3 · Day 15'].map((x, i) => `<div class="event ${i === 1 ? 'reply' : ''}"><time>Stage ${i + 1}</time><p><strong>${x.split(' · ')[0]}</strong><br><span style="color:var(--muted)">${x.split(' · ')[1]}</span></p></div>`).join('')}</div></div></section></div></div>`; }

  function insights() { return `<div class="content">${pageHead('Insights', 'Know where momentum is building', 'A lightweight reporting preview built from mock activity.')}${state.preview !== 'ready' ? stateView() : `<div class="grid grid-4"><div class="stat-card"><div class="stat-label">Reply rate</div><div class="stat-value">18%</div><div class="stat-meta">↑ 4% this month</div></div><div class="stat-card"><div class="stat-label">Contacted</div><div class="stat-value">42</div><div class="stat-meta">of 84 active prospects</div></div><div class="stat-card"><div class="stat-label">Interested</div><div class="stat-value">8</div><div class="stat-meta">19% of replies</div></div><div class="stat-card"><div class="stat-label">Won</div><div class="stat-value">3</div><div class="stat-meta">This quarter</div></div></div><div class="card" style="margin-top:16px"><div class="card-head"><div><h2>Activity trend</h2><p>DMs sent and replies received · last 7 days</p></div>${pill('Mock trend', 'violet')}</div><div class="card-body"><div style="height:190px;display:flex;align-items:end;gap:12px;padding:18px 8px 2px;border-bottom:1px solid var(--line)">${[35, 52, 44, 70, 58, 82, 64].map((n, i) => `<div class="grow" style="height:100%;display:flex;align-items:end;gap:4px"><span style="height:${n}%;background:var(--accent);border-radius:5px 5px 0 0;flex:1" title="${n} sent"></span><span style="height:${Math.round(n * .35)}%;background:var(--green);border-radius:5px 5px 0 0;flex:1" title="${Math.round(n * .35)} replies"></span><small style="position:absolute;transform:translateY(24px);font-size:9px;color:var(--muted)">${['Tue','Wed','Thu','Fri','Sat','Sun','Mon'][i]}</small></div>`).join('')}</div></div></div>`}</div>`; }

  function simpleView(title, subtitle) { return `<div class="content">${pageHead(title, title === 'Settings' ? 'Workspace settings' : title, subtitle)}<div class="card"><div class="card-body"><h2>${title} preview</h2><p class="muted">This area is intentionally lightweight for the first UX review. The interaction shell, permission states, theme, and responsive behavior are live; business actions remain mock-only.</p>${button('Show permission denied state', '', 'preview', 'denied')}</div></div></div>`; }

  function stateView(title = '', description = '') {
    const configs = {
      loading: ['◌', 'Loading workspace…', 'Fetching mock records and preparing your workspace.'],
      empty: ['⌁', title || 'Nothing here yet', description || 'When records arrive, they’ll appear in this workspace.'],
      error: ['!', 'Something went wrong', 'We couldn’t load this mock view. Try again or return to Home.'],
      denied: ['⊘', 'You don’t have permission', 'Your role does not allow access to this area. Ask an owner or admin to update your workspace access.'],
    }[state.preview];
    if (!configs) return '';
    return `<div class="card state-card"><div><div class="state-icon">${configs[0]}</div><h2>${configs[1]}</h2><p>${configs[2]}</p>${state.preview === 'error' ? button('Try again', 'primary', 'preview', 'ready') : ''}</div></div>`;
  }

  function activityEvents() { return [{ type: 'reply', date: 'Today · 09:42', text: 'Maya Patel replied positively', detail: '“Yes, send over your availability for next week.”' }, { type: 'sent', date: 'Yesterday · 16:20', text: 'Follow-up sent to Aisha Khan', detail: 'Follow-up 2 · Interior Designer' }, { type: 'added', date: 'Sunday · 11:08', text: 'New prospect added', detail: 'Sarah Wilson · SA Provider' }]; }
  function eventMarkup(event) { return `<div class="event ${event.type === 'reply' ? 'reply' : ''}"><time>${event.date}</time><p><strong>${event.text}</strong><br><span style="color:var(--muted)">${event.detail}</span></p></div>`; }

  function drawer(id) {
    const p = state.prospects.find((x) => x.id === Number(id));
    if (!p) return '';
    return `<div class="drawer-backdrop" data-action="close-drawer"><aside class="drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title"><div class="drawer-head">${iconButton('×', 'close-drawer', 'Close prospect')}<div class="avatar" style="background:${p.color};color:white">${p.initials}</div><div class="grow"><h2 id="drawer-title">${esc(p.name)}</h2><div class="handle">${esc(p.handle)}</div></div>${iconButton('⋯', 'toast', 'More actions', 'More actions are mock-only')}</div><div class="drawer-content"><div class="inline-actions">${pill(p.stage, toneForStage(p.stage))}${pill(p.type, 'slate')}${button('Compose next message', 'primary', 'compose', p.id)}</div><section class="drawer-section"><h3>Contact details</h3><div class="detail-grid"><div class="detail"><label>Lead source</label><span>${esc(p.source)}</span></div><div class="detail"><label>Next action</label><span class="${p.due === 'Overdue' ? 'due' : ''}">${esc(p.due)}</span></div><div class="detail"><label>Instagram</label><span>${esc(p.handle)}</span></div><div class="detail"><label>Location</label><span>Birmingham, UK</span></div></div></section><section class="drawer-section"><h3>Notes</h3><div class="detail"><span style="font-weight:500;line-height:1.55">${esc(p.note)}</span></div></section><section class="drawer-section"><h3>Groups</h3><div class="tag-list">${p.tags.map((tag) => `<span class="tag">${esc(tag)}</span>`).join('')} ${button('+ Add group', 'ghost', 'toast', 'Group editing is mock-only')}</div></section><section class="drawer-section"><h3>Activity timeline</h3><div class="timeline">${activityEvents().map((e) => eventMarkup(e)).join('')}</div></section></div></aside></div>`;
  }

  function composer(id) {
    const p = state.prospects.find((x) => x.id === Number(id));
    if (!p) return '';
    return `<div class="modal-backdrop" data-action="close-composer"><section class="compose-box" role="dialog" aria-modal="true" aria-labelledby="composer-title"><div class="card-head"><div><h2 id="composer-title">Compose next message</h2><p>To ${esc(p.name)} · ${esc(p.handle)}</p></div>${iconButton('×', 'close-composer', 'Close composer')}</div><div class="card-body"><div class="inline-actions">${pill('Follow-up 2', 'violet')} ${pill('Variant 2 of 3', 'slate')}</div><div class="field"><label for="message-text">Message preview</label><textarea id="message-text" class="textarea">Hiya ${esc(p.name.split(' ')[0])}, hope you’re well. Just following up in case my previous message got buried. Happy to send over a few relevant examples whenever suits.</textarea></div><div class="inline-actions" style="justify-content:flex-end">${button('Copy only', '', 'toast', 'Copied mock message')} ${button('Copy & mark sent', 'primary', 'mark-sent', p.id)}</div><p class="muted" style="font-size:11px;margin:0">Mock only · no clipboard, Instagram, or activity API is connected.</p></div></section></div>`;
  }

  function render() {
    let content;
    if (state.view === 'dashboard') content = dashboard();
    else if (state.view === 'today') content = today();
    else if (state.view === 'pipeline') content = pipeline();
    else if (state.view === 'messages') content = messages();
    else if (state.view === 'insights') content = insights();
    else if (state.view === 'settings') content = simpleView('Settings', 'Appearance and workspace controls for the prototype.');
    else if (state.view === 'kpis') content = simpleView('KPIs', 'Track the numbers that keep outreach consistent.');
    else if (state.view === 'checklist') content = simpleView('Standard', 'Define what a winning day looks like.');
    else content = simpleView('Automations', 'Rules are intentionally disabled in this prototype.');
    shell(content);
  }

  function showToast(message) { state.toast = message; render(); setTimeout(() => { state.toast = ''; render(); }, 1800); }
  function bind() {
    app.querySelectorAll('[data-action]').forEach((element) => {
      const action = element.dataset.action;
      if (action === 'preview-state') element.addEventListener('change', () => { state.preview = element.value; render(); });
      else if (action === 'navigate') element.addEventListener('click', () => { state.view = element.dataset.view; state.preview = 'ready'; render(); });
      else if (action === 'navigate-today') element.addEventListener('click', () => { state.view = 'today'; render(); });
      else if (action === 'navigate-pipeline') element.addEventListener('click', () => { state.view = 'pipeline'; render(); });
      else if (action === 'open-drawer') element.addEventListener('click', (event) => { if (event.target.closest('button') && !element.dataset.id) return; state.drawer = element.dataset.id; render(); });
      else if (action === 'close-drawer') element.addEventListener('click', (event) => { if (event.target === element || element.tagName === 'BUTTON') { state.drawer = null; render(); } });
      else if (action === 'compose') element.addEventListener('click', (event) => { event.stopPropagation(); state.composer = element.dataset.id; state.drawer = null; render(); });
      else if (action === 'close-composer') element.addEventListener('click', (event) => { if (event.target === element || element.tagName === 'BUTTON') { state.composer = null; render(); } });
      else if (action === 'mark-sent') element.addEventListener('click', () => { state.composer = null; showToast('Mock send recorded · no real message sent'); });
      else if (action === 'toggle-theme') element.addEventListener('click', () => { state.theme = state.theme === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = state.theme; localStorage.setItem('barbon-prototype-theme', state.theme); render(); });
      else if (action === 'focus-search') element.addEventListener('click', () => { state.view = 'pipeline'; render(); setTimeout(() => document.getElementById('pipeline-search')?.focus(), 0); });
      else if (action === 'new-prospect') element.addEventListener('click', () => showToast('New prospect form is mock-only in this prototype'));
      else if (action === 'workspace-menu') element.addEventListener('click', () => { state.selectedWorkspace = state.selectedWorkspace === 'Barbon Photography' ? 'SA Management' : 'Barbon Photography'; showToast(`Switched to mock workspace: ${state.selectedWorkspace}`); });
      else if (action === 'shortcuts') element.addEventListener('click', () => showToast('J / K moves through Today · Enter opens · S snoozes'));
      else if (action === 'toast') element.addEventListener('click', () => showToast(element.dataset.id || 'Mock action complete'));
      else if (action === 'preview') element.addEventListener('click', () => { state.preview = element.dataset.id; render(); });
    });
    const search = document.getElementById('pipeline-search');
    if (search) search.addEventListener('input', () => { state.query = search.value; render(); setTimeout(() => { const input = document.getElementById('pipeline-search'); input?.focus(); input?.setSelectionRange(state.query.length, state.query.length); }, 0); });
  }

  document.addEventListener('keydown', (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); state.view = 'pipeline'; render(); setTimeout(() => document.getElementById('pipeline-search')?.focus(), 0); }
    if (event.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) { event.preventDefault(); state.view = 'pipeline'; render(); setTimeout(() => document.getElementById('pipeline-search')?.focus(), 0); }
    if (event.key === 'Escape') { state.drawer = null; state.composer = null; render(); }
    if (event.key.toLowerCase() === 'n' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) showToast('New prospect form is mock-only in this prototype');
  });

  render();
})();
