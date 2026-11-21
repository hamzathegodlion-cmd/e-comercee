import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const appEntry = path.join(rootDir, 'server', 'app.ts');
const serverEntry = path.join(rootDir, 'server.ts');

if (!fs.existsSync(appEntry) || !fs.existsSync(serverEntry)) {
  if (process.argv.includes('--if-present')) {
    process.exit(0);
  }
  console.error('Server entry files not found.');
  process.exit(1);
}

await Promise.all([
  build({
    entryPoints: [appEntry],
    outfile: path.join(rootDir, 'api', '_app.js'),
    bundle: true,
    platform: 'node',
    target: 'node22',
    format: 'esm',
    packages: 'external',
    sourcemap: false,
    logLevel: 'warning',
  }),
  build({
    entryPoints: [serverEntry],
    outfile: path.join(rootDir, 'server.js'),
    bundle: true,
    platform: 'node',
    target: 'node22',
    format: 'esm',
    packages: 'external',
    sourcemap: false,
    logLevel: 'warning',
  }),
]);
