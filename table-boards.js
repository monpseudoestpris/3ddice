(() => {
  "use strict";

  /* =====================================================================
   * Table Boards Module (Sprout)
   *  - 4 3D Board Shapes: rect, octagon, hexagon, circle
   *    (exact mitered floor + rail meshes + matching physics wall planes)
   *  - 8 Procedural Board Themes (surface + rail textures)
   * ===================================================================== */

  const BOARD_SHAPES = [
    { id: "rect",    label: "Classique" },
    { id: "octagon", label: "Octogone" },
    { id: "hexagon", label: "Hexagone" },
    { id: "circle",  label: "Arène" }
  ];

  const BOARD_THEMES = {
    emerald: {
      id: "emerald",
      label: "Émeraude",
      swatch: "#15513b",
      swatchRing: "#d4af6a",
      surfaceStyle: "felt",
      c0: "#1c5740", c1: "#134230", c2: "#0b2a1e",
      accent: "rgba(212, 175, 106, 0.26)",
      railStyle: "wood",
      railBase: [46, 26, 15], railVar: [30, 18, 10],
      surfaceSpec: 0.08, surfaceShininess: 12.0,
      railSpec: 0.35, railShininess: 32.0
    },
    crimson: {
      id: "crimson",
      label: "Casino Pourpre",
      swatch: "#6e1828",
      swatchRing: "#e5c176",
      surfaceStyle: "felt",
      c0: "#7a1d2d", c1: "#58121f", c2: "#330811",
      accent: "rgba(232, 196, 118, 0.30)",
      railStyle: "wood",
      railBase: [54, 18, 16], railVar: [26, 12, 10],
      surfaceSpec: 0.10, surfaceShininess: 14.0,
      railSpec: 0.42, railShininess: 38.0
    },
    bloodbowl: {
      id: "bloodbowl",
      label: "Stade Blood Bowl",
      swatch: "#26632c",
      swatchRing: "#f2efe6",
      surfaceStyle: "pitch",
      c0: "#2e6d32", c1: "#235727", c2: "#163b19",
      accent: "rgba(244, 240, 228, 0.46)",
      railStyle: "wood",
      railBase: [52, 36, 22], railVar: [24, 16, 12],
      surfaceSpec: 0.06, surfaceShininess: 10.0,
      railSpec: 0.28, railShininess: 24.0
    },
    tavern: {
      id: "tavern",
      label: "Taverne Chêne",
      swatch: "#634024",
      swatchRing: "#c49a6c",
      surfaceStyle: "planks",
      c0: "#6e4728", c1: "#52321b", c2: "#382010",
      accent: "rgba(20, 10, 4, 0.42)",
      railStyle: "metal",
      railBase: [38, 40, 44], railVar: [20, 22, 24],
      surfaceSpec: 0.22, surfaceShininess: 22.0,
      railSpec: 0.58, railShininess: 52.0
    },
    dungeon: {
      id: "dungeon",
      label: "Donjon Pierre",
      swatch: "#353b42",
      swatchRing: "#8c96a0",
      surfaceStyle: "stone",
      c0: "#3e454d", c1: "#2d333a", c2: "#1d2126",
      accent: "rgba(15, 18, 22, 0.52)",
      railStyle: "stone",
      railBase: [44, 48, 54], railVar: [22, 24, 26],
      surfaceSpec: 0.14, surfaceShininess: 18.0,
      railSpec: 0.24, railShininess: 22.0
    },
    rockstage: {
      id: "rockstage",
      label: "Scène Rock",
      swatch: "#1b1424",
      swatchRing: "#ff3d6e",
      surfaceStyle: "rock",
      c0: "#241930", c1: "#16101f", c2: "#0b0811",
      accent: "rgba(255, 61, 110, 0.34)",
      railStyle: "metal",
      railBase: [26, 24, 30], railVar: [30, 28, 34],
      surfaceSpec: 0.28, surfaceShininess: 30.0,
      railSpec: 0.78, railShininess: 76.0
    },
    cosmos: {
      id: "cosmos",
      label: "Table Astrale",
      swatch: "#131e3d",
      swatchRing: "#7ae2ff",
      surfaceStyle: "cosmos",
      c0: "#17264d", c1: "#0e1733", c2: "#060b1a",
      accent: "rgba(122, 226, 255, 0.32)",
      railStyle: "metal",
      railBase: [24, 28, 42], railVar: [24, 28, 40],
      surfaceSpec: 0.26, surfaceShininess: 34.0,
      railSpec: 0.68, railShininess: 68.0
    },
    leather: {
      id: "leather",
      label: "Cuir Havane",
      swatch: "#6b3d22",
      swatchRing: "#e0b66c",
      surfaceStyle: "leather",
      c0: "#7a4626", c1: "#5c3219", c2: "#3b1e0e",
      accent: "rgba(235, 204, 148, 0.42)",
      railStyle: "metal",
      railBase: [110, 84, 42], railVar: [36, 28, 16],
      surfaceSpec: 0.20, surfaceShininess: 24.0,
      railSpec: 0.76, railShininess: 72.0
    }
  };

  const BOARD_THEME_ORDER = [
    "emerald", "crimson", "bloodbowl", "tavern",
    "dungeon", "rockstage", "cosmos", "leather"
  ];

  function getTheme(id) {
    return BOARD_THEMES[id] || BOARD_THEMES.emerald;
  }

  function makeRng(seed) {
    let s = (seed >>> 0) || 1;
    return () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  /* =====================================================================
   * 1. Convex 2D Board Polygon & Matching Physics Wall Planes
   * ===================================================================== */
  function buildBoardPolygon(shapeId, hw, hd) {
    // Vertices ordered CCW when looking from +Y down onto XZ plane
    // (in XZ with +X right and +Z down on screen, CCW from +Y is clockwise in (x,z) screen coords:
    //  verify: cross((b-a), (c-a)) has +Y component when (dx1*dz2 - dz1*dx2) < 0)
    const pts = [];
    if (shapeId === "octagon") {
      const r = Math.min(hw, hd) * 1.06;
      const cx = hw * 0.56;
      const cz = hd * 0.56;
      const rx = Math.max(hw * 0.96, r);
      const rz = Math.max(hd * 0.96, r);
      // 8-gon with chamfered corners
      pts.push(
        [-cx, -rz], [ cx, -rz],
        [ rx, -cz], [ rx,  cz],
        [ cx,  rz], [-cx,  rz],
        [-rx,  cz], [-rx, -cz]
      );
    } else if (shapeId === "hexagon") {
      const r = Math.min(hw * 0.98, hd * 1.14);
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3; // flat-top / pointy-sides hexagon
        pts.push([Math.cos(a) * r * 1.06, Math.sin(a) * r * 0.96]);
      }
    } else if (shapeId === "circle") {
      const segs = 24;
      const r = Math.min(hw * 0.94, hd * 1.08);
      for (let i = 0; i < segs; i++) {
        const a = (2 * Math.PI * i) / segs;
        pts.push([Math.cos(a) * r, Math.sin(a) * r]);
      }
    } else {
      // Classic rectangle
      pts.push([-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]);
    }

    // Ensure consistent winding: outward normal points away from (0,0)
    // Compute signed area in (x, z): sum (x0*z1 - x1*z0).
    // For +Y upward face normal, we want (p1-p0) x (p2-p0) to have +Y => (z1-z0)*(x2-x0) - (x1-x0)*(z2-z0) > 0 => signed area < 0.
    let area2 = 0;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      area2 += a[0] * b[1] - b[0] * a[1];
    }
    if (area2 > 0) pts.reverse();
    return pts;
  }

  function buildWallPlanes(pts) {
    const walls = [];
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % n];
      const ex = b[0] - a[0];
      const ez = b[1] - a[1];
      const len = Math.hypot(ex, ez) || 1;
      // Candidate normal perpendicular to edge
      let ox = ez / len;
      let oz = -ex / len;
      // Make sure it points outward (dot with midpoint > 0)
      const mx = (a[0] + b[0]) * 0.5;
      const mz = (a[1] + b[1]) * 0.5;
      if (ox * mx + oz * mz < 0) {
        ox = -ox;
        oz = -oz;
      }
      const dist = a[0] * ox + a[1] * oz;
      walls.push({
        ox,
        oz,
        dist,
        inNormal: [-ox, 0, -oz]
      });
    }
    return walls;
  }

  function clampPointToBoard(x, z, walls, margin) {
    let px = x;
    let pz = z;
    for (let iter = 0; iter < 3; iter++) {
      for (const w of walls) {
        const limit = Math.max(0.4, w.dist - margin);
        const pen = px * w.ox + pz * w.oz - limit;
        if (pen > 0) {
          px -= w.ox * pen;
          pz -= w.oz * pen;
        }
      }
    }
    return [px, pz];
  }

  /* =====================================================================
   * 2. 3D Floor & Mitered Rail Meshes for Any Convex Board Polygon
   * ===================================================================== */
  function buildBoardGeometry(shapeId, hw, hd) {
    const pts = buildBoardPolygon(shapeId, hw, hd);
    const walls = buildWallPlanes(pts);
    const n = pts.length;

    // Bounding box for clean floor UVs
    let maxX = 0.001, maxZ = 0.001;
    for (const [x, z] of pts) {
      if (Math.abs(x) > maxX) maxX = Math.abs(x);
      if (Math.abs(z) > maxZ) maxZ = Math.abs(z);
    }

    // --- Floor Mesh (triangle fan from center 0,0,0, +Y normal) ---
    const fPos = [0, 0, 0];
    const fNorm = [0, 1, 0];
    const fUv = [0.5, 0.5];
    const fIdx = [];
    for (let i = 0; i < n; i++) {
      const [x, z] = pts[i];
      fPos.push(x, 0, z);
      fNorm.push(0, 1, 0);
      fUv.push(0.5 + (x / (maxX * 2)), 0.5 + (z / (maxZ * 2)));
    }
    for (let i = 0; i < n; i++) {
      const next = (i + 1) % n;
      fIdx.push(0, 1 + i, 1 + next);
    }

    // --- Mitered Rail Mesh ---
    const railT = 0.62;
    const railH = 0.72;
    const yBot = -0.06;
    const yTop = railH - 0.05;

    // Outer offset vertices by intersecting adjacent offset wall lines
    const outerPts = [];
    for (let i = 0; i < n; i++) {
      const wPrev = walls[(i - 1 + n) % n];
      const wCurr = walls[i];
      const d1 = wPrev.dist + railT;
      const d2 = wCurr.dist + railT;
      const det = wPrev.ox * wCurr.oz - wPrev.oz * wCurr.ox;
      if (Math.abs(det) > 1e-4) {
        const ox = (d1 * wCurr.oz - wPrev.oz * d2) / det;
        const oz = (wPrev.ox * d2 - d1 * wCurr.ox) / det;
        outerPts.push([ox, oz]);
      } else {
        outerPts.push([pts[i][0] + wCurr.ox * railT, pts[i][1] + wCurr.oz * railT]);
      }
    }

    const rPos = [];
    const rNorm = [];
    const rUv = [];
    const rIdx = [];

    function pushQuad(p0, p1, p2, p3, nrm, uLen) {
      // Ensure CCW matching nrm
      const e1 = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
      const e2 = [p2[0] - p0[0], p2[1] - p0[1], p2[2] - p0[2]];
      const cr = [
        e1[1]*e2[2] - e1[2]*e2[1],
        e1[2]*e2[0] - e1[0]*e2[2],
        e1[0]*e2[1] - e1[1]*e2[0]
      ];
      const flip = (cr[0]*nrm[0] + cr[1]*nrm[1] + cr[2]*nrm[2]) < 0;
      const base = rPos.length / 3;
      const verts = flip ? [p0, p3, p2, p1] : [p0, p1, p2, p3];
      const uvs = [[0, 0], [uLen, 0], [uLen, 1], [0, 1]];
      for (let k = 0; k < 4; k++) {
        rPos.push(verts[k][0], verts[k][1], verts[k][2]);
        rNorm.push(nrm[0], nrm[1], nrm[2]);
        rUv.push(uvs[k][0], uvs[k][1]);
      }
      rIdx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }

    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const inA = pts[i], inB = pts[j];
      const outA = outerPts[i], outB = outerPts[j];
      const w = walls[i];
      const edgeLen = Math.hypot(inB[0] - inA[0], inB[1] - inA[1]);
      const uTile = Math.max(0.4, edgeLen * 0.35);

      // Top rail cap (+Y)
      pushQuad(
        [inA[0], yTop, inA[1]],
        [inB[0], yTop, inB[1]],
        [outB[0], yTop, outB[1]],
        [outA[0], yTop, outA[1]],
        [0, 1, 0],
        uTile
      );
      // Inner vertical wall (inward normal)
      pushQuad(
        [inA[0], yBot, inA[1]],
        [inB[0], yBot, inB[1]],
        [inB[0], yTop, inB[1]],
        [inA[0], yTop, inA[1]],
        w.inNormal,
        uTile
      );
      // Outer vertical wall (outward normal)
      pushQuad(
        [outB[0], yBot, outB[1]],
        [outA[0], yBot, outA[1]],
        [outA[0], yTop, outA[1]],
        [outB[0], yTop, outB[1]],
        [w.ox, 0, w.oz],
        uTile
      );
    }

    return {
      shapeId,
      pts,
      walls,
      floorMesh: {
        positions: new Float32Array(fPos),
        normals: new Float32Array(fNorm),
        uvs: new Float32Array(fUv),
        indices: new Uint16Array(fIdx)
      },
      railMesh: {
        positions: new Float32Array(rPos),
        normals: new Float32Array(rNorm),
        uvs: new Float32Array(rUv),
        indices: new Uint16Array(rIdx)
      }
    };
  }

  /* =====================================================================
   * 3. Procedural Board Surface & Rail Textures (8 themes)
   * ===================================================================== */
  function createSurfaceCanvas(themeId) {
    const t = getTheme(themeId);
    const size = 512;
    const c = document.createElement("canvas");
    c.width = size;
    c.height = size;
    const ctx = c.getContext("2d");
    const rng = makeRng(themeId.length * 9137 + 42);

    const grad = ctx.createRadialGradient(size*0.5, size*0.48, size*0.05, size*0.5, size*0.5, size*0.72);
    grad.addColorStop(0, t.c0);
    grad.addColorStop(0.55, t.c1);
    grad.addColorStop(1, t.c2);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    if (t.surfaceStyle === "pitch") {
      // Mowed stadium grass stripes
      const stripes = 12;
      const sw = size / stripes;
      for (let i = 0; i < stripes; i++) {
        ctx.fillStyle = i % 2 === 0 ? "rgba(255,255,255,0.045)" : "rgba(0,0,0,0.05)";
        ctx.fillRect(i * sw, 0, sw, size);
      }
      // Crisp chalk pitch markings
      ctx.strokeStyle = t.accent;
      ctx.lineWidth = 4;
      ctx.strokeRect(32, 32, size - 64, size - 64);
      // Center line & circle
      ctx.beginPath();
      ctx.moveTo(size * 0.5, 32);
      ctx.lineTo(size * 0.5, size - 32);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(size * 0.5, size * 0.5, 58, 0, Math.PI * 2);
      ctx.stroke();
      // Wide-zone dashed lines
      ctx.lineWidth = 2;
      for (const y of [136, size - 136]) {
        for (let x = 44; x < size - 44; x += 26) {
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + 14, y);
          ctx.stroke();
        }
      }
    } else if (t.surfaceStyle === "planks") {
      const planks = 7;
      const ph = size / planks;
      for (let p = 0; p < planks; p++) {
        const y0 = p * ph;
        ctx.fillStyle = p % 2 === 0 ? "rgba(255,220,170,0.04)" : "rgba(0,0,0,0.06)";
        ctx.fillRect(0, y0, size, ph);
        // Wood grain streaks
        ctx.strokeStyle = "rgba(24, 12, 4, 0.14)";
        ctx.lineWidth = 1.5;
        for (let g = 0; g < 6; g++) {
          const gy = y0 + (g + 0.5) * (ph / 6);
          ctx.beginPath();
          ctx.moveTo(0, gy);
          ctx.lineTo(size, gy + (rng() - 0.5) * 6);
          ctx.stroke();
        }
        // Plank seam
        ctx.fillStyle = t.accent;
        ctx.fillRect(0, y0, size, 2.5);
      }
    } else if (t.surfaceStyle === "stone") {
      const rows = 6, cols = 6;
      const rw = size / cols, rh = size / rows;
      for (let r = 0; r < rows; r++) {
        const off = (r % 2) * (rw * 0.5);
        for (let col = -1; col <= cols; col++) {
          const sx = col * rw + off;
          const sy = r * rh;
          ctx.fillStyle = rng() > 0.5 ? "rgba(255,255,255,0.035)" : "rgba(0,0,0,0.05)";
          ctx.fillRect(sx + 2, sy + 2, rw - 4, rh - 4);
          ctx.strokeStyle = t.accent;
          ctx.lineWidth = 3;
          ctx.strokeRect(sx, sy, rw, rh);
        }
      }
      // Subtle engraved center rune ring
      ctx.strokeStyle = "rgba(180, 195, 210, 0.14)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(size*0.5, size*0.5, 118, 0, Math.PI * 2);
      ctx.stroke();
    } else if (t.surfaceStyle === "rock") {
      // Subtle stage checker / metal diamond grid + center electric star
      ctx.strokeStyle = "rgba(255, 61, 110, 0.10)";
      ctx.lineWidth = 1.5;
      for (let i = -size; i < size * 2; i += 44) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i + size, size);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(i, size);
        ctx.lineTo(i + size, 0);
        ctx.stroke();
      }
      // Center stage emblem ring + star
      ctx.strokeStyle = t.accent;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(size*0.5, size*0.5, 132, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = "rgba(255, 212, 59, 0.24)";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI * 0.5 + (i * Math.PI) / 5;
        const rad = i % 2 === 0 ? 112 : 48;
        const x = size*0.5 + Math.cos(a) * rad;
        const y = size*0.5 + Math.sin(a) * rad;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    } else if (t.surfaceStyle === "cosmos") {
      // Astrolabe circles + starfield
      for (let s = 0; s < 140; s++) {
        ctx.fillStyle = s % 6 === 0 ? "rgba(255, 224, 140, 0.72)" : "rgba(220, 242, 255, 0.55)";
        ctx.beginPath();
        ctx.arc(rng() * size, rng() * size, 0.8 + rng() * 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = t.accent;
      ctx.lineWidth = 1.8;
      for (const r of [72, 146, 206]) {
        ctx.beginPath();
        ctx.arc(size*0.5, size*0.5, r, 0, Math.PI * 2);
        ctx.stroke();
      }
      for (let k = 0; k < 8; k++) {
        const a = (k * Math.PI) / 4;
        ctx.beginPath();
        ctx.moveTo(size*0.5 + Math.cos(a)*72, size*0.5 + Math.sin(a)*72);
        ctx.lineTo(size*0.5 + Math.cos(a)*206, size*0.5 + Math.sin(a)*206);
        ctx.stroke();
      }
    } else if (t.surfaceStyle === "leather") {
      // Saddle-stitched perimeter border
      ctx.strokeStyle = t.accent;
      ctx.lineWidth = 2.4;
      for (let x = 36; x < size - 36; x += 14) {
        ctx.beginPath(); ctx.moveTo(x, 30); ctx.lineTo(x + 7, 30); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x, size - 30); ctx.lineTo(x + 7, size - 30); ctx.stroke();
      }
      for (let y = 36; y < size - 36; y += 14) {
        ctx.beginPath(); ctx.moveTo(30, y); ctx.lineTo(30, y + 7); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(size - 30, y); ctx.lineTo(size - 30, y + 7); ctx.stroke();
      }
    } else {
      // Classic felt inlaid double brass border
      ctx.strokeStyle = t.accent;
      ctx.lineWidth = 2.5;
      ctx.strokeRect(26, 26, size - 52, size - 52);
      ctx.strokeStyle = "rgba(212, 175, 106, 0.12)";
      ctx.lineWidth = 1;
      ctx.strokeRect(34, 34, size - 68, size - 68);
    }

    // Subtle organic surface noise
    if (typeof ctx.getImageData === "function" && typeof ctx.putImageData === "function") {
      const img = ctx.getImageData(0, 0, size, size);
      const d = img.data;
      const amp = t.surfaceStyle === "felt" || t.surfaceStyle === "pitch" ? 12 : 7;
      for (let i = 0; i < d.length; i += 4) {
        const n = (rng() - 0.5) * amp;
        d[i] = Math.min(255, Math.max(0, d[i] + n));
        d[i+1] = Math.min(255, Math.max(0, d[i+1] + n));
        d[i+2] = Math.min(255, Math.max(0, d[i+2] + n));
      }
      ctx.putImageData(img, 0, 0);
    }

    return c;
  }

  function createRailCanvas(themeId) {
    const t = getTheme(themeId);
    const size = 256;
    const c = document.createElement("canvas");
    c.width = size;
    c.height = size;
    const ctx = c.getContext("2d");
    const rng = makeRng(themeId.length * 4129 + 7);

    const [br, bg, bb] = t.railBase;
    const [vr, vg, vb] = t.railVar;
    for (let y = 0; y < size; y++) {
      const wave = t.railStyle === "wood" ? (Math.sin(y * 0.11) * 10 + Math.sin(y * 0.37) * 5) : 0;
      const shade = 0.5 + 0.5 * Math.sin((y + wave) * (t.railStyle === "metal" ? 0.45 : 0.22));
      const r = Math.min(255, Math.floor(br + shade * vr));
      const g = Math.min(255, Math.floor(bg + shade * vg));
      const b = Math.min(255, Math.floor(bb + shade * vb));
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(0, y, size, 1);
    }

    ctx.fillStyle = "rgba(0, 0, 0, 0.14)";
    for (let i = 0; i < 36; i++) {
      ctx.fillRect(0, rng() * size, size, 1 + rng() * 2);
    }
    return c;
  }

  const api = {
    BOARD_SHAPES,
    BOARD_THEMES,
    BOARD_THEME_ORDER,
    getTheme,
    buildBoardGeometry,
    clampPointToBoard,
    createSurfaceCanvas,
    createRailCanvas
  };

  if (typeof globalThis !== "undefined") {
    globalThis.TableBoards = api;
  }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})();
