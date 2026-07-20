const API = 'https://api.vercel.com';
const TOKEN = process.env.VERCEL_TOKEN;
const TEAM_ID = process.env.VERCEL_TEAM_ID;
const PROJECT_ID = process.env.VERCEL_PROJECT_ID;
const PRODUCTION_DOMAIN = process.env.VERCEL_PRODUCTION_DOMAIN;
const DRY_RUN = String(process.env.DRY_RUN || 'false').toLowerCase() === 'true';

if (!TOKEN || !TEAM_ID || !PROJECT_ID || !PRODUCTION_DOMAIN) {
  throw new Error('Missing VERCEL_TOKEN, VERCEL_TEAM_ID, VERCEL_PROJECT_ID or VERCEL_PRODUCTION_DOMAIN.');
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const deploymentId = item => item.uid || item.id;

async function request(url, options = {}, attempts = 6) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          'Content-Type': 'application/json',
          ...(options.headers || {})
        }
      });
      const text = await response.text();
      let body = null;
      try { body = text ? JSON.parse(text) : null; } catch { body = text; }

      if (response.ok || response.status === 404) return { response, body };
      if ([401, 403].includes(response.status)) {
        throw new Error(`Vercel authorization failed (${response.status}): ${text}`);
      }
      if (response.status === 429 || response.status >= 500) {
        lastError = new Error(`Temporary Vercel error (${response.status}): ${text}`);
        await sleep(attempt * 2000);
        continue;
      }
      return { response, body };
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await sleep(attempt * 2000);
    }
  }
  throw lastError || new Error('Vercel request failed.');
}

async function getProtectedDeployment() {
  const url = new URL(`/v13/deployments/${encodeURIComponent(PRODUCTION_DOMAIN)}`, API);
  url.searchParams.set('teamId', TEAM_ID);
  const { response, body } = await request(url);
  if (!response.ok || !body) {
    throw new Error(`Unable to resolve current production deployment (${response.status}).`);
  }
  return body.deployment || body;
}

async function listDeployments() {
  const found = [];
  let until;

  for (let page = 0; page < 50; page += 1) {
    const url = new URL('/v7/deployments', API);
    url.searchParams.set('projectId', PROJECT_ID);
    url.searchParams.set('teamId', TEAM_ID);
    url.searchParams.set('limit', '100');
    if (until) url.searchParams.set('until', String(until));

    const { response, body } = await request(url);
    if (!response.ok) {
      throw new Error(`Unable to list deployments (${response.status}): ${JSON.stringify(body)}`);
    }

    const deployments = body?.deployments || body?.data?.deployments || [];
    const pagination = body?.pagination || body?.data?.pagination || {};
    found.push(...deployments);

    if (!pagination.next || deployments.length === 0) break;
    until = pagination.next;
  }

  const unique = new Map();
  for (const item of found) unique.set(deploymentId(item), item);
  return [...unique.values()];
}

async function removeDeployment(item) {
  const id = deploymentId(item);
  const url = new URL(`/v13/deployments/${encodeURIComponent(id)}`, API);
  url.searchParams.set('teamId', TEAM_ID);
  const { response, body } = await request(url, { method: 'DELETE' });

  if (response.ok || response.status === 404) return;
  throw new Error(`Cannot delete ${id} (${response.status}): ${JSON.stringify(body)}`);
}

async function main() {
  const protectedDeployment = await getProtectedDeployment();
  const protectedId = deploymentId(protectedDeployment);
  if (!protectedId) throw new Error('Current production deployment has no ID.');

  const deployments = await listDeployments();
  const candidates = deployments.filter(item => deploymentId(item) !== protectedId);

  console.log(`Current production preserved: ${protectedId}`);
  console.log(`Deployments eligible for deletion: ${candidates.length}`);

  for (const item of candidates) {
    console.log(`${DRY_RUN ? '[dry-run]' : '[delete]'} ${deploymentId(item)} | ${item.state || item.readyState || 'UNKNOWN'} | ${item.url || 'no-url'}`);
    if (!DRY_RUN) {
      await removeDeployment(item);
      await sleep(300);
    }
  }

  if (DRY_RUN) return;

  const verification = await listDeployments();
  const remaining = verification.filter(item => deploymentId(item) !== protectedId);
  if (remaining.length > 0) {
    throw new Error(`Cleanup incomplete: ${remaining.length} non-production deployment(s) remain.`);
  }

  const stillProtected = await getProtectedDeployment();
  if (deploymentId(stillProtected) !== protectedId) {
    throw new Error('Production changed during cleanup; manual verification required.');
  }

  console.log('Cleanup completed successfully.');
}

main().catch(error => {
  console.error(error.stack || error.message || error);
  process.exit(1);
});
