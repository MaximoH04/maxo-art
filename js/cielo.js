/*
  El cielo de la portada como fondo de toda la web.
  Las estrellas giran alrededor de un polo debajo de la pantalla, como en una foto
  de larga exposición. Mientras más bajás, más largos los trazos.
*/
(function () {
  "use strict";
  const { quieto, clamp, azar } = window.Maxo;

  window.Maxo.cielo = function (canvas, finEntrada) {
    const ctx = canvas.getContext("2d");
    let w = 0, h = 0, dpr = 1, polo = [0, 0], estrellas = [], fondo = null;
    let exposicion = quieto ? 0.18 : 0.004;
    let ultimo = 0, corriendo = false;
    const t0 = performance.now();

    function medir() {
      const nuevoW = innerWidth, nuevoH = Math.max(innerHeight, document.documentElement.clientHeight);
      // en celular la barra del navegador cambia el alto: solo rearmamos si cambia el ancho
      if (nuevoW === w && Math.abs(nuevoH - h) < 160 && estrellas.length) return;
      w = nuevoW; h = nuevoH;
      dpr = Math.min(devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      polo = [w * 0.42, h * 1.12];
      const r = azar(3);
      const maxR = Math.hypot(Math.max(polo[0], w - polo[0]), polo[1]) * 1.02;
      const n = Math.round((w * h) / (w < 700 ? 1300 : 950));
      estrellas = Array.from({ length: n }, () => ({
        r: Math.sqrt(r()) * maxR,
        a: -Math.PI + r() * Math.PI,
        b: 0.1 + Math.pow(r(), 3) * 0.7,
        s: r() < 0.93 ? 0.7 : 1.4,
      }));
      // fondo pintado una vez: los colores de las esquinas de la portada y la bruma
      fondo = document.createElement("canvas");
      fondo.width = canvas.width; fondo.height = canvas.height;
      const f = fondo.getContext("2d");
      f.setTransform(dpr, 0, 0, dpr, 0, 0);
      const lin = f.createLinearGradient(w, 0, 0, h);
      lin.addColorStop(0, "#15181d"); lin.addColorStop(1, "#1c222c");
      f.fillStyle = lin; f.fillRect(0, 0, w, h);
      const bruma = f.createRadialGradient(w * 0.85, h * 0.95, 0, w * 0.85, h * 0.95, Math.max(w, h) * 0.7);
      bruma.addColorStop(0, "rgba(58,66,77,.7)"); bruma.addColorStop(1, "rgba(58,66,77,0)");
      f.fillStyle = bruma; f.fillRect(0, 0, w, h);
      const claro = f.createRadialGradient(0, 0, 0, 0, 0, Math.max(w, h) * 0.6);
      claro.addColorStop(0, "rgba(39,43,52,.85)"); claro.addColorStop(1, "rgba(39,43,52,0)");
      f.fillStyle = claro; f.fillRect(0, 0, w, h);
      dibujar(performance.now());
    }

    function dibujar(ahora) {
      ctx.drawImage(fondo, 0, 0, w, h);
      const giro = quieto ? 0 : (ahora - t0) * 0.00001;
      ctx.lineCap = "round";
      for (const e of estrellas) {
        const a = e.a + giro;
        ctx.strokeStyle = `rgba(255,255,255,${e.b})`;
        ctx.lineWidth = e.s;
        ctx.beginPath();
        ctx.arc(polo[0], polo[1], e.r, a, a + exposicion);
        ctx.stroke();
      }
    }

    // 30 cuadros por segundo alcanzan para un giro tan lento, y gastan la mitad
    function bucle(ahora) {
      if (!corriendo) return;
      if (ahora - ultimo > 33) { dibujar(ahora); ultimo = ahora; }
      requestAnimationFrame(bucle);
    }
    function arrancar() { if (!corriendo && !quieto && !document.hidden) { corriendo = true; requestAnimationFrame(bucle); } }

    medir();
    addEventListener("resize", medir);
    document.addEventListener("visibilitychange", () => (document.hidden ? (corriendo = false) : arrancar()));
    if (!quieto) {
      const leer = () => {
        // durante la entrada los trazos crecen rápido; después, despacio hasta el final
        const total = document.documentElement.scrollHeight - innerHeight;
        const fin = Math.max(1, finEntrada ? finEntrada() : total);
        exposicion = scrollY < fin
          ? 0.004 + (scrollY / fin) * 0.2
          : 0.204 + clamp((scrollY - fin) / Math.max(1, total - fin)) * 0.16;
      };
      addEventListener("scroll", leer, { passive: true });
      leer();
      arrancar();
    }
  };
})();
