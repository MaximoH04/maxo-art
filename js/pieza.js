/*
  Geometría de la pieza.
  Medida sobre la portada de "Sin Rumbo" (pieza_sin_rumbo.png, 636x635):
  cuerpo de ~307x317 px, pestaña con base de 72 px, cabeza de 95 px
  y una salida de 92 px desde la línea de las esquinas.
  Todo se guarda en proporción al largo del borde.
*/
(function () {
  const FORMA = {
    cuello: 0.114, // medio ancho de la base de la pestaña
    radio: 0.15,   // radio de la cabeza
    alto: 0.15,    // altura del centro de la cabeza sobre la línea de esquinas
    arco: 0.046,   // el borde se arquea hacia el lado contrario de la pestaña
  };

  const K = 0.5523; // aproximación de un cuarto de círculo con una curva cúbica

  // Puntos de un borde en coordenadas locales: u a lo largo (0..1), v hacia afuera.
  // dir: 1 pestaña, -1 hueco, 0 borde liso. c: centro de la pestaña sobre el borde.
  function bordeLocal(dir, c, f) {
    if (!dir) return [];
    const n = f.cuello, r = f.radio, a = f.alto, s = f.arco, k = K * r;
    const segs = [
      ["L", c - n - 0.035, -s],
      ["C", c - n - 0.005, -s, c - n, -s + 0.01, c - n, -s + 0.035],
      ["C", c - n, -s + 0.09, c - r, a - 0.09, c - r, a],
      ["C", c - r, a + k, c - k, a + r, c, a + r],
      ["C", c + k, a + r, c + r, a + k, c + r, a],
      ["C", c + r, a - 0.09, c + n, -s + 0.09, c + n, -s + 0.035],
      ["C", c + n, -s + 0.01, c + n + 0.005, -s, c + n + 0.035, -s],
    ];
    return segs.map(([cmd, ...p]) => {
      const out = [cmd];
      for (let i = 0; i < p.length; i += 2) out.push(p[i], p[i + 1] * dir);
      return out;
    });
  }

  const fmt = (x) => (Math.round(x * 100) / 100).toString();

  // Borde de P a Q. La normal hacia afuera queda a la izquierda del recorrido
  // cuando la pieza se recorre en sentido horario (y hacia abajo).
  function borde(P, Q, dir, c, f) {
    const dx = Q[0] - P[0], dy = Q[1] - P[1];
    const L = Math.hypot(dx, dy);
    const nx = dy / L, ny = -dx / L;
    const T = (u, v) => [P[0] + u * dx + v * L * nx, P[1] + u * dy + v * L * ny];
    let d = "";
    for (const [cmd, ...p] of bordeLocal(dir, c, f)) {
      d += cmd;
      const pts = [];
      for (let i = 0; i < p.length; i += 2) pts.push(...T(p[i], p[i + 1]));
      d += pts.map(fmt).join(" ");
    }
    return d + "L" + fmt(Q[0]) + " " + fmt(Q[1]);
  }

  /*
    Path de una pieza.
    esquinas: [arribaIzq, arribaDer, abajoDer, abajoIzq] como [x, y]
    lados: { arriba, derecha, abajo, izquierda } con 1, -1 o 0
    centros (opcional): posición de cada pestaña sobre su borde, 0.5 por defecto
  */
  function path(esquinas, lados, centros = {}, forma = FORMA) {
    const [tl, tr, br, bl] = esquinas;
    const c = (k) => (centros[k] == null ? 0.5 : centros[k]);
    return (
      "M" + fmt(tl[0]) + " " + fmt(tl[1]) +
      borde(tl, tr, lados.arriba || 0, c("arriba"), forma) +
      borde(tr, br, lados.derecha || 0, c("derecha"), forma) +
      borde(br, bl, lados.abajo || 0, c("abajo"), forma) +
      borde(bl, tl, lados.izquierda || 0, c("izquierda"), forma) +
      "Z"
    );
  }

  // Atajo para una pieza rectangular de ancho w y alto h con origen en (x, y).
  function rect(x, y, w, h, lados, centros) {
    return path([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], lados, centros);
  }

  // La pieza de la portada: pestañas a los costados, huecos arriba y abajo.
  const SIN_RUMBO = { arriba: -1, derecha: 1, abajo: -1, izquierda: 1 };

  window.Pieza = { FORMA, path, rect, SIN_RUMBO };
})();
