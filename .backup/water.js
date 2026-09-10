(function mountWater() {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = window.matchMedia("(pointer: fine)").matches;
  if (reduced || !fine) return;

  const canvas = document.getElementById("water");
  const ring = document.querySelector(".cursor-ring");
  if (!canvas) return;

  const ctx = canvas.getContext("2d", { alpha: true });
  const sim = document.createElement("canvas");
  const sctx = sim.getContext("2d", { willReadFrequently: true });

  let w = 0;
  let h = 0;
  let scale = 0.5;
  const mouse = { x: innerWidth / 2, y: innerHeight / 2, px: 0, py: 0 };
  const core = { x: mouse.x, y: mouse.y, vx: 0, vy: 0 };
  const drops = [];

  function resize() {
    w = canvas.width = innerWidth;
    h = canvas.height = innerHeight;
    sim.width = Math.max(160, Math.floor(w * scale));
    sim.height = Math.max(90, Math.floor(h * scale));
  }
  resize();
  window.addEventListener("resize", resize);

  window.addEventListener(
    "pointermove",
    (e) => {
      mouse.px = mouse.x;
      mouse.py = mouse.y;
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      if (ring) {
        ring.style.left = `${e.clientX}px`;
        ring.style.top = `${e.clientY}px`;
        ring.classList.add("is-on");
      }

      const dx = mouse.x - mouse.px;
      const dy = mouse.y - mouse.py;
      const spd = Math.hypot(dx, dy);
      if (spd < 1.2) return;

      const n = Math.min(10, 1 + Math.floor(spd / 10));
      for (let i = 0; i < n; i++) {
        const spread = (Math.random() - 0.5) * 2.4;
        const nx = -dx / spd;
        const ny = -dy / spd;
        const px = -ny;
        const py = dx / spd;
        drops.push({
          x: mouse.x + (Math.random() - 0.5) * 6,
          y: mouse.y + (Math.random() - 0.5) * 6,
          vx: nx * spd * (0.22 + Math.random() * 0.28) + px * spread * spd * 0.32,
          vy: ny * spd * (0.22 + Math.random() * 0.28) + py * spread * spd * 0.32,
          r: 5 + Math.random() * 11,
          life: 1,
          decay: 0.018 + Math.random() * 0.03,
        });
      }
    },
    { passive: true }
  );

  function blob(ctx2, x, y, r, a) {
    const g = ctx2.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(255,255,255,${a})`);
    g.addColorStop(0.45, `rgba(255,255,255,${a * 0.45})`);
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx2.fillStyle = g;
    ctx2.beginPath();
    ctx2.arc(x, y, r, 0, Math.PI * 2);
    ctx2.fill();
  }

  function frame() {
    const k = 0.18;
    core.vx += (mouse.x - core.x) * k;
    core.vy += (mouse.y - core.y) * k;
    core.vx *= 0.72;
    core.vy *= 0.72;
    core.x += core.vx;
    core.y += core.vy;

    const stretch = Math.min(1.8, 1 + Math.hypot(core.vx, core.vy) * 0.04);

    for (let i = drops.length - 1; i >= 0; i--) {
      const d = drops[i];
      d.x += d.vx;
      d.y += d.vy;
      d.vx *= 0.94;
      d.vy *= 0.94;
      d.life -= d.decay;
      d.r *= 1.012;
      if (d.life <= 0 || drops.length > 60) drops.splice(i, 1);
    }

    sctx.clearRect(0, 0, sim.width, sim.height);
    sctx.globalCompositeOperation = "lighter";
    const sx = sim.width / w;
    const sy = sim.height / h;

    blob(sctx, core.x * sx, core.y * sy, 16 * sx * stretch, 1);
    for (const d of drops) {
      blob(sctx, d.x * sx, d.y * sy, d.r * sx, d.life * 0.85);
    }

    const img = sctx.getImageData(0, 0, sim.width, sim.height);
    const data = img.data;
    for (let i = 0; i < data.length; i += 4) {
      const v = data[i];
      if (v > 150) {
        const t = Math.min(1, (v - 150) / 70);
        data[i] = 210 + t * 45;
        data[i + 1] = 200 + t * 40;
        data[i + 2] = 170 + t * 50;
        data[i + 3] = Math.floor(90 + t * 90);
      } else {
        data[i + 3] = 0;
      }
    }
    sctx.putImageData(img, 0, 0);

    ctx.clearRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = true;
    ctx.filter = "blur(3px)";
    ctx.drawImage(sim, 0, 0, w, h);
    ctx.filter = "none";

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
})();
