const json = (value, status = 200, headers = {}) => new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...headers } });
const bytes = (value) => new TextEncoder().encode(value);
const base64url = (value) => btoa(String.fromCharCode(...new Uint8Array(value))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

function cors(request, env) {
  const origin = request.headers.get('Origin');
  return origin && origin === env.ADMIN_ORIGIN.replace(/\/$/, '')
    ? { 'access-control-allow-origin': origin, 'access-control-allow-credentials': 'true', 'vary': 'Origin' }
    : {};
}

function sessionId(request) {
  return request.headers.get('Cookie')?.match(/(?:^|;\s*)otavio_cms_session=([^;]+)/)?.[1];
}

async function githubAppJwt(env) {
  const key = await crypto.subtle.importKey('pkcs8', pemToArrayBuffer(env.GITHUB_APP_PRIVATE_KEY), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(bytes(JSON.stringify({ alg: 'RS256', typ: 'JWT' })));
  const payload = base64url(bytes(JSON.stringify({ iat: now - 60, exp: now + 540, iss: env.GITHUB_APP_ID })));
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, bytes(`${header}.${payload}`));
  return `${header}.${payload}.${base64url(signature)}`;
}

function pemToArrayBuffer(pem) {
  const body = pem.replace(/-----(BEGIN|END) [A-Z ]+-----/g, '').replace(/\s/g, '');
  const binary = atob(body), bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function installationToken(env, installationId) {
  const appJwt = await githubAppJwt(env);
  const response = await fetch(`https://api.github.com/app/installations/${installationId}/access_tokens`, { method: 'POST', headers: { authorization: `Bearer ${appJwt}`, accept: 'application/vnd.github+json', 'user-agent': 'otavio-portfolio-cms' } });
  if (!response.ok) throw new Error('Could not create a GitHub installation token.');
  return (await response.json()).token;
}

async function github(url, token, init = {}) {
  const response = await fetch(`https://api.github.com${url}`, { ...init, headers: { accept: 'application/vnd.github+json', authorization: `Bearer ${token}`, 'user-agent': 'otavio-portfolio-cms', ...(init.headers || {}) } });
  if (!response.ok) throw new Error(`GitHub returned ${response.status}.`);
  return response.status === 204 ? null : response.json();
}

async function publish(request, env) {
  const id = sessionId(request), session = id && await env.SESSIONS.get(`session:${id}`, 'json');
  if (!session?.installationId) return json({ error: 'Sign in required.' }, 401, cors(request, env));
  const body = await request.json();
  if (!Array.isArray(body.files) || !body.files.length) return json({ error: 'No files to publish.' }, 400, cors(request, env));
  const token = await installationToken(env, session.installationId);
  for (const file of body.files) {
    if (!/^content\/[a-zA-Z0-9_./-]+\.(json|png|jpe?g|webp)$/.test(file.path) || !file.content) throw new Error('One or more file paths are not permitted.');
    let sha;
    try { sha = (await github(`/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${file.path}?ref=${env.GITHUB_BRANCH}`, token)).sha; } catch { sha = undefined; }
    await github(`/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${file.path}`, token, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message: body.message || 'Update portfolio content', content: file.content, branch: env.GITHUB_BRANCH, ...(sha ? { sha } : {}) }) });
  }
  return json({ ok: true }, 200, cors(request, env));
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url), headers = cors(request, env);
    if (request.method === 'OPTIONS') return new Response(null, { headers: { ...headers, 'access-control-allow-methods': 'POST, OPTIONS', 'access-control-allow-headers': 'content-type' } });
    if (url.pathname === '/auth/login') {
      const state = crypto.randomUUID();
      await env.SESSIONS.put(`state:${state}`, '1', { expirationTtl: 600 });
      const login = new URL('https://github.com/login/oauth/authorize');
      login.searchParams.set('client_id', env.GITHUB_CLIENT_ID); login.searchParams.set('redirect_uri', `${url.origin}/auth/callback`); login.searchParams.set('state', state);
      return Response.redirect(login.toString(), 302);
    }
    if (url.pathname === '/auth/callback') {
      const state = url.searchParams.get('state'), code = url.searchParams.get('code');
      if (!state || !code || !(await env.SESSIONS.get(`state:${state}`))) return new Response('Invalid or expired sign-in request.', { status: 400 });
      await env.SESSIONS.delete(`state:${state}`);
      const tokenResponse = await fetch('https://github.com/login/oauth/access_token', { method: 'POST', headers: { accept: 'application/json', 'content-type': 'application/json' }, body: JSON.stringify({ client_id: env.GITHUB_CLIENT_ID, client_secret: env.GITHUB_CLIENT_SECRET, code }) });
      const userToken = (await tokenResponse.json()).access_token;
      if (!userToken) return new Response('GitHub authorization failed.', { status: 401 });
      const installations = await github('/user/installations', userToken);
      const installation = installations.installations.find(item => item.account?.login?.toLowerCase() === env.GITHUB_OWNER.toLowerCase());
      if (!installation) return new Response('Install the GitHub App for the portfolio repository, then try again.', { status: 403 });
      const id = crypto.randomUUID();
      await env.SESSIONS.put(`session:${id}`, JSON.stringify({ installationId: installation.id }), { expirationTtl: 28800 });
      return new Response('<!doctype html><script>location.replace("' + env.ADMIN_ORIGIN.replace(/\/$/, '') + '?connected=1")</script>', { headers: { 'content-type': 'text/html', 'set-cookie': `otavio_cms_session=${id}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=28800` } });
    }
    if (url.pathname === '/publish' && request.method === 'POST') {
      try { return await publish(request, env); } catch (error) { return json({ error: error.message || 'Publishing failed.' }, 500, headers); }
    }
    return json({ error: 'Not found.' }, 404, headers);
  }
};
