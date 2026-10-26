const fs = require('fs');
const path = require('path');

// Read backend routes
const ownerRoutesSrc = fs.readFileSync(path.join(__dirname, '..', 'routes', 'owner.routes.ts'), 'utf8');
const residentRoutesSrc = fs.readFileSync(path.join(__dirname, '..', 'routes', 'resident.routes.ts'), 'utf8');
const superAdminRoutesSrc = fs.readFileSync(path.join(__dirname, '..', 'routes', 'super-admin.routes.ts'), 'utf8');
const rootRoutesSrc = fs.readFileSync(path.join(__dirname, '..', 'routes', 'index.ts'), 'utf8');

// Parse route declarations: router.<method>('<path>', ...)
function extractBackendRoutes(src, prefix) {
  const routes = [];
  const regex = /router\.(get|post|patch|put|delete)\(\s*['"`]([^'"`]+)['"`]/g;
  let match;
  while ((match = regex.exec(src)) !== null) {
    routes.push({
      method: match[1].toUpperCase(),
      path: prefix + match[2]
    });
  }
  return routes;
}

const backendRoutes = [
  ...extractBackendRoutes(ownerRoutesSrc, '/owner'),
  ...extractBackendRoutes(residentRoutesSrc, '/resident'),
  ...extractBackendRoutes(superAdminRoutesSrc, '/super-admin'),
  ...extractBackendRoutes(rootRoutesSrc, '')
];

console.log(`Extracted ${backendRoutes.length} backend route declarations.`);

// Read client API definitions
const ownerApiSrc = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'client', 'src', 'services', 'ownerApi.ts'), 'utf8');
const residentApiSrc = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'client', 'src', 'services', 'residentApi.ts'), 'utf8');
const superAdminApiSrc = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'client', 'src', 'services', 'superAdminApi.ts'), 'utf8');

// Parse client calls: api.<method>(`<path>` or `<path>`)
function extractClientCalls(src, fileName) {
  const calls = [];
  // Match api.get('/owner/...'), api.post(`/resident/...`), etc.
  const regex = /api\.(get|post|patch|put|delete)\s*(?:<[^>]+>)?\s*\(\s*[`'"]([^`'"]+)[`'"]/g;
  let match;
  while ((match = regex.exec(src)) !== null) {
    calls.push({
      file: fileName,
      method: match[1].toUpperCase(),
      rawPath: match[2]
    });
  }
  return calls;
}

const clientCalls = [
  ...extractClientCalls(ownerApiSrc, 'ownerApi.ts'),
  ...extractClientCalls(residentApiSrc, 'residentApi.ts'),
  ...extractClientCalls(superAdminApiSrc, 'superAdminApi.ts')
];

console.log(`Extracted ${clientCalls.length} client API calls.`);

// Normalize path by replacing ${...} or :param with a placeholder
function normalizePath(p) {
  return p
    .split('?')[0]
    .replace(/\$\{[^}]+\}/g, ':id')
    .replace(/\/:[a-zA-Z0-9_]+/g, '/:param');
}

let mismatched = 0;
clientCalls.forEach(call => {
  const normalizedClient = normalizePath(call.rawPath);
  const found = backendRoutes.find(b => {
    if (b.method !== call.method) return false;
    const normalizedBackend = normalizePath(b.path);
    return normalizedBackend === normalizedClient;
  });

  if (!found) {
    // Check if it's a known parameterized route or alias
    mismatched++;
    console.log(`[MISMATCH / UNVERIFIED] in ${call.file}: ${call.method} ${call.rawPath} (normalized: ${normalizedClient})`);
  }
});

console.log(`\nAPI Route Alignment Check complete. Mismatches: ${mismatched} out of ${clientCalls.length} client calls.`);
