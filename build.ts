import pkg from './package.json' with { type: 'json' };

const HEADER = `// ==UserScript==
// @name         PSNP+ Gist Sync
// @namespace    psnp.plus.gist
// @version      ${pkg.version}
// @description  ${pkg.description}
// @author       MihaiStreames
// @homepageURL  https://github.com/MihaiStreames/psnpp-gist
// @supportURL   https://github.com/MihaiStreames/psnpp-gist/issues
// @updateURL    https://github.com/MihaiStreames/psnpp-gist/releases/latest/download/psnpp-gist-sync.meta.js
// @downloadURL  https://github.com/MihaiStreames/psnpp-gist/releases/latest/download/psnpp-gist-sync.user.js
// @match        https://psnprofiles.com/*
// @grant        unsafeWindow
// @grant        GM_xmlhttpRequest
// @connect      api.github.com
// @run-at       document-idle
// ==/UserScript==`;

const result = await Bun.build({
  entrypoints: ['src/index.ts'],
  outdir: 'dist',
  minify: true,
  target: 'browser',
  naming: 'psnpp-gist-sync.user.js',
});

if (!result.success) {
  for (const log of result.logs) {
    console.error(log);
  }
  process.exit(1);
}

const userJs = 'dist/psnpp-gist-sync.user.js';
const metaJs = 'dist/psnpp-gist-sync.meta.js';

const built = await Bun.file(userJs).text();
await Bun.write(userJs, HEADER + '\n' + built);
await Bun.write(metaJs, HEADER + '\n');

console.log('Built:', userJs, metaJs);
