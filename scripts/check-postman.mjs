import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const collectionPath = path.join(root, 'docs', 'postman', 'zubaan.postman_collection.json');
const routeDir = path.join(root, 'src', 'routes');
const collection = JSON.parse(await readFile(collectionPath, 'utf8'));
const errors = [];
const folders = collection.item ?? [];
const requests = [];
const collectionVariables = new Set((collection.variable ?? []).map((variable) => variable.key));

function walk(items, folder) {
  for (const item of items ?? []) {
    if (item.item) walk(item.item, item.name);
    else requests.push({ item, folder });
  }
}

walk(folders);

for (const { item, folder } of requests) {
  if (!item.request?.description) errors.push(`${folder}/${item.name}: missing description`);
  if (!item.event?.some((event) => event.listen === 'test' && event.script?.exec?.length))
    errors.push(`${folder}/${item.name}: missing test script`);
  const requestText = JSON.stringify({
    url: item.request?.url,
    header: item.request?.header,
    body: item.request?.body,
  });
  if (
    /localhost|127\.0\.0\.1|Bearer\s+[A-Za-z0-9._-]{8,}|(?:^|[^A-Za-z0-9])[a-f0-9]{24}(?:[^A-Za-z0-9]|$)/i.test(
      requestText,
    )
  )
    errors.push(`${folder}/${item.name}: hard-coded host, token, or ObjectId in request`);
  for (const [, variable] of requestText.matchAll(/\{\{([^}]+)\}\}/g)) {
    if (!collectionVariables.has(variable))
      errors.push(`${folder}/${item.name}: undefined collection variable {{${variable}}}`);
  }
}

for (const folder of folders) {
  const names = new Set();
  for (const item of folder.item ?? []) {
    if (item.item) continue;
    if (names.has(item.name)) errors.push(`${folder.name}: duplicate request name ${item.name}`);
    names.add(item.name);
  }
}

const prefixes = {
  attemptRoutes: '/api',
  conversationRoutes: '/api/conversations',
  homeRoutes: '/api/home',
  lessonRoutes: '/api/lessons',
  mistakeRoutes: '/api/mistakes',
  onboardingRoutes: '/api/onboarding',
  speechRoutes: '/api/speech',
};
const canonical = (value) => path.posix.normalize(value).replace(/:[^/]+/g, ':param');
const routes = new Set(['GET /health']);
for (const [fileBase, prefix] of Object.entries(prefixes)) {
  const source = await readFile(path.join(routeDir, `${fileBase}.ts`), 'utf8');
  const regex = /(\w+Router)\.(get|post|put|patch|delete)\(\s*['"]([^'"]*)['"]/g;
  for (const match of source.matchAll(regex)) {
    const route = `${match[2].toUpperCase()} ${canonical(`${prefix}/${match[3]}`)}`;
    routes.add(route.replace(/\/$/, '') || route);
  }
}

function requestRoute(item) {
  const raw = typeof item.request.url === 'string' ? item.request.url : item.request.url?.raw;
  if (!raw) return '';
  const routePath = raw
    .replace('{{baseUrl}}', '/api')
    .split('?')[0]
    .split('/')
    .map((segment) => {
      const decoded = segment.replace(/%7B%7B/gi, '{{').replace(/%7D%7D/gi, '}}');
      return decoded.startsWith('{{') && decoded.endsWith('}}')
        ? `:${decoded.slice(2, -2)}`
        : decoded;
    })
    .join('/');
  return `${item.request.method.toUpperCase()} ${canonical(routePath.replace(/\/$/, '') || '/')}`;
}

const covered = new Set(requests.map(({ item }) => requestRoute(item)));
for (const route of routes) if (!covered.has(route)) errors.push(`route not covered: ${route}`);

if (errors.length) {
  process.stderr.write(`${errors.join('\n')}\n`);
  process.exit(1);
}

process.stdout.write(
  `Postman check passed: ${folders.length} folders, ${requests.length} requests, ${routes.size} routes covered.\n`,
);
