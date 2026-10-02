/* Arranque de la web: arma todo y lee data/obras.json. */
(function () {
  "use strict";
  const M = window.Maxo;
  const { P, nodo, esc, valido, urlSegura, clamp, encastre, orbita, iconoPieza, quieto, punteroFino, conGsap } = M;
  const raiz = document.documentElement;

  /* ---------- la silueta en todos lados ---------- */
  document.querySelectorAll("[data-silueta]").forEach((p) => p.setAttribute("d", P.silueta));
  const mascara = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${P.w} ${P.h}"><path d="${P.silueta}"/></svg>`;
  raiz.style.setProperty("--pieza-mascara", `url("data:image/svg+xml,${encodeURIComponent(mascara)}")`);
  // para tu foto: una pieza vertical con pestañas a los cuatro lados, así ningún hueco le corta la cara
  const retrato = window.Pieza.rect(37.5, 30, 100, 125, { arriba: 1, derecha: 1, abajo: 1, izquierda: 1 });
  raiz.style.setProperty("--pieza-retrato", `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 175 185"><path d="${retrato}"/></svg>`)}")`);

  /* ---------- cargador: la silueta se dibuja como un trazo de estrella ---------- */
  (function cargador() {
    const el = document.querySelector(".cargador");
    if (quieto || !el) return;
    try { if (sessionStorage.getItem("maxo-visto")) return; sessionStorage.setItem("maxo-visto", "1"); } catch (e) { /* sin storage: se muestra igual */ }
    const svg = el.querySelector("svg");
    svg.setAttribute("viewBox", `-10 -10 ${P.w + 20} ${P.h + 20}`);
    const path = svg.querySelector("path");
    path.setAttribute("d", P.silueta);
    path.setAttribute("pathLength", "1");
    el.classList.add("activo");
    const minimo = new Promise((r) => setTimeout(r, 1150));
    const fuentes = document.fonts ? document.fonts.ready : Promise.resolve();
    const tope = new Promise((r) => setTimeout(r, 2600));
    Promise.race([Promise.all([minimo, fuentes]), tope]).then(() => {
      el.style.transition = "opacity .5s";
      el.style.opacity = "0";
      setTimeout(() => el.classList.remove("activo"), 520);
    });
  })();

  /* ---------- cielo y entrada ---------- */
  const recorrido = document.querySelector(".inicio-recorrido");
  M.cielo(document.querySelector(".cielo"), () => recorrido.offsetHeight - innerHeight);
  M.inicio(document.querySelector(".inicio"));

  /* ---------- menú ---------- */
  const menu = document.querySelector(".menu");
  const fondoMenu = () => menu.classList.toggle("con-fondo", scrollY > recorrido.offsetHeight - innerHeight * 1.05);
  addEventListener("scroll", fondoMenu, { passive: true });
  fondoMenu();
  const enlaces = new Map([...menu.querySelectorAll("nav a")].map((a) => [a.getAttribute("href").slice(1), a]));
  const observador = new IntersectionObserver((entradas) => {
    for (const e of entradas) {
      const a = enlaces.get(e.target.id);
      if (!a) continue;
      if (e.isIntersecting) { enlaces.forEach((x) => x.removeAttribute("aria-current")); a.setAttribute("aria-current", "true"); }
      else if (a.getAttribute("aria-current")) a.removeAttribute("aria-current");
    }
  }, { rootMargin: "-45% 0px -50% 0px" });
  enlaces.forEach((_, id) => { const s = document.getElementById(id); if (s) observador.observe(s); });

  /* ---------- cursor: una pieza que invierte lo que tiene abajo y va a la deriva ---------- */
  (function cursor() {
    if (!punteroFino) return;
    const c = document.createElement("div");
    c.className = "cursor";
    c.setAttribute("aria-hidden", "true");
    c.innerHTML = `<svg viewBox="0 0 ${P.w} ${P.h}"><path d="${P.silueta}" fill="#fff"/></svg>`;
    document.body.appendChild(c);
    raiz.classList.add("con-cursor");
    let x = 0, y = 0, cx = 0, cy = 0, giro = 0, activo = false;
    addEventListener("pointermove", (e) => {
      if (e.pointerType !== "mouse") return;
      x = e.clientX; y = e.clientY;
      if (!activo) { cx = x; cy = y; activo = true; c.classList.add("visible"); }
      c.classList.toggle("sobre-algo", !!(e.target.closest && e.target.closest("a, button, .publicada")));
    });
    raiz.addEventListener("mouseleave", () => { activo = false; c.classList.remove("visible"); });
    const seguir = () => {
      if (!activo) return;
      const k = quieto ? 1 : 0.22;
      cx += (x - cx) * k; cy += (y - cy) * k;
      if (!quieto) giro += 0.12;
      c.style.transform = `translate(${cx.toFixed(1)}px, ${cy.toFixed(1)}px) rotate(${giro.toFixed(1)}deg)`;
    };
    if (window.gsap) gsap.ticker.add(seguir); else (function bucle() { seguir(); requestAnimationFrame(bucle); })();
  })();

  /* ---------- separadores: un trazo de estrella con una pieza que lo recorre ---------- */
  document.querySelectorAll("[data-separador]").forEach((el, k) => {
    const r = M.azar(40 + k);
    const estrellas = Array.from({ length: 46 }, () => `<circle cx="${(r() * 1000).toFixed(0)}" cy="${(r() * 90).toFixed(0)}" r="${r() < 0.9 ? 0.8 : 1.4}" fill="#fff" opacity="${(0.12 + r() * 0.45).toFixed(2)}"/>`).join("");
    const arco = `sep-${k}`;
    el.innerHTML = `<svg viewBox="0 0 1000 90" preserveAspectRatio="none">${estrellas}
      <path id="${arco}" d="M-10 84 Q 500 -24 1010 84" fill="none" stroke="#fff" stroke-opacity=".3" stroke-width="1" vector-effect="non-scaling-stroke"/></svg>
      <svg class="sep-pieza" viewBox="0 0 ${P.w} ${P.h}" aria-hidden="true"><path d="${P.silueta}" fill="#fff"/></svg>`;
    const pieza = el.querySelector(".sep-pieza");
    if (!conGsap) { pieza.style.left = "50%"; return; }
    gsap.fromTo(pieza, { "--t": 0 }, {
      "--t": 1, ease: "none",
      scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: 0.4 },
      onUpdate() {
        // sigue la curva del arco: x lineal, y por la cuadrática
        const t = this.progress();
        pieza.style.left = t * 100 + "%";
        pieza.style.top = ((1 - t) * (1 - t) * 84 + 2 * (1 - t) * t * -24 + t * t * 84) / 90 * 100 + "%";
        pieza.style.transform = `translate(-50%, -50%) rotate(${(t - 0.5) * 50}deg)`;
      },
    });
  });

  /* ---------- títulos que se estiran (y nunca se salen de la pantalla) ---------- */
  const titulos = [...document.querySelectorAll("[data-estirar]")];
  function ajustarTitulos() {
    for (const t of titulos) {
      t.style.fontSize = "";
      const antes = t.style.fontVariationSettings;
      t.style.fontVariationSettings = '"wdth" 112';
      const disponible = t.parentElement.clientWidth;
      if (t.scrollWidth > disponible) t.style.fontSize = parseFloat(getComputedStyle(t).fontSize) * (disponible / t.scrollWidth) * 0.98 + "px";
      t.style.fontVariationSettings = antes;
    }
  }
  ajustarTitulos();
  if (document.fonts) document.fonts.ready.then(ajustarTitulos);
  addEventListener("resize", ajustarTitulos);
  titulos.forEach((t) => {
    if (!conGsap) { t.style.fontVariationSettings = '"wdth" 112'; return; }
    gsap.fromTo(t, { fontVariationSettings: '"wdth" 62' }, {
      fontVariationSettings: '"wdth" 112', ease: "none",
      scrollTrigger: { trigger: t, start: "top 95%", end: "top 40%", scrub: 0.4 },
    });
  });

  /* ---------- sobre mí: las líneas entran de a una, con corte seco ---------- */
  if (conGsap) {
    gsap.from(".manifiesto > *", {
      autoAlpha: 0, duration: 0.01, stagger: 0.22,
      scrollTrigger: { trigger: ".manifiesto", start: "top 75%", toggleActions: "play none none reverse" },
    });
    gsap.from(".sobre-foto", {
      rotate: -24, x: -60, autoAlpha: 0, duration: 1.1, ease: "power3.out",
      scrollTrigger: { trigger: ".sobre-foto", start: "top 80%", toggleActions: "play none none reverse" },
    });
  }

  /* ---------- contacto: la última pieza completa el rompecabezas ---------- */
  function ultimaPieza() {
    const svg = document.querySelector("[data-ultima-pieza]");
    const celdas = M.reticula({ filas: [-1, 1], columnas: [-2, 1], semilla: 7 }); // la misma retícula de la entrada
    const id = M.defs(svg, "rayas-contacto");
    const hueco = celdas.get("0,-1");
    // la vista queda centrada entre el hueco y tu pieza
    const medioX = (hueco.cx + M.CENTRO.x) / 2, medioY = (hueco.cy + M.CENTRO.y) / 2;
    svg.setAttribute("viewBox", `${medioX - 560} ${medioY - 380} 1120 760`);
    for (const c of celdas.values()) if (c.clave !== "0,0" && c.clave !== "0,-1") nodo("path", { d: c.d, class: "vecina" }, svg);
    nodo("path", { d: hueco.d, class: "hueco" }, svg);
    M.piezaPortada(svg, id, true);
    const ultima = nodo("g", null, svg);
    nodo("path", { d: hueco.d, class: "halo-2", filter: `url(#${id}-b2)` }, ultima);
    nodo("path", { d: hueco.d, class: "ultima" }, ultima);
    const centro = { x: hueco.cx + 140, y: hueco.cy - 40 };
    const pintar = (p) => {
      const e = encastre(clamp(p));
      ultima.setAttribute("transform", orbita(hueco, centro, e));
      ultima.style.opacity = clamp(e * 1.6);
    };
    if (!conGsap) { pintar(1); return; }
    const estado = { p: 0 };
    pintar(0);
    gsap.to(estado, {
      p: 1, ease: "none", onUpdate: () => pintar(estado.p),
      scrollTrigger: { trigger: "#contacto", start: "top 85%", end: "top 25%", scrub: 0.6 },
    });
  }

  function contacto(datos) {
    const mail = (datos && datos.mail) || "";
    const lugarMail = document.querySelector("[data-mail]");
    if (valido(mail) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) {
      lugarMail.innerHTML = `<a href="mailto:${esc(mail)}">${esc(mail)}</a><button type="button" class="boton" data-copiar>${iconoPieza}<span>Copiar mail</span></button>`;
      const b = lugarMail.querySelector("[data-copiar]");
      b.addEventListener("click", async () => {
        try { await navigator.clipboard.writeText(mail); b.querySelector("span").textContent = "Copiado"; }
        catch (e) { b.querySelector("span").textContent = "No pude copiarlo"; }
        setTimeout(() => (b.querySelector("span").textContent = "Copiar mail"), 2200);
      });
    } else {
      lugarMail.innerHTML = `<span class="pendiente">[PENDIENTE: tu mail]</span>`;
    }
    const redes = (datos && datos.redes) || [];
    document.querySelector("[data-redes]").innerHTML = redes.map((r) => {
      const u = urlSegura(r.url);
      if (/^\s*pr[oó]ximamente\s*$/i.test(r.url || "")) return `<li><span class="boton" aria-disabled="true">${esc(r.nombre)} <span class="prox">próximamente</span></span></li>`;
      return u
        ? `<li><a class="boton" href="${esc(u)}" target="_blank" rel="noopener">${iconoPieza}${esc(r.nombre)}</a></li>`
        : `<li><span class="boton" aria-disabled="true">${esc(r.nombre)} <span class="pendiente">[PENDIENTE]</span></span></li>`;
    }).join("");
  }

  /* ---------- a la deriva: te lleva a una obra cualquiera ---------- */
  function deriva(musica, pantalla) {
    const boton = document.querySelector("[data-deriva]");
    boton.addEventListener("click", () => {
      const opciones = [
        ...musica.publicadas().map((p) => () => musica.abrir(p.c.id)),
        ...pantalla.planos().map((pl) => () => {
          pl.scrollIntoView({ behavior: quieto ? "auto" : "smooth", block: "center" });
          const foco = pl.querySelector("h3"); foco.setAttribute("tabindex", "-1"); foco.focus({ preventScroll: true });
        }),
      ];
      if (opciones.length) opciones[Math.floor(Math.random() * opciones.length)]();
    });
  }

  /* ---------- datos ---------- */
  const tablero = document.querySelector("[data-tablero-musica]");
  const planos = document.querySelector("[data-planos]");
  ultimaPieza();
  fetch("data/obras.json", { cache: "no-cache" })
    .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then((datos) => {
      const musica = M.musica(tablero, datos, document.querySelector(".ficha"));
      const pantalla = M.pantalla(planos, datos);
      contacto(datos.contacto);
      deriva(musica, pantalla);
      if (window.ScrollTrigger) ScrollTrigger.refresh();
    })
    .catch((err) => {
      console.error("No pude leer data/obras.json", err);
      const aviso = `<p class="aviso-carga">No pude leer <code>data/obras.json</code>. Si abriste index.html con doble clic, el navegador no deja leerlo: abrilo con un servidor local (está en el README). Si ya estás en un servidor, revisá que el JSON no tenga una coma de más.</p>`;
      tablero.innerHTML = aviso;
      planos.innerHTML = "";
      contacto(null);
    });
})();
