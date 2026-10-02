/*
  Pantalla: cada película es un plano panorámico. Arranca recortado con la silueta de la pieza
  y se abre con el scroll; el fotograma llega tramado a un bit y se revela como foto.
  Todo sale de data/obras.json -> "peliculas".
*/
(function () {
  "use strict";
  const M = window.Maxo;
  const { esc, texto, valido, vacio, urlSegura, youtubeEmbed, iconoPieza, conGsap, quieto } = M;

  // Bayer 8x8: el umbral de cada píxel del tramado
  const BAYER = [0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36, 14, 46, 6, 38, 60, 28, 52, 20, 62, 30, 54, 22, 3, 35, 11, 43, 1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25, 15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23, 61, 29, 53, 21];

  function tramar(img, canvas) {
    const ancho = 440, alto = Math.round(ancho / 2.39);
    canvas.width = ancho; canvas.height = alto;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const r = Math.max(ancho / img.naturalWidth, alto / img.naturalHeight);
    const w = img.naturalWidth * r, h = img.naturalHeight * r;
    ctx.drawImage(img, (ancho - w) / 2, (alto - h) / 2, w, h);
    let datos;
    try { datos = ctx.getImageData(0, 0, ancho, alto); }
    catch (e) { canvas.remove(); return; } // abierto sin servidor: queda la foto sola
    const d = datos.data, n = ancho * alto, lum = new Float32Array(n), hist = new Uint32Array(256);
    for (let i = 0; i < n; i++) {
      const v = 0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2];
      lum[i] = v; hist[v | 0]++;
    }
    // estira el contraste entre los percentiles 2 y 98
    let acum = 0, bajo = 0, alto_ = 255;
    for (let v = 0; v < 256; v++) { acum += hist[v]; if (acum < n * 0.02) bajo = v; if (acum < n * 0.98) alto_ = v; }
    const rango = Math.max(1, alto_ - bajo);
    for (let y = 0; y < alto; y++)
      for (let x = 0; x < ancho; x++) {
        const i = y * ancho + x, v = (lum[i] - bajo) / rango;
        const on = v > (BAYER[(y & 7) * 8 + (x & 7)] + 0.5) / 64;
        d[i * 4] = on ? 255 : 21; d[i * 4 + 1] = on ? 255 : 24; d[i * 4 + 2] = on ? 255 : 29; d[i * 4 + 3] = 255;
      }
    ctx.putImageData(datos, 0, 0);
  }

  function planoHTML(p, k) {
    const num = String(k + 1).padStart(2, "0");
    const meta = [num, vacio(p.formato) ? "" : texto(p.formato), vacio(p.anio) ? "" : texto(p.anio)].filter(Boolean).join(" · ");
    // "video" es el link (YouTube se ve adentro del cuadro). "videoEs": "completo" o "trailer".
    const video = vacio(p.video) ? p.trailer : p.video;
    const yt = valido(video) && youtubeEmbed(video);
    const externo = !yt && urlSegura(video);
    const completo = /complet/i.test(p.videoEs || "");
    const verTexto = !completo ? "Ver tráiler" : /largo/i.test(p.formato || "") ? "Ver la película" : /corto/i.test(p.formato || "") ? "Ver el corto" : "Ver completo";
    const imagen = valido(p.fotograma)
      ? `<img src="${esc(p.fotograma)}" alt="${esc(p.fotogramaAlt || "Fotograma de " + p.titulo)}" loading="lazy" decoding="async"><canvas aria-hidden="true"></canvas>`
      : `<div class="fotograma-falta"><span>Fotograma <span class="pendiente">[PENDIENTE]</span></span></div>`;
    const creditos = [["Mi personaje", p.personaje], ["Dirección", p.direccion]]
      .filter(([, v]) => !vacio(v)).map(([rol, v]) => `<div><dt>${rol}</dt><dd>${texto(v)}</dd></div>`).join("");
    let enlace = "";
    if (externo) enlace = `<a class="boton" href="${esc(externo)}" target="_blank" rel="noopener">${iconoPieza}${verTexto}</a>`;
    else if (M.pendiente(video)) enlace = `<p class="nota-pendiente">Video <span class="pendiente">${esc(video)}</span></p>`;
    return `
      <article class="plano" id="${esc(p.id || "pelicula-" + (k + 1))}" aria-labelledby="plano-t-${k}">
        <div class="plano-cuadro">
          ${imagen}
          <div class="grano" aria-hidden="true"></div>
          ${yt ? `<button type="button" class="ver-trailer" data-embed="${esc(yt)}" aria-label="${verTexto}: ${esc(p.titulo)}"><span>${iconoPieza}${verTexto}</span></button>` : ""}
        </div>
        <div class="plano-creditos">
          <p class="plano-meta">${meta}</p>
          <h3 class="plano-titulo" id="plano-t-${k}">${texto(p.titulo)}</h3>
          ${creditos ? `<dl class="creditos-cine">${creditos}</dl>` : ""}
          ${vacio(p.sinopsis) ? "" : `<p class="plano-sinopsis">${texto(p.sinopsis)}</p>`}
          ${valido(p.nota) ? `<p class="plano-nota">${esc(p.nota)}</p>` : ""}
          ${enlace}
        </div>
      </article>`;
  }

  M.pantalla = function (contenedor, datos) {
    const peliculas = (datos.peliculas || []).filter((p) => p && p.titulo);
    if (!peliculas.length) { contenedor.innerHTML = '<p class="aviso-carga">Todavía no hay películas en data/obras.json.</p>'; return { planos: () => [] }; }
    contenedor.innerHTML = peliculas.map(planoHTML).join("");

    const planos = [...contenedor.querySelectorAll(".plano")];
    planos.forEach((plano, k) => {
      const p = peliculas[k];
      const cuadro = plano.querySelector(".plano-cuadro");
      const img = cuadro.querySelector("img"), canvas = cuadro.querySelector("canvas");
      if (img && canvas) {
        const hacer = () => {
          tramar(img, canvas);
          // un fotograma chico se vería borroso al abrirse: queda tramado
          if (img.naturalWidth < 900) { canvas.dataset.fijo = "1"; canvas.style.display = ""; canvas.style.opacity = 1; }
        };
        if (quieto) canvas.style.display = "none";
        if (img.complete && img.naturalWidth) hacer(); else img.addEventListener("load", hacer, { once: true });
      }

      // video de YouTube: se carga adentro del mismo cuadro, recién al tocarlo
      const boton = cuadro.querySelector(".ver-trailer");
      if (boton) boton.addEventListener("click", () => {
        cuadro.classList.add("abierto");
        cuadro.insertAdjacentHTML("beforeend", `<iframe src="${esc(boton.dataset.embed)}" title="${esc(p.titulo)} en YouTube" allow="autoplay; encrypted-media; picture-in-picture; fullscreen"></iframe>`);
        boton.remove();
        cuadro.querySelector("iframe").focus();
      });

      if (!conGsap) { cuadro.classList.add("abierto"); return; }
      // la pieza se abre hasta ser la película
      gsap.fromTo(cuadro, { "--m": "34%" }, {
        "--m": "260%", ease: "power2.in",
        scrollTrigger: { trigger: plano, start: "top 82%", end: "top 18%", scrub: 0.5 },
        onUpdate() {
          const t = this.progress();
          cuadro.classList.toggle("abierto", t > 0.995);
          if (canvas && !canvas.dataset.fijo) canvas.style.opacity = t < 0.7 ? 1 : Math.max(0, 1 - (t - 0.7) / 0.25);
        },
      });
      // créditos que aparecen de a uno, con corte seco
      gsap.from(plano.querySelectorAll(".plano-creditos > *, .creditos-cine > div"), {
        autoAlpha: 0, duration: 0.01, stagger: 0.14,
        scrollTrigger: { trigger: plano.querySelector(".plano-creditos"), start: "top 80%", toggleActions: "play none none reverse" },
      });
    });
    return { planos: () => planos };
  };
})();
