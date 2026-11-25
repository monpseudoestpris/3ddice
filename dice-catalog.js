(() => {
  "use strict";

  /* =====================================================================
   * Extended Dice Catalog (Sprout Module)
   *  - Polyhedra: d%, d14, d16, d24, d30, d60, d100
   *  - Presets for mixed dice pools (d6 -> d100 + Blood Bowl)
   * ===================================================================== */

  /* --- Minimal 3D vector helpers --- */
  function v3Dot(a, b) { return a[0]*b[0] + a[1]*b[1] + a[2]*b[2]; }
  function v3Cross(a, b) {
    return [
      a[1]*b[2] - a[2]*b[1],
      a[2]*b[0] - a[0]*b[2],
      a[0]*b[1] - a[1]*b[0]
    ];
  }
  function v3Len(a) { return Math.hypot(a[0], a[1], a[2]); }
  function v3Norm(a) {
    const l = v3Len(a) || 1;
    return [a[0]/l, a[1]/l, a[2]/l];
  }

  function orientFaceCCW(vertices, rawIndices) {
    let cx = 0, cy = 0, cz = 0;
    for (const idx of rawIndices) {
      cx += vertices[idx][0];
      cy += vertices[idx][1];
      cz += vertices[idx][2];
    }
    const k = rawIndices.length;
    const center = [cx / k, cy / k, cz / k];
    const v0 = vertices[rawIndices[0]];
    const v1 = vertices[rawIndices[1]];
    const v2 = vertices[rawIndices[2]];
    let n = v3Norm(v3Cross(
      [v1[0] - v0[0], v1[1] - v0[1], v1[2] - v0[2]],
      [v2[0] - v0[0], v2[1] - v0[1], v2[2] - v0[2]]
    ));
    if (v3Dot(n, center) < 0) n = [-n[0], -n[1], -n[2]];

    const ref = Math.abs(n[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    const tx = v3Norm(v3Cross(ref, n));
    const ty = v3Cross(n, tx);
    const sorted = rawIndices.slice().sort((ia, ib) => {
      const a = vertices[ia], b = vertices[ib];
      const angA = Math.atan2(
        v3Dot([a[0] - center[0], a[1] - center[1], a[2] - center[2]], ty),
        v3Dot([a[0] - center[0], a[1] - center[1], a[2] - center[2]], tx)
      );
      const angB = Math.atan2(
        v3Dot([b[0] - center[0], b[1] - center[1], b[2] - center[2]], ty),
        v3Dot([b[0] - center[0], b[1] - center[1], b[2] - center[2]], tx)
      );
      return angA - angB;
    });
    return { indices: sorted, n, center };
  }

  function computeFaceUVLayout(vertices, face, upHint, uvRadius = 0.43) {
    const n = face.n;
    const c = face.center;
    const d = v3Dot(upHint, n);
    let upDir = [upHint[0] - d * n[0], upHint[1] - d * n[1], upHint[2] - d * n[2]];
    if (v3Len(upDir) < 1e-5) {
      const fallback = Math.abs(n[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
      const fd = v3Dot(fallback, n);
      upDir = [fallback[0] - fd * n[0], fallback[1] - fd * n[1], fallback[2] - fd * n[2]];
    }
    upDir = v3Norm(upDir);
    const vAxis = [-upDir[0], -upDir[1], -upDir[2]];
    const uAxis = v3Norm(v3Cross(upDir, n));

    const localPts = [];
    let maxR = 1e-5;
    for (const idx of face.indices) {
      const p = vertices[idx];
      const dx = p[0] - c[0], dy = p[1] - c[1], dz = p[2] - c[2];
      const x = dx * uAxis[0] + dy * uAxis[1] + dz * uAxis[2];
      const y = dx * vAxis[0] + dy * vAxis[1] + dz * vAxis[2];
      localPts.push([x, y]);
      const r = Math.hypot(x, y);
      if (r > maxR) maxR = r;
    }
    const scale = uvRadius / maxR;
    return { uvPts: localPts.map(([x, y]) => [0.5 + x * scale, 0.5 + y * scale]) };
  }

  function assignOppositeValues(faces) {
    const total = faces.length;
    const used = new Array(total).fill(false);
    let nextLow = 1;
    for (let i = 0; i < total; i++) {
      if (used[i]) continue;
      let opp = -1;
      let minDot = Infinity;
      for (let j = i + 1; j < total; j++) {
        if (used[j]) continue;
        const dot = v3Dot(faces[i].n, faces[j].n);
        if (dot < minDot) {
          minDot = dot;
          opp = j;
        }
      }
      faces[i].value = nextLow;
      used[i] = true;
      if (opp !== -1) {
        faces[opp].value = total + 1 - nextLow;
        used[opp] = true;
      }
      nextLow++;
    }
  }

  /* =====================================================================
   * 1. Exact 3D Half-Space Dual Polyhedron Builder (d24, d30, d60, d100)
   * ===================================================================== */
  function clipPolyByHalfSpace(poly, n, dist) {
    if (poly.length < 3) return [];
    const out = [];
    const eps = 1e-7;
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i];
      const b = poly[(i + 1) % poly.length];
      const da = v3Dot(a, n) - dist;
      const db = v3Dot(b, n) - dist;
      const aIn = da <= eps;
      const bIn = db <= eps;
      if (aIn) out.push(a);
      if (aIn !== bIn) {
        const denom = da - db;
        if (Math.abs(denom) > 1e-12) {
          const t = da / denom;
          out.push([
            a[0] + t * (b[0] - a[0]),
            a[1] + t * (b[1] - a[1]),
            a[2] + t * (b[2] - a[2])
          ]);
        }
      }
    }
    return out;
  }

  function buildDualPolyhedronSpec(type, label, normals, R, atlasCfg) {
    const vertices = [];
    const weldEpsSq = 1e-6;
    function addVertex(p) {
      for (let i = 0; i < vertices.length; i++) {
        const v = vertices[i];
        const dx = v[0] - p[0], dy = v[1] - p[1], dz = v[2] - p[2];
        if (dx*dx + dy*dy + dz*dz < weldEpsSq) return i;
      }
      vertices.push(p);
      return vertices.length - 1;
    }

    const faces = [];
    const big = R * 4.0;

    for (let i = 0; i < normals.length; i++) {
      const n = v3Norm(normals[i]);
      const ref = Math.abs(n[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
      const u = v3Norm(v3Cross(ref, n));
      const v = v3Cross(n, u);
      const c0 = [n[0] * R, n[1] * R, n[2] * R];

      // Initial large CCW square on plane p . n = R
      let poly = [
        [c0[0] - big*u[0] - big*v[0], c0[1] - big*u[1] - big*v[1], c0[2] - big*u[2] - big*v[2]],
        [c0[0] + big*u[0] - big*v[0], c0[1] + big*u[1] - big*v[1], c0[2] + big*u[2] - big*v[2]],
        [c0[0] + big*u[0] + big*v[0], c0[1] + big*u[1] + big*v[1], c0[2] + big*u[2] + big*v[2]],
        [c0[0] - big*u[0] + big*v[0], c0[1] - big*u[1] + big*v[1], c0[2] - big*u[2] + big*v[2]]
      ];

      for (let j = 0; j < normals.length; j++) {
        if (j === i) continue;
        poly = clipPolyByHalfSpace(poly, normals[j], R);
        if (poly.length < 3) break;
      }
      if (poly.length < 3) continue;

      const idxList = [];
      for (const pt of poly) {
        const idx = addVertex(pt);
        if (idxList.length === 0 || idxList[idxList.length - 1] !== idx) {
          idxList.push(idx);
        }
      }
      if (idxList.length > 1 && idxList[0] === idxList[idxList.length - 1]) {
        idxList.pop();
      }
      if (idxList.length < 3) continue;

      const f = orientFaceCCW(vertices, idxList);
      const upHint = Math.abs(f.n[1]) < 0.92 ? [0, 1, 0] : [0, 0, -1];
      const { uvPts } = computeFaceUVLayout(vertices, f, upHint, 0.44);
      faces.push({
        value: 0,
        n: f.n,
        center: f.center,
        indices: f.indices,
        uvPts
      });
    }

    assignOppositeValues(faces);

    return {
      type,
      sides: faces.length,
      label,
      bottomRead: false,
      vertices,
      faces,
      restHeight: R,
      collisionRadius: atlasCfg.collisionRadius || (R * 1.05),
      shadowScale: atlasCfg.shadowScale || 1.76,
      atlasCols: atlasCfg.atlasCols,
      atlasRows: atlasCfg.atlasRows,
      atlasW: atlasCfg.atlasW,
      atlasH: atlasCfg.atlasH,
      fontScale: atlasCfg.fontScale,
      underline69: true
    };
  }

  function buildSymmetricFibonacciNormals(totalCount) {
    const half = totalCount / 2;
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    const normals = [];
    for (let i = 0; i < half; i++) {
      const y = 1 - (i + 0.5) / half; // strictly > 0
      const rad = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = goldenAngle * i;
      const n = v3Norm([Math.cos(theta) * rad, y, Math.sin(theta) * rad]);
      normals.push(n);
      normals.push([-n[0], -n[1], -n[2]]);
    }
    return normals;
  }

  /* =====================================================================
   * 2. Specific Polyhedral Builders (d%, d14, d16, d24, d30, d60, d100)
   * ===================================================================== */
  function buildTrapezohedronSpec(type, label, halfSides, opts = {}) {
    const N = halfSides;
    const H = opts.H || 0.80;
    const R = opts.R || 0.78;
    const cosA = Math.cos(Math.PI / N);
    const y0 = H * (1 - cosA) / (1 + cosA);

    const vertices = [
      [0,  H, 0],
      [0, -H, 0]
    ];
    for (let k = 0; k < N; k++) {
      const a = (2 * Math.PI * k) / N;
      vertices.push([R * Math.cos(a), y0, R * Math.sin(a)]);
    }
    for (let k = 0; k < N; k++) {
      const a = ((2 * k + 1) * Math.PI) / N;
      vertices.push([R * Math.cos(a), -y0, R * Math.sin(a)]);
    }

    const faces = [];
    for (let k = 0; k < N; k++) {
      const uNext = 2 + ((k + 1) % N);
      const fUp = orientFaceCCW(vertices, [0, 2 + k, 2 + N + k, uNext]);
      faces.push({
        value: 0,
        n: fUp.n,
        center: fUp.center,
        indices: fUp.indices,
        uvPts: computeFaceUVLayout(vertices, fUp, [0, 1, 0]).uvPts
      });

      const lNext = 2 + N + ((k + 1) % N);
      const fLo = orientFaceCCW(vertices, [1, 2 + N + k, uNext, lNext]);
      faces.push({
        value: 0,
        n: fLo.n,
        center: fLo.center,
        indices: fLo.indices,
        uvPts: computeFaceUVLayout(vertices, fLo, [0, -1, 0]).uvPts
      });
    }

    assignOppositeValues(faces);

    if (opts.percentile) {
      for (const f of faces) {
        const tens = (f.value % 10) * 10;
        f.value = tens;
        f.displayText = tens === 0 ? "00" : String(tens);
      }
    }

    const restHeight = v3Dot(vertices[faces[0].indices[0]], faces[0].n);
    return {
      type,
      sides: opts.percentile ? 90 : N * 2,
      maxDisplayValue: opts.percentile ? 90 : N * 2,
      percentile: Boolean(opts.percentile),
      label,
      bottomRead: false,
      vertices,
      faces,
      restHeight,
      collisionRadius: 0.66,
      shadowScale: 1.74,
      atlasCols: opts.atlasCols || 4,
      atlasRows: opts.atlasRows || 4,
      atlasW: opts.atlasW || 1024,
      atlasH: opts.atlasH || 1024,
      fontScale: opts.fontScale || 0.27,
      underline69: !opts.percentile
    };
  }

  function buildExtendedPolyhedraSpecs() {
    const specs = {};

    specs.d100p = buildTrapezohedronSpec("d100p", "d%", 5, {
      percentile: true,
      atlasCols: 4,
      atlasRows: 4,
      atlasW: 1024,
      atlasH: 1024,
      fontScale: 0.25
    });
    specs.d14 = buildTrapezohedronSpec("d14", "d14", 7, {
      atlasCols: 4,
      atlasRows: 4,
      atlasW: 1024,
      atlasH: 1024,
      fontScale: 0.25
    });
    specs.d16 = buildTrapezohedronSpec("d16", "d16", 8, {
      atlasCols: 4,
      atlasRows: 4,
      atlasW: 1024,
      atlasH: 1024,
      fontScale: 0.24
    });

    // d24: Exact Tetrakis Hexahedron (24 congruent faces)
    {
      const normals = [];
      const a = 2, b = 1;
      for (const s1 of [-1, 1]) {
        for (const s2 of [-1, 1]) {
          normals.push(v3Norm([s1 * a, s2 * b, 0]));
          normals.push(v3Norm([s1 * b, s2 * a, 0]));
          normals.push(v3Norm([s1 * a, 0, s2 * b]));
          normals.push(v3Norm([s1 * b, 0, s2 * a]));
          normals.push(v3Norm([0, s1 * a, s2 * b]));
          normals.push(v3Norm([0, s1 * b, s2 * a]));
        }
      }
      specs.d24 = buildDualPolyhedronSpec("d24", "d24", normals, 0.66, {
        atlasCols: 6,
        atlasRows: 4,
        atlasW: 1536,
        atlasH: 1024,
        fontScale: 0.27
      });
    }

    // d30: Exact Rhombic Triacontahedron (30 congruent golden rhombuses)
    {
      const phi = (1 + Math.sqrt(5)) * 0.5;
      const invPhi = 1 / phi;
      const normals = [
        [1, 0, 0], [-1, 0, 0],
        [0, 1, 0], [0, -1, 0],
        [0, 0, 1], [0, 0, -1]
      ];
      for (const s1 of [-1, 1]) {
        for (const s2 of [-1, 1]) {
          for (const s3 of [-1, 1]) {
            normals.push(v3Norm([s1 * 0.5, s2 * phi * 0.5, s3 * invPhi * 0.5]));
            normals.push(v3Norm([s1 * phi * 0.5, s2 * invPhi * 0.5, s3 * 0.5]));
            normals.push(v3Norm([s1 * invPhi * 0.5, s2 * 0.5, s3 * phi * 0.5]));
          }
        }
      }
      specs.d30 = buildDualPolyhedronSpec("d30", "d30", normals, 0.69, {
        atlasCols: 6,
        atlasRows: 5,
        atlasW: 1536,
        atlasH: 1280,
        fontScale: 0.28
      });
    }

    // d60: 60-sided symmetric dual polyhedron
    specs.d60 = buildDualPolyhedronSpec("d60", "d60", buildSymmetricFibonacciNormals(60), 0.72, {
      atlasCols: 10,
      atlasRows: 6,
      atlasW: 2048,
      atlasH: 1280,
      fontScale: 0.30,
      collisionRadius: 0.74
    });

    // d100: Zocchihedron (100-sided symmetric convex dual polyhedron)
    specs.d100 = buildDualPolyhedronSpec("d100", "d100", buildSymmetricFibonacciNormals(100), 0.78, {
      atlasCols: 10,
      atlasRows: 10,
      atlasW: 2048,
      atlasH: 2048,
      fontScale: 0.30,
      collisionRadius: 0.80,
      shadowScale: 1.88
    });

    return specs;
  }

  function getSymbolicFaceInfo(dieType, value) {
    if (dieType === "bb" && typeof globalThis !== "undefined" && globalThis.BloodBowlDice) {
      return globalThis.BloodBowlDice.getFaceInfo(value);
    }
    return null;
  }

  function createSymbolicSvg(dieType, value) {
    if (dieType === "bb" && typeof globalThis !== "undefined" && globalThis.BloodBowlDice) {
      return globalThis.BloodBowlDice.createFaceSvg(value);
    }
    return null;
  }

  /* =====================================================================
   * 3. Catalog Metadata & Mix Presets (d6 -> d100 + Blood Bowl)
   * ===================================================================== */
  const CATALOG_GROUPS = [
    {
      id: "poly",
      title: "Polyédriques (d6 → d100)",
      items: [
        { type: "d6",    label: "d6",   title: "Cube classique (6 faces)" },
        { type: "d8",    label: "d8",   title: "Octaèdre (8 faces)" },
        { type: "d10",   label: "d10",  title: "Dé à 10 faces" },
        { type: "d100p", label: "d%",   title: "Dé de dizaines (00–90)" },
        { type: "d12",   label: "d12",  title: "Dodécaèdre (12 faces)" },
        { type: "d14",   label: "d14",  title: "Dé à 14 faces" },
        { type: "d16",   label: "d16",  title: "Dé à 16 faces" },
        { type: "d20",   label: "d20",  title: "Icosaèdre (20 faces)" },
        { type: "d24",   label: "d24",  title: "Dé à 24 faces" },
        { type: "d30",   label: "d30",  title: "Triacontaèdre (30 faces)" },
        { type: "d60",   label: "d60",  title: "Dé à 60 faces" },
        { type: "d100",  label: "d100", title: "Zocchihedron (100 faces)" }
      ]
    },
    {
      id: "boardgames",
      title: "Blood Bowl",
      items: [
        { type: "bb", label: "BB", title: "Blood Bowl (Blocage 6 faces)" }
      ]
    }
  ];

  const MIX_PRESETS = [
    { id: "pct", label: "d100 (d%+d10)",        pool: { d100p: 1, d10: 1 } },
    { id: "rpg", label: "JDR (d20+2d6+d8)",     pool: { d20: 1, d6: 2, d8: 1 } },
    { id: "bb2", label: "Blood Bowl (2 BB)",    pool: { bb: 2 } },
    { id: "bb3", label: "Blood Bowl (2 BB+d6)", pool: { bb: 2, d6: 1 } }
  ];

  const ALL_TYPES = CATALOG_GROUPS.flatMap((g) => g.items.map((it) => it.type));

  const api = {
    ALL_TYPES,
    CATALOG_GROUPS,
    MIX_PRESETS,
    buildExtendedPolyhedraSpecs,
    getSymbolicFaceInfo,
    createSymbolicSvg
  };

  if (typeof globalThis !== "undefined") {
    globalThis.DiceCatalog = api;
  }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})();
