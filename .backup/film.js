window.Film = (function () {
  const canvas = document.getElementById("film");
  if (!canvas) return { setItems() {}, setOffset() {}, setMouse() {} };

  const gl = canvas.getContext("webgl", { premultipliedAlpha: false, alpha: false, antialias: true });
  const view = gl ? null : canvas.getContext("2d");
  const page = document.createElement("canvas");
  const ctx = page.getContext("2d");
  const flow = document.createElement("canvas");
  const fctx = flow.getContext("2d");
  flow.width = 128;
  flow.height = 128;

  const images = new Map();
  let items = [];
  let offset = 0;
  let vel = 0;
  let foldDir = 0;
  let mouse = { x: 0.5, y: 0.5, vx: 0, vy: 0 };
  let hits = [];
  let time = 0;

  const vs = `
    attribute vec2 a;
    varying vec2 v;
    void main(){
      v = a * 0.5 + 0.5;
      v.y = 1.0 - v.y;
      gl_Position = vec4(a, 0.0, 1.0);
    }
  `;
  const fs = `
    precision highp float;
    varying vec2 v;
    uniform sampler2D uTex;
    uniform sampler2D uFlow;
    uniform vec2 uMouse;
    uniform vec2 uVel;
    uniform float uTime;
    uniform vec2 uRes;
    void main(){
      vec2 uv = v;
      vec2 aspect = vec2(uRes.x / uRes.y, 1.0);
      vec2 p = (uv - uMouse) * aspect;
      float d = length(p);
      vec2 n = d > 0.0001 ? p / d : vec2(0.0);
      float splash = exp(-d * 10.0);
      vec2 flow = texture2D(uFlow, uv).rg * 2.0 - 1.0;
      uv += flow * 0.11;
      uv += n * sin(d * 28.0 - uTime * 8.0) * 0.03 * splash;
      uv += uVel * splash * 0.55;
      float ca = 0.003 + (0.01 + length(flow) * 0.04) * splash;
      vec3 c;
      c.r = texture2D(uTex, uv + vec2(ca, 0.0)).r;
      c.g = texture2D(uTex, uv).g;
      c.b = texture2D(uTex, uv - vec2(ca, 0.0)).b;
      gl_FragColor = vec4(c, 1.0);
    }
  `;

  let prog = null;
  let tex = null;
  let flowTex = null;
  let uTex, uFlow, uMouse, uVel, uTime, uRes;
  if (gl) {
    function compile(type, src) {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    }
    prog = gl.createProgram();
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, vs));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(prog);
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "a");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    tex = gl.createTexture();
    flowTex = gl.createTexture();
    function setupTex(t) {
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }
    setupTex(tex);
    setupTex(flowTex);
    uTex = gl.getUniformLocation(prog, "uTex");
    uFlow = gl.getUniformLocation(prog, "uFlow");
    uMouse = gl.getUniformLocation(prog, "uMouse");
    uVel = gl.getUniformLocation(prog, "uVel");
    uTime = gl.getUniformLocation(prog, "uTime");
    uRes = gl.getUniformLocation(prog, "uRes");
  }

  function load(src) {
    if (images.has(src)) return;
    const img = new Image();
    img.onload = () => images.set(src, img);
    img.src = src;
    images.set(src, null);
  }

  function sourceRect(img, dw, dh) {
    const ir = img.width / img.height;
    const cr = dw / dh;
    if (ir > cr) {
      const sh = img.height;
      const sw = sh * cr;
      return { sx: (img.width - sw) / 2, sy: 0, sw, sh };
    }
    const sw = img.width;
    const sh = sw / cr;
    return { sx: 0, sy: (img.height - sh) / 2, sw, sh };
  }

  function mapCylinder(y, H, Rtop, Rbot) {
    const top = Rtop;
    const bot = H - Rbot;
    if (y >= top && y <= bot) {
      return { y, scaleY: 1, squeeze: 1, angle: 0, zone: "flat" };
    }
    if (y < top) {
      const angle = Math.min(Math.PI * 0.92, (top - y) / Math.max(1, Rtop));
      return {
        y: top - Rtop * Math.sin(angle),
        scaleY: Math.max(0.04, Math.cos(angle)),
        squeeze: 0.78 + 0.22 * Math.cos(angle),
        angle,
        zone: "top",
      };
    }
    const angle = Math.min(Math.PI * 0.92, (y - bot) / Math.max(1, Rbot));
    return {
      y: bot + Rbot * Math.sin(angle),
      scaleY: Math.max(0.04, Math.cos(angle)),
      squeeze: 0.78 + 0.22 * Math.cos(angle),
      angle,
      zone: "bottom",
    };
  }

  function drawCardSlices(img, item, x, stripTop, cellW, imgH, metaH, H, Rtop, Rbot, ink, muted) {
    const cardH = imgH + metaH;
    const slices = 48;
    const sliceH = cardH / slices;
    const src = img && img.width ? sourceRect(img, cellW, imgH) : null;

    for (let i = 0; i < slices; i++) {
      const t = i / slices;
      const y0 = stripTop + i * sliceH;
      const a = mapCylinder(y0, H, Rtop, Rbot);
      const b = mapCylinder(y0 + sliceH, H, Rtop, Rbot);
      if (a.scaleY < 0.05 && b.scaleY < 0.05) continue;
      const destY = a.y;
      const destH = Math.max(0.6, b.y - a.y) + 0.8;
      const squeeze = (a.squeeze + b.squeeze) * 0.5;
      const dw2 = cellW * squeeze;
      const dx2 = x + (cellW - dw2) / 2;
      const inImage = y0 < stripTop + imgH;

      if (inImage && src) {
        const imgT = Math.max(0, Math.min(1, (y0 - stripTop) / imgH));
        const srcY = src.sy + imgT * src.sh;
        const srcH = Math.max(1, src.sh / (imgH / sliceH));
        ctx.drawImage(img, src.sx, srcY, src.sw, srcH, dx2, destY, dw2, destH);
      }
    }

    const namePos = mapCylinder(stripTop + imgH + metaH * 0.38, H, Rtop, Rbot);
    if (namePos.zone === "flat" && namePos.scaleY > 0.5) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, namePos.scaleY * 1.35);
      const dw2 = cellW * namePos.squeeze;
      const dx2 = x + (cellW - dw2) / 2;
      ctx.fillStyle = ink;
      ctx.font = `500 ${Math.round(H * 0.022)}px Geist, sans-serif`;
      ctx.fillText(item.name, dx2, namePos.y);
      ctx.fillStyle = muted;
      ctx.font = `400 ${Math.round(H * 0.016)}px Geist, sans-serif`;
      ctx.fillText(item.sub, dx2, namePos.y + H * 0.024 * namePos.scaleY);
      ctx.restore();
    }
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.floor(rect.width * dpr));
    const h = Math.max(1, Math.floor(rect.height * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = page.width = w;
      canvas.height = page.height = h;
      if (gl) gl.viewport(0, 0, w, h);
    }
  }

  function drawPage() {
    const w = page.width;
    const h = page.height;
    const theme = getComputedStyle(document.documentElement);
    const bg = theme.getPropertyValue("--bg").trim() || "#050505";
    const ink = theme.getPropertyValue("--text").trim() || "#ffffff";
    const muted = theme.getPropertyValue("--muted").trim() || "#8e8e8e";
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    hits = [];
    if (!items.length) return;

    const gapX = w * 0.028;
    const speed = Math.min(1, Math.abs(foldDir));
    const base = h * 0.06;
    const extra = h * (0.1 + speed * 0.16);
    const Rtop = foldDir >= 0.04 ? extra : base;
    const Rbot = foldDir <= -0.04 ? extra : base;
    const flatH = h - Rtop - Rbot;
    const rowH = flatH / 2;
    const imgH = rowH * 0.78;
    const metaH = rowH * 0.22;
    const cellW = (w - gapX) / 2;
    const rows = Math.ceil(items.length / 2);
    const maxOff = Math.max(0.001, rows - 2);
    const off = offset * maxOff;

    const ordered = [];
    for (let i = 0; i < items.length; i++) {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const stripTop = Rtop + (row - off) * rowH;
      if (stripTop + rowH < -Rtop || stripTop > h + Rbot) continue;
      ordered.push({ i, col, stripTop });
    }
    ordered.sort((a, b) => {
      const da = Math.abs(a.stripTop + rowH * 0.5 - h * 0.5);
      const db = Math.abs(b.stripTop + rowH * 0.5 - h * 0.5);
      return db - da;
    });

    for (const o of ordered) {
      const x = o.col * (cellW + gapX);
      const item = items[o.i];
      const img = images.get(item.img);
      drawCardSlices(img, item, x, o.stripTop, cellW, imgH, metaH, h, Rtop, Rbot, ink, muted);
      hits.push({
        x,
        y: mapCylinder(o.stripTop, h, Rtop, Rbot).y,
        w: cellW,
        h: rowH,
        href: item.href,
      });
    }
  }

  function splatFlow() {
    fctx.fillStyle = "rgba(128,128,128,0.12)";
    fctx.fillRect(0, 0, 128, 128);
    const vx = Math.max(-1, Math.min(1, mouse.vx * 8));
    const vy = Math.max(-1, Math.min(1, mouse.vy * 8));
    const r = 18 + Math.hypot(vx, vy) * 22;
    const cx = mouse.x * 128;
    const cy = mouse.y * 128;
    const g = fctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    const cr = Math.floor(128 + vx * 110);
    const cg = Math.floor(128 + vy * 110);
    g.addColorStop(0, `rgba(${cr},${cg},128,0.95)`);
    g.addColorStop(1, "rgba(128,128,128,0)");
    fctx.fillStyle = g;
    fctx.beginPath();
    fctx.arc(cx, cy, r, 0, Math.PI * 2);
    fctx.fill();
  }

  function frame(t) {
    time = t * 0.001;
    resize();
    vel *= 0.955;
    foldDir += Math.max(-1, Math.min(1, vel)) * 0.08;
    foldDir *= 0.94;
    mouse.vx *= 0.88;
    mouse.vy *= 0.88;
    try {
      drawPage();
      splatFlow();
      if (gl) {
        gl.useProgram(prog);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, page);
        gl.uniform1i(uTex, 0);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, flowTex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, flow);
        gl.uniform1i(uFlow, 1);
        gl.uniform2f(uMouse, mouse.x, mouse.y);
        gl.uniform2f(uVel, mouse.vx, mouse.vy);
        gl.uniform1f(uTime, time);
        gl.uniform2f(uRes, canvas.width, canvas.height);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      } else if (view) {
        view.drawImage(page, 0, 0);
      }
    } catch (err) {
      console.warn(err);
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  canvas.addEventListener("click", (e) => {
    const r = canvas.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * page.width;
    const y = ((e.clientY - r.top) / r.height) * page.height;
    const hit = hits.find((h) => x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h);
    if (hit && hit.href) window.open(hit.href, "_blank", "noopener");
  });

  return {
    setItems(next) {
      items = next || [];
      items.forEach((it) => load(it.img));
      offset = 0;
    },
    setOffset(v, velocity) {
      offset = Math.max(0, Math.min(1, v));
      vel += velocity;
    },
    setMouse(nx, ny, dvx, dvy) {
      mouse.x = nx;
      mouse.y = ny;
      mouse.vx += dvx;
      mouse.vy += dvy;
    },
  };
})();
