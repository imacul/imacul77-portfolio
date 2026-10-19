/* Run once with SANITY_WRITE_TOKEN=... npm run cms:import. Never commit tokens. */
import {readFileSync} from 'node:fs';
const original=JSON.parse(readFileSync(new URL('../content/site.json',import.meta.url),'utf8'));
const token=process.env.SANITY_WRITE_TOKEN;
if(!token) throw new Error('Missing SANITY_WRITE_TOKEN');
const project='597y0bha', dataset='production';
const site={...original,_id:'siteSettings',_type:'siteSettings',
 seo:{_type:'object',title:'IMACUL77 - Selected Projects',description:'IMACUL77 - immersive web experiences, fullstack systems and mobile applications.'},
 ui:{_type:'object',index:'Index',projects:'Projects',contact:'Contact',all:'All',frontend:'Frontend',fullstack:'Fullstack',mobile:'Mobile',scroll:'Scroll to explore',menuEmail:'imacul77@gmail.com',menuEmailUrl:'mailto:imacul77@gmail.com'},
 audioUrl:'https://imacul77.vercel.app/assets/ambience.webm',brandIconUrl:'https://imacul77.vercel.app/assets/logo-imacul.svg'};
delete site.projects;
for(const key of ['hero','entry','about','footer'])site[key]._type='object';
const docs=[site,...original.projects.map((p,i)=>({...p,_type:'portfolioProject',_id:'project-'+i,order:i,imageUrl:p.img}))];
docs.forEach(p=>{if(p._type==='portfolioProject'){delete p.img; if(p.href&&!p.href.startsWith('http'))delete p.href;}});
const response=await fetch('https://'+project+'.api.sanity.io/v2025-02-19/data/mutate/'+dataset,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({mutations:docs.map(doc=>({createOrReplace:doc}))})});
if(!response.ok)throw new Error('Import failed: '+response.status+' '+await response.text());
console.log('Imported and published '+docs.length+' Sanity documents.');
