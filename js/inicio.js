/*
  Entrada: la pieza de la portada sola. Con el scroll (la ruedita o el dedo) llegan las demás
  orbitando y encajan de golpe. Las cuatro vecinas son el menú; Contacto queda como hueco.
*/
(function () {
  "use strict";
  const M = window.Maxo;
  const { nodo, clamp, lerp, suave, encastre, orbita, CENTRO, quieto, conGsap } = M;

  const MENU = {
    "-1,0": { texto: "Música", href: "#musica" },
    "0,1": { texto: "Pantalla", href: "#pantalla" },
    "1,0": { texto: "Sobre mí", href: "#sobre-mi" },
    "0,-1": { texto: "Contacto", href: "#contacto", hueco: true },
  };

  M.inicio = function (seccion) {
    const recorrido = seccion.querySelector(".inicio-recorrido");
    const escena = seccion.querySelector(".inicio-escena");
    const [svg, svgRot] = escena.querySelectorAll("svg");
    const nombre = escena.querySelector(".nombre");
    const pista = escena.querySelector(".pista");
    const id = M.defs(svg, "rayas-inicio");

    // ---------- piezas ----------
    const capa = nodo("g", null, svg);
    const vecinas = [];
    for (const celda of M.reticula({ filas: [-2, 2], columnas: [-3, 3], semilla: 7 }).values()) {
      if (!celda.i && !celda.j) continue;
      const menu = MENU[celda.clave];
      let g = nodo("g", null, capa);
      if (menu) {
        const a = nodo("a", { href: menu.href, tabindex: "-1" }, g);
        nodo("path", { d: celda.d, class: menu.hueco ? "hueco" : "vecina menu-pieza" }, a);
      } else {
        nodo("path", { d: celda.d, class: "vecina" }, g);
      }
      let rotulo = null;
      if (menu) {
        // los rótulos se pegan a tu pieza: los de los costados hacia afuera, arriba y abajo hacia el centro
        const dx = Math.abs(celda.cx - CENTRO.x) > 100 ? Math.sign(celda.cx - CENTRO.x) * 64 : 0;
        const dy = Math.abs(celda.cy - CENTRO.y) > 100 ? -Math.sign(celda.cy - CENTRO.y) * 70 : 0;
        rotulo = nodo("text", { x: celda.cx + dx, y: celda.cy + dy + 7, "text-anchor": "middle", class: "rotulo-svg" + (menu.hueco ? " en-hueco" : "") }, svgRot);
        rotulo.textContent = menu.texto;
      }
      vecinas.push({ ...celda, g, rotulo, hueco: !!(menu && menu.hueco), inicio: 0.05 + (celda.anillo - 1) * 0.15 + celda.a * 0.12 });
    }
    const centro = nodo("g", null, svg);
    M.piezaPortada(centro, id, true);

    // ---------- cámara ----------
    // En pantallas angostas se aleja a medida que se arma, para que el menú entre entero.
    const W0 = 720, H0 = 915;
    let alejar = 1, subir = 0;
    function medirCamara() {
      const bw = svg.clientWidth || innerWidth, bh = svg.clientHeight || innerHeight;
      alejar = clamp(1080 / Math.max(W0, (H0 * bw) / bh), 1, 1.6);
      subir = bw > bh ? 0.05 : 0.03; // deja aire abajo para el nombre
    }
    function camara(p) {
      const k = lerp(1, alejar, suave(clamp((p - 0.35) / 0.55)));
      const W = W0 * k, H = H0 * k;
      const vb = `${(CENTRO.x - W / 2).toFixed(1)} ${(CENTRO.y - H / 2 + H * subir).toFixed(1)} ${W.toFixed(1)} ${H.toFixed(1)}`;
      svg.setAttribute("viewBox", vb);
      svgRot.setAttribute("viewBox", vb);
      const px = Math.min((svg.clientWidth || innerWidth) / W, (svg.clientHeight || innerHeight) / H);
      const tam = Math.max(19, 12.5 / px) + "px";
      for (const v of vecinas) if (v.rotulo) v.rotulo.style.fontSize = tam;
    }

    // ---------- el nombre ----------
    // Estirado del todo ocupa algo más de la mitad del ancho (casi todo en celular),
    // con un tope de alto para que no le gane a la pieza.
    let tamNombre = 0;
    function medirNombre() {
      const vertical = escena.clientWidth < escena.clientHeight;
      const disponible = (escena.clientWidth - 2 * parseFloat(getComputedStyle(nombre).left)) * (vertical ? 0.8 : 0.58);
      nombre.style.fontSize = "100px";
      nombre.style.fontVariationSettings = '"wdth" 125';
      const ancho = nombre.getBoundingClientRect().width;
      tamNombre = Math.min((100 * disponible) / ancho, escena.clientHeight * (vertical ? 0.16 : 0.19));
      nombre.style.fontSize = tamNombre + "px";
    }

    // ---------- pintar un estado (p de 0 a 1) ----------
    function pintar(p) {
      camara(p);
      for (const v of vecinas) {
        if (v.hueco) {
          v.g.style.opacity = clamp((p - 0.55) / 0.3);
        } else {
          const e = encastre(clamp((p - v.inicio) / 0.45));
          v.g.setAttribute("transform", orbita(v, CENTRO, e));
          v.g.style.opacity = clamp(e * 1.6);
        }
        if (v.rotulo) {
          if (!v.hueco) v.rotulo.setAttribute("transform", v.g.getAttribute("transform"));
          v.rotulo.style.opacity = clamp((p - 0.82) / 0.12);
        }
      }
      const s = lerp(1.22, 1, suave(clamp(p / 0.6)));
      centro.setAttribute("transform", `translate(${CENTRO.x} ${CENTRO.y}) scale(${s.toFixed(4)}) translate(${-CENTRO.x} ${-CENTRO.y})`);
      nombre.style.fontVariationSettings = `"wdth" ${lerp(62, 125, suave(p)).toFixed(1)}`;
      if (pista) pista.style.opacity = p > 0.9 ? 0 : 1;
    }

    let actual = quieto ? 1 : 0, objetivo = 0;
    medirCamara();
    if (document.fonts) document.fonts.ready.then(() => { medirNombre(); pintar(actual); });
    medirNombre();
    addEventListener("resize", () => { medirCamara(); medirNombre(); pintar(actual); });

    pintar(actual);
    if (quieto) return;

    // ---------- progreso: solo el scroll. Mover el mouse no arma nada. ----------
    if (conGsap) {
      ScrollTrigger.create({ trigger: recorrido, start: "top top", end: "bottom bottom", onUpdate: (st) => (objetivo = st.progress) });
    } else {
      addEventListener("scroll", () => {
        const r = recorrido.getBoundingClientRect(), largo = r.height - innerHeight;
        objetivo = largo > 0 ? clamp(-r.top / largo) : 1;
      }, { passive: true });
    }

    const paso = () => {
      if (Math.abs(objetivo - actual) > 0.0004) {
        actual += (objetivo - actual) * 0.12;
        pintar(actual);
      }
    };
    if (window.gsap) gsap.ticker.add(paso);
    else (function bucle() { paso(); requestAnimationFrame(bucle); })();
  };
})();
