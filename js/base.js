/* Utilidades compartidas, la retícula de piezas y los elementos SVG comunes. */
window.Maxo = (function () {
  "use strict";

  const NS = "http://www.w3.org/2000/svg";
  const P = window.PIEZA_PORTADA;
  const { path } = window.Pieza;

  const quieto = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const punteroFino = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const conGsap = !!(window.gsap && window.ScrollTrigger) && !quieto;
  if (conGsap) gsap.registerPlugin(ScrollTrigger);

  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const suave = (t) => 1 - Math.pow(1 - t, 3);

  // Llegada de una pieza: viaja con suavidad y en el último tramo encaja de golpe.
  const encastre = (t) => (t < 0.8 ? 0.9 * suave(t / 0.8) : 1);

  function azar(semilla) {
    return function () {
      semilla = (semilla + 0x6d2b79f5) | 0;
      let t = Math.imul(semilla ^ (semilla >>> 15), 1 | semilla);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function nodo(tag, attrs, padre) {
    const n = document.createElementNS(NS, tag);
    if (attrs) for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (padre) padre.appendChild(n);
    return n;
  }

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

  // En data/obras.json: "" significa que no hay, "[PENDIENTE...]" que falta completarlo.
  const vacio = (v) => v == null || String(v).trim() === "";
  const pendiente = (v) => !vacio(v) && /^\s*\[/.test(String(v));
  const valido = (v) => !vacio(v) && !pendiente(v);

  /* ---------- retícula ----------
     Una grilla de piezas donde la celda (0,0) es la pieza de la portada, con sus esquinas
     reales. Todos los bordes compartidos se generan una sola vez, así las piezas encajan. */
  const [TL, TR, BR, BL] = P.esquinas;
  const DX = 309, DY = 321;
  const CENTRO = { x: (TL[0] + TR[0] + BR[0] + BL[0]) / 4, y: (TL[1] + TR[1] + BR[1] + BL[1]) / 4 };

  function reticula({ filas, columnas, semilla = 7, jitter = 26 }) {
    const [f0, f1] = filas, [c0, c1] = columnas;
    const r = azar(semilla);
    const P_ = {}, H = {}, V = {}, cH = {}, cV = {};
    const k = (i, j) => i + "," + j;
    for (let i = f0; i <= f1 + 1; i++)
      for (let j = c0; j <= c1 + 1; j++)
        P_[k(i, j)] = [TL[0] + j * DX + (r() - 0.5) * jitter, TL[1] + i * DY + (r() - 0.5) * jitter];
    P_[k(0, 0)] = TL; P_[k(0, 1)] = TR; P_[k(1, 1)] = BR; P_[k(1, 0)] = BL;
    for (let i = f0; i <= f1 + 1; i++)
      for (let j = c0; j <= c1; j++) { H[k(i, j)] = r() < 0.5 ? 1 : -1; cH[k(i, j)] = 0.5 + (r() - 0.5) * 0.12; }
    for (let i = f0; i <= f1; i++)
      for (let j = c0; j <= c1 + 1; j++) { V[k(i, j)] = r() < 0.5 ? 1 : -1; cV[k(i, j)] = 0.5 + (r() - 0.5) * 0.12; }
    // los bordes que tocan la pieza de la portada respetan su forma
    H[k(0, 0)] = 1; H[k(1, 0)] = -1; V[k(0, 0)] = -1; V[k(0, 1)] = 1;
    cH[k(0, 0)] = cH[k(1, 0)] = cV[k(0, 0)] = cV[k(0, 1)] = 0.5;

    const celdas = new Map();
    for (let i = f0; i <= f1; i++)
      for (let j = c0; j <= c1; j++) {
        const tl = P_[k(i, j)], tr = P_[k(i, j + 1)], br = P_[k(i + 1, j + 1)], bl = P_[k(i + 1, j)];
        const lados = { arriba: -H[k(i, j)], derecha: V[k(i, j + 1)], abajo: H[k(i + 1, j)], izquierda: -V[k(i, j)] };
        const centros = { arriba: cH[k(i, j)], derecha: cV[k(i, j + 1)], abajo: 1 - cH[k(i + 1, j)], izquierda: 1 - cV[k(i, j)] };
        celdas.set(k(i, j), {
          clave: k(i, j), i, j, esquinas: [tl, tr, br, bl],
          d: path([tl, tr, br, bl], lados, centros),
          cx: (tl[0] + tr[0] + br[0] + bl[0]) / 4,
          cy: (tl[1] + tr[1] + br[1] + bl[1]) / 4,
          anillo: Math.max(Math.abs(i), Math.abs(j)),
          a: r(), b: r(), c: r(),
        });
      }
    return celdas;
  }

  /* ---------- SVG comunes ---------- */
  let uid = 0;
  function defs(svg, rayasId) {
    const id = "m" + ++uid;
    const d = nodo("defs", null, svg);
    d.innerHTML = `
      <clipPath id="${id}-sil"><path d="${P.silueta}"/></clipPath>
      <filter id="${id}-b1" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="4"/></filter>
      <filter id="${id}-b2" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="22"/></filter>
      ${rayasId ? `<pattern id="${rayasId}" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="14" height="14" fill="#15181d"/><rect width="4.5" height="14" fill="#797d81"/></pattern>` : ""}`;
    return id;
  }

  // La pieza de la portada en vector: halo opcional, silueta blanca y sus grietas.
  function piezaPortada(padre, id, conHalo = true) {
    const g = nodo("g", null, padre);
    if (conHalo) {
      nodo("path", { d: P.silueta, class: "halo-2", filter: `url(#${id}-b2)` }, g);
      nodo("path", { d: P.silueta, class: "halo-1", filter: `url(#${id}-b1)` }, g);
    }
    nodo("path", { d: P.silueta, class: "pr-base" }, g);
    const gr = nodo("g", { "clip-path": `url(#${id}-sil)` }, g);
    nodo("path", { d: P.claro, class: "pr-grieta" }, gr);
    nodo("path", { d: P.oscuro, class: "pr-honda" }, gr);
    return g;
  }

  // Posición de llegada en órbita alrededor de un centro (dirección A).
  function orbita(celda, centro, e) {
    const vx = celda.cx - centro.x, vy = celda.cy - centro.y;
    const R = Math.hypot(vx, vy), ang = Math.atan2(vy, vx);
    const R0 = R * 1.7 + 420, ang0 = ang + 1.1 + celda.b * 0.5;
    const r = lerp(R0, R, e), a = lerp(ang0, ang, e);
    const tx = centro.x + r * Math.cos(a) - celda.cx, ty = centro.y + r * Math.sin(a) - celda.cy;
    return `translate(${tx.toFixed(1)} ${ty.toFixed(1)}) rotate(${((1 - e) * (90 + celda.c * 90)).toFixed(1)} ${celda.cx.toFixed(1)} ${celda.cy.toFixed(1)})`;
  }

  // Links: solo http(s). De Spotify y YouTube se saca lo necesario para el reproductor.
  const urlSegura = (u) => (valido(u) && /^https?:\/\//i.test(String(u).trim()) ? String(u).trim() : null);
  function spotifyEmbed(u) {
    const m = String(u || "").match(/open\.spotify\.com\/(?:intl-[a-z-]+\/)?(track|album|playlist|episode)\/([A-Za-z0-9]+)/);
    return m ? `https://open.spotify.com/embed/${m[1]}/${m[2]}?utm_source=generator&theme=0` : null;
  }
  function youtubeId(u) {
    const m = String(u || "").match(/(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/|\/live\/)([A-Za-z0-9_-]{11})/);
    return m ? m[1] : null;
  }
  // Segundo de inicio de un link de YouTube (&t=259s, &t=4m19s o &start=259).
  function youtubeInicio(u) {
    const m = String(u || "").match(/[?&#](?:t|start)=([0-9hms]+)/);
    if (!m) return 0;
    if (/^\d+$/.test(m[1])) return +m[1];
    const parte = (l) => +((m[1].match(new RegExp("(\\d+)" + l)) || [0, 0])[1]);
    return parte("h") * 3600 + parte("m") * 60 + parte("s");
  }
  function youtubeEmbed(u) {
    const id = youtubeId(u);
    if (!id) return null;
    const inicio = youtubeInicio(u);
    return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0${inicio > 5 ? "&start=" + inicio : ""}`;
  }

  // "2026-08-05" -> "5 de agosto de 2026"
  const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  function fechaLarga(iso) {
    const m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return m ? `${+m[3]} de ${MESES[+m[2] - 1]} de ${m[1]}` : null;
  }

  // Texto que puede venir como [PENDIENTE]: se marca para que se vea que falta.
  const texto = (v) => (pendiente(v) ? `<span class="pendiente">${esc(v)}</span>` : esc(v));

  const iconoPieza = '<svg class="icono-pieza" aria-hidden="true" focusable="false"><use href="#pieza-icono"/></svg>';

  return {
    NS, P, DX, DY, CENTRO, quieto, punteroFino, conGsap,
    clamp, lerp, suave, encastre, azar, nodo, esc, vacio, pendiente, valido,
    reticula, defs, piezaPortada, orbita, iconoPieza,
    urlSegura, spotifyEmbed, youtubeId, youtubeInicio, youtubeEmbed, fechaLarga, texto,
  };
})();
