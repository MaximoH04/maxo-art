/*
  Música: el EP como tablero. Cada canción es una pieza; lo que no salió es un hueco rayado.
  Todo sale de data/obras.json -> "canciones". El orden del tablero es el orden del archivo.
*/
(function () {
  "use strict";
  const M = window.Maxo;
  const { nodo, esc, texto, clamp, encastre, orbita, valido, vacio, urlSegura, spotifyEmbed, youtubeEmbed, fechaLarga, iconoPieza, DX, DY, P, conGsap } = M;

  const PLATAFORMAS = [["spotify", "Spotify"], ["appleMusic", "Apple Music"], ["youtubeMusic", "YouTube Music"]];

  M.musica = function (contenedor, datos, dialogo) {
    const canciones = (datos.canciones || []).filter((c) => c && c.titulo);
    const disco = datos.disco || {};
    const caja = dialogo.querySelector("[data-ficha]");
    let vertical = null, animacion = null, origenFoco = null;
    const piezas = new Map(); // id -> elemento svg de la pieza

    /* ---------- tablero ---------- */
    function construir() {
      const ahoraVertical = contenedor.clientWidth < 700;
      if (ahoraVertical === vertical) return;
      vertical = ahoraVertical;
      if (animacion) { animacion.scrollTrigger && animacion.scrollTrigger.kill(); animacion.kill(); animacion = null; }
      contenedor.innerHTML = "";
      piezas.clear();
      const n = canciones.length;
      if (!n) { contenedor.innerHTML = '<p class="aviso-carga">Todavía no hay canciones en data/obras.json.</p>'; return; }

      // la pieza de la portada queda en la celda (0,0) de la retícula
      let ancla = canciones.findIndex((c) => c.piezaDeLaPortada && c.estado === "publicada");
      if (ancla < 0) ancla = 0;
      const lugar = (k) => (vertical ? [k - ancla, 0] : [0, k - ancla]);
      const celdas = M.reticula({
        filas: vertical ? [-ancla - 1, n - ancla] : [-1, 1],
        columnas: vertical ? [-1, 1] : [-ancla - 1, n - ancla],
        semilla: 31, jitter: 20,
      });
      const [TL] = P.esquinas;
      const vb = vertical
        ? [TL[0] - 0.32 * DX, TL[1] - ancla * DY - 0.42 * DY, 2.75 * DX, (n + 0.84) * DY]
        : [TL[0] - ancla * DX - 0.55 * DX, TL[1] - 0.5 * DY, (n + 1.1) * DX, 1.5 * DY + 230];

      const svg = nodo("svg", { viewBox: vb.join(" "), "aria-hidden": "true", class: vertical ? "vertical" : "horizontal" });
      const lista = document.createElement("ol");
      lista.className = "tablero-rotulos " + (vertical ? "vertical" : "horizontal");
      lista.setAttribute("aria-label", `${disco.titulo || "PIEZAS"}: canciones`);
      contenedor.append(svg, lista);
      const id = M.defs(svg, "rayas-musica");
      // rayas sin fondo, para dejar ver un adelanto por debajo
      svg.querySelector("defs").insertAdjacentHTML("beforeend", `<pattern id="rayas-musica-abiertas" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="5.5" height="14" fill="#15181d"/></pattern>`);

      const capaFantasma = nodo("g", { class: "fantasmas" }, svg);
      const capaPiezas = nodo("g", null, svg);
      const enTablero = new Set(canciones.map((_, k) => lugar(k).join(",")));
      for (const celda of celdas.values()) if (!enTablero.has(celda.clave)) nodo("path", { d: celda.d, class: "fantasma" }, capaFantasma);

      // centro del tablero, para las órbitas de llegada
      const cs = canciones.map((_, k) => celdas.get(lugar(k).join(",")));
      const centroT = { x: cs.reduce((s, c) => s + c.cx, 0) / n, y: cs.reduce((s, c) => s + c.cy, 0) / n };
      const llegadas = [];

      canciones.forEach((c, k) => {
        const celda = cs[k];
        const publicada = c.estado === "publicada";
        const g = nodo("g", { class: "pieza-cancion " + (publicada ? "publicada" : "hueco"), "data-id": c.id }, capaPiezas);
        const viaje = nodo("g", null, g);
        const levanta = nodo("g", { class: "levanta" }, viaje);
        let contorno = celda.d;
        if (publicada && c.piezaDeLaPortada && k === ancla) {
          M.piezaPortada(levanta, id, true);
          contorno = P.silueta;
        } else if (publicada) {
          // pieza generada con la portada adentro
          const clip = `${id}-c${k}`;
          nodo("clipPath", { id: clip }, svg.querySelector("defs")).appendChild(nodo("path", { d: celda.d }));
          nodo("path", { d: celda.d, class: "halo-2", filter: `url(#${id}-b2)` }, levanta);
          const xs = celda.esquinas.map((p) => p[0]), ys = celda.esquinas.map((p) => p[1]);
          const lado = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) * 1.65;
          nodo("image", { href: c.portada || "", x: celda.cx - lado / 2, y: celda.cy - lado / 2, width: lado, height: lado, preserveAspectRatio: "xMidYMid slice", "clip-path": `url(#${clip})` }, levanta);
        } else {
          nodo("path", { d: celda.d, class: "hueco-cancion" }, levanta);
          if (valido(c.adelanto)) {
            // la portada que viene se asoma tramada entre las rayas
            const clip = `${id}-a${k}`;
            nodo("clipPath", { id: clip }, svg.querySelector("defs")).appendChild(nodo("path", { d: celda.d }));
            const lado = DX * 1.25;
            nodo("image", { href: c.adelanto, x: celda.cx - lado / 2, y: celda.cy - lado / 2, width: lado, height: lado, preserveAspectRatio: "xMidYMid slice", "clip-path": `url(#${clip})`, class: "adelanto" }, levanta);
            nodo("path", { d: celda.d, class: "rayas-sobre" }, levanta);
          }
        }
        nodo("path", { d: contorno, class: "contorno" }, viaje);

        // rótulo en HTML, ubicado en porcentaje sobre el viewBox
        const li = document.createElement("li");
        li.id = c.id;
        const num = String(k + 1).padStart(2, "0");
        const [lx, ly] = vertical ? [celda.esquinas[1][0] + 0.34 * DX, celda.cy] : [celda.cx, Math.max(celda.esquinas[2][1], celda.esquinas[3][1]) + 120];
        li.style.left = ((lx - vb[0]) / vb[2]) * 100 + "%";
        li.style.top = ((ly - vb[1]) / vb[3]) * 100 + "%";
        li.style.width = (vertical ? ((vb[0] + vb[2] - lx) / vb[2]) * 100 - 1 : (DX / vb[2]) * 100) + "%";
        if (publicada) {
          const dato = [vacio(c.bpm) ? "" : `${esc(c.bpm)} BPM`, ...(c.creditos || []).filter((x) => /producci/i.test(x.rol)).map((x) => texto(x.nombre))].filter(Boolean).join(" · ");
          li.innerHTML = `<span class="cancion-num">${num}</span><button type="button" class="cancion-boton" aria-haspopup="dialog">${esc(c.titulo)}</button><span class="cancion-dato">${dato}</span>`;
          const boton = li.querySelector("button");
          boton.addEventListener("click", () => abrir(c, g, boton));
          boton.addEventListener("focus", () => g.classList.add("foco"));
          boton.addEventListener("blur", () => g.classList.remove("foco"));
          g.addEventListener("click", () => abrir(c, g, boton));
          g.addEventListener("pointerenter", () => li.classList.add("foco"));
          g.addEventListener("pointerleave", () => li.classList.remove("foco"));
          piezas.set(c.id, { g, boton, c });
        } else {
          li.innerHTML = `<span class="cancion-num">${num}</span><span class="cancion-titulo">${esc(c.titulo)}</span><span class="cancion-dato">Próximamente</span>${valido(c.nota) ? `<span class="cancion-nota">${esc(c.nota)}</span>` : ""}`;
        }
        lista.appendChild(li);
        llegadas.push({ ...celda, viaje, li, publicada, inicio: 0.04 + k * (0.3 / n) });
      });

      // llegada: las publicadas orbitan y encajan; los huecos aparecen en su lugar
      function pintar(p) {
        capaFantasma.style.opacity = clamp(p * 1.4);
        for (const l of llegadas) {
          const t = clamp((p - l.inicio) / 0.55);
          if (l.publicada) {
            const e = encastre(t);
            l.viaje.setAttribute("transform", orbita(l, centroT, e));
            l.viaje.style.opacity = clamp(e * 1.5);
          } else {
            l.viaje.style.opacity = clamp(t * 1.8);
          }
          l.li.style.opacity = clamp((t - 0.75) / 0.25);
        }
      }
      if (conGsap) {
        const estado = { p: 0 };
        pintar(0);
        animacion = gsap.to(estado, {
          p: 1, ease: "none", onUpdate: () => pintar(estado.p),
          scrollTrigger: { trigger: contenedor, start: "top 92%", end: "top 30%", scrub: 0.6 },
        });
      } else pintar(1);
    }

    /* ---------- ficha ---------- */
    function fichaHTML(c) {
      const num = String(canciones.indexOf(c) + 1).padStart(2, "0");
      const fecha = fechaLarga(c.fecha) || (vacio(c.anio) ? "" : texto(c.anio));
      const datosLinea = [fecha, vacio(c.duracion) ? "" : esc(c.duracion), vacio(c.bpm) ? "" : `${esc(c.bpm)} BPM`].filter(Boolean).map((d) => `<li>${d}</li>`).join("");
      const creditos = (c.creditos || []).map((x) => `<div><dt>${esc(x.rol)}</dt><dd>${texto(x.nombre)}</dd></div>`).join("");
      const sp = valido(c.spotify) && spotifyEmbed(c.spotify);
      const yt = valido(c.youtube) && youtubeEmbed(c.youtube);
      const reproductor = sp || yt
        ? `<div class="botones">${sp ? `<button type="button" class="boton lleno" data-cargar="spotify">${iconoPieza}Escuchar acá</button>` : ""}${yt ? `<button type="button" class="boton" data-cargar="youtube">${iconoPieza}Ver el video</button>` : ""}</div><p class="nota-pendiente">El reproductor carga recién cuando lo tocás.</p>`
        : `<p class="nota-pendiente">Reproductor <span class="pendiente">[PENDIENTE]</span>: aparece cuando esté el link de Spotify o de YouTube.</p>`;
      const enlaces = PLATAFORMAS.filter(([k]) => !vacio(c[k])).map(([k, nombre]) => {
        const u = urlSegura(c[k]);
        return u
          ? `<a class="boton" href="${esc(u)}" target="_blank" rel="noopener">${iconoPieza}${nombre}</a>`
          : `<span class="boton" aria-disabled="true">${nombre} <span class="pendiente">[PENDIENTE]</span></span>`;
      }).join("");
      const letra = valido(c.letra) ? `<div class="letra"><h3 class="rotulo">Letra</h3><p>${esc(c.letra)}</p></div>` : "";
      return `
        <div class="ficha-grilla">
          <div class="ficha-portada">${c.portada ? `<img src="${esc(c.portada)}" alt="${esc(c.portadaAlt || "")}">` : ""}</div>
          <div class="ficha-info">
            <p class="rotulo">${esc(disco.titulo || "PIEZAS")} · ${num}</p>
            <h2 id="ficha-titulo" class="ficha-titulo">${esc(c.titulo)}</h2>
            ${valido(c.artistas) ? `<p class="ficha-artistas">${esc(c.artistas)}</p>` : ""}
            ${datosLinea ? `<ul class="ficha-datos">${datosLinea}</ul>` : ""}
            ${creditos ? `<dl class="creditos">${creditos}</dl>` : ""}
            <div class="reproductor" data-reproductor>${reproductor}</div>
            ${enlaces ? `<div class="escuchar"><h3 class="rotulo">Escuchala en</h3><div class="botones">${enlaces}</div></div>` : ""}
            ${letra}
          </div>
        </div>`;
    }

    function cargarReproductor(c, cual) {
      const lugar = caja.querySelector("[data-reproductor]");
      if (cual === "spotify") {
        lugar.innerHTML = `<iframe src="${esc(spotifyEmbed(c.spotify))}" height="152" title="${esc(c.titulo)} en Spotify" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>`;
      } else {
        lugar.innerHTML = `<iframe class="video" src="${esc(youtubeEmbed(c.youtube))}" title="${esc(c.titulo)} en YouTube" allow="autoplay; encrypted-media; picture-in-picture; fullscreen"></iframe>`;
      }
      lugar.querySelector("iframe").focus();
    }

    function abrir(c, g, boton) {
      origenFoco = boton || document.activeElement;
      caja.innerHTML = fichaHTML(c);
      caja.querySelectorAll("[data-cargar]").forEach((b) => b.addEventListener("click", () => cargarReproductor(c, b.dataset.cargar)));
      dialogo.showModal();
      dialogo.scrollTop = 0;
      history.replaceState(null, "", "#" + c.id);
      if (conGsap) {
        gsap.from(dialogo.querySelector(".ficha-caja"), { opacity: 0, y: 24, duration: 0.45, ease: "power2.out" });
        const img = caja.querySelector(".ficha-portada img");
        if (img && g) {
          const de = g.getBoundingClientRect(), a = img.getBoundingClientRect();
          if (de.width && a.width) {
            gsap.from(img, {
              x: de.left + de.width / 2 - (a.left + a.width / 2), y: de.top + de.height / 2 - (a.top + a.height / 2),
              scale: de.width / a.width, duration: 0.75, ease: "power3.out", clearProps: "transform",
            });
          }
        }
      }
    }

    dialogo.querySelector("[data-cerrar]").addEventListener("click", () => dialogo.close());
    dialogo.addEventListener("click", (e) => { if (e.target === dialogo) dialogo.close(); });
    dialogo.addEventListener("close", () => {
      caja.innerHTML = ""; // corta cualquier reproductor que esté sonando
      history.replaceState(null, "", location.pathname + location.search);
      if (origenFoco && document.contains(origenFoco)) origenFoco.focus({ preventScroll: true });
    });

    construir();
    let espera;
    addEventListener("resize", () => {
      clearTimeout(espera);
      espera = setTimeout(() => { const antes = vertical; construir(); if (antes !== vertical && window.ScrollTrigger) ScrollTrigger.refresh(); }, 200);
    });

    // abrir directo si la dirección trae #id-de-cancion
    const directo = canciones.find((c) => c.estado === "publicada" && "#" + c.id === location.hash);
    if (directo) {
      const p = piezas.get(directo.id);
      abrir(directo, null, p && p.boton);
    }

    return {
      publicadas: () => [...piezas.values()],
      abrir: (idCancion) => { const p = piezas.get(idCancion); if (p) abrir(p.c, p.g, p.boton); },
    };
  };
})();
