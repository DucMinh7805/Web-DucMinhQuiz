import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
import { build } from 'vite';
import viteConfig from '../vite.config.js';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));

function listFunctionEntries(dir, relative = '') {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name.startsWith('_') || entry.name.startsWith('.')) return [];
    const fullPath = path.join(dir, entry.name);
    const nextRelative = path.join(relative, entry.name);
    if (entry.isDirectory()) return listFunctionEntries(fullPath, nextRelative);
    return entry.isFile() && /\.(js|mjs|cjs|ts)$/.test(entry.name) ? [nextRelative] : [];
  });
}

const functionEntries = listFunctionEntries(path.join(projectRoot, 'api'));
if (functionEntries.length > 12) {
  throw new Error(`Vercel Hobby chỉ cho tối đa 12 Functions; hiện có ${functionEntries.length}: ${functionEntries.join(', ')}`);
}
for (const required of ['auth/sheet-login.js', 'auth/refresh-access.js', 'quiz/manifest.js', 'quiz/questions.js', 'admin/content-sync.js']) {
  if (!functionEntries.includes(required.replaceAll('/', path.sep))) {
    throw new Error(`Thiếu Vercel Function bắt buộc: api/${required}`);
  }
}

const vercelConfig = JSON.parse(fs.readFileSync(path.join(projectRoot, 'vercel.json'), 'utf8'));
const routes = Array.isArray(vercelConfig.routes) ? vercelConfig.routes : [];
const filesystemRouteIndex = routes.findIndex(route => route?.handle === 'filesystem');
const spaRouteIndex = routes.findIndex(route => route?.dest === '/index.html');
if (filesystemRouteIndex < 0 || spaRouteIndex < 0 || filesystemRouteIndex > spaRouteIndex) {
  throw new Error('vercel.json phải ưu tiên filesystem/API trước khi fallback SPA về index.html.');
}

await build({
  ...viteConfig,
  configFile: false,
  root: projectRoot,
  build: {
    ...(viteConfig.build || {}),
    outDir: 'dist-verify',
    emptyOutDir: true
  }
});
