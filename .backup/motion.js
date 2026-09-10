const PROJECTS = {
  frontend: [
    {
      name: "Flames",
      sub: "Frontend · Web — cinematic fire study",
      href: "https://github.com/imacul/flames",
      img: "assets/flames.png",
    },
    {
      name: "Ice",
      sub: "Frontend · Web — live WebGL glass",
      href: "https://github.com/imacul/ice",
      img: "assets/ice.png",
    },
    {
      name: "Air",
      sub: "Frontend · Web — wind, pressure, sky",
      href: "https://github.com/imacul/air",
      img: "assets/air.jpg",
    },
    {
      name: "Rock",
      sub: "Frontend · Web — gated stone studies",
      href: "https://github.com/imacul/rock",
      img: "assets/rock.jpg",
    },
    {
      name: "Sculpt",
      sub: "Frontend · Web — browser 3D sculpting",
      href: "https://github.com/imacul/sculpt",
      img: "assets/sculpt.png",
    },
    {
      name: "Mesh Editor",
      sub: "Frontend · Web — mesh editing workspace",
      href: "https://github.com/imacul/mesh-editor-web",
      img: "assets/mesh.png",
    },
  ],
  fullstack: [
    {
      name: "MedViz",
      sub: "Fullstack · Web — 3D medical mesh editor",
      href: "https://github.com/imacul/medviz-web-editor",
      img: "assets/medviz.png",
    },
    {
      name: "AnimTheme",
      sub: "Fullstack · Web — motion marketplace",
      href: "https://github.com/imacul/animtheme",
      img: "assets/animtheme.png",
    },
    {
      name: "Atlas",
      sub: "Fullstack · Web — sites into Figma",
      href: "https://github.com/imacul/atlas-showcase",
      img: "assets/atlas.png",
    },
    {
      name: "Smileville",
      sub: "Fullstack · Web — dental review portal",
      href: "https://github.com/imacul/smileville",
      img: "assets/smileville.png",
    },
  ],
  mobile: [
    {
      name: "RideWave",
      sub: "Mobile · iOS/Android — ride hailing",
      href: "https://github.com/imacul/ridewave",
      img: "assets/ridewave.png",
    },
    {
      name: "Servix",
      sub: "Mobile · iOS/Android — artisan app",
      href: "https://github.com/imacul/servix",
      img: "assets/servix.png",
    },
  ],
};

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const fine = window.matchMedia("(pointer: fine)").matches;
if (fine) document.body.classList.add("is-fine");

const filters = [...document.querySelectorAll(".filter")];
const ring = document.querySelector(".cursor-ring");
const filmEl = document.getElementById("film");

let filter = "all";
let lastProgress = 0;
let mx = 0.5;
let my = 0.5;

function listFor(mode) {
  if (mode === "frontend") return PROJECTS.frontend;
  if (mode === "fullstack") return PROJECTS.fullstack;
  if (mode === "mobile") return PROJECTS.mobile;
  return [...PROJECTS.frontend, ...PROJECTS.fullstack, ...PROJECTS.mobile];
}

function applyFilter(next) {
  filter = next;
  filters.forEach((btn) => btn.classList.toggle("is-on", btn.dataset.filter === next));
  window.Film.setItems(listFor(filter));
}

filters.forEach((btn) => {
  btn.addEventListener("click", () => applyFilter(btn.dataset.filter));
});

window.Film.setItems(listFor("all"));

const themeBtn = document.querySelector(".theme-toggle");
function applyTheme(next) {
  document.documentElement.setAttribute("data-theme", next);
  try {
    localStorage.setItem("imacul77-theme", next);
  } catch (e) {}
}
if (themeBtn) {
  themeBtn.addEventListener("click", () => {
    const next = document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
    applyTheme(next);
  });
}

if (!reduced && window.Lenis) {
  const lenis = new Lenis({
    lerp: 0.085,
    wheelMultiplier: 0.85,
    smoothWheel: true,
  });
  gsap.registerPlugin(ScrollTrigger);
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  ScrollTrigger.create({
    trigger: ".work",
    start: "top top",
    end: "bottom bottom",
    onUpdate: (self) => {
      const dv = self.progress - lastProgress;
      lastProgress = self.progress;
      window.Film.setOffset(self.progress, dv * 32);
    },
  });
}

window.addEventListener(
  "pointermove",
  (e) => {
    if (ring) {
      ring.style.left = `${e.clientX}px`;
      ring.style.top = `${e.clientY}px`;
      ring.classList.add("is-on");
    }
    if (!filmEl) return;
    const r = filmEl.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width;
    const ny = (e.clientY - r.top) / r.height;
    const inside = nx >= 0 && nx <= 1 && ny >= 0 && ny <= 1;
    window.Film.setMouse(
      inside ? nx : Math.max(0, Math.min(1, nx)),
      inside ? ny : Math.max(0, Math.min(1, ny)),
      nx - mx,
      ny - my
    );
    mx = nx;
    my = ny;
  },
  { passive: true }
);
