import pkg from './package.json' with { type: 'json' };

const HEADER = `// ==UserScript==
// @name         PSNP+ Gist Sync
// @namespace    psnp.plus.gist
// @version      ${pkg.version}
// @description  ${pkg.description}
// @author       MihaiStreames
// @match        https://psnprofiles.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM.getValue
// @grant        GM.setValue
// @grant        GM.deleteValue
// @run-at       document-start
// @inject-into  page
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

const outputFile = 'dist/psnpp-gist-sync.user.js';
const built = await Bun.file(outputFile).text();
await Bun.write(outputFile, HEADER + '\n' + built);
console.log('Built:', outputFile);
