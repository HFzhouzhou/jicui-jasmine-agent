import { build } from 'esbuild';
await build({
  entryPoints: ['server/index.ts'], bundle: true, platform: 'node',
  target: 'node24', format: 'esm', packages: 'external',
  outfile: 'dist/server/index.js', sourcemap: true,
});
