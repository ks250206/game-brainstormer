import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const {render}=await import(pathToFileURL(resolve('.ssg/entry-server.js')).href);
const template=await readFile('dist/index.html','utf8');
// Accept either a preserved marker or an empty root after HTML normalization.
const root=/<div\s+id=(?:"root"|'root'|root)\s*>\s*(?:<!--app-html-->)?\s*<\/div>/;
if(!root.test(template))throw new Error('SSG mount point missing; refusing to emit an empty app shell.');
const html=template.replace(root,()=>`<div id="root" data-ssg="true">${render()}</div>`);
await writeFile('dist/index.html',html);
await writeFile('dist/.nojekyll','');
console.log('Prerendered complete application shell + initial board. Deploy dist/ to any static host.');
