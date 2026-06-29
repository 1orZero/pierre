import { cp, mkdir, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(rootDir, 'dist');

await rm(distDir, { force: true, recursive: true });
await mkdir(distDir, { recursive: true });

const result = await Bun.build({
  entrypoints: [
    resolve(rootDir, 'src/background.ts'),
    resolve(rootDir, 'src/content.ts'),
    resolve(rootDir, 'src/github-content.ts'),
    resolve(rootDir, 'src/popup.ts'),
  ],
  format: 'esm',
  minify: false,
  outdir: distDir,
  sourcemap: 'none',
  target: 'browser',
});

if (!result.success) {
  for (const log of result.logs) {
    console.error(log);
  }
  process.exit(1);
}

await cp(
  resolve(rootDir, 'src/manifest.json'),
  resolve(distDir, 'manifest.json')
);
await cp(resolve(rootDir, 'src/popup.html'), resolve(distDir, 'popup.html'));
