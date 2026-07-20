(() => {
  const routes = { om:'operations-and-maintenance', mobnit:'mobnit', cm:'music-streaming-rebrand', rbt:'ringback-tone-service', tracs:'tracs', hospitality:'hospitality', assets:'open-medicine', open:'open-medicine' };
  const clean = value => String(value || '').replace(/\s+/g, ' ').trim();
  const route = () => { const path = location.pathname.toLowerCase(); for (const [key,slug] of Object.entries(routes)) { const m = path.match(new RegExp('(?:/|^)' + key + '-(en|pt)(?:/|$)')); if (m) return {slug,lang:m[1]}; } return null; };
  const setText = (node, value) => { if (!node || node.dataset.cmsValue === value) return; node.dataset.cmsValue = value; node.replaceChildren(...String(value || '').split('\n').flatMap((line,index) => index ? [document.createElement('br'), document.createTextNode(line)] : [document.createTextNode(line)])); };
  const firstMatching = (root, pattern) => [...root.querySelectorAll('span,h1,h2,h3,h4,p')].find(node => pattern.test(clean(node.textContent)) && !node.children.length);
  const updateImage = (root, previous, next) => { if (!next) return; root.querySelectorAll('img,[style*="background-image"]').forEach(node => { const value = node.src || node.style.backgroundImage || ''; if (value.includes(previous)) { if (node.tagName === 'IMG') node.src = next; else node.style.backgroundImage = `url("${next}")`; } }); };
  function home(root, site, lang) {
    const t = site.translations?.[lang] || site.translations?.en; if (!t) return;
    setText(firstMatching(root,/^PRODUCT [•·]/i),t.hero?.kicker);
    setText(firstMatching(root,/^(Hi!|Olá!)/),t.hero?.title);
    const about = firstMatching(root,/I have a great passion|Tenho grande paixão/i); if (about) setText(about,t.hero?.description);
    const aboutText = firstMatching(root,/designer with a passion|designer e tenho paixão/i); if (aboutText) setText(aboutText,t.about?.text);
    root.querySelectorAll('a').forEach(link => { if (/resume|curr[ií]culo/i.test(clean(link.textContent)) && site.links?.resume) link.href = site.links.resume; });
  }
  function project(root, site, routeInfo) {
    const project = site.projects?.find(item => item.slug === routeInfo.slug); if (!project) return;
    const t = project.translations?.[routeInfo.lang] || project.translations?.en; if (!t) return;
    const title = root.querySelector('h1 span'); setText(title,t.title);
    const description = [...root.querySelectorAll('h3 span')].find(node => clean(node.textContent).length > 80); setText(description,t.intro);
    const headings = [...root.querySelectorAll('h2 span,h3 span')].filter(node => { const text = clean(node.textContent); return text.length > 2 && text.length < 80 && !/tools|role|work|about|resume/i.test(text); });
    t.sections?.forEach((section,index) => setText(headings[index],section.subtitle));
    const bodies = [...root.querySelectorAll('h4 span')].filter(node => clean(node.textContent).length > 80);
    t.sections?.forEach((section,index) => setText(bodies[index],section.text));
    root.querySelectorAll('a').forEach(link => { if (/resume|curr[ií]culo/i.test(clean(link.textContent)) && site.links?.resume) link.href = site.links.resume; });
  }
  fetch('/content/site.json').then(response => response.ok ? response.json() : null).then(initialSite => {
    if (!initialSite) return; let site = initialSite; const info = route(); let attempts = 0;
    const apply = () => { const root = document.querySelector('#mags'); if (!root || !root.querySelector('.rmwidget')) return false; if (info) project(root,site,info); else home(root,site,location.pathname.toLowerCase().includes('/pt') ? 'pt' : 'en'); return true; };
    window.addEventListener('message', event => { if (event.origin === location.origin && event.data?.type === 'otavio-cms-preview') { site = event.data.content; apply(); } });
    const observer = new MutationObserver(() => apply()); observer.observe(document.documentElement,{childList:true,subtree:true});
    const timer = setInterval(() => { apply(); if (++attempts > 120) { clearInterval(timer); observer.disconnect(); } },250);
  }).catch(() => {});
})();
