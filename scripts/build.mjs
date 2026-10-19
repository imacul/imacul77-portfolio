import {execFileSync} from 'node:child_process';
import {mkdirSync,copyFileSync,cpSync} from 'node:fs';
mkdirSync('dist',{recursive:true});
for(const file of ['index.html','film.js','motion.js','sanity-content.js','styles.css','water.js'])copyFileSync(file,'dist/'+file);
cpSync('assets','dist/assets',{recursive:true});
execFileSync(process.platform==='win32'?'node_modules/.bin/sanity.cmd':'node_modules/.bin/sanity',['build','dist/admin'],{stdio:'inherit'});
