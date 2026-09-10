/* Original canvas scene and gallery renderer. No runtime dependencies. */
window.Film = (() => {
  const canvas = document.getElementById('film');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const page = document.createElement('canvas'), ctx = page.getContext('2d');
  const room = document.createElement('canvas'), roomCtx = room.getContext('2d');
  const gl = !reduced && canvas.getContext('webgl', {alpha:false, antialias:false, powerPreference:'low-power'});
  const fallback = !gl;
  if (fallback) document.body.classList.add('static-gallery');
  const links = document.getElementById('project-links');
  const section = document.getElementById('work');
  const heading = document.querySelector('.gallery-heading');
  const hint = document.querySelector('.explore-hint');
  const flow = document.createElement('canvas'); flow.width=160; flow.height=100;
  const flowCtx = flow.getContext('2d');
  flowCtx.fillStyle='rgb(128,128,128)'; flowCtx.fillRect(0,0,160,100);
  let items=[], surfaces=[], anchors=[], width=0,height=0,dpr=1,scroll=window.scrollY,velocity=0,lastTime=0;
  let layout={}, transition=1, targetTransition=1, frameId=0, focused=-1;
  let mouse={x:.5,y:.5,dx:0,dy:0,active:0}, camera={x:0,y:0}, held=0;
  const butterflies=Array.from({length:42},(_,i)=>({x:((i*73.17)%100)/100,y:((i*39.31)%100)/100,size:4+(i%7)*1.8,phase:i*2.41,speed:.012+(i%5)*.003}));
  let program, sceneTexture, flowTexture, uniforms, quadBuffer;
  let cardProgram, cardUniforms, meshBuffer, meshCount, composition, compositionTexture, depthBuffer, blitProgram;
  const cardTextures = new Map();
  function shader(type, source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;}
  if(gl){
    program=gl.createProgram();
    gl.attachShader(program,shader(gl.VERTEX_SHADER,`attribute vec2 a; varying vec2 v; void main(){v=a*.5+.5;v.y=1.-v.y;gl_Position=vec4(a,0.,1.);}`));
    gl.attachShader(program,shader(gl.FRAGMENT_SHADER,`precision highp float;
      varying vec2 v; uniform sampler2D scene; uniform sampler2D flow; uniform vec2 res; uniform vec2 pointer; uniform float time; uniform float active; uniform float hold;
      vec4 readScene(vec2 p){p=clamp(p,.001,.999);return texture2D(scene,vec2(p.x,1.-p.y));}
      void main(){vec2 uv=v;vec2 p=(uv-pointer)*vec2(res.x/res.y,1.);float dist=length(p);vec2 f=(texture2D(flow,uv).rg-vec2(128./255.))*2.;
        float wave=sin(dist*38.-time*2.2)*exp(-dist*8.)*.003*active;
        uv+=f*.043+p/(dist+.001)*wave;
        // Broad, slow currents remain alive with a stationary pointer.
        vec2 current=vec2(
          sin(v.y*7.2+v.x*3.1+time*.38)+.45*sin(v.y*14.-v.x*5.-time*.29),
          cos(v.x*6.4-v.y*2.5+time*.31)+.4*sin(v.x*12.+v.y*5.+time*.24));
        uv+=current*vec2(.0048,.006);
        uv+=(uv-pointer)*exp(-dist*4.)*hold*.07;
        float edge=pow(length((v-.5)*1.4),3.);vec2 ca=vec2(.00038+edge*.0007+length(f)*.0035,0.);
        vec3 c=vec3(readScene(uv+ca).r,readScene(uv).g,readScene(uv-ca).b);
        c*=1.-edge*.075;gl_FragColor=vec4(c,1.);}`));
    gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error('Unable to link gallery shader');gl.useProgram(program);
    quadBuffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,quadBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
    const a=gl.getAttribLocation(program,'a');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);
    function texture(){const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);return t;}
    sceneTexture=texture();flowTexture=texture();uniforms=Object.fromEntries(['scene','flow','res','pointer','time','active','hold'].map(k=>[k,gl.getUniformLocation(program,k)]));
    compositionTexture=texture();composition=gl.createFramebuffer();depthBuffer=gl.createRenderbuffer();
    blitProgram=gl.createProgram();
    gl.attachShader(blitProgram,shader(gl.VERTEX_SHADER,`attribute vec2 a;varying vec2 uv;void main(){uv=a*.5+.5;uv.y=1.-uv.y;gl_Position=vec4(a,0.,1.);}`));
    gl.attachShader(blitProgram,shader(gl.FRAGMENT_SHADER,`precision mediump float;varying vec2 uv;uniform sampler2D image;void main(){gl_FragColor=texture2D(image,uv);}`));
    gl.linkProgram(blitProgram);
    cardProgram=gl.createProgram();
    gl.attachShader(cardProgram,shader(gl.VERTEX_SHADER,`precision highp float;
      attribute vec2 a; varying vec2 uv; varying float angle; varying float endFade;
      uniform vec4 rect; uniform vec2 res; uniform float hinge; uniform float radius; uniform float time; uniform float index;
      void main(){
        uv=a;float originalY=rect.y+a.y*rect.w;
        float crossCurve=sin(a.x*3.14159265);
        float foldLine=hinge-crossCurve*12.;
        float r=radius*(.92+.08*crossCurve);
        angle=max(0.,(foldLine-originalY)/r);
        float theta=min(angle,3.42);
        float y=angle>0.?foldLine-r*sin(theta):originalY;
        float depth=r*(1.-cos(theta));
        float squeeze=1.-.19*(1.-cos(theta))*.5;
        float x=rect.x+rect.z*.5+(a.x-.5)*rect.z*squeeze;
        y+=sin(a.x*3.14+time*.42+index*.7)*2.2;
        endFade=1.-smoothstep(3.12,3.42,angle);
          // The face stays closest to the viewer; the curled section recedes behind it.
          gl_Position=vec4(x/res.x*2.-1.,1.-y/res.y*2.,-.05+depth/800.,1.);
      }`));
    gl.attachShader(cardProgram,shader(gl.FRAGMENT_SHADER,`precision highp float;
      varying vec2 uv; varying float angle; varying float endFade;
      uniform sampler2D image; uniform float opacity; uniform float time;
      void main(){
        float curl=smoothstep(.08,1.72,angle);
        // A soft ripple keeps the reverse face airy instead of reading as a rigid slab.
        vec2 texUv=uv;
        texUv.x+=sin(texUv.y*18.+time*.8)*.018*curl;
        texUv.y+=cos(texUv.x*12.-time*.55)*.009*curl;
        vec4 c=texture2D(image,texUv);
        if(c.a<.02||endFade<.005)discard;
        float reverse=smoothstep(1.48,1.66,angle);
        float shade=mix(1.-sin(min(angle,1.57))*.13,.72+.12*abs(cos(angle)),reverse);
        c.rgb=c.rgb*shade+vec3(.045,.052,.053)*reverse;
        float translucency=mix(1.,.34,curl);
        gl_FragColor=vec4(c.rgb,c.a*opacity*endFade*translucency);
      }`));
    gl.linkProgram(cardProgram);if(!gl.getProgramParameter(cardProgram,gl.LINK_STATUS))throw new Error('Unable to link folded card shader');
    cardUniforms=Object.fromEntries(['rect','res','hinge','radius','time','index','image','opacity'].map(k=>[k,gl.getUniformLocation(cardProgram,k)]));
    // Shared connected triangle mesh: no independently resampled canvas strips.
    const mesh=[];const nx=16,ny=120;
    for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){const x0=x/nx,x1=(x+1)/nx,y0=y/ny,y1=(y+1)/ny;mesh.push(x0,y0,x1,y0,x0,y1,x0,y1,x1,y0,x1,y1);}
    meshCount=mesh.length/2;meshBuffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,meshBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(mesh),gl.STATIC_DRAW);
  }
  function archPath(x,y,w,h){const p=new Path2D();p.moveTo(x,y+h);p.lineTo(x,y+w*.65);p.bezierCurveTo(x,y-w*.15,x+w,y-w*.15,x+w,y+w*.65);p.lineTo(x+w,y+h);p.closePath();return p;}
  function drawRoom(){
    const c=roomCtx,w=width,h=height;c.setTransform(dpr,0,0,dpr,0,0);
    const base=c.createLinearGradient(0,0,0,h);base.addColorStop(0,'#dedfdc');base.addColorStop(.65,'#eeeeeb');base.addColorStop(1,'#cccfcd');c.fillStyle=base;c.fillRect(0,0,w,h);
    // Architectural bays recede toward the central light.
    for(const side of [-1,1]){
      c.save();if(side===1){c.translate(w,0);c.scale(-1,1);}
      for(let i=3;i>=0;i--){
        const scale=Math.pow(.65,i),aw=w*.142*scale,ah=h*.94*scale;
        const x=w*.285*(1-scale)-w*.022,y=h*.45-ah*.5;
        c.save();c.globalAlpha=.85-i*.15;
        c.shadowColor='#888e8e';c.shadowBlur=25*scale;c.shadowOffsetX=9*scale;
        let fill=c.createLinearGradient(x,0,x+aw,0);fill.addColorStop(0,'#b9bfbe');fill.addColorStop(.13,'#f4f4f0');fill.addColorStop(.62,'#dddfdc');fill.addColorStop(1,'#b6bdbd');c.fillStyle=fill;c.fill(archPath(x,y,aw,ah));c.shadowBlur=0;c.shadowOffsetX=0;
        const inset=aw*.24;
        let inner=c.createLinearGradient(x+inset,0,x+aw,0);inner.addColorStop(0,'#aeb7b8');inner.addColorStop(.35,'#c8cece');inner.addColorStop(1,'#e3e5e0');c.fillStyle=inner;c.fill(archPath(x+inset,y+inset*.8,aw-inset*1.65,ah-inset*.8));
        c.strokeStyle='#f8f8f1';c.lineWidth=1.4;c.stroke(archPath(x+1,y+1,aw-2,ah-1));
        c.restore();
      }c.restore();
    }
    const mist=c.createRadialGradient(w*.5,h*.39,20,w*.5,h*.43,w*.53);mist.addColorStop(0,'rgba(249,249,244,.98)');mist.addColorStop(.45,'rgba(242,243,238,.8)');mist.addColorStop(1,'rgba(230,233,232,0)');c.fillStyle=mist;c.fillRect(0,0,w,h);
    const floor=c.createLinearGradient(0,h*.72,0,h);floor.addColorStop(0,'rgba(234,236,231,0)');floor.addColorStop(1,'rgba(199,205,204,.55)');c.fillStyle=floor;c.fillRect(0,h*.7,w,h*.3);
    c.save();c.filter='blur(12px)';c.fillStyle='#f0f1ed99';c.beginPath();c.ellipse(w*.5,h*.89,w*.43,h*.08,0,0,Math.PI*2);c.fill();c.restore();
  }
  function measure(){
    width=innerWidth;height=innerHeight;dpr=Math.min(devicePixelRatio||1,1.5);
    for(const c of [canvas,page,room]){c.width=Math.round(width*dpr);c.height=Math.round(height*dpr);}
    if(gl){
      gl.viewport(0,0,canvas.width,canvas.height);
      gl.bindTexture(gl.TEXTURE_2D,compositionTexture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,canvas.width,canvas.height,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
      gl.bindRenderbuffer(gl.RENDERBUFFER,depthBuffer);gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH_COMPONENT16,canvas.width,canvas.height);
      gl.bindFramebuffer(gl.FRAMEBUFFER,composition);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,compositionTexture,0);gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,depthBuffer);
      if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw new Error('Gallery framebuffer unavailable');
      gl.bindFramebuffer(gl.FRAMEBUFFER,null);
    }
    const mobile=width<=640,columns=mobile?1:2;
    const area=mobile?width-42:Math.min(width*.75,1420),gap=mobile?0:width*.032;
    const cardWidth=(area-gap)/columns,imageHeight=cardWidth*.525;
    const start=mobile?250:Math.max(260,height*.39),pitch=imageHeight+82;
    // Begin curling lower in the viewport, with a stable radius independent of wheel speed.
    const top=mobile?Math.max(305,height*.43):Math.max(310,height*.5);
    layout={columns,cardWidth,imageHeight,start,pitch,left:(width-area)/2,top,radius:Math.max(80,top-(mobile?205:155)),rows:Math.ceil(items.length/columns)};
    layout.end=Math.max(height,start+layout.rows*pitch+height*.28);
    if(!fallback)section.style.height=layout.end+'px';
    drawRoom();buildSurfaces();
  }
  function buildSurface(item,index,img){
    const c=document.createElement('canvas'),scale=Math.min(dpr,1.5),w=layout.cardWidth,ih=layout.imageHeight;
    // Power-of-two textures allow trilinear mip filtering at the tightly compressed crest.
    c.width=2**Math.ceil(Math.log2(w*scale));c.height=2**Math.ceil(Math.log2((ih+49)*scale));const g=c.getContext('2d');g.scale(c.width/w,c.height/(ih+49));
    g.fillStyle=item.color||'#c5cdcb';g.fillRect(0,0,w,ih);
    if(img&&img.naturalWidth){const ratio=Math.max(w/img.naturalWidth,ih/img.naturalHeight),sw=w/ratio,sh=ih/ratio;g.drawImage(img,(img.naturalWidth-sw)/2,(img.naturalHeight-sh)/2,sw,sh,0,0,w,ih);}
    else {g.fillStyle='#ffffffa0';g.font='28px Montreal,Arial';g.fillText(item.name,22,ih*.55);}
    g.fillStyle='#252725';g.font='16px Montreal,Arial';g.fillText(item.name,0,ih+21);g.font='14px Montreal,Arial';g.fillText(item.description,0,ih+39,w-28);g.font='20px Arial';g.fillText('↘',w-18,ih+34);
    g.strokeStyle='#555b57';g.lineWidth=.65;g.beginPath();g.moveTo(0,ih+48);g.lineTo(w,ih+48);g.stroke();
    const previous=surfaces[index];if(previous&&cardTextures.has(previous)){gl.deleteTexture(cardTextures.get(previous));cardTextures.delete(previous);}
    surfaces[index]=c;
    if(gl){const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,c);gl.generateMipmap(gl.TEXTURE_2D);cardTextures.set(c,texture);}
  }
  const imageCache=new Map();
  function buildSurfaces(){if(gl){for(const texture of cardTextures.values())gl.deleteTexture(texture);cardTextures.clear();}surfaces=[];items.forEach((item,i)=>{let img=imageCache.get(item.img);if(!img){img=new Image();imageCache.set(item.img,img);img.onload=()=>{const index=items.findIndex(it=>it.img===item.img);if(index>=0)buildSurface(items[index],index,img);};img.src=item.img;}buildSurface(item,i,img);});}
  function setItems(next){
    items=next;focused=-1;anchors=[];links.replaceChildren();
    items.forEach((item,i)=>{const a=document.createElement('a');a.href=item.href;a.target='_blank';a.rel='noopener noreferrer';a.className='project-link';a.dataset.index=String(i);a.setAttribute('aria-label',`${item.name} — ${item.description}, open project on GitHub`);
      if(fallback){const img=document.createElement('img');img.src=item.img;img.alt='';a.append(img);}
      const span=document.createElement('span');span.className='link-text';span.textContent=item.name+' — '+item.description;a.append(span);
      a.addEventListener('focus',()=>{focused=i;if(!fallback){const row=Math.floor(i/layout.columns);const y=layout.start+row*layout.pitch;if(y-scroll<layout.top||y+layout.imageHeight-scroll>height)window.scrollTo({top:Math.max(0,y-layout.top-30),behavior:'instant'});}});
      a.addEventListener('blur',()=>{focused=-1;});links.append(a);anchors.push(a);
    });measure();
  }
  function drawCard(surface,x,y,index,time){
    gl.uniform4f(cardUniforms.rect,x+camera.x*3,y,layout.cardWidth,layout.imageHeight+49);
    gl.uniform1f(cardUniforms.index,index);gl.bindTexture(gl.TEXTURE_2D,cardTextures.get(surface));
    gl.drawArrays(gl.TRIANGLES,0,meshCount);
    // Accessible click regions follow the front of the mesh; turned-over portions are decorative.
    const bottom=y+layout.imageHeight+49;
    const crest=layout.top-layout.radius;
    const projectedTop=y>=layout.top?y:layout.top-layout.radius*Math.sin(Math.min(Math.PI/2,(layout.top-y)/layout.radius));
    const minY=Math.max(crest+20,projectedTop),maxY=Math.min(height,bottom);
    const visible=bottom>layout.top&&minY<height&&maxY>minY&&transition>.5;
    const a=anchors[index];a.style.left=(x+camera.x*3)+'px';a.style.top=(visible?minY:height+100)+'px';a.style.width=layout.cardWidth+'px';a.style.height=(visible?maxY-minY:1)+'px';a.style.pointerEvents=visible?'auto':'none';
  }
  function bindGeometry(prog,buffer){
    gl.bindBuffer(gl.ARRAY_BUFFER,buffer);const a=gl.getAttribLocation(prog,'a');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);
  }
  function drawButterflies(time){
    for(const b of butterflies){
      const x=b.x*width+Math.sin(time*.17+b.phase)*width*.055+camera.x*(b.size*2);
      const y=((b.y-time*b.speed*.09+2)%1)*height+Math.cos(time*.23+b.phase)*22+camera.y*b.size;
      const flap=.2+Math.abs(Math.sin(time*2.3+b.phase))*.8;
      ctx.save();ctx.translate(x,y);ctx.rotate(Math.sin(time*.35+b.phase)*.65+b.phase);ctx.scale(b.size,b.size);
      ctx.globalAlpha=.2+(b.size/16)*.27;ctx.fillStyle=b.phase%3>1?'#fffef5':'#9daba9';
      for(const sign of [-1,1]){ctx.save();ctx.scale(sign*flap,1);ctx.beginPath();ctx.moveTo(0,0);ctx.bezierCurveTo(-.1,-.9,1.1,-1.4,.96,-.12);ctx.bezierCurveTo(1.05,.5,.38,.92,0,.15);ctx.fill();ctx.restore();}
      ctx.restore();
    }
  }
  function updateFlow(dt){
    flowCtx.fillStyle=`rgba(128,128,128,${Math.min(.3,dt*.0038)})`;flowCtx.fillRect(0,0,160,100);
    if(Math.abs(mouse.dx)+Math.abs(mouse.dy)>.00002){
      const x=mouse.x*160,y=mouse.y*100,r=12+Math.min(15,Math.hypot(mouse.dx,mouse.dy)*1500);
      const gradient=flowCtx.createRadialGradient(x,y,0,x,y,r);const red=Math.round(128+Math.max(-120,Math.min(120,mouse.dx*4800))),green=Math.round(128+Math.max(-120,Math.min(120,mouse.dy*4800)));
      gradient.addColorStop(0,`rgba(${red},${green},128,.8)`);gradient.addColorStop(1,`rgba(${red},${green},128,0)`);flowCtx.fillStyle=gradient;flowCtx.fillRect(x-r,y-r,r*2,r*2);
    }
    const decay=Math.exp(-dt/90);mouse.dx*=decay;mouse.dy*=decay;mouse.active*=Math.exp(-dt/700);
  }
  function frame(time){
    const dt=Math.min(40,time-(lastTime||time-16.67));lastTime=time;const ease=1-Math.exp(-dt/100),next=scroll+(window.scrollY-scroll)*ease;velocity=next-scroll;scroll=next;
    transition+=(targetTransition-transition)*(1-Math.exp(-dt/160));const cameraEase=1-Math.exp(-dt/650);camera.x+=((mouse.x-.5)*2-camera.x)*cameraEase;camera.y+=((mouse.y-.5)*2-camera.y)*cameraEase;
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);ctx.drawImage(room,0,0,width,height);drawButterflies(time*.001);
    const opacity=Math.max(0,Math.min(1,(layout.end-scroll-height*.45)/180));heading.style.opacity=opacity;heading.style.visibility=opacity<=0?'hidden':'visible';hint.style.opacity=scroll<70?'1':'0';
    updateFlow(dt);
    // Compose the backdrop and depth-tested, double-sided cards before one liquid post-process.
    gl.bindFramebuffer(gl.FRAMEBUFFER,composition);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    gl.disable(gl.DEPTH_TEST);gl.disable(gl.BLEND);gl.useProgram(blitProgram);bindGeometry(blitProgram,quadBuffer);
    gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,sceneTexture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,page);gl.uniform1i(gl.getUniformLocation(blitProgram,'image'),0);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
    gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.disable(gl.CULL_FACE);
    gl.useProgram(cardProgram);bindGeometry(cardProgram,meshBuffer);gl.uniform2f(cardUniforms.res,width,height);gl.uniform1f(cardUniforms.hinge,layout.top);gl.uniform1f(cardUniforms.radius,layout.radius);gl.uniform1f(cardUniforms.time,time*.001);gl.uniform1f(cardUniforms.opacity,transition);gl.uniform1i(cardUniforms.image,0);
    for(let i=0;i<items.length;i++){const row=Math.floor(i/layout.columns),col=i%layout.columns,x=layout.left+col*(layout.cardWidth+width*.032),y=layout.start+row*layout.pitch-scroll+(1-transition)*70;
      if(y+layout.imageHeight+49>layout.top-layout.radius*3.42&&y<height+20&&surfaces[i])drawCard(surfaces[i],x,y,i,time*.001);
      else {anchors[i].style.top=height+100+'px';anchors[i].style.height='1px';anchors[i].style.pointerEvents='none';}}
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.disable(gl.DEPTH_TEST);gl.disable(gl.BLEND);gl.useProgram(program);bindGeometry(program,quadBuffer);
    gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,compositionTexture);gl.uniform1i(uniforms.scene,0);
    gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,flowTexture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,flow);gl.uniform1i(uniforms.flow,1);
    gl.uniform2f(uniforms.res,width,height);gl.uniform2f(uniforms.pointer,mouse.x,mouse.y);gl.uniform1f(uniforms.time,time*.001);gl.uniform1f(uniforms.active,mouse.active);gl.uniform1f(uniforms.hold,held);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);frameId=requestAnimationFrame(frame);
  }
  window.addEventListener('resize',measure);
  document.fonts.ready.then(buildSurfaces);
  document.addEventListener('visibilitychange',()=>{if(fallback)return;if(document.hidden)cancelAnimationFrame(frameId);else{lastTime=0;frameId=requestAnimationFrame(frame);}});
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();cancelAnimationFrame(frameId);location.reload();});
  measure();if(gl)frameId=requestAnimationFrame(frame);
  return {setItems,reset(){scroll=0;transition=0;window.scrollTo({top:0,behavior:'instant'});},pointer(x,y){mouse.dx+=(x/width-mouse.x)*.5;mouse.dy+=(y/height-mouse.y)*.5;mouse.x=x/width;mouse.y=y/height;mouse.active=1;},hold(value){held=value;},get fallback(){return fallback;}};
})();

