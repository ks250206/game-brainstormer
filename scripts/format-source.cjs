/** Format our TypeScript/TSX using the TypeScript printer; no external formatter is needed. */
const fs=require('node:fs');const path=require('node:path');const ts=require('typescript');
const printer=ts.createPrinter({newLine:ts.NewLineKind.LineFeed});
function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())walk(p);else if(/\.tsx?$/.test(p)){const source=ts.createSourceFile(p,fs.readFileSync(p,'utf8'),ts.ScriptTarget.Latest,true,p.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);fs.writeFileSync(p,printer.printFile(source));}}}
walk('src');walk('tests');
for(const p of ['vite.config.ts','playwright.config.ts']){const source=ts.createSourceFile(p,fs.readFileSync(p,'utf8'),ts.ScriptTarget.Latest,true);fs.writeFileSync(p,printer.printFile(source));}
