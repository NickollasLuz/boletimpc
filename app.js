/* Inventário TI compartilhado: GitHub Pages + Supabase (Auth, Database e Realtime). */
const CONFIG = window.INVENTARIO_CONFIG || {};
const SUPABASE_URL = String(CONFIG.supabaseUrl || '').trim().replace(/\/+$/, '');
const SUPABASE_KEY = String(CONFIG.supabaseKey || '').trim();
const CONFIGURED = /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(SUPABASE_URL) &&
  /^(sb_publishable_|eyJ)/.test(SUPABASE_KEY) && !SUPABASE_KEY.includes('COLE_A_');

const app = document.getElementById('app');
const title = document.getElementById('pageTitle');
const nav = document.querySelector('.bottom-nav');
const homeBtn = document.getElementById('homeBtn');
const logoutBtn = document.getElementById('logoutBtn');
let db = null;
let liveChannel = null;
let refreshTimer = null;
let state = { route: 'home', sectionId: null, pcId: null, search: '', session: null, readyUser: null };

const fields = ['manufacturer','model','bmp','serial','cpu','ram','os','user','hostname','ip','mac','disk','monitor','notes'];
const fieldLabels = {
  manufacturer:'Fabricante', model:'Modelo', bmp:'BMP', serial:'Serial', cpu:'Processador', ram:'RAM', os:'Sistema operacional',
  user:'Usuário', hostname:'Hostname', ip:'IP', mac:'MAC', disk:'Disco', monitor:'Monitor / periféricos', notes:'Observações'
};
function esc(value='') {
  return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
}
function fmt(value) { return value ? esc(value) : '<span class="muted">Não informado</span>'; }
function setTitle(value) { title.textContent = value; document.title = `${value} — Inventário TI`; }
function toast(message) {
  const el = document.getElementById('toast');
  el.textContent = message; el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 3000);
}
function friendlyError(error) {
  const msg = String(error?.message || error || 'Erro desconhecido');
  if (/Invalid login credentials/i.test(msg)) return 'E-mail ou senha incorretos.';
  if (/Failed to fetch|NetworkError/i.test(msg)) return 'Sem conexão com o Supabase. Verifique a internet e a configuração do projeto.';
  if (/relation .* does not exist|Could not find the table/i.test(msg)) return 'As tabelas ainda não foram criadas. Execute o arquivo supabase-setup.sql no SQL Editor do Supabase.';
  if (/row-level security|permission denied|not allowed/i.test(msg)) return 'Acesso negado pelo banco. Confira as políticas de segurança do script SQL.';
  return msg;
}
function showFatal(message) {
  nav.hidden = true; logoutBtn.hidden = true; homeBtn.hidden = true; setTitle('Configuração necessária');
  app.innerHTML = `<section class="auth-panel setup-panel"><div class="auth-symbol">⚙</div><h2>Configure o banco compartilhado</h2><p>${esc(message)}</p><ol class="setup-steps"><li>Crie um projeto no <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer">Supabase</a>.</li><li>Abra <b>SQL Editor</b> e execute o arquivo <code>supabase-setup.sql</code> que acompanha esta aplicação.</li><li>Copie a URL do projeto e a chave <b>Publishable</b> (ou chave pública <code>anon</code>) para o arquivo <code>config.js</code>.</li><li>Publique todos os arquivos no GitHub Pages e crie contas para os usuários em <b>Authentication → Users</b>.</li></ol><div class="hint">Não use a chave <code>service_role</code> no site. O script SQL restringe as operações a usuários autenticados.</div><button class="btn btn-primary" onclick="location.reload()">Verificar configuração novamente</button></section>`;
}
function renderLogin(errorText='') {
  nav.hidden = true; logoutBtn.hidden = true; homeBtn.hidden = true;
  setTitle('Acesso ao inventário');
  app.innerHTML = `<section class="auth-panel"><div class="auth-symbol">▦</div><div class="eyebrow auth-eyebrow">CENTRAL DE TI</div><h2>Inventário de computadores</h2><p class="muted">Entre com a conta cadastrada no Supabase. Os dados são compartilhados entre todos os usuários autorizados.</p><form id="loginForm" class="auth-form"><div class="field"><label for="loginEmail">E-mail</label><input class="input" id="loginEmail" name="email" type="email" autocomplete="username" required placeholder="nome@instituicao.gov.br"></div><div class="field"><label for="loginPassword">Senha</label><input class="input" id="loginPassword" name="password" type="password" autocomplete="current-password" required placeholder="Sua senha"></div>${errorText ? `<div class="auth-error" role="alert">${esc(errorText)}</div>` : ''}<button class="btn btn-primary auth-submit" type="submit">Entrar no inventário</button></form><p class="auth-footnote">As contas são criadas pelo administrador no painel do Supabase.</p></section>`;
  document.getElementById('loginForm').addEventListener('submit', async e => {
    e.preventDefault(); const btn = e.target.querySelector('button[type="submit"]'); btn.disabled = true; btn.textContent = 'Entrando…';
    const fd = new FormData(e.target);
    const { error } = await db.auth.signInWithPassword({ email: fd.get('email').trim(), password: fd.get('password') });
    if (error) { renderLogin(friendlyError(error)); return; }
  });
}

function fromSection(row) { return {id:row.id, name:row.name, createdAt:row.created_at}; }
function fromPc(row) {
  const pc = {id:row.id, sectionId:row.section_id, createdAt:row.created_at, updatedAt:row.updated_at};
  for (const f of fields) pc[f] = row[f] ?? '';
  return pc;
}
function toPcRow(pc) {
  const row = { id:pc.id, section_id:pc.sectionId };
  for (const f of fields) row[f] = pc[f] ?? '';
  return row;
}
async function all(table) {
  const {data, error} = await db.from(table).select('*');
  if (error) throw error;
  if (table === 'sections') return (data || []).map(fromSection);
  if (table === 'pcs') return (data || []).map(fromPc);
  return data || [];
}
async function pcById(id) { const pcs = await all('pcs'); return pcs.find(p => p.id === id); }
function makePc(sectionId) {
  const pc = {id:crypto.randomUUID(), sectionId};
  for (const f of fields) pc[f] = '';
  return pc;
}
async function guarded(fn) {
  try { await fn(); }
  catch (error) { console.error(error); toast(friendlyError(error)); }
}

async function startWorkspace(session) {
  if (!session?.user) return;
  state.session = session;
  if (state.readyUser === session.user.id) return;
  state.readyUser = session.user.id;
  nav.hidden = false; logoutBtn.hidden = false; homeBtn.hidden = false;
  document.querySelectorAll('.bottom-nav button').forEach(b => b.classList.toggle('active', b.dataset.nav === 'home'));
  await guarded(async () => { await renderHome(); setupRealtime(); });
}
async function stopWorkspace() {
  if (liveChannel && db) { await db.removeChannel(liveChannel); liveChannel = null; }
  state = {route:'home', sectionId:null, pcId:null, search:'', session:null, readyUser:null};
  renderLogin();
}
function setupRealtime() {
  if (liveChannel) db.removeChannel(liveChannel);
  liveChannel = db.channel('inventario-ti-live')
    .on('postgres_changes', {event:'*', schema:'public', table:'sections'}, payload => onRemoteChange('sections', payload))
    .on('postgres_changes', {event:'*', schema:'public', table:'pcs'}, payload => onRemoteChange('pcs', payload))
    .on('postgres_changes', {event:'*', schema:'public', table:'pc_changes'}, payload => onRemoteChange('pc_changes', payload))
    .subscribe(status => {
      if (status === 'SUBSCRIBED') toast('Sincronização em tempo real conectada.');
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') console.warn('Realtime:', status);
    });
}
function onRemoteChange(table, payload) {
  if (payload?.eventType === 'INSERT' && table === 'pc_changes') {
    if (state.route === 'updates') guarded(renderUpdates);
    else toast('Uma atualização de computador chegou de outro usuário.');
  }
  if (state.route === 'form') { if (table === 'pcs') toast('Outro usuário alterou o inventário. Seus campos continuam abertos.'); return; }
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => guarded(refreshCurrentRoute), 220);
}
async function refreshCurrentRoute() {
  if (state.route === 'home') return renderHome();
  if (state.route === 'section') return renderSection();
  if (state.route === 'updates') return renderUpdates();
  if (state.route === 'report') return showReport(state.sectionId);
}

async function renderHome() {
  state.route = 'home'; state.sectionId = null; setTitle('Seções');
  const [sections, pcs] = await Promise.all([all('sections'), all('pcs')]);
  const win11 = pcs.filter(p => /WIN ?11|WINDOWS 11/i.test(p.os)).length;
  const win10 = pcs.filter(p => /WIN ?10|WINDOWS 10/i.test(p.os)).length;
  app.innerHTML = `<div class="toolbar"><input class="input search" id="globalSearch" placeholder="Pesquisar seção…" value="${esc(state.search)}"><button class="btn btn-primary" onclick="newSection()">+ Nova seção</button></div><div class="cloud-status"><span class="live-dot"></span> Banco compartilhado e sincronização em tempo real</div><div class="stats"><div class="stat"><b>${sections.length}</b><span>Seções</span></div><div class="stat"><b>${pcs.length}</b><span>Computadores</span></div><div class="stat"><b>${win11}</b><span>Windows 11</span></div><div class="stat"><b>${win10}</b><span>Windows 10</span></div></div><div class="section-grid" id="sectionGrid"></div>`;
  const grid = document.getElementById('sectionGrid'); const q = state.search.toLowerCase();
  const filtered = sections.filter(s => s.name.toLowerCase().includes(q));
  grid.innerHTML = filtered.map(s => {
    const count = pcs.filter(p => p.sectionId === s.id).length;
    return `<button class="section-card" data-search="${esc(s.name.toLowerCase())}" onclick="openSection('${s.id}')"><div class="section-card-main"><h2>${esc(s.name)}</h2><div class="count">${count} computador${count === 1 ? '' : 'es'}</div></div><div class="arrow">›</div></button>`;
  }).join('') || '<div class="empty">Nenhuma seção encontrada. Crie uma nova seção para começar.</div>';
  document.getElementById('globalSearch').oninput = e => {
    state.search = e.target.value; const value = state.search.toLowerCase();
    grid.querySelectorAll('.section-card').forEach(card => card.hidden = !card.dataset.search.includes(value));
  };
  setNavActive('home');
}
function setNavActive(which) { document.querySelectorAll('.bottom-nav button').forEach(b => b.classList.toggle('active', b.dataset.nav === which)); }
async function openSection(id) { state.route = 'section'; state.sectionId = id; state.search = ''; await renderSection(); }
async function renderSection() {
  const [sections, pcs] = await Promise.all([all('sections'), all('pcs')]);
  const section = sections.find(s => s.id === state.sectionId); if (!section) return renderHome();
  setTitle(section.name);
  const list = pcs.filter(p => p.sectionId === section.id);
  const win11 = list.filter(p => /WIN ?11|WINDOWS 11/i.test(p.os)).length;
  const win10 = list.filter(p => /WIN ?10|WINDOWS 10/i.test(p.os)).length;
  app.innerHTML = `<div class="toolbar"><button class="btn btn-secondary" onclick="renderHome()">← Seções</button><button class="btn btn-primary" onclick="newPc('${section.id}')">+ Adicionar PC</button><button class="btn btn-ghost" onclick="showReport('${section.id}')">Boletim</button></div><div class="toolbar"><input class="input search" id="sectionSearch" placeholder="Pesquisar nesta seção…" value="${esc(state.search)}"></div><div class="stats"><div class="stat"><b>${list.length}</b><span>Total de PCs</span></div><div class="stat"><b>${win11}</b><span>Windows 11</span></div><div class="stat"><b>${win10}</b><span>Windows 10</span></div><div class="stat"><b>${new Set(list.map(p => p.manufacturer).filter(Boolean)).size}</b><span>Fabricantes</span></div></div><div class="pc-list" id="pcList">${list.map(pcCard).join('') || '<div class="empty">Nenhum computador nesta seção.</div>'}</div>`;
  document.getElementById('sectionSearch').oninput = e => {
    state.search = e.target.value; const q = state.search.toLowerCase();
    document.querySelectorAll('#pcList .pc-card').forEach(card => card.hidden = !card.dataset.search.includes(q));
  };
  setNavActive('home');
}
function pcCard(p) {
  const name = [p.manufacturer, p.model].filter(Boolean).join(' ') || 'Computador sem modelo';
  const search = [name,p.bmp,p.serial,p.cpu,p.os,p.user,p.hostname,p.ip].join(' ').toLowerCase();
  return `<article class="pc-card" data-search="${esc(search)}"><div class="pc-head"><div><h3 class="pc-title">${esc(name)}</h3><div class="pc-meta">BMP: ${fmt(p.bmp)} · Serial: ${fmt(p.serial)}</div></div><span class="chip">${fmt(p.os)}</span></div><div class="pc-grid"><div class="kv"><b>Processador</b><span>${fmt(p.cpu)}</span></div><div class="kv"><b>RAM</b><span>${fmt(p.ram)}</span></div><div class="kv"><b>Usuário</b><span>${fmt(p.user)}</span></div><div class="kv"><b>Hostname / IP</b><span>${fmt([p.hostname,p.ip].filter(Boolean).join(' · '))}</span></div></div><div class="actions"><button class="btn btn-secondary" onclick="editPc('${p.id}')">Editar</button><button class="btn btn-danger" onclick="deletePc('${p.id}')">Excluir</button></div></article>`;
}
async function newPc(sectionId) { state.route = 'form'; state.sectionId = sectionId; state.pcId = null; state.search = ''; await renderForm(); }
async function editPc(id) { state.route = 'form'; state.pcId = id; state.search = ''; await renderForm(); }
async function renderForm() {
  const [sections, pcs] = await Promise.all([all('sections'), all('pcs')]);
  const p = state.pcId ? pcs.find(x => x.id === state.pcId) : null;
  const sectionId = p?.sectionId || state.sectionId || sections[0]?.id;
  setTitle(p ? 'Editar computador' : 'Novo computador');
  if (!sections.length) { app.innerHTML = '<div class="empty">Crie uma seção antes de cadastrar computadores.</div><button class="btn btn-primary" onclick="newSection()">+ Nova seção</button>'; return; }
  app.innerHTML = `<form class="form" id="pcForm"><div class="toolbar"><button type="button" class="btn btn-secondary" onclick="openSection('${sectionId}')">← Voltar</button><button class="btn btn-primary" type="submit">Salvar alterações</button></div><div class="field"><label for="sectionId">Seção *</label><select id="sectionId" name="sectionId" required>${sections.map(s => `<option value="${s.id}" ${s.id === sectionId ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></div><div class="section-title">Identificação</div><div class="form-grid">${formField('manufacturer','Fabricante',p)}${formField('model','Modelo',p)}${formField('bmp','BMP / patrimônio',p)}${formField('serial','Número de série',p)}</div><div class="section-title">Configuração</div><div class="form-grid">${formField('cpu','Processador',p)}${formField('ram','Memória RAM',p)}${formField('os','Sistema operacional',p)}${formField('disk','Disco',p)}</div><div class="section-title">Rede e responsável</div><div class="form-grid">${formField('user','Usuário responsável',p)}${formField('hostname','Hostname',p)}${formField('ip','Endereço IP',p)}${formField('mac','Endereço MAC',p)}</div>${formField('monitor','Monitor / periféricos',p)}<div class="field"><label for="notes">Observações</label><textarea id="notes" name="notes" rows="4">${esc(p?.notes || '')}</textarea></div><div class="hint">Ao salvar, a alteração será gravada no banco central e aparecerá para os outros usuários conectados. O histórico registrará quem realizou a operação.</div></form>`;
  document.getElementById('pcForm').onsubmit = async e => {
    e.preventDefault(); const button = e.target.querySelector('button[type="submit"]'); button.disabled = true;
    try {
      const fd = new FormData(e.target); const obj = Object.fromEntries(fd.entries());
      const data = {...(p || makePc(sectionId)), ...obj, sectionId:document.getElementById('sectionId').value};
      const query = p ? db.from('pcs').update(toPcRow(data)).eq('id', p.id) : db.from('pcs').insert(toPcRow(data));
      const {error} = await query; if (error) throw error;
      toast(p ? 'Computador atualizado para todos os usuários.' : 'Computador cadastrado no banco compartilhado.');
      await openSection(data.sectionId);
    } catch (error) { console.error(error); toast(friendlyError(error)); button.disabled = false; }
  };
}
function formField(name, label, p) { return `<div class="field"><label for="${name}">${esc(label)}</label><input class="input" id="${name}" name="${name}" value="${esc(p?.[name] || '')}"></div>`; }
async function deletePc(id) {
  const p = await pcById(id); if (!p) return;
  if (!confirm('Excluir este computador do inventário compartilhado? A exclusão aparecerá no histórico para todos os usuários.')) return;
  await guarded(async () => { const {error} = await db.from('pcs').delete().eq('id', id); if (error) throw error; toast('Computador excluído do inventário compartilhado.'); await openSection(p.sectionId); });
}
async function newSection() {
  const name = prompt('Nome da nova seção:'); if (!name?.trim()) return;
  await guarded(async () => { const {error} = await db.from('sections').insert({name:name.trim()}); if (error) throw error; state.search = ''; toast('Seção criada para todos os usuários.'); await renderHome(); });
}

async function renderUpdates() {
  state.route = 'updates'; state.pcId = null; setTitle('Atualizações de PCs');
  const {data, error} = await db.from('pc_changes').select('*').order('changed_at', {ascending:false}).limit(150);
  if (error) throw error;
  app.innerHTML = `<div class="updates-intro"><div><h2>Histórico de alterações</h2><p class="muted">Novos cadastros, edições e exclusões realizadas por qualquer usuário autorizado.</p></div><button class="btn btn-ghost" onclick="renderUpdates()">Atualizar</button></div><div class="updates-summary"><span class="live-dot"></span> Sincronizado em tempo real · ${data.length} registro(s) recentes</div><div class="updates-list">${data.map(updateCard).join('') || '<div class="empty">Ainda não há atualizações registradas.</div>'}</div>`;
  setNavActive('updates');
}
function updateCard(item) {
  const action = String(item.action || '').toUpperCase();
  const label = action === 'INSERT' ? 'Novo PC' : action === 'UPDATE' ? 'PC atualizado' : action === 'DELETE' ? 'PC excluído' : action;
  const cls = action === 'INSERT' ? 'created' : action === 'DELETE' ? 'deleted' : 'edited';
  const date = item.changed_at ? new Date(item.changed_at).toLocaleString('pt-BR') : 'Data indisponível';
  let details = String(item.details || 'Alteração registrada no inventário.');
  details = details.replace(/^Campos alterados: (.+)\.$/, (_, list) => 'Campos alterados: ' + list.split(', ').map(key => fieldLabels[key] || key).join(', ') + '.');
  return `<article class="update-card"><div class="update-icon ${cls}">${action === 'INSERT' ? '+' : action === 'DELETE' ? '−' : '↻'}</div><div class="update-content"><div class="update-card-head"><span class="update-action ${cls}">${label}</span><time>${esc(date)}</time></div><h3>${esc(item.pc_label || 'Computador sem identificação')}</h3><p class="update-section">${esc(item.section_name || 'Seção não informada')}</p><p class="update-details">${esc(details)}</p><div class="update-by">Alterado por: <b>${esc(item.changed_by || 'Usuário não identificado')}</b></div></div></article>`;
}

async function showReport(sectionId) {
  state.route = 'report'; state.sectionId = sectionId; state.search = '';
  const [sections, pcs] = await Promise.all([all('sections'), all('pcs')]);
  const section = sections.find(s => s.id === sectionId); if (!section) return renderHome();
  const list = pcs.filter(p => p.sectionId === sectionId);
  const win11 = list.filter(p => /WIN ?11|WINDOWS 11/i.test(p.os)).length;
  const win10 = list.filter(p => /WIN ?10|WINDOWS 10/i.test(p.os)).length;
  setTitle('Boletim da seção');
  app.innerHTML = `<div class="report-actions no-print"><button class="btn btn-secondary" onclick="openSection('${sectionId}')">← Voltar</button><button class="btn btn-primary" onclick="window.print()">🖨 Gerar / imprimir</button><button class="btn btn-ghost" onclick="shareReport('${sectionId}')">Compartilhar</button></div><div class="report-card"><h2 class="report-title">BOLETIM DE INVENTÁRIO DE COMPUTADORES</h2><div class="report-sub">Seção: <b>${esc(section.name)}</b></div><div class="report-sub">Emitido em: ${new Date().toLocaleString('pt-BR')}</div><div class="stats"><div class="stat"><b>${list.length}</b><span>Total de PCs</span></div><div class="stat"><b>${win11}</b><span>Windows 11</span></div><div class="stat"><b>${win10}</b><span>Windows 10</span></div><div class="stat"><b>${new Set(list.map(p => p.manufacturer).filter(Boolean)).size}</b><span>Fabricantes</span></div></div><table class="report-table"><thead><tr><th>#</th><th>Fabricante / Modelo</th><th>BMP</th><th>Serial</th><th>Processador</th><th>RAM</th><th>SO</th><th>Usuário</th><th>Hostname</th><th>IP</th></tr></thead><tbody>${list.map((p,i) => `<tr><td>${i+1}</td><td>${fmt([p.manufacturer,p.model].filter(Boolean).join(' '))}</td><td>${fmt(p.bmp)}</td><td>${fmt(p.serial)}</td><td>${fmt(p.cpu)}</td><td>${fmt(p.ram)}</td><td>${fmt(p.os)}</td><td>${fmt(p.user)}</td><td>${fmt(p.hostname)}</td><td>${fmt(p.ip)}</td></tr>`).join('')}</tbody></table></div>`;
}
async function shareReport(sectionId) {
  await guarded(async () => {
    const [sections, pcs] = await Promise.all([all('sections'), all('pcs')]);
    const section = sections.find(s => s.id === sectionId), list = pcs.filter(p => p.sectionId === sectionId);
    const text = `BOLETIM DE INVENTÁRIO DE COMPUTADORES\nSeção: ${section.name}\nTotal: ${list.length} PCs\n\n` + list.map((p,i) => `${i+1}. ${[p.manufacturer,p.model].filter(Boolean).join(' ')} | BMP: ${p.bmp||'-'} | Serial: ${p.serial||'-'} | CPU: ${p.cpu||'-'} | RAM: ${p.ram||'-'} | SO: ${p.os||'-'} | Usuário: ${p.user||'-'} | Hostname: ${p.hostname||'-'} | IP: ${p.ip||'-'}`).join('\n');
    if (navigator.share) await navigator.share({title:`Boletim - ${section.name}`, text});
    else { await navigator.clipboard.writeText(text); toast('Boletim copiado para a área de transferência.'); }
  });
}

async function renderBackup() {
  state.route = 'backup'; setTitle('Backup'); setNavActive('backup');
  app.innerHTML = `<div class="report-card"><h2 class="report-title">Backup do inventário compartilhado</h2><p class="muted">O backup exporta os dados atuais do banco central. A restauração substitui o inventário de todos os usuários; use com cuidado.</p><div class="actions backup-actions"><button class="btn btn-primary" onclick="exportData()">Exportar banco (JSON)</button><button class="btn btn-secondary" onclick="document.getElementById('importFile').click()">Restaurar backup</button></div><input id="importFile" type="file" accept="application/json" hidden><div class="hint"><b>Importante:</b> restauração afeta o inventário compartilhado inteiro. Faça uma exportação antes de restaurar.</div><div class="section-title">Conta conectada</div><p>${esc(state.session?.user?.email || 'Usuário autenticado')}</p><button class="btn btn-ghost" onclick="logout()">Sair da conta</button></div>`;
  document.getElementById('importFile').onchange = importData;
}
async function exportData() {
  await guarded(async () => {
    const data = {version:2, exportedAt:new Date().toISOString(), sections:await all('sections'), pcs:await all('pcs')};
    const blob = new Blob([JSON.stringify(data,null,2)], {type:'application/json'}); const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `inventario-ti-${new Date().toISOString().slice(0,10)}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000); toast('Backup exportado.');
  });
}
async function importData(event) {
  const file = event.target.files?.[0]; if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (!Array.isArray(data.sections) || !Array.isArray(data.pcs)) throw new Error('Formato de backup inválido.');
    if (!confirm('ATENÇÃO: isto substituirá o inventário compartilhado para TODOS os usuários. Tem certeza?')) return;
    const delPcs = await db.from('pcs').delete().not('id','is',null); if (delPcs.error) throw delPcs.error;
    const delSections = await db.from('sections').delete().not('id','is',null); if (delSections.error) throw delSections.error;
    for (const s of data.sections) {
      const row = {name:String(s.name || '').trim()}; if (s.id) row.id = s.id;
      const result = await db.from('sections').insert(row); if (result.error) throw result.error;
    }
    for (const p of data.pcs) {
      if (!p.sectionId) continue;
      const row = toPcRow(p); if (p.id) row.id = p.id; else delete row.id;
      const result = await db.from('pcs').insert(row); if (result.error) throw result.error;
    }
    toast('Backup restaurado no banco compartilhado.'); await renderHome();
  } catch (error) { console.error(error); alert(`Não foi possível restaurar o backup: ${friendlyError(error)}`); }
  finally { event.target.value = ''; }
}
async function logout() { await guarded(async () => { const {error} = await db.auth.signOut(); if (error) throw error; }); }

nav.querySelectorAll('button').forEach(button => {
  button.addEventListener('click', () => {
    const which = button.dataset.nav; setNavActive(which);
    if (which === 'home') { state.search = ''; guarded(renderHome); }
    if (which === 'updates') guarded(renderUpdates);
    if (which === 'add') {
      guarded(async () => {
        const sections = await all('sections');
        if (state.sectionId && sections.some(s => s.id === state.sectionId)) await newPc(state.sectionId);
        else if (sections.length === 1) await newPc(sections[0].id);
        else { state.search = ''; await renderHome(); toast('Selecione uma seção antes de adicionar o PC.'); }
      });
    }
    if (which === 'backup') guarded(renderBackup);
  });
});
homeBtn.addEventListener('click', () => guarded(renderHome));
logoutBtn.addEventListener('click', logout);

async function init() {
  if (!CONFIGURED) { showFatal('O endereço e a chave do Supabase ainda não foram preenchidos no arquivo config.js.'); return; }
  if (!window.supabase?.createClient) { showFatal('Não foi possível carregar a biblioteca do Supabase. Verifique a conexão com a internet e recarregue o site.'); return; }
  db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  db.auth.onAuthStateChange((event, session) => {
    if (session) { state.session = session; setTimeout(() => startWorkspace(session).catch(error => { console.error(error); toast(friendlyError(error)); }), 0); }
    else if (event === 'SIGNED_OUT' || event === 'INITIAL_SESSION') setTimeout(() => stopWorkspace(), 0);
  });
  const {data, error} = await db.auth.getSession();
  if (error) { renderLogin(friendlyError(error)); return; }
  if (data.session) await startWorkspace(data.session); else renderLogin();
}

init().catch(error => { console.error(error); showFatal(friendlyError(error)); });

if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) navigator.serviceWorker.register('./sw.js').catch(error => console.warn('Service worker:', error));
