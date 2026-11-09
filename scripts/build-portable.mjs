/** A tiny, build-time bundler for our own dependency-free modules only.
 * Never use this to bundle arbitrary third-party code. TypeScript is the sole build dependency. */
import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const ts=require('typescript');
const sources=['src/core/quadrant.ts','src/core/engine.ts','src/core/store.ts','src/core/icons.ts','src/portable.ts'];
const output=[];
for(const path of sources){
 const source=await fs.readFile(path,'utf8');
 const result=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext},reportDiagnostics:true,fileName:path});
 const errors=(result.diagnostics??[]).filter(d=>d.category===ts.DiagnosticCategory.Error);
 if(errors.length)throw new Error(ts.formatDiagnosticsWithColorAndContext(errors,{getCanonicalFileName:x=>x,getCurrentDirectory:()=>process.cwd(),getNewLine:()=> '\n'}));
 const js=result.outputText.replace(/^import\s[\s\S]*?from\s*['"][^'"]+['"];?\s*$/gm,'').replace(/^export\s+(?=(?:const|let|function|class)\b)/gm,'').replace(/^export\s*\{[^}]*\};?\s*$/gm,'');
 output.push(`// ${path}\n${js}`);
}
const catalog=await fs.readFile('src/data/catalog.json','utf8');
const css=await fs.readFile('src/styles.css','utf8');
const favicon=await fs.readFile('public/favicon.svg','utf8');
const js=`(()=>{'use strict';\nconst CATALOG_DATA=${catalog};\n${output.join('\n')}\n})();`.replace(/<\/script/gi,'<\\/script');
const html=`<!doctype html>\n<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#6558d7"><meta name="description" content="429 Steamタグと203メカニクスから、新しいゲームの化学反応を探すローカル・ホワイトボード。"><title>Game Brainstormer — Portable</title><link rel="icon" href="data:image/svg+xml,${encodeURIComponent(favicon)}"><style>${css}</style></head><body><div id="root"></div><noscript>このホワイトボードにはJavaScriptが必要です。</noscript><script>${js}</script></body></html>`;
await fs.mkdir('portable',{recursive:true});
await fs.writeFile('portable/game-brainstormer.html',html);
console.log(`Portable HTML: ${Buffer.byteLength(html).toLocaleString()} bytes; no external requests.`);
