const API = 'https://otavio-portfolio-auth.otaviopr.workers.dev';
const CONTENT_URL = '../content/site.json';
const clone = value => JSON.parse(JSON.stringify(value));
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
let db, language = 'en', activeProject = null, activeView = 'home', dirty = false;

function translations(item) { return item.translations[language] || item.translations.en; }
function markDirty() { dirty = true; $('#save-status').textContent = 'Changes not published'; }
function fallbackTranslation(template) { return clone(template || { title:'', tools:'', roles:'', intro:'', sections:[] }); }
function renderLanguages() {
  const codes = Object.keys(db.translations);
  $$('[data-language-bar]').forEach(bar => bar.innerHTML = codes.map(code => `<button class="language-tab ${code === language ? 'active' : ''}" data-lang="${code}">${code === 'pt' ? 'Português' : code === 'en' ? 'English' : code.toUpperCase()}<small>${code.toUpperCase()}</small></button>`).join(''));
  $$('[data-lang]').forEach(button => button.onclick = () => { language = button.dataset.lang; render(); });
}
function imagePreview(field, value) {
  const root = $(`[data-image-field="${field}"]`); if (!root) return;
  $('.image-preview img', root).src = value || '';
  $('.image-preview', root).classList.toggle('has-image', Boolean(value));
  const input = $(`[data-image-url="${field}"]`, root); input.value = value || '';
  input.oninput = () => { if (field === 'home.banner') db.home.banner = input.value.trim(); else currentProject().banner = input.value.trim(); markDirty(); imagePreview(field, input.value.trim()); };
}
function currentProject() { return db.projects.find(project => project.slug === activeProject); }
function wireFields(scope) {
  $$('[data-field]').forEach(input => {
    const path = input.dataset.field.split('.');
    let target = scope;
    for (let i = 1; i < path.length - 1; i++) target = target[path[i]] ||= {};
    const key = path.at(-1); input.value = target[key] || '';
    input.oninput = () => { target[key] = input.value; markDirty(); };
  });
}
function renderHome() { wireFields(translations(db)); imagePreview('home.banner', db.home.banner); }
function renderProjects() {
  $('#project-count').textContent = db.projects.length;
  $('#project-list').innerHTML = db.projects.map(project => { const t = translations(project); return `<article class="project-row" data-project="${project.slug}"><div class="project-thumb">${project.banner ? `<img src="${project.banner}" alt="">` : ''}</div><div class="project-info"><strong>${escapeHtml(t.title || 'Untitled project')}</strong><span>${escapeHtml(t.tools || 'No tools added')}</span></div><span class="row-arrow">→</span></article>`; }).join('');
  $$('[data-project]').forEach(row => row.onclick = () => { activeProject = row.dataset.project; showView('project-editor'); });
}
function escapeHtml(value) { return String(value || '').replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char])); }
function sectionHtml(section, index) { return `<div class="section-item" data-section="${index}"><div class="section-top"><span class="drag">⠿</span><strong>Section ${String(index + 1).padStart(2, '0')}</strong><div class="section-actions"><button class="icon-button up" title="Move up">↑</button><button class="icon-button down" title="Move down">↓</button><button class="icon-button delete" title="Delete">×</button></div></div><div class="section-fields"><label>Blue subtitle<input data-section-field="subtitle" value="${escapeHtml(section.subtitle)}"></label><label>Section text<textarea rows="4" data-section-field="text">${escapeHtml(section.text)}</textarea></label><label>Image URL<input data-section-field="image" value="${escapeHtml(section.image)}" placeholder="Optional image URL"></label></div></div>`; }
function renderProjectEditor() {
  const project = currentProject(); if (!project) return showView('projects');
  const t = translations(project); t.sections ||= [];
  $('#project-name').textContent = t.title || 'Untitled project';
  wireFields(t); imagePreview('project.banner', project.banner);
  const list = $('#sections-list'); list.innerHTML = t.sections.map(sectionHtml).join('');
  $$('.section-item', list).forEach(item => { const index = +item.dataset.section;
    $$('[data-section-field]', item).forEach(input => input.oninput = () => { t.sections[index][input.dataset.sectionField] = input.value; markDirty(); });
    $('.delete', item).onclick = () => { t.sections.splice(index, 1); markDirty(); renderProjectEditor(); };
    $('.up', item).onclick = () => moveSection(t.sections, index, -1);
    $('.down', item).onclick = () => moveSection(t.sections, index, 1);
  });
}
function moveSection(sections, index, direction) { const next = index + direction; if (next < 0 || next >= sections.length) return; [sections[index], sections[next]] = [sections[next], sections[index]]; markDirty(); renderProjectEditor(); }
function showView(view) { activeView = view; $('#home-view').classList.toggle('hidden', view !== 'home'); $('#projects-view').classList.toggle('hidden', view !== 'projects'); $('#project-editor-view').classList.toggle('hidden', view !== 'project-editor'); $$('.nav-item[data-view]').forEach(button => button.classList.toggle('active', button.dataset.view === view || (view === 'project-editor' && button.dataset.view === 'projects'))); $('#view-label').textContent = view === 'home' ? 'Home page' : 'Projects'; render(); }
function render() { if (!db) return; renderLanguages(); if (activeView === 'home') renderHome(); if (activeView === 'projects') renderProjects(); if (activeView === 'project-editor') renderProjectEditor(); }
function toast(message) { const item = $('#toast'); item.textContent = message; item.classList.remove('hidden'); setTimeout(() => item.classList.add('hidden'), 3500); }
function openLanguages() {
  const modal = $('#language-modal'); modal.classList.remove('hidden'); const codes = Object.keys(db.translations);
  $('#language-list').innerHTML = codes.map(code => `<div class="language-row"><strong>${code === 'pt' ? 'Português' : code === 'en' ? 'English' : code.toUpperCase()}</strong><small>${code.toUpperCase()}</small><button data-remove="${code}" ${codes.length <= 1 ? 'disabled' : ''}>Remove</button></div>`).join('');
  $$('[data-remove]').forEach(button => button.onclick = () => { const code = button.dataset.remove; delete db.translations[code]; db.projects.forEach(project => delete project.translations[code]); if (language === code) language = Object.keys(db.translations)[0]; markDirty(); openLanguages(); render(); });
}
function base64(text) { const bytes = new TextEncoder().encode(text); let binary = ''; bytes.forEach(byte => binary += String.fromCharCode(byte)); return btoa(binary); }
async function publish() {
  const button = $('#publish'); button.disabled = true; button.textContent = 'Publishing…';
  try { const response = await fetch(`${API}/publish`, { method:'POST', credentials:'include', headers:{'content-type':'application/json'}, body:JSON.stringify({message:'Update portfolio content', files:[{path:'content/site.json', content:base64(JSON.stringify(db, null, 2))}]}) }); const result = await response.json(); if (!response.ok) throw new Error(result.error || 'Publishing failed.'); dirty = false; $('#save-status').textContent = 'Published — GitHub Pages will update shortly'; toast('Published successfully.'); }
  catch (error) { toast(error.message === 'Sign in required.' ? 'Please connect GitHub first.' : error.message); }
  finally { button.disabled = false; button.textContent = 'Publish changes'; }
}
async function init() {
  db = await fetch(CONTENT_URL).then(response => { if (!response.ok) throw new Error('Content file could not load.'); return response.json(); });
  if (new URLSearchParams(location.search).get('connected')) { $('#save-status').textContent = 'GitHub connected'; history.replaceState({}, '', location.pathname); toast('GitHub connected. You can now publish.'); }
  $$('.nav-item[data-view]').forEach(button => button.onclick = () => showView(button.dataset.view));
  $('#back-to-projects').onclick = () => showView('projects'); $('#new-project').onclick = () => { const seed = fallbackTranslation(translations(db.projects[0])); seed.title = 'New project'; seed.tools = ''; seed.roles = ''; seed.intro = ''; seed.sections = []; const slug = `project-${Date.now()}`; db.projects.unshift({slug, banner:'', translations:Object.fromEntries(Object.keys(db.translations).map(code => [code, clone(seed)]))}); activeProject = slug; markDirty(); showView('project-editor'); };
  $('#add-section').onclick = () => { translations(currentProject()).sections.push({subtitle:'', text:'', image:''}); markDirty(); renderProjectEditor(); };
  $('#delete-project').onclick = () => { if (confirm('Delete this project?')) { db.projects = db.projects.filter(project => project.slug !== activeProject); markDirty(); showView('projects'); } };
  $('#language-settings').onclick = openLanguages; $('.close').onclick = () => $('#language-modal').classList.add('hidden'); $('#language-modal').onclick = event => { if (event.target.id === 'language-modal') event.currentTarget.classList.add('hidden'); };
  $('#add-language').onsubmit = event => { event.preventDefault(); const [nameInput, codeInput] = event.target.querySelectorAll('input'); const code = codeInput.value.trim().toLowerCase().replace(/[^a-z-]/g, ''); if (!code || db.translations[code]) return toast('Use a new language code.'); db.translations[code] = clone(db.translations.en); db.projects.forEach(project => project.translations[code] = clone(project.translations.en)); language = code; markDirty(); event.target.reset(); openLanguages(); render(); };
  $('#download-content').onclick = () => { const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([JSON.stringify(db, null, 2)], {type:'application/json'})); link.download = 'site.json'; link.click(); URL.revokeObjectURL(link.href); };
  $('#import-content').onchange = async event => { try { db = JSON.parse(await event.target.files[0].text()); markDirty(); render(); toast('Content imported.'); } catch { toast('That is not a valid site.json file.'); } event.target.value = ''; };
  $('#connect').onclick = () => location.href = `${API}/auth/login`; $('#preview').onclick = () => window.open('../', '_blank'); $('#publish').onclick = publish;
  window.addEventListener('beforeunload', event => { if (dirty) { event.preventDefault(); event.returnValue = ''; } }); render();
}
init().catch(error => { document.body.innerHTML = `<p style="padding:40px;font-family:sans-serif">${escapeHtml(error.message)}</p>`; });
