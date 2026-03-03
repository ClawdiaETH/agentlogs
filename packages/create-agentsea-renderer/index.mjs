#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import prompts from 'prompts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_DIR = path.join(__dirname, 'template');

/* ── Layer registry ─────────────────────────────────────────────── */

const ALL_LAYERS = [
  { file: 'background.ts',     name: 'background' },
  { file: 'noise.ts',          name: 'noise' },
  { file: 'momentum.ts',       name: 'momentum' },
  { file: 'sky.ts',            name: 'sky' },
  { file: 'waterfall.ts',      name: 'waterfall' },
  { file: 'glitch.ts',         name: 'glitch' },
  { file: 'geometry.ts',       name: 'geometry' },
  { file: 'log-text.ts',       name: 'logText' },
  { file: 'replies.ts',        name: 'replies' },
  { file: 'commits.ts',        name: 'commits' },
  { file: 'code-rain.ts',      name: 'codeRain' },
  { file: 'repo-glyphs.ts',    name: 'repoGlyphs' },
  { file: 'price-waveform.ts', name: 'priceWaveform' },
  { file: 'scanlines.ts',      name: 'scanlines' },
  { file: 'metadata-line.ts',  name: 'metadataLine' },
  { file: 'watermark.ts',      name: 'watermark' },
];

const MINIMAL_FILES = new Set(['background.ts', 'noise.ts', 'scanlines.ts']);

/* ── Static file manifest (relative to template/) ──────────────── */

const STATIC_FILES = [
  'src/index.ts',
  'src/types.ts',
  'src/prng.ts',
  'src/palette.ts',
  'scripts/render.ts',
  'tsconfig.json',
  '.gitignore',
];

const TEMPLATE_FILES = [
  { src: 'package.json.tmpl',        dest: 'package.json' },
  { src: 'README.md.tmpl',           dest: 'README.md' },
  { src: 'example-daylog.json.tmpl', dest: 'example-daylog.json' },
];

/* ── Main ───────────────────────────────────────────────────────── */

async function main() {
  const dirArg = process.argv[2];

  console.log();
  console.log('  \x1b[1mcreate-agentsea-renderer\x1b[0m');
  console.log();

  const response = await prompts(
    [
      {
        type: 'text',
        name: 'projectName',
        message: 'Project name',
        initial: dirArg || 'my-renderer',
      },
      {
        type: 'text',
        name: 'agentName',
        message: 'Agent name',
        initial: 'Clawdia',
      },
      {
        type: 'text',
        name: 'seriesTitle',
        message: 'Series title',
        initial: 'Corrupt Memory',
      },
      {
        type: 'select',
        name: 'template',
        message: 'Starter template',
        choices: [
          { title: 'Full 16-layer',      value: 'full' },
          { title: 'Minimal (3 layers)', value: 'minimal' },
        ],
      },
    ],
    { onCancel: () => { console.log('\n  Cancelled.'); process.exit(1); } },
  );

  const { projectName, agentName, seriesTitle, template } = response;
  const targetDir = path.resolve(projectName);

  if (fs.existsSync(targetDir) && fs.readdirSync(targetDir).length > 0) {
    console.log(`\n  Directory "${projectName}" already exists and is not empty.`);
    process.exit(1);
  }

  const layers = template === 'minimal'
    ? ALL_LAYERS.filter(l => MINIMAL_FILES.has(l.file))
    : ALL_LAYERS;

  const replacements = {
    '{{PROJECT_NAME}}': projectName,
    '{{AGENT_NAME}}': agentName,
    '{{SERIES_TITLE}}': seriesTitle,
  };

  // Create directories
  fs.mkdirSync(path.join(targetDir, 'src', 'layers'), { recursive: true });
  fs.mkdirSync(path.join(targetDir, 'scripts'), { recursive: true });
  fs.mkdirSync(path.join(targetDir, 'output'), { recursive: true });

  // Copy static files (verbatim)
  for (const file of STATIC_FILES) {
    const content = fs.readFileSync(path.join(TEMPLATE_DIR, file), 'utf-8');
    fs.writeFileSync(path.join(targetDir, file), content);
  }

  // Copy templated files (with placeholder substitution)
  for (const { src, dest } of TEMPLATE_FILES) {
    let content = fs.readFileSync(path.join(TEMPLATE_DIR, src), 'utf-8');
    for (const [key, val] of Object.entries(replacements)) {
      content = content.replaceAll(key, val);
    }
    fs.writeFileSync(path.join(targetDir, dest), content);
  }

  // Copy selected layer files
  for (const layer of layers) {
    fs.copyFileSync(
      path.join(TEMPLATE_DIR, 'src', 'layers', layer.file),
      path.join(targetDir, 'src', 'layers', layer.file),
    );
  }

  // Generate layers/index.ts barrel
  const imports = layers.map(l => {
    const mod = l.file.replace('.ts', '');
    return `import { ${l.name} } from './${mod}';`;
  }).join('\n');

  const entries = layers.map((l, i) => {
    const pad = ' '.repeat(Math.max(1, 16 - l.name.length));
    return `  ${l.name},${pad}// ${i + 1}`;
  }).join('\n');

  const layersIndex = `import type { LayerFn } from '../types';\n\n${imports}\n\nexport const LAYERS: LayerFn[] = [\n${entries}\n];\n`;

  fs.writeFileSync(path.join(targetDir, 'src', 'layers', 'index.ts'), layersIndex);

  // Done
  console.log();
  console.log(`  \x1b[32m✓\x1b[0m Scaffolded ${layers.length}-layer renderer in \x1b[1m${projectName}/\x1b[0m`);
  console.log();
  console.log('  Next steps:');
  console.log(`    cd ${projectName}`);
  console.log('    npm install');
  console.log('    npm run render');
  console.log();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
