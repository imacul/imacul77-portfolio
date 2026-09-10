const DEFAULT_PROJECTS = [
  {name:'Ice',description:'Live WebGL glass',category:'frontend',href:'https://github.com/imacul/ice',img:'assets/ice.png',color:'#95bfcf'},
  {name:'Flames',description:'Cinematic fire study',category:'frontend',href:'https://github.com/imacul/flames',img:'assets/flames.png',color:'#ad5f35'},
  {name:'Air',description:'Wind, pressure, sky',category:'frontend',href:'https://github.com/imacul/air',img:'assets/air.jpg'},
  {name:'Rock',description:'Gated stone studies',category:'frontend',href:'https://github.com/imacul/rock',img:'assets/rock.jpg'},
  {name:'Sculpt',description:'Browser-based 3D sculpting',category:'frontend',href:'https://github.com/imacul/sculpt',img:'assets/sculpt.png'},
  {name:'Mesh Editor',description:'A mesh editing workspace',category:'frontend',href:'https://github.com/imacul/mesh-editor-web',img:'assets/mesh.png'},
  {name:'MedViz',description:'3D medical mesh editor',category:'fullstack',href:'https://github.com/imacul/medviz-web-editor',img:'assets/medviz.png'},
  {name:'AnimTheme',description:'A marketplace for motion',category:'fullstack',href:'https://github.com/imacul/animtheme',img:'assets/animtheme.png'},
  {name:'Atlas',description:'From websites to Figma',category:'fullstack',href:'https://github.com/imacul/atlas-showcase',img:'assets/atlas.png'},
  {name:'Smileville',description:'Dental review portal',category:'fullstack',href:'https://github.com/imacul/smileville',img:'assets/smileville.png'},
  {name:'RideWave',description:'Ride hailing Â· iOS & Android',category:'mobile',href:'https://github.com/imacul/ridewave',img:'assets/ridewave.png'},
  {name:'Servix',description:'Connecting people and artisans',category:'mobile',href:'https://github.com/imacul/servix',img:'assets/servix.png'}
];
 (async () => {
  const film=window.Film,reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  let PROJECTS=DEFAULT_PROJECTS;
  try {
    const response=await fetch('content/site.json',{cache:'no-cache'});
    if(response.ok){const content=await response.json();if(Array.isArray(content.projects)&&content.projects.length)PROJECTS=content.projects;applyContent(content);}
  } catch(error){console.info('Using built-in portfolio content.',error);}
  film.setItems(PROJECTS);
  document.querySelectorAll('.filter').forEach(button=>button.addEventListener('click',()=>{
    const category=button.dataset.filter;
    document.querySelectorAll('.filter').forEach(b=>{const active=b===button;b.classList.toggle('is-on',active);b.setAttribute('aria-pressed',String(active));});
    const selected=category==='all'?PROJECTS:PROJECTS.filter(p=>p.category===category);
    film.setItems(selected);film.reset();document.getElementById('filter-status').textContent=`Showing ${selected.length} ${category==='all'?'':category+' '}projects.`;
  }));
  const audio=document.getElementById('ambience'),sound=document.querySelector('.sound-toggle'),audioStatus=document.getElementById('audio-status');
  audio.volume=.35;let soundWanted=false;
  function updateSound(){const playing=!audio.paused;sound.setAttribute('aria-pressed',String(playing));sound.setAttribute('aria-label',playing?'Mute sound':'Enable sound');sound.title=playing?'Mute sound':'Enable sound';}
  async function enableSound(){soundWanted=true;try{await audio.play();audioStatus.textContent='Ambient sound enabled.';}catch{soundWanted=false;audioStatus.textContent='Sound could not start. Use the sound button to retry.';}updateSound();}
  sound.addEventListener('click',()=>{if(audio.paused)enableSound();else{soundWanted=false;audio.pause();audioStatus.textContent='Sound muted.';updateSound();}});
  audio.addEventListener('pause',updateSound);audio.addEventListener('playing',updateSound);
  document.addEventListener('visibilitychange',()=>{if(document.hidden){audio.pause();}else if(soundWanted)enableSound();});
  const entry=document.getElementById('entry');
  let entered=false;try{entered=sessionStorage.getItem('imacul77-entered')==='yes';}catch{}
  function lock(){document.documentElement.style.overflow='hidden';}
  function unlock(){if(!document.querySelector('dialog[open]'))document.documentElement.style.overflow='';}
  function enter(withSound){if(withSound)enableSound();try{sessionStorage.setItem('imacul77-entered','yes');}catch{}entry.classList.add('leaving');setTimeout(()=>{entry.close();unlock();},reduced?0:650);}
  if(!entered){entry.showModal();lock();}
  document.getElementById('enter-sound').addEventListener('click',()=>enter(true));document.getElementById('enter-silent').addEventListener('click',()=>enter(false));
  entry.addEventListener('cancel',()=>{try{sessionStorage.setItem('imacul77-entered','yes');}catch{}});entry.addEventListener('close',unlock);
  const menu=document.getElementById('menu'),menuButton=document.querySelector('.menu-toggle'),about=document.getElementById('about');
  menuButton.addEventListener('click',()=>{menu.showModal();lock();menuButton.setAttribute('aria-expanded','true');});
  document.querySelector('.menu-close').addEventListener('click',()=>menu.close());menu.addEventListener('close',()=>{menuButton.setAttribute('aria-expanded','false');unlock();});
  document.querySelectorAll('[data-about]').forEach(button=>button.addEventListener('click',()=>{menu.close();about.showModal();lock();}));
  document.querySelector('.about-close').addEventListener('click',()=>about.close());about.addEventListener('close',unlock);
  document.getElementById('about-work').addEventListener('click',()=>{about.close();window.scrollTo({top:0,behavior:reduced?'instant':'smooth'});});
  document.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',event=>{const selector=a.getAttribute('href');if(selector==='#project-links')return;event.preventDefault();menu.close();if(selector==='#'||selector==='#work'){window.scrollTo({top:0,behavior:reduced?'instant':'smooth'});}else{document.querySelector(selector)?.scrollIntoView({behavior:reduced?'instant':'smooth'});}}));
  const cursor=document.querySelector('.cursor');let drag=null,suppressClick=false;
  window.addEventListener('pointermove',event=>{
    film.pointer(event.clientX,event.clientY);cursor.style.left=event.clientX+'px';cursor.style.top=event.clientY+'px';
    cursor.classList.toggle('is-on',!drag&&!!event.target.closest('.project-link')&&event.pointerType==='mouse');
    if(drag&&event.pointerType==='mouse'){const dy=event.clientY-drag.y;if(Math.abs(dy)>5)drag.moved=true;if(drag.moved){window.scrollTo({top:Math.max(0,drag.scroll-dy*1.7),behavior:'instant'});suppressClick=true;}}
  },{passive:true});
  window.addEventListener('pointerdown',event=>{if(event.button!==0||event.pointerType!=='mouse'||event.target.closest('button,dialog,.nav,.contact,.filters,.sound-toggle'))return;drag={y:event.clientY,scroll:window.scrollY,moved:false};film.hold(1);});
  function endDrag(){drag=null;film.hold(0);setTimeout(()=>suppressClick=false,0);}
  window.addEventListener('pointerup',endDrag);window.addEventListener('pointercancel',endDrag);window.addEventListener('blur',endDrag);
  document.addEventListener('click',event=>{if(suppressClick&&event.target.closest('.project-link')){event.preventDefault();event.stopPropagation();}},true);
  document.addEventListener('dragstart',event=>{if(event.target.closest('.project-link'))event.preventDefault();});
  document.addEventListener('pointerleave',()=>cursor.classList.remove('is-on'));
})();

function getContentValue(source,path){return path.split('.').reduce((value,key)=>value?.[key],source);}
function applyContent(content){
  document.querySelectorAll('[data-content]').forEach(element=>{
    const value=getContentValue(content,element.dataset.content);if(value==null)return;
    if(element.dataset.content==='about.heading')element.innerHTML=value;else if(element.dataset.content==='footer.copyright')element.textContent=${value} © 2021–;else element.textContent=value;
  });
  document.querySelectorAll('[data-content-href]').forEach(element=>{const value=getContentValue(content,element.dataset.contentHref);if(value)element.href=value;});
  const footerEmail=document.querySelector('[data-content="footer.email"]');const emailUrl=getContentValue(content,'footer.emailUrl');if(footerEmail&&emailUrl)footerEmail.href=emailUrl;
  const counts={frontend:0,fullstack:0,mobile:0};(content.projects||[]).forEach(project=>{if(counts[project.category]!=null)counts[project.category]++;});
  const all=document.querySelector('[data-filter="all"] sup');if(all)all.textContent=String(content.projects?.length||0);
  Object.entries(counts).forEach(([category,count])=>{const sup=document.querySelector(`[data-filter="${category}"] sup`);if(sup)sup.textContent=String(count);});
}
