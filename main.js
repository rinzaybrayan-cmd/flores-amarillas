/* ==========================================================
   Regalo de cumpleaños: planeta de girasoles
   Cambia los textos y ajustes aquí abajo. No hace falta tocar
   nada más.
   ========================================================== */
const CONFIG = {
  nombre: "",          // Nombre de tu hermana (ej.: "Ana"). Si lo dejas vacío dice "hermana".
  regalo: true,        // true = pantalla inicial "Toca para abrir tu regalo"
  fecha: "23 de setiembre",

  // Mensajes grandes que aparecen uno por uno abajo. {nombre} se reemplaza solo.
  mensajes: [
    "Para ti, {nombre}",
    "Feliz cumpleaños",
    "Que este nuevo año te llene de luz",
    "Gracias por ser mi hermana",
    "Eres mi girasol favorito",
    "Que todos tus sueños florezcan",
    "Te quiero mucho"
  ],

  // Frases del anillo que gira alrededor del planeta
  frases: [
    "Feliz cumpleaños, {nombre}",
    "Eres mi girasol favorito",
    "Que florezcan todos tus sueños",
    "Te quiero mucho"
  ],

  flores: 720,         // Girasoles del planeta en pantallas grandes (en celular se reduce sola)
  velocidad: 1,        // 0 = quieto, 1 = normal, 2 = el doble
  semilla: 2109        // Cambia este número para obtener otra distribución
};

(function () {
  'use strict';

  var TAU = Math.PI * 2;
  var D = 6;                       // distancia de la cámara (perspectiva suave)
  var BASE = 0.00016;              // giro del planeta en rad/ms (~40 s por vuelta)
  var ROLL = -0.36;                // inclinación del eje, como la Tierra
  var TILT0 = 0.38;                // cuánto se ve el polo norte
  var FUENTE = '"Cormorant Garamond", "Iowan Old Style", Georgia, serif';

  var cv = document.getElementById('galaxia');
  var ctx = cv.getContext('2d');
  var reducir = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Textos ---------- */
  var destinataria = CONFIG.nombre && CONFIG.nombre.length ? CONFIG.nombre : 'hermana';
  function txt(s) { return String(s).replace(/\{nombre\}/g, destinataria); }

  var frases = (CONFIG.frases || []).filter(function (f) { return f && f.length; }).map(txt);
  var mensajes = (CONFIG.mensajes || []).filter(function (f) { return f && f.length; }).map(txt);

  document.title = 'Feliz cumpleaños' + (CONFIG.nombre ? ', ' + CONFIG.nombre : '');
  document.getElementById('titulo').textContent = document.title;
  document.getElementById('fecha').textContent = CONFIG.fecha;
  document.getElementById('regaloTexto').textContent = txt('Para ti, {nombre}');
  var fraseEl = document.getElementById('frase');

  /* ---------- Utilidades ---------- */
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function easeOutBack(x) {
    var c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
  }
  function easeOutCubic(x) { return 1 - Math.pow(1 - x, 3); }

  // Matrices 3x3 (filas seguidas en un arreglo de 9)
  function rotY(a) { var c = Math.cos(a), s = Math.sin(a); return [c, 0, s, 0, 1, 0, -s, 0, c]; }
  function rotX(a) { var c = Math.cos(a), s = Math.sin(a); return [1, 0, 0, 0, c, -s, 0, s, c]; }
  function rotZ(a) { var c = Math.cos(a), s = Math.sin(a); return [c, -s, 0, s, c, 0, 0, 0, 1]; }
  function mul(A, B) {
    var r = new Array(9), i, j;
    for (i = 0; i < 3; i++) {
      for (j = 0; j < 3; j++) {
        r[i * 3 + j] = A[i * 3] * B[j] + A[i * 3 + 1] * B[3 + j] + A[i * 3 + 2] * B[6 + j];
      }
    }
    return r;
  }

  /* ---------- Girasoles, hojas y pétalos ---------- */
  var PALETAS = [
    ['#e8900a', '#ffc61a', '#ffe066'],
    ['#ea9a0c', '#ffc81f', '#ffe27a'],
    ['#dc8a08', '#ffbf12', '#ffdc55']
  ];

  // Pétalo puntiagudo que nace en el radio r0 y mide L de largo
  function petalo(g, r0, L, w, pal, oscuro) {
    var gr = g.createLinearGradient(0, -r0, 0, -r0 - L);
    gr.addColorStop(0, pal[0]);
    gr.addColorStop(0.45, pal[1]);
    gr.addColorStop(1, pal[2]);

    g.beginPath();
    g.moveTo(0, -r0);
    g.bezierCurveTo(w, -r0 - L * 0.22, w * 1.05, -r0 - L * 0.68, 0, -r0 - L);
    g.bezierCurveTo(-w * 1.05, -r0 - L * 0.68, -w, -r0 - L * 0.22, 0, -r0);
    g.closePath();
    g.fillStyle = gr;
    g.fill();
    if (oscuro) {
      g.fillStyle = 'rgba(120, 60, 0, 0.28)';
      g.fill();
    }
    g.lineWidth = 0.7;
    g.strokeStyle = 'rgba(150, 80, 0, 0.35)';
    g.stroke();

    g.beginPath();
    g.moveTo(0, -r0 - 3);
    g.lineTo(0, -r0 - L * 0.8);
    g.strokeStyle = 'rgba(160, 90, 0, 0.22)';
    g.lineWidth = 0.6;
    g.stroke();
  }

  function crearGirasol(semilla, pal) {
    var S = 128, C = S / 2, i, g;
    var rnd = mulberry32(semilla);
    var c = document.createElement('canvas');
    c.width = c.height = S;
    g = c.getContext('2d');
    g.translate(C, C);

    var RF = 60, r0 = 16;
    function anillo(n, largo, ancho, desfase, oscuro) {
      var k;
      for (k = 0; k < n; k++) {
        g.save();
        g.rotate(k * TAU / n + desfase + (rnd() - 0.5) * 0.09);
        petalo(g, r0, largo * (0.92 + 0.16 * rnd()), ancho * (0.9 + 0.2 * rnd()), pal, oscuro);
        g.restore();
      }
    }
    anillo(24, RF - r0, 8.5, 0.13, true);      // pétalos de atrás, más oscuros
    anillo(21, RF - r0 - 4, 9.5, 0, false);    // pétalos de adelante

    // Disco central oscuro
    var rd = 25;
    var dg = g.createRadialGradient(-4, -5, 2, 0, 0, rd);
    dg.addColorStop(0, '#4a2609');
    dg.addColorStop(0.55, '#3a1c07');
    dg.addColorStop(0.9, '#57300f');
    dg.addColorStop(1, '#7a4a1a');
    g.fillStyle = dg;
    g.beginPath();
    g.arc(0, 0, rd, 0, TAU);
    g.fill();

    // Semillas en espiral (filotaxis)
    var n = 150, oro = 2.39996323;
    for (i = 1; i <= n; i++) {
      var rr = rd * 0.94 * Math.sqrt(i / n), aa = i * oro;
      g.fillStyle = (i % 2) ? 'rgba(15, 6, 0, 0.5)' : 'rgba(170, 110, 45, 0.42)';
      g.beginPath();
      g.arc(Math.cos(aa) * rr, Math.sin(aa) * rr, 0.5 + (i / n) * 1.3, 0, TAU);
      g.fill();
    }
    g.strokeStyle = 'rgba(210, 150, 60, 0.28)';
    g.lineWidth = 2.2;
    g.beginPath();
    g.arc(0, 0, rd * 0.72, 0, TAU);
    g.stroke();
    g.strokeStyle = 'rgba(200, 130, 50, 0.45)';
    g.lineWidth = 1.6;
    g.beginPath();
    g.arc(0, 0, rd - 0.8, 0, TAU);
    g.stroke();
    return c;
  }

  // Hoja de eucalipto, redondeada y verde grisácea, como las del ramo
  function crearHoja(c1, c2) {
    var S = 64;
    var c = document.createElement('canvas');
    c.width = c.height = S;
    var g = c.getContext('2d');
    g.translate(S / 2, S / 2);
    var gr = g.createLinearGradient(0, 24, 0, -24);
    gr.addColorStop(0, c2);
    gr.addColorStop(1, c1);
    g.beginPath();
    g.moveTo(0, 24);
    g.bezierCurveTo(19, 15, 18, -14, 0, -25);
    g.bezierCurveTo(-18, -14, -19, 15, 0, 24);
    g.closePath();
    g.fillStyle = gr;
    g.fill();
    g.lineWidth = 0.8;
    g.strokeStyle = 'rgba(30, 60, 40, 0.35)';
    g.stroke();
    g.beginPath();
    g.moveTo(0, 22);
    g.lineTo(0, -18);
    g.strokeStyle = 'rgba(30, 70, 45, 0.3)';
    g.stroke();
    return c;
  }

  function crearPetaloCaida() {
    var c = document.createElement('canvas');
    c.width = 40;
    c.height = 64;
    var g = c.getContext('2d');
    g.translate(20, 60);
    petalo(g, 0, 54, 11, PALETAS[1], false);
    return c;
  }

  var girasoles = [
    crearGirasol(11, PALETAS[0]),
    crearGirasol(23, PALETAS[1]),
    crearGirasol(37, PALETAS[2]),
    crearGirasol(52, PALETAS[0])
  ];
  var hojas = [
    crearHoja('#7f9f86', '#a9c1a5'),
    crearHoja('#5f8468', '#8fae8b'),
    crearHoja('#6f8f77', '#9db79a')
  ];
  var petaloCaida = crearPetaloCaida();

  /* ---------- Estado ---------- */
  var W, H, dpr, R, cx, cy, unidad;
  var items = [], orden = [];
  var polvo = [], estrellas = [], petalos = [];
  var plantas = [], hierbas = [], luciernagas = [], corazones = [], chispas = [];
  var anillo = null;
  var fuenteLista = false;
  var estado = { sigma: 0, vel: BASE, tilt: TILT0, arrastre: false };
  var ult = { x: 0, y: 0, t: 0, x0: 0, y0: 0, t0: 0 };
  var fugaz = { activa: false, sig: 3500, vida: 0, x: 0, y: 0, ang: 0 };
  var abierto = false, pedirInicio = false, tInicio = null;

  function crearItem(tipo, y, ph, radio, tam, delay, rnd, sprite) {
    var r = Math.sqrt(Math.max(0, 1 - y * y));
    var nx = Math.cos(ph) * r, ny = y, nz = Math.sin(ph) * r;
    // este = y_arriba × n ; norte = n × este
    var ex = nz, ey = 0, ez = -nx;
    var el = Math.sqrt(ex * ex + ez * ez);
    if (el < 1e-4) { ex = 1; ey = 0; ez = 0; } else { ex /= el; ez /= el; }
    var kx = ny * ez - nz * ey, ky = nz * ex - nx * ez, kz = nx * ey - ny * ex;
    var rho = rnd() * TAU, c = Math.cos(rho), s = Math.sin(rho);
    return {
      tipo: tipo,
      px: nx * radio, py: ny * radio, pz: nz * radio,
      ux: c * ex + s * kx, uy: c * ey + s * ky, uz: c * ez + s * kz,
      vx: s * ex - c * kx, vy: s * ey - c * ky, vz: s * ez - c * kz,
      tam: tam, delay: delay, fase: rnd() * TAU, sprite: sprite,
      qx: 0, qy: 0, qz: 0
    };
  }

  function construir() {
    var rnd = mulberry32(CONFIG.semilla);
    var N = Math.round(CONFIG.flores * (W < 600 ? 0.62 : 1));
    var esp = Math.sqrt(4 * Math.PI / N);        // separación entre flores, en radios
    var oro = Math.PI * (3 - Math.sqrt(5));
    var lista = [], i, y, ph;

    var nh = Math.round(N * 0.55);
    for (i = 0; i < nh; i++) {
      y = 2 * rnd() - 1;
      ph = rnd() * TAU;
      lista.push(crearItem(1, y, ph, 0.965, esp * (1.15 + 0.7 * rnd()),
        Math.max(0, (1 - y) / 2 * 2000 + rnd() * 500 - 300), rnd, hojas[Math.floor(rnd() * hojas.length)]));
    }
    for (i = 0; i < N; i++) {
      y = 1 - 2 * (i + 0.5) / N + (rnd() - 0.5) * esp * 0.35;
      y = clamp(y, -1, 1);
      ph = i * oro + (rnd() - 0.5) * 0.35;
      lista.push(crearItem(0, y, ph, 1, esp * 1.34 * (0.86 + 0.3 * rnd()),
        (1 - y) / 2 * 2000 + rnd() * 600, rnd, girasoles[Math.floor(rnd() * girasoles.length)]));
    }
    items = lista;
    orden = [];

    polvo = [];
    for (i = 0; i < 150; i++) {
      polvo.push({
        r: 1.22 + rnd() * 0.68,
        a: rnd() * TAU,
        v: 0.7 + rnd() * 0.7,
        y: (rnd() - 0.5) * 0.14,
        tam: 0.6 + rnd() * 1.5,
        fase: rnd() * TAU
      });
    }

    estrellas = [];
    for (i = 0; i < 170; i++) {
      estrellas.push({ x: rnd(), y: rnd(), r: 0.4 + rnd() * 1.1, fase: rnd() * TAU });
    }

    petalos = [];
    var np = W < 600 ? 14 : 26;
    for (i = 0; i < np; i++) {
      petalos.push({
        x0: rnd() * W, y: rnd() * H,
        vy: (0.024 + rnd() * 0.036),
        sway: 0.6 + rnd(),
        fase: rnd() * TAU,
        s: 14 + rnd() * 12,
        rot: rnd() * TAU,
        rv: (rnd() - 0.5) * 0.0016,
        fl: rnd() * TAU,
        fv: 0.002 + rnd() * 0.002
      });
    }

    // Luciérnagas amarillas y turquesa, como en tu referencia
    luciernagas = [];
    var nl = W < 600 ? 26 : 46;
    for (i = 0; i < nl; i++) {
      luciernagas.push({
        x0: rnd() * W, y0: H * (0.08 + rnd() * 0.8),
        ax: 20 + rnd() * 60, ay: 14 + rnd() * 40,
        vx: 0.0002 + rnd() * 0.0004, vy: 0.0002 + rnd() * 0.0004,
        fx: rnd() * TAU, fy: rnd() * TAU,
        vb: 0.0008 + rnd() * 0.0016, fb: rnd() * TAU,
        r: 0.9 + rnd() * 1.4,
        c: rnd() < 0.4
      });
    }

    // Corazones suaves que suben despacio
    corazones = [];
    var nc = W < 600 ? 7 : 12;
    for (i = 0; i < nc; i++) {
      corazones.push({
        x0: rnd() * W, y: rnd() * H,
        vy: 0.014 + rnd() * 0.022,
        sway: 0.5 + rnd(),
        fase: rnd() * TAU,
        s: 8 + rnd() * 9,
        rot: (rnd() - 0.5) * 0.5
      });
    }

    construirJardin(mulberry32(CONFIG.semilla + 7));
  }

  /* ---------- Jardín: girasoles con tallo, hojas y pasto ---------- */
  function construirJardin(rnd) {
    var chico = W < 600;
    var xs = chico ? [0.07, 0.19, 0.93, 0.81] : [0.05, 0.12, 0.19, 0.95, 0.88, 0.81];
    var ms = chico ? [1, 0.62, 1, 0.66] : [1, 0.66, 0.42, 1, 0.68, 0.44];
    var hBase = Math.min(H * 0.32, W * 0.42);
    var i, k;
    plantas = [];
    hierbas = [];

    for (i = 0; i < xs.length; i++) {
      var h = hBase * ms[i] * (0.92 + 0.16 * rnd());
      var x = xs[i] * W;
      var lado = x < W / 2 ? 1 : -1;
      var nHojas = ms[i] > 0.5 ? 3 : 2;
      var hj = [];
      for (k = 0; k < nHojas; k++) {
        hj.push({
          u: 0.28 + k * 0.17 + rnd() * 0.05,
          lado: (k % 2 === 0) ? 1 : -1,
          largo: h * (0.2 + 0.07 * rnd())
        });
      }
      plantas.push({
        x: x, h: h,
        dx: lado * h * 0.18 * (0.6 + 0.8 * rnd()),
        hd: clamp(h * 0.34, 30, 86),
        amp: h * 0.05,
        vel: 0.7 + rnd() * 0.6,
        fase: rnd() * TAU,
        ret: i * 300,
        spin: (rnd() - 0.5) * 2,
        sp: girasoles[i % girasoles.length],
        hojas: hj
      });
      for (k = 0; k < 7; k++) {
        hierbas.push({
          x: x + (rnd() - 0.5) * hBase * 0.55,
          h: H * (0.04 + rnd() * 0.1) * (chico ? 0.8 : 1),
          lean: (rnd() - 0.5) * 0.5,
          w: 3 + rnd() * 3,
          fase: rnd() * TAU,
          ret: rnd() * 900
        });
      }
    }
  }

  function dibujarJardin(t) {
    var i, j, pl, b, cr;

    // Suelo oscuro para asentar el jardín (también ayuda a leer el texto)
    var g0 = ctx.createLinearGradient(0, H * 0.84, 0, H);
    g0.addColorStop(0, 'rgba(3, 2, 12, 0)');
    g0.addColorStop(1, 'rgba(3, 2, 12, 0.72)');
    ctx.fillStyle = g0;
    ctx.fillRect(0, H * 0.84, W, H * 0.16);

    // Pasto
    for (i = 0; i < hierbas.length; i++) {
      b = hierbas[i];
      cr = reducir ? 1 : easeOutCubic(clamp((t - 3800 - b.ret) / 2000, 0, 1));
      if (cr <= 0) continue;
      var bh = b.h * cr;
      var sw2 = reducir ? 0 : Math.sin(t * 0.0011 + b.fase) * bh * 0.12;
      var tx = b.x + b.lean * bh + sw2, ty = H + 4 - bh;
      var gb = ctx.createLinearGradient(b.x, H + 4, tx, ty);
      gb.addColorStop(0, 'rgba(10, 70, 40, 0.9)');
      gb.addColorStop(1, 'rgba(70, 225, 120, 0.9)');
      ctx.fillStyle = gb;
      ctx.beginPath();
      ctx.moveTo(b.x - b.w, H + 4);
      ctx.quadraticCurveTo(b.x - b.w * 0.4 + (tx - b.x) * 0.35, H + 4 - bh * 0.6, tx, ty);
      ctx.quadraticCurveTo(b.x + b.w * 0.4 + (tx - b.x) * 0.35, H + 4 - bh * 0.6, b.x + b.w, H + 4);
      ctx.closePath();
      ctx.fill();
    }

    // Girasoles con tallo
    ctx.lineCap = 'round';
    for (i = 0; i < plantas.length; i++) {
      pl = plantas[i];
      var prog = reducir ? 1 : clamp((t - 4200 - pl.ret) / 2600, 0, 1);
      if (prog <= 0) continue;
      var h = pl.h * easeOutCubic(prog);
      var sway = reducir ? 0 : Math.sin(t * 0.0009 * pl.vel + pl.fase) * pl.amp * (h / pl.h);
      var x0 = pl.x, y0 = H + 6;
      var x2 = x0 + pl.dx * (h / pl.h) + sway, y2 = y0 - h;
      var x1 = x0 + pl.dx * 0.25 + sway * 0.25, y1 = y0 - h * 0.55;

      // Tallo turquesa
      var gs = ctx.createLinearGradient(x0, y0, x2, y2);
      gs.addColorStop(0, '#12796f');
      gs.addColorStop(1, '#3bcab5');
      ctx.strokeStyle = gs;
      ctx.lineWidth = Math.max(2.4, pl.h * 0.022);
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.quadraticCurveTo(x1, y1, x2, y2);
      ctx.stroke();

      // Hojas verdes a lo largo del tallo
      for (j = 0; j < pl.hojas.length; j++) {
        var hj = pl.hojas[j];
        var gl = reducir ? 1 : clamp((prog - hj.u * 0.7) / 0.3, 0, 1);
        if (gl <= 0) continue;
        var u = hj.u;
        var bx = (1 - u) * (1 - u) * x0 + 2 * (1 - u) * u * x1 + u * u * x2;
        var by = (1 - u) * (1 - u) * y0 + 2 * (1 - u) * u * y1 + u * u * y2;
        var tdx = 2 * (1 - u) * (x1 - x0) + 2 * u * (x2 - x1);
        var tdy = 2 * (1 - u) * (y1 - y0) + 2 * u * (y2 - y1);
        var ang = Math.atan2(tdy, tdx) + hj.lado * (0.95 + (reducir ? 0 : 0.1 * Math.sin(t * 0.0012 + pl.fase + j)));
        var L = hj.largo * easeOutCubic(gl), Wd = L * 0.3;
        ctx.save();
        ctx.translate(bx, by);
        ctx.rotate(ang);
        var gh = ctx.createLinearGradient(0, 0, L, 0);
        gh.addColorStop(0, '#187a45');
        gh.addColorStop(1, '#6be59a');
        ctx.fillStyle = gh;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(L * 0.25, -Wd, L * 0.7, -Wd * 0.9, L, 0);
        ctx.bezierCurveTo(L * 0.7, Wd * 0.9, L * 0.25, Wd, 0, 0);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(L * 0.9, 0);
        ctx.stroke();
        ctx.restore();
      }

      // Flor: brillo suave y girasol que gira despacio
      var crecer = reducir ? 1 : clamp((prog - 0.85) / 0.15, 0, 1);
      if (crecer > 0) {
        var hs = pl.hd * easeOutBack(crecer);
        var atdx = 2 * (x2 - x1), atdy = 2 * (y2 - y1);
        var giro = Math.atan2(atdy, atdx) + Math.PI / 2 + (reducir ? 0 : t * 0.00012 * pl.spin);

        ctx.globalCompositeOperation = 'lighter';
        var gg = ctx.createRadialGradient(x2, y2, 0, x2, y2, hs * 1.1);
        gg.addColorStop(0, 'rgba(255, 200, 60, 0.32)');
        gg.addColorStop(1, 'rgba(255, 200, 60, 0)');
        ctx.fillStyle = gg;
        ctx.beginPath();
        ctx.arc(x2, y2, hs * 1.1, 0, TAU);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';

        var kk = dpr * hs / 0.9375;
        var cg = Math.cos(giro), sg = Math.sin(giro);
        ctx.setTransform(cg * kk, sg * kk, -sg * kk, cg * kk, dpr * x2, dpr * y2);
        ctx.drawImage(pl.sp, -0.5, -0.5, 1, 1);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
    }
  }

  function dibujarLuciernagas(t, alfa) {
    if (alfa <= 0) return;
    var i, f, x, y, b, a, col;
    ctx.globalCompositeOperation = 'lighter';
    for (i = 0; i < luciernagas.length; i++) {
      f = luciernagas[i];
      x = f.x0 + (reducir ? 0 : Math.sin(t * f.vx + f.fx) * f.ax);
      y = f.y0 + (reducir ? 0 : Math.cos(t * f.vy + f.fy) * f.ay);
      b = 0.5 + 0.5 * Math.sin(t * f.vb + f.fb);
      a = (0.15 + 0.75 * b * b) * alfa;
      col = f.c ? '94, 234, 212' : '255, 224, 102';
      ctx.fillStyle = 'rgba(' + col + ', ' + (a * 0.18).toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(x, y, f.r * 5 * unidad, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(' + col + ', ' + a.toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(x, y, f.r * unidad, 0, TAU);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  function trazarCorazon(s) {
    ctx.beginPath();
    ctx.moveTo(0, s * 0.4);
    ctx.bezierCurveTo(-s, -s * 0.1, -s * 0.5, -s * 0.9, 0, -s * 0.35);
    ctx.bezierCurveTo(s * 0.5, -s * 0.9, s, -s * 0.1, 0, s * 0.4);
    ctx.closePath();
  }

  function dibujarCorazones(t, dt, alfa) {
    var i, p, px, al, ca, sa;
    for (i = 0; i < corazones.length; i++) {
      p = corazones[i];
      p.y -= p.vy * dt;
      if (p.y < -30) { p.y = H + 30; p.x0 = Math.random() * W; }
      if (alfa <= 0) continue;
      px = p.x0 + Math.sin(t * 0.0006 * p.sway + p.fase) * 26;
      al = 0.5 * alfa * clamp(p.y / (H * 0.3), 0, 1) * clamp((H + 30 - p.y) / 80, 0, 1);
      ca = Math.cos(p.rot);
      sa = Math.sin(p.rot);
      ctx.setTransform(dpr * ca, dpr * sa, -dpr * sa, dpr * ca, dpr * px, dpr * p.y);
      ctx.fillStyle = 'rgba(255, 150, 175, ' + al.toFixed(3) + ')';
      trazarCorazon(p.s * unidad);
      ctx.fill();
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /* ---------- Estallido de pétalos, corazones y chispas ---------- */
  function estallido(x, y, n) {
    var i, a, v, r, tipo;
    for (i = 0; i < n && chispas.length < 320; i++) {
      a = Math.random() * TAU;
      v = 0.15 + Math.random() * 0.5;
      r = Math.random();
      tipo = r < 0.55 ? 0 : (r < 0.8 ? 1 : 2);
      chispas.push({
        x: x, y: y,
        vx: Math.cos(a) * v, vy: Math.sin(a) * v - 0.12,
        tipo: tipo,
        rot: Math.random() * TAU,
        rv: (Math.random() - 0.5) * 0.008,
        fl: Math.random() * TAU,
        s: tipo === 0 ? 12 + Math.random() * 12 : (tipo === 1 ? 9 + Math.random() * 9 : 1.2 + Math.random() * 1.8),
        vida: 0,
        max: 1800 + Math.random() * 1600
      });
    }
  }

  function dibujarChispas(dt) {
    var i, c, al, ca, sa, K, f;
    for (i = chispas.length - 1; i >= 0; i--) {
      c = chispas[i];
      c.vida += dt;
      if (c.vida >= c.max) { chispas.splice(i, 1); continue; }
      c.vx *= Math.pow(0.9985, dt);
      c.vy = c.vy * Math.pow(0.9985, dt) + 0.00028 * dt;
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      c.rot += c.rv * dt;
      c.fl += 0.004 * dt;
      al = 1 - Math.pow(c.vida / c.max, 2);
      ca = Math.cos(c.rot);
      sa = Math.sin(c.rot);
      if (c.tipo === 0) {
        K = dpr * c.s * unidad / 64;
        f = Math.cos(c.fl);
        ctx.globalAlpha = al;
        ctx.setTransform(ca * K, sa * K, -sa * K * f, ca * K * f, dpr * c.x, dpr * c.y);
        ctx.drawImage(petaloCaida, -20, -32);
      } else if (c.tipo === 1) {
        ctx.globalAlpha = 1;
        ctx.setTransform(dpr * ca, dpr * sa, -dpr * sa, dpr * ca, dpr * c.x, dpr * c.y);
        ctx.fillStyle = 'rgba(255, 150, 175, ' + (0.85 * al).toFixed(3) + ')';
        trazarCorazon(c.s * unidad);
        ctx.fill();
      } else {
        ctx.globalAlpha = 1;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = 'rgba(255, 226, 120, ' + al.toFixed(3) + ')';
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.s * unidad, 0, TAU);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
      }
    }
    ctx.globalAlpha = 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /* ---------- Anillo de frases ---------- */
  function construirAnillo() {
    if (!frases.length) { anillo = null; return; }
    var kr = 1.55;
    var circ = TAU * kr * R;
    var fs0 = clamp(R * 0.145, 13, 34);

    function medir(f) {
      ctx.font = 'italic 500 ' + f + 'px ' + FUENTE;
      var lista = [], total = 0;
      frases.forEach(function (fr) {
        var chars = Array.from(fr), n, w;
        for (n = 0; n < chars.length; n++) {
          w = ctx.measureText(chars[n]).width;
          lista.push({ tipo: 0, ch: chars[n], w: w });
          total += w;
        }
        lista.push({ tipo: 1, ch: '', w: f * 2 });     // separador: mini girasol
        total += f * 2;
      });
      return { lista: lista, total: total };
    }

    // Ajusta el tamaño de letra para que las frases llenen el anillo
    var fs = fs0;
    var m = medir(fs);
    var ajuste = circ * 0.985 / m.total;
    fs = ajuste < 1 ? Math.max(9, fs * ajuste) : Math.min(fs * ajuste, fs0 * 1.15);
    m = medir(fs);
    if (m.total > circ * 0.985) {
      fs = Math.max(9, fs * circ * 0.985 / m.total);
      m = medir(fs);
    }

    var reps = Math.max(1, Math.floor(circ * 0.985 / m.total));
    var lista = [], r, j;
    for (r = 0; r < reps; r++) {
      for (j = 0; j < m.lista.length; j++) {
        lista.push({ tipo: m.lista[j].tipo, ch: m.lista[j].ch, w: m.lista[j].w });
      }
    }
    var total = m.total * reps;
    var gap = Math.max(0, (circ - total) / lista.length);
    var acc = 0, i;
    for (i = 0; i < lista.length; i++) {
      lista[i].off = (acc + lista[i].w / 2) / (kr * R);
      lista[i].tr = { a: 0, b: 0, c: 0, d: 0, e: 0, f: 0, al: 1, z: 0 };
      acc += lista[i].w + gap;
    }
    anillo = { kr: kr, fs: fs, items: lista };
  }

  function prepararAnillo(Rs, MR, angBase) {
    var kr = anillo.kr, lista = anillo.items, i, it, th, s, c, x, z, per, k, tr;
    for (i = 0; i < lista.length; i++) {
      it = lista[i];
      tr = it.tr;
      th = angBase + it.off;
      s = Math.sin(th);
      c = Math.cos(th);
      x = s * kr;
      z = c * kr;
      var Px = MR[0] * x + MR[2] * z;
      var Py = MR[3] * x + MR[5] * z;
      var Pz = MR[6] * x + MR[8] * z;
      var Tx = MR[0] * c - MR[2] * s;
      var Ty = MR[3] * c - MR[5] * s;
      per = D / (D - Pz);
      k = dpr * per;
      tr.a = Tx * k;
      tr.b = -Ty * k;
      tr.c = -MR[1] * k;
      tr.d = MR[4] * k;
      tr.e = dpr * (cx + Px * Rs * per);
      tr.f = dpr * (cy - Py * Rs * per);
      tr.z = Pz;
      tr.al = clamp(0.3 + 0.7 * (Pz / kr + 0.35) / 0.7, 0.3, 1);
    }
  }

  function dibujarAnillo(frente, t) {
    if (!anillo) return;
    var lista = anillo.items, i, it, tr, rev, fs = anillo.fs;
    ctx.font = 'italic 500 ' + fs + 'px ' + FUENTE;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(2.4, fs * 0.16);
    for (i = 0; i < lista.length; i++) {
      it = lista[i];
      tr = it.tr;
      if ((tr.z >= 0) !== frente) continue;
      rev = reducir ? 1 : clamp((t - 2800 - i * 22) / 700, 0, 1);
      if (rev <= 0) continue;
      ctx.globalAlpha = tr.al * rev;
      ctx.setTransform(tr.a, tr.b, tr.c, tr.d, tr.e, tr.f);
      if (it.tipo === 0) {
        if (frente) {
          ctx.strokeStyle = 'rgba(30, 14, 55, 0.9)';
          ctx.strokeText(it.ch, 0, 0);
        }
        ctx.fillStyle = '#fff6d6';
        ctx.fillText(it.ch, 0, 0);
      } else {
        var sz = fs * 1.2;
        ctx.drawImage(girasoles[1], -sz / 2, -sz / 2, sz, sz);
      }
    }
    ctx.globalAlpha = 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function dibujarPolvo(frente, t, Rs, MR, aparece) {
    var i, p, th, x, z, Px, Py, Pz, per, al;
    ctx.globalCompositeOperation = 'lighter';
    for (i = 0; i < polvo.length; i++) {
      p = polvo[i];
      th = p.a + estado.sigma * p.v;
      x = Math.sin(th) * p.r;
      z = Math.cos(th) * p.r;
      Px = MR[0] * x + MR[1] * p.y + MR[2] * z;
      Py = MR[3] * x + MR[4] * p.y + MR[5] * z;
      Pz = MR[6] * x + MR[7] * p.y + MR[8] * z;
      if ((Pz >= 0) !== frente) continue;
      per = D / (D - Pz);
      al = (0.28 + 0.3 * Math.sin(t * 0.0011 + p.fase)) * aparece;
      ctx.fillStyle = 'rgba(255, 214, 110, ' + al.toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(cx + Px * Rs * per, cy - Py * Rs * per, p.tam * unidad * per, 0, TAU);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  /* ---------- Redimensionar ---------- */
  function redimensionar() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    R = Math.min(H * 0.3, W * 0.29);
    unidad = clamp(R / 240, 0.6, 1.2);
    cx = W / 2;
    cy = H * 0.42;
    construir();
    if (fuenteLista) construirAnillo();
    if (reducir) dibujar(1e9, 0);
  }

  /* ---------- Dibujo ---------- */
  function dibujar(t, dt) {
    var i, j, it, s, p;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, W, H);

    var aparece = reducir ? 1 : clamp(t / 2200, 0, 1);
    var escena = reducir ? 1 : 0.72 + 0.28 * easeOutCubic(clamp(t / 2600, 0, 1));
    var respira = reducir ? 1 : 0.9 + 0.1 * Math.sin(t * 0.0008);
    var Rs = R * escena;

    // Matrices: planeta (con giro) y anillo (sin giro propio)
    var MR = mul(rotZ(ROLL), rotX(estado.tilt));
    var M = mul(MR, rotY(estado.sigma));

    // Estrellas
    for (i = 0; i < estrellas.length; i++) {
      s = estrellas[i];
      var al = (0.28 + 0.24 * Math.sin(t * 0.0012 + s.fase)) * aparece;
      ctx.fillStyle = 'rgba(255, 244, 200, ' + al.toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(s.x * W, s.y * H, s.r, 0, TAU);
      ctx.fill();
    }

    // Estrella fugaz
    if (!reducir && aparece > 0) {
      if (!fugaz.activa && t > fugaz.sig) {
        fugaz.activa = true;
        fugaz.vida = 0;
        fugaz.x = W * (0.1 + Math.random() * 0.5);
        fugaz.y = H * (0.05 + Math.random() * 0.25);
        fugaz.ang = 0.45 + Math.random() * 0.3;
      }
      if (fugaz.activa) {
        fugaz.vida += dt;
        var pf = fugaz.vida / 1000;
        var hx = fugaz.x + Math.cos(fugaz.ang) * 700 * pf;
        var hy = fugaz.y + Math.sin(fugaz.ang) * 700 * pf;
        var tx = hx - Math.cos(fugaz.ang) * 130;
        var ty = hy - Math.sin(fugaz.ang) * 130;
        var gf = ctx.createLinearGradient(hx, hy, tx, ty);
        var af = Math.sin(clamp(pf, 0, 1) * Math.PI);
        gf.addColorStop(0, 'rgba(255, 246, 214, ' + af.toFixed(3) + ')');
        gf.addColorStop(1, 'rgba(255, 246, 214, 0)');
        ctx.strokeStyle = gf;
        ctx.lineWidth = 1.6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(hx, hy);
        ctx.lineTo(tx, ty);
        ctx.stroke();
        if (pf >= 1) {
          fugaz.activa = false;
          fugaz.sig = t + 6000 + Math.random() * 6000;
        }
      }
    }

    // Halo dorado del planeta
    ctx.globalCompositeOperation = 'lighter';
    var hal = ctx.createRadialGradient(cx, cy, Rs * 0.85, cx, cy, Rs * 1.85);
    hal.addColorStop(0, 'rgba(255, 190, 50, ' + (0.3 * aparece * respira).toFixed(3) + ')');
    hal.addColorStop(0.45, 'rgba(255, 160, 40, ' + (0.08 * aparece).toFixed(3) + ')');
    hal.addColorStop(1, 'rgba(255, 160, 40, 0)');
    ctx.fillStyle = hal;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';

    // Anillo: parte de atrás (queda oculta por el planeta)
    var angAnillo = -0.6 * estado.sigma;
    if (anillo) prepararAnillo(Rs, MR, angAnillo);
    dibujarPolvo(false, t, Rs, MR, aparece);
    dibujarAnillo(false, t);

    // Cuerpo del planeta
    var rb = Rs * 0.985;
    var bg = ctx.createRadialGradient(cx - rb * 0.35, cy - rb * 0.4, rb * 0.05, cx, cy, rb);
    bg.addColorStop(0, '#46662f');
    bg.addColorStop(0.6, '#22381f');
    bg.addColorStop(1, '#0c170f');
    ctx.globalAlpha = aparece;
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.arc(cx, cy, rb, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Girasoles y hojas visibles, de atrás hacia adelante
    orden.length = 0;
    for (i = 0; i < items.length; i++) {
      it = items[i];
      it.qz = M[6] * it.px + M[7] * it.py + M[8] * it.pz;
      if (it.qz < -0.06) continue;
      it.qx = M[0] * it.px + M[1] * it.py + M[2] * it.pz;
      it.qy = M[3] * it.px + M[4] * it.py + M[5] * it.pz;
      orden.push(it);
    }
    orden.sort(function (a, b) { return a.qz - b.qz; });

    for (j = 0; j < orden.length; j++) {
      it = orden[j];
      var pr = reducir ? 1 : clamp((t - it.delay) / 1300, 0, 1);
      if (pr <= 0) continue;
      var bl = reducir ? 1 : easeOutBack(pr);
      var per = D / (D - it.qz);
      var pulso = (it.tipo === 0 && !reducir) ? 1 + 0.025 * Math.sin(t * 0.002 + it.fase) : 1;
      var tamPx = (it.tipo === 0 ? it.tam / 0.9375 : it.tam) * Rs * per * bl * pulso;
      var k = dpr * tamPx;
      var Ux = M[0] * it.ux + M[1] * it.uy + M[2] * it.uz;
      var Uy = M[3] * it.ux + M[4] * it.uy + M[5] * it.uz;
      var Vx = M[0] * it.vx + M[1] * it.vy + M[2] * it.vz;
      var Vy = M[3] * it.vx + M[4] * it.vy + M[5] * it.vz;

      ctx.globalAlpha = clamp((it.qz + 0.06) / 0.26, 0, 1) * clamp(pr * 1.8, 0, 1);
      ctx.setTransform(Ux * k, -Uy * k, Vx * k, -Vy * k,
        dpr * (cx + it.qx * Rs * per), dpr * (cy - it.qy * Rs * per));
      ctx.drawImage(it.sprite, -0.5, -0.5, 1, 1);
    }
    ctx.globalAlpha = 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Sombra en el borde y luz: dan volumen de esfera
    ctx.globalAlpha = aparece;
    var rs2 = Rs * 1.03;
    var sh = ctx.createRadialGradient(cx, cy, rs2 * 0.45, cx, cy, rs2);
    sh.addColorStop(0, 'rgba(8, 5, 25, 0)');
    sh.addColorStop(0.7, 'rgba(8, 5, 25, 0.14)');
    sh.addColorStop(0.92, 'rgba(8, 5, 25, 0.55)');
    sh.addColorStop(1, 'rgba(8, 5, 25, 0.85)');
    ctx.fillStyle = sh;
    ctx.beginPath();
    ctx.arc(cx, cy, rs2, 0, TAU);
    ctx.fill();

    ctx.globalCompositeOperation = 'lighter';
    var hi = ctx.createRadialGradient(cx - rb * 0.38, cy - rb * 0.42, 0, cx - rb * 0.38, cy - rb * 0.42, rb * 0.95);
    hi.addColorStop(0, 'rgba(255, 236, 150, 0.2)');
    hi.addColorStop(1, 'rgba(255, 236, 150, 0)');
    ctx.fillStyle = hi;
    ctx.beginPath();
    ctx.arc(cx, cy, rb, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 210, 110, 0.09)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, rb, 0, TAU);
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;

    // Anillo: parte de adelante
    dibujarPolvo(true, t, Rs, MR, aparece);
    dibujarAnillo(true, t);

    // Jardín, luciérnagas y corazones
    if (reducir || t > 3800) dibujarJardin(t);
    dibujarLuciernagas(t, reducir ? 1 : clamp((t - 3000) / 2000, 0, 1));
    dibujarCorazones(t, dt, reducir ? 1 : clamp((t - 6000) / 2000, 0, 1));

    // Pétalos que caen
    for (i = 0; i < petalos.length; i++) {
      p = petalos[i];
      p.y += p.vy * dt;
      p.rot += p.rv * dt;
      p.fl += p.fv * dt;
      if (p.y > H + 30) {
        p.y = -30;
        p.x0 = Math.random() * W;
      }
      var px = p.x0 + Math.sin(t * 0.0007 * p.sway + p.fase) * 40;
      var K = dpr * p.s * unidad / 64;
      var ca = Math.cos(p.rot), sa = Math.sin(p.rot), fl = Math.cos(p.fl);
      ctx.globalAlpha = 0.82 * aparece;
      ctx.setTransform(ca * K, sa * K, -sa * K * fl, ca * K * fl, dpr * px, dpr * p.y);
      ctx.drawImage(petaloCaida, -20, -32);
    }
    ctx.globalAlpha = 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    dibujarChispas(dt);
  }

  /* ---------- Mensajes: aparecen palabra por palabra ---------- */
  var msgIdx = 0;

  function mostrarFrase(texto) {
    var palabras = texto.split(' '), i, sp;
    fraseEl.textContent = '';
    for (i = 0; i < palabras.length; i++) {
      sp = document.createElement('span');
      sp.className = 'pal';
      sp.textContent = palabras[i];
      sp.style.transitionDelay = (i * 140) + 'ms';
      fraseEl.appendChild(sp);
      if (i < palabras.length - 1) fraseEl.appendChild(document.createTextNode(' '));
    }
    void fraseEl.offsetWidth;            // reinicia la transición
    fraseEl.classList.add('entra');
  }

  function ciclo() {
    if (!mensajes.length) return;
    var texto = mensajes[msgIdx % mensajes.length];
    msgIdx++;
    mostrarFrase(texto);
    if (/cumplea/i.test(texto)) estallido(cx, cy, 70);
    var dur = 3800 + texto.split(' ').length * 140;
    setTimeout(function () {
      fraseEl.classList.add('sale');
      setTimeout(function () {
        fraseEl.classList.remove('sale');
        fraseEl.classList.remove('entra');
        ciclo();
      }, 1000);
    }, dur);
  }

  /* ---------- Apertura del regalo ---------- */
  var regaloEl = document.getElementById('regalo');

  function abrir() {
    if (abierto) return;
    abierto = true;
    pedirInicio = true;
    document.body.classList.add('abierto');
    regaloEl.classList.add('cerrado');
    setTimeout(function () { regaloEl.hidden = true; }, 1400);
    if (reducir) {
      dibujar(1e9, 0);
      ciclo();
    } else {
      setTimeout(ciclo, 3300);
    }
  }

  /* ---------- Bucle ---------- */
  function actualizar(dt) {
    if (!estado.arrastre) {
      estado.vel += (BASE * CONFIG.velocidad - estado.vel) * Math.min(1, dt * 0.004);
      estado.tilt += (TILT0 - estado.tilt) * Math.min(1, dt * 0.0015);
    }
    estado.sigma += estado.vel * dt;
  }

  var prev = 0;
  function cuadro(ahora) {
    if (pedirInicio) { tInicio = ahora; pedirInicio = false; }
    var t = tInicio === null ? 0 : ahora - tInicio;
    var dt = Math.min(64, Math.max(0, ahora - prev));
    prev = ahora;
    actualizar(dt);
    dibujar(t, dt);
    requestAnimationFrame(cuadro);
  }

  /* ---------- Interacción: arrastrar para girar, tocar para un estallido ---------- */
  function soltar() {
    estado.arrastre = false;
    document.body.classList.remove('arrastrando');
  }

  function esControl(e) {
    return e.target && e.target.closest && e.target.closest('.boton, .regalo');
  }

  window.addEventListener('resize', redimensionar);
  window.addEventListener('pointerdown', function (e) {
    if (esControl(e)) return;
    estado.arrastre = true;
    ult.x = ult.x0 = e.clientX;
    ult.y = ult.y0 = e.clientY;
    ult.t = ult.t0 = Date.now();
    document.body.classList.add('arrastrando');
  });
  window.addEventListener('pointermove', function (e) {
    if (!estado.arrastre) return;
    var ahora = Date.now();
    var dx = e.clientX - ult.x, dy = e.clientY - ult.y;
    var ds = dx * 0.0062;
    estado.sigma += ds;
    estado.tilt = clamp(estado.tilt + dy * 0.0035, 0.05, 0.8);
    estado.vel = clamp(ds / Math.max(8, ahora - ult.t), -0.006, 0.006);
    ult.x = e.clientX;
    ult.y = e.clientY;
    ult.t = ahora;
    if (reducir) dibujar(1e9, 0);
  });
  window.addEventListener('pointerup', function (e) {
    var eraArrastre = estado.arrastre;
    soltar();
    if (!eraArrastre || !abierto || esControl(e)) return;
    var mov = Math.abs(e.clientX - ult.x0) + Math.abs(e.clientY - ult.y0);
    if (mov < 8 && Date.now() - ult.t0 < 450) estallido(e.clientX, e.clientY, 36);
  });
  window.addEventListener('pointercancel', soltar);

  document.getElementById('abrir').addEventListener('click', abrir);
  regaloEl.addEventListener('click', abrir);

  var boton = document.getElementById('pantalla');
  var raiz = document.documentElement;
  if (!raiz.requestFullscreen) {
    boton.hidden = true;
  } else {
    boton.addEventListener('click', function () {
      if (document.fullscreenElement) document.exitFullscreen();
      else raiz.requestFullscreen();
    });
  }

  /* ---------- Inicio ---------- */
  function cuandoFuenteLista(cb) {
    var hecho = false;
    function fin() { if (!hecho) { hecho = true; cb(); } }
    if (document.fonts && document.fonts.load) {
      document.fonts.load('italic 500 24px "Cormorant Garamond"').then(fin, fin);
      setTimeout(fin, 1800);
    } else {
      fin();
    }
  }

  redimensionar();
  cuandoFuenteLista(function () {
    fuenteLista = true;
    construirAnillo();
    if (reducir) dibujar(1e9, 0);
  });
  if (!reducir) requestAnimationFrame(cuadro);

  if (!CONFIG.regalo) {
    regaloEl.hidden = true;
    abrir();
  }
})();