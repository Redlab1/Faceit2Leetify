#!/usr/bin/env node
import { build, context } from 'esbuild';
import { rmSync, mkdirSync, copyFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const outdir = join(process.cwd(), 'dist');

function copyDir(src, dest) {
  mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src)) {
    const s = join(src, entry);
    const d = join(dest, entry);
    const st = statSync(s);
    if (st.isDirectory()) copyDir(s, d);
    else copyFileSync(s, d);
  }
}

async function run({ watch } = { watch: false }) {
  // clean dist
  rmSync(outdir, { recursive: true, force: true });
  mkdirSync(outdir, { recursive: true });

  const common = {
    bundle: true,
    sourcemap: true,
    platform: 'browser',
    target: ['chrome114'],
    outdir,
  entryNames: '[name]',
  format: 'esm',
    logLevel: 'info',
    define: {
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || (watch ? 'development' : 'production')),
    },
  };

  const entryPoints = [
    'src/background.ts',
    'src/content.ts',
    'src/popup/popup.ts',
    'src/options/options.ts'
  ];

  if (watch) {
    const ctx = await context({ ...common, entryPoints });
    await ctx.watch();
  } else {
    await build({ ...common, entryPoints });
  }

  // copy static assets (manifest, html, css, images)
  copyDir(join(process.cwd(), 'public'), outdir);
}

const watch = process.argv.includes('--watch');
run({ watch }).catch((err) => {
  console.error(err);
  process.exit(1);
});
