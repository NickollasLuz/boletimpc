const DB_NAME='InventarioTI', DB_VERSION=1;
const seedSections=[
  {name:'SERVIÇO SOCIAL GAP-BE', pcs:[
    ['POSITIVO','MASTER','1915831','', 'I3 6100','16 GB','WIN10 PRO'],
    ['DELL','9020','','72646994378','I5 4590','16 GB','WIN10 PRO'],
    ['DELL','OPTIPLEX 9020','1689383','','I5-4G','8 GB','WIN10 PRO'],
    ['DELL','OPTIPLEX 3050','1907600','','I3-7G','4 GB','WIN10 PRO'],
    ['VINIK','','','','I3-4G','8 GB','WIN10 PRO'],
    ['POSITIVO','MASTER','1915831','','I3 6100','16 GB','WIN10 PRO'],
    ['DELL','9020','','72646994378','I5 4590','16 GB','WIN11 PRO']
  ]},
  {name:'VICE CHEFIA GAP-BE', pcs:[
    ['DATEN','','2466540','','RYZEN 3 PRO 5355GE 3.60 GHz','8 GB','WIN11 PRO'],
    ['DELL','7050','2127639','','I5-7G','8 GB','WIN11 PRO'],
    ['DATEN','','2466540','','RYZEN 3 PRO 5355GE 3.60 GHz','8 GB','WIN11 PRO']
  ]},
  {name:'ACESSORIA DE PLANEJAMENTO E GOVERNANÇA', pcs:[
    ['POSITIVO','','1915836','','I3 6100','8 GB','WINDOWS 10'],
    ['DELL','OPTIPLEX 9020','1861024','','I3 7100','12 GB','WIN11'],
    ['DELL','OPTIPLEX 790','1338621','','I3 2120','8 GB','WIN 10']
  ]},
  {name:'DIVISÃO DE OBTENÇÃO DE CONTRATOS - DOC', pcs:[
    ['DELL','OPTIPLEX **','','','','8 GB','WIN10 PRO'],
    ['DATEN','','2471441','','AMD RYZEN 3 PRO','8 GB','WIN11 PRO'],
    ['DELL','OPTIPLEX 7010','','7105NZ1','I3-3G','4 GB','WIN10 PRO'],
    ['DATEN','','2471426','','AMD RYZEN 3 PRO','8 GB','WIN11 PRO'],
    ['DATEN','','2471424','','AMD RYZEN 3 PRO','8 GB','WIN11 PRO'],
    ['DATEN','','2471442','','AMD RYZEN 3 PRO','8 GB','WIN11 PRO'],
    ['DATEN','','2471435','','AMD RYZEN 3 PRO','8 GB','WIN11 PRO'],
    ['DATEN','','2471440','','AMD RYZEN 3 PRO','8 GB','WIN11 PRO'],
    ['DATEN','','2471443','','AMD RYZEN 3 PRO','8 GB','WIN11 PRO'],
    ['DATEN','','2471434','','AMD RYZEN 3 PRO','8 GB','WIN11 PRO'],
    ['THINKCENTRE','','2127640','','I3-9G','4 GB','WIN10 PRO']
  ]},
  {name:'DRH2', pcs:[
    ['DELL','OPTIPLEX 7010','1797612','','I3-3G','8 GB','WIN10 PRO'],
    ['DATEN','','2466541','','AMD RYZEN 3 PRO','8 GB','WIN11 PRO'],
    ['DELL','OPTIPLEX 9020','','JB57M22','I5-4G','8 GB','WIN10 PRO'],
    ['DELL','OPTIPLEX 3040','','GZYPLG2','I3-6G','8 GB','WIN10 PRO'],
    ['DATEN','','2466500','','AMD RYZEN 3 PRO','8 GB','WIN11 PRO'],
    ['DATEN','','2466501','','AMD RYZEN 3 PRO','8 GB','WIN11 PRO'],
    ['HP','COMPAQ','1330085','','I5-3G','8 GB','WIN10 PRO'],
    ['DATEN','','2466543','','AMD RYZEN 3 PRO','8 GB','WIN11 PRO'],
    ['DELL','OPTIPLEX 3040','1791613','','I3 3.70 GHz','4 GB','WIN11 PRO']
  ]}
].map(s=>({...s,id:crypto.randomUUID()}));

function req(store, mode='readonly'){return new Promise((resolve,reject)=>{const r=store.transaction(DB_NAME,mode).objectStore(store).getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
let db;
function openDb(){return new Promise((resolve,reject)=>{const r=indexedDB.open(DB_NAME,DB_VERSION);r.onupgradeneeded=e=>{const d=e.target.result;if(!d.objectStoreNames.contains('sections'))d.createObjectStore('sections',{keyPath:'id'});if(!d.objectStoreNames.contains('pcs')){const s=d.createObjectStore('pcs',{keyPath:'id'});s.createIndex('sectionId','sectionId')}};r.onsuccess=()=>{db=r.result;resolve()};r.onerror=()=>reject(r.error)})}
function tx(store,mode='readonly'){return db.transaction(store,mode).objectStore(store)}
function put(store,obj){return new Promise((res,rej)=>{const r=tx(store,'readwrite').put(obj);r.onsuccess=()=>res(obj);r.onerror=()=>rej(r.error)})}
function del(store,id){return new Promise((res,rej)=>{const r=tx(store,'readwrite').delete(id);r.onsuccess=()=>res();r.onerror=()=>rej(r.error)})}
async function all(store){return new Promise((res,rej)=>{const r=tx(store).getAll();r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
async function seed(){const sections=await all('sections');if(sections.length)return;for(const s of seedSections){await put('sections',{id:s.id,name:s.name,createdAt:new Date().toISOString()});for(const p of s.pcs){await put('pcs',makePc(s.id,p))}}}
function makePc(sectionId,p=[]){return{id:crypto.randomUUID(),sectionId,manufacturer:p[0]||'',model:p[1]||'',bmp:p[2]||'',serial:p[3]||'',cpu:p[4]||'',ram:p[5]||'',os:p[6]||'',user:'',hostname:'',ip:'',mac:'',disk:'',monitor:'',notes:'',updatedAt:new Date().toISOString()}}
let state={route:'home',sectionId:null,pcId:null,search:''};
const app=document.getElementById('app'), title=document.getElementById('pageTitle');
function esc(s=''){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]))}
function fmt(v){return v?esc(v):'<span class="muted">Não informado</span>'}
function setTitle(t){title.textContent=t}
function toast(m){const t=document.getElementById('toast');t.textContent=m;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2200)}
async function renderHome(){state.route='home';state.sectionId=null;setTitle('Seções');const [sections,pcs]=await Promise.all([all('sections'),all('pcs')]);
 app.innerHTML=`<div class="toolbar"><input class="input search" id="globalSearch" placeholder="Pesquisar seção..." value="${esc(state.search)}"><button class="btn btn-primary" onclick="newSection()">+ Seção</button></div><div class="stats"><div class="stat"><b>${sections.length}</b><span>Seções</span></div><div class="stat"><b>${pcs.length}</b><span>Computadores</span></div><div class="stat"><b>${pcs.filter(p=>/WIN11|WINDOWS 11/i.test(p.os)).length}</b><span>Windows 11</span></div><div class="stat"><b>${pcs.filter(p=>/WIN ?10|WINDOWS 10/i.test(p.os)).length}</b><span>Windows 10</span></div></div><div class="section-grid" id="sectionGrid"></div>`;
 const grid=document.getElementById('sectionGrid');const q=state.search.toLowerCase();for(const s of sections.filter(x=>x.name.toLowerCase().includes(q))){const count=pcs.filter(p=>p.sectionId===s.id).length;grid.insertAdjacentHTML('beforeend',`<button class="section-card" onclick="openSection('${s.id}')"><div class="section-card-main"><h2>${esc(s.name)}</h2><div class="count">${count} computador${count===1?'':'es'}</div></div><div class="arrow">›</div></button>`)}
 document.getElementById('globalSearch').oninput=e=>{state.search=e.target.value;renderHome()}
}
async function openSection(id){state.route='section';state.sectionId=id;await renderSection()}
async function renderSection(){const [sections,pcs]=await Promise.all([all('sections'),all('pcs')]);const s=sections.find(x=>x.id===state.sectionId);if(!s)return renderHome();setTitle(s.name);const list=pcs.filter(p=>p.sectionId===s.id).filter(p=>{const q=state.search.toLowerCase();return !q||[p.manufacturer,p.model,p.bmp,p.serial,p.cpu,p.os,p.user,p.hostname].join(' ').toLowerCase().includes(q)});
 app.innerHTML=`<div class="toolbar"><button class="btn btn-secondary" onclick="renderHome()">← Seções</button><button class="btn btn-primary" onclick="newPc('${s.id}')">+ Adicionar PC</button><button class="btn btn-ghost" onclick="showReport('${s.id}')">Boletim</button></div><div class="toolbar"><input class="input search" id="sectionSearch" placeholder="Pesquisar nesta seção..." value="${esc(state.search)}"></div><div class="stats"><div class="stat"><b>${list.length}</b><span>PCs exibidos</span></div><div class="stat"><b>${pcs.filter(p=>p.sectionId===s.id&&/WIN11|WINDOWS 11/i.test(p.os)).length}</b><span>Windows 11</span></div><div class="stat"><b>${pcs.filter(p=>p.sectionId===s.id&&/WIN ?10|WINDOWS 10/i.test(p.os)).length}</b><span>Windows 10</span></div><div class="stat"><b>${new Set(pcs.filter(p=>p.sectionId===s.id).map(p=>p.manufacturer).filter(Boolean)).size}</b><span>Fabricantes</span></div></div><div class="pc-list">${list.length?list.map(pcCard).join(''):'<div class="empty">Nenhum computador encontrado nesta seção.</div>'}</div>`;
 document.getElementById('sectionSearch').oninput=e=>{state.search=e.target.value;renderSection()}
}
function pcCard(p){const name=[p.manufacturer,p.model].filter(Boolean).join(' ')||'Computador sem modelo';return `<article class="pc-card"><div class="pc-head"><div><h3 class="pc-title">${esc(name)}</h3><div class="pc-meta">BMP: ${fmt(p.bmp)} · Serial: ${fmt(p.serial)}</div></div><span class="chip">${fmt(p.os)}</span></div><div class="pc-grid"><div class="kv"><b>Processador</b><span>${fmt(p.cpu)}</span></div><div class="kv"><b>RAM</b><span>${fmt(p.ram)}</span></div><div class="kv"><b>Usuário</b><span>${fmt(p.user)}</span></div><div class="kv"><b>Hostname</b><span>${fmt(p.hostname)}</span></div></div><div class="actions"><button class="btn btn-secondary" onclick="editPc('${p.id}')">Editar</button><button class="btn btn-danger" onclick="deletePc('${p.id}')">Excluir</button></div></article>`}
async function newPc(sectionId){state.route='form';state.sectionId=sectionId;state.pcId=null;state.search='';await renderForm()}
async function editPc(id){state.route='form';state.pcId=id;state.search='';await renderForm()}
async function renderForm(){const [sections,pcs]=await Promise.all([all('sections'),all('pcs')]);const p=state.pcId?pcs.find(x=>x.id===state.pcId):null;const sectionId=p?.sectionId||state.sectionId;setTitle(p?'Editar computador':'Novo computador');app.innerHTML=`<form class="form" id="pcForm"><div class="toolbar"><button type="button" class="btn btn-secondary" onclick="openSection('${sectionId}')">← Voltar</button><button class="btn btn-primary" type="submit">Salvar</button></div><div class="field"><label>Seção *</label><select id="sectionId" required>${sections.map(s=>`<option value="${s.id}" ${s.id===sectionId?'selected':''}>${esc(s.name)}</option>`).join('')}</select></div><div class="section-title">Identificação</div><div class="form-grid"><div class="field"><label>Fabricante</label><input class="input" name="manufacturer" value="${esc(p?.manufacturer||'')}"></div><div class="field"><label>Modelo</label><input class="input" name="model" value="${esc(p?.model||'')}"></div><div class="field"><label>BMP</label><input class="input" name="bmp" value="${esc(p?.bmp||'')}"></div><div class="field"><label>Serial</label><input class="input" name="serial" value="${esc(p?.serial||'')}"></div></div><div class="section-title">Configuração</div><div class="form-grid"><div class="field"><label>Processador</label><input class="input" name="cpu" value="${esc(p?.cpu||'')}"></div><div class="field"><label>RAM</label><input class="input" name="ram" value="${esc(p?.ram||'')}"></div><div class="field"><label>Sistema operacional</label><input class="input" name="os" value="${esc(p?.os||'')}"></div><div class="field"><label>Disco</label><input class="input" name="disk" value="${esc(p?.disk||'')}"></div></div><div class="section-title">Rede e responsável</div><div class="form-grid"><div class="field"><label>Usuário</label><input class="input" name="user" value="${esc(p?.user||'')}"></div><div class="field"><label>Hostname</label><input class="input" name="hostname" value="${esc(p?.hostname||'')}"></div><div class="field"><label>IP</label><input class="input" name="ip" value="${esc(p?.ip||'')}"></div><div class="field"><label>MAC</label><input class="input" name="mac" value="${esc(p?.mac||'')}"></div></div><div class="field"><label>Monitor / periféricos</label><input class="input" name="monitor" value="${esc(p?.monitor||'')}"></div><div class="field"><label>Observações</label><textarea name="notes" rows="4">${esc(p?.notes||'')}</textarea></div><div class="hint">Os campos do documento original que não tinham informação ficam em branco para você completar posteriormente.</div></form>`;
 document.getElementById('pcForm').onsubmit=async e=>{e.preventDefault();const fd=new FormData(e.target);const obj=Object.fromEntries(fd.entries());const data={...(p||makePc(sectionId)),...obj,sectionId:document.getElementById('sectionId').value,updatedAt:new Date().toISOString()};await put('pcs',data);toast('Computador salvo.');openSection(data.sectionId)}
}
async function deletePc(id){const pcs=await all('pcs');const p=pcs.find(x=>x.id===id);if(!confirm('Excluir este computador?'))return;await del('pcs',id);toast('Computador excluído.');openSection(p.sectionId)}
async function newSection(){const name=prompt('Nome da nova seção:');if(!name?.trim())return;const s={id:crypto.randomUUID(),name:name.trim(),createdAt:new Date().toISOString()};await put('sections',s);toast('Seção criada.');renderHome()}
async function showReport(sectionId){state.route='report';state.sectionId=sectionId;state.search='';const [sections,pcs]=await Promise.all([all('sections'),all('pcs')]);const s=sections.find(x=>x.id===sectionId);const list=pcs.filter(p=>p.sectionId===sectionId);setTitle('Boletim da seção');const win11=list.filter(p=>/WIN11|WINDOWS 11/i.test(p.os)).length,win10=list.filter(p=>/WIN ?10|WINDOWS 10/i.test(p.os)).length;app.innerHTML=`<div class="report-actions no-print"><button class="btn btn-secondary" onclick="openSection('${sectionId}')">← Voltar</button><button class="btn btn-primary" onclick="window.print()">🖨 Gerar / imprimir</button><button class="btn btn-ghost" onclick="shareReport('${sectionId}')">Compartilhar</button></div><div class="report-card"><h2 class="report-title">BOLETIM DE INVENTÁRIO DE COMPUTADORES</h2><div class="report-sub">Seção: <b>${esc(s.name)}</b></div><div class="report-sub">Emitido em: ${new Date().toLocaleString('pt-BR')}</div><div class="stats"><div class="stat"><b>${list.length}</b><span>Total de PCs</span></div><div class="stat"><b>${win11}</b><span>Windows 11</span></div><div class="stat"><b>${win10}</b><span>Windows 10</span></div><div class="stat"><b>${new Set(list.map(p=>p.manufacturer).filter(Boolean)).size}</b><span>Fabricantes</span></div></div><table class="report-table"><thead><tr><th>#</th><th>Fabricante/Modelo</th><th>BMP</th><th>Serial</th><th>Processador</th><th>RAM</th><th>SO</th><th>Usuário</th><th>Hostname</th></tr></thead><tbody>${list.map((p,i)=>`<tr><td>${i+1}</td><td>${fmt([p.manufacturer,p.model].filter(Boolean).join(' '))}</td><td>${fmt(p.bmp)}</td><td>${fmt(p.serial)}</td><td>${fmt(p.cpu)}</td><td>${fmt(p.ram)}</td><td>${fmt(p.os)}</td><td>${fmt(p.user)}</td><td>${fmt(p.hostname)}</td></tr>`).join('')}</tbody></table></div>`}
async function shareReport(sectionId){const sections=await all('sections');const pcs=await all('pcs');const s=sections.find(x=>x.id===sectionId),list=pcs.filter(p=>p.sectionId===sectionId);const text=`BOLETIM DE INVENTÁRIO DE COMPUTADORES\nSeção: ${s.name}\nTotal: ${list.length} PCs\n\n`+list.map((p,i)=>`${i+1}. ${[p.manufacturer,p.model].filter(Boolean).join(' ')} | BMP: ${p.bmp||'-'} | Serial: ${p.serial||'-'} | CPU: ${p.cpu||'-'} | RAM: ${p.ram||'-'} | SO: ${p.os||'-'}`).join('\n');if(navigator.share){await navigator.share({title:`Boletim - ${s.name}`,text})}else{await navigator.clipboard.writeText(text);toast('Boletim copiado para a área de transferência.')}}
async function renderBackup(){setTitle('Backup');app.innerHTML=`<div class="report-card"><h2 class="report-title">Backup dos dados</h2><p class="muted">Use estas opções para transportar o banco entre celulares ou guardar uma cópia.</p><div class="actions"><button class="btn btn-primary" onclick="exportData()">Exportar banco</button><button class="btn btn-secondary" onclick="document.getElementById('importFile').click()">Importar banco</button></div><input id="importFile" type="file" accept="application/json" hidden><div class="hint">A aplicação funciona localmente. Não depende de servidor para cadastrar e consultar os dados neste aparelho.</div></div>`;document.getElementById('importFile').onchange=importData}
async function exportData(){const data={version:1,exportedAt:new Date().toISOString(),sections:await all('sections'),pcs:await all('pcs')};const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`inventario-ti-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(a.href);toast('Backup exportado.')}
async function importData(e){const file=e.target.files[0];if(!file)return;try{const data=JSON.parse(await file.text());if(!Array.isArray(data.sections)||!Array.isArray(data.pcs))throw new Error('Formato inválido');if(!confirm('Importar substituirá os dados atuais. Continuar?'))return;for(const s of await all('sections'))await del('sections',s.id);for(const p of await all('pcs'))await del('pcs',p.id);for(const s of data.sections)await put('sections',s);for(const p of data.pcs)await put('pcs',p);toast('Backup importado.');renderHome()}catch(err){alert('Não foi possível importar este arquivo.')}}

document.querySelectorAll('.bottom-nav button').forEach(b=>{b.onclick=()=>{document.querySelectorAll('.bottom-nav button').forEach(x=>x.classList.remove('active'));b.classList.add('active');if(b.dataset.nav==='home'){state.search='';renderHome()}if(b.dataset.nav==='add'){if(state.sectionId)newPc(state.sectionId);else toast('Abra uma seção primeiro.')}if(b.dataset.nav==='backup')renderBackup()}});
document.getElementById('homeBtn').onclick=()=>{state.search='';renderHome()};
openDb().then(seed).then(renderHome);
if('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('./sw.js').catch(()=>{});
