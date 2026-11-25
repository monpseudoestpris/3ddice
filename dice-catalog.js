(() => {
  "use strict";

  /* =====================================================================
   * Extended Dice Catalog (Sprout Module)
   *  - Polyhedra: d2, d3, d%, d14, d16, d24, d30, d60, d100
   *  - Symbolic / Fun / Rock & Roll: fudge, rock, chaos
   *  - Presets for mixed dice pools
   * ===================================================================== */

  const SVG_NS = "http://www.w3.org/2000/svg";

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
   * 2. Specific Polyhedral Builders (d2, d3, d%, d14, d16, d24, d30, d60, d100)
   * ===================================================================== */
  function buildD2Spec() {
    const segs = 16;
    const R = 0.64;
    const H = 0.14;
    const vertices = [];
    for (let i = 0; i < segs; i++) {
      const a = (2 * Math.PI * i) / segs;
      vertices.push([R * Math.cos(a), H, R * Math.sin(a)]);
    }
    for (let i = 0; i < segs; i++) {
      const a = (2 * Math.PI * i) / segs;
      vertices.push([R * Math.cos(a), -H, R * Math.sin(a)]);
    }

    const topIdx = Array.from({ length: segs }, (_, i) => i);
    const botIdx = Array.from({ length: segs }, (_, i) => segs + i);
    const fTop = orientFaceCCW(vertices, topIdx);
    const fBot = orientFaceCCW(vertices, botIdx);

    const faces = [
      {
        value: 2,
        displayText: "2",
        n: fTop.n,
        center: fTop.center,
        indices: fTop.indices,
        uvPts: computeFaceUVLayout(vertices, fTop, [0, 0, -1], 0.44).uvPts
      },
      {
        value: 1,
        displayText: "1",
        n: fBot.n,
        center: fBot.center,
        indices: fBot.indices,
        uvPts: computeFaceUVLayout(vertices, fBot, [0, 0, 1], 0.44).uvPts
      }
    ];

    // Closed rim quads (visual only, non-scoring)
    for (let i = 0; i < segs; i++) {
      const next = (i + 1) % segs;
      const rf = orientFaceCCW(vertices, [i, next, segs + next, segs + i]);
      faces.push({
        value: 0,
        noScore: true,
        n: rf.n,
        center: rf.center,
        indices: rf.indices,
        uvPts: computeFaceUVLayout(vertices, rf, [0, 1, 0], 0.42).uvPts
      });
    }

    return {
      type: "d2",
      sides: 2,
      label: "d2",
      bottomRead: false,
      vertices,
      faces,
      restHeight: H,
      collisionRadius: 0.65,
      shadowScale: 1.72,
      atlasCols: 2,
      atlasRows: 1,
      atlasW: 1024,
      atlasH: 512,
      fontScale: 0.42
    };
  }

  function buildD3Spec() {
    // 3-sided prism with pointed end-caps so it only settles on its 3 rectangular faces
    const L = 0.56;
    const tipL = 0.88;
    const R = 0.54;
    const vertices = [
      [-tipL, 0, 0], // 0: left tip
      [ tipL, 0, 0]  // 1: right tip
    ];
    for (let i = 0; i < 3; i++) {
      const a = (2 * Math.PI * i) / 3 + Math.PI / 6;
      vertices.push([-L, R * Math.cos(a), R * Math.sin(a)]); // 2, 3, 4
    }
    for (let i = 0; i < 3; i++) {
      const a = (2 * Math.PI * i) / 3 + Math.PI / 6;
      vertices.push([ L, R * Math.cos(a), R * Math.sin(a)]); // 5, 6, 7
    }

    const faces = [];
    for (let i = 0; i < 3; i++) {
      const next = (i + 1) % 3;
      const f = orientFaceCCW(vertices, [2 + i, 2 + next, 5 + next, 5 + i]);
      faces.push({
        value: i + 1,
        n: f.n,
        center: f.center,
        indices: f.indices,
        uvPts: computeFaceUVLayout(vertices, f, [1, 0, 0], 0.42).uvPts
      });
    }
    // End-cap triangles (visual only, non-scoring)
    for (let i = 0; i < 3; i++) {
      const next = (i + 1) % 3;
      const fl = orientFaceCCW(vertices, [0, 2 + next, 2 + i]);
      faces.push({
        value: 0,
        noScore: true,
        n: fl.n,
        center: fl.center,
        indices: fl.indices,
        uvPts: computeFaceUVLayout(vertices, fl, [0, 1, 0], 0.4).uvPts
      });
      const fr = orientFaceCCW(vertices, [1, 5 + i, 5 + next]);
      faces.push({
        value: 0,
        noScore: true,
        n: fr.n,
        center: fr.center,
        indices: fr.indices,
        uvPts: computeFaceUVLayout(vertices, fr, [0, 1, 0], 0.4).uvPts
      });
    }

    const restHeight = v3Dot(vertices[faces[0].indices[0]], faces[0].n);
    return {
      type: "d3",
      sides: 3,
      label: "d3",
      bottomRead: false,
      vertices,
      faces,
      restHeight,
      collisionRadius: 0.64,
      shadowScale: 1.72,
      atlasCols: 3,
      atlasRows: 1,
      atlasW: 1024,
      atlasH: 512,
      fontScale: 0.36
    };
  }

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

  function buildExtendedPolyhedraSpecs(cubeCorners, d6Faces, dieHalf) {
    const specs = {};

    specs.d2 = buildD2Spec();
    specs.d3 = buildD3Spec();
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

    // Symbolic 6-sided beveled cube dice: fudge, rock, chaos
    for (const [type, label, numericMode] of [
      ["fudge", "Fate", true],
      ["rock", "Rock", false],
      ["chaos", "Fun", false]
    ]) {
      specs[type] = {
        type,
        sides: 6,
        label,
        symbolic: true,
        beveledCube: true,
        hasNumericValue: numericMode,
        bottomRead: false,
        vertices: cubeCorners,
        faces: d6Faces,
        restHeight: dieHalf,
        collisionRadius: dieHalf * 1.06,
        shadowScale: 1.65
      };
    }

    return specs;
  }

  /* =====================================================================
   * 3. Symbolic Dice Metadata (Fate/Fudge, Rock & Roll, Fun/Chaos)
   * ===================================================================== */
  const SYMBOLIC_FACES = {
    fudge: {
      1: { id: "minus", shortLabel: "−", label: "Moins (-1)", description: "Fate : -1", tone: "danger", numericValue: -1 },
      2: { id: "minus", shortLabel: "−", label: "Moins (-1)", description: "Fate : -1", tone: "danger", numericValue: -1 },
      3: { id: "blank", shortLabel: "0", label: "Neutre (0)", description: "Fate : 0", tone: "neutral", numericValue: 0 },
      4: { id: "blank", shortLabel: "0", label: "Neutre (0)", description: "Fate : 0", tone: "neutral", numericValue: 0 },
      5: { id: "plus",  shortLabel: "+", label: "Plus (+1)", description: "Fate : +1", tone: "max", numericValue: 1 },
      6: { id: "plus",  shortLabel: "+", label: "Plus (+1)", description: "Fate : +1", tone: "max", numericValue: 1 }
    },
    rock: {
      1: { id: "horns",  shortLabel: "Rock!",   label: "Cornes du Diable", description: "Rock & Roll — Cornes du Diable !", tone: "max" },
      2: { id: "bolt",   shortLabel: "Éclair",  label: "Haute Tension", description: "Rock & Roll — Haute Tension !", tone: "good" },
      3: { id: "guitar", shortLabel: "Guitare", label: "Solo de Guitare", description: "Rock & Roll — Solo de Guitare !", tone: "good" },
      4: { id: "rskull", shortLabel: "Metal",   label: "Crâne Metal", description: "Rock & Roll — Crâne Metal !", tone: "danger" },
      5: { id: "star",   shortLabel: "Star",    label: "Rock Star", description: "Rock & Roll — Rock Star !", tone: "warning" },
      6: { id: "flame",  shortLabel: "En Feu",  label: "Scène en Feu", description: "Rock & Roll — Scène en Feu !", tone: "max" }
    },
    chaos: {
      1: { id: "bomb",    shortLabel: "Boom!",   label: "Bombe", description: "Fun — Boom ! Effet explosif", tone: "danger" },
      2: { id: "twist",   shortLabel: "Twist",   label: "Rebondissement", description: "Fun — Twist ! Inversez la situation", tone: "warning" },
      3: { id: "shield",  shortLabel: "Safe",    label: "Bouclier", description: "Fun — Protégé ce tour", tone: "neutral" },
      4: { id: "x2",      shortLabel: "×2",      label: "Double", description: "Fun — Effet doublé !", tone: "good" },
      5: { id: "target",  shortLabel: "Crit!",   label: "Coup Critique", description: "Fun — Dans le mille !", tone: "good" },
      6: { id: "crown",   shortLabel: "Jackpot", label: "Couronne", description: "Fun — Jackpot royal !", tone: "max" }
    }
  };

  function getSymbolicFaceInfo(dieType, value) {
    if (dieType === "bb" && typeof globalThis !== "undefined" && globalThis.BloodBowlDice) {
      return globalThis.BloodBowlDice.getFaceInfo(value);
    }
    const map = SYMBOLIC_FACES[dieType];
    if (!map) return null;
    return map[value] || map[3];
  }

  /* =====================================================================
   * 4. Canvas 2D Vector Art for Symbolic 6-Sided Dice (fudge, rock, chaos)
   * ===================================================================== */
  function drawCarved(ctx, traceFn, fillCol, rimCol, lw) {
    ctx.save();
    ctx.translate(2, 2.5);
    traceFn(ctx);
    ctx.fillStyle = rimCol;
    ctx.fill();
    ctx.restore();

    traceFn(ctx);
    ctx.fillStyle = fillCol;
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.26)";
    ctx.lineWidth = lw || 2.8;
    ctx.lineJoin = "round";
    ctx.stroke();
  }

  function drawStar(ctx, cx, cy, pts, rOut, rIn, rot) {
    ctx.beginPath();
    for (let i = 0; i < pts * 2; i++) {
      const a = rot + (i * Math.PI) / pts;
      const r = i % 2 === 0 ? rOut : rIn;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  function drawSymbolicFace(ctx, cx, cy, r, faceId, theme) {
    ctx.save();
    ctx.translate(cx, cy);

    if (faceId === "minus") {
      drawCarved(ctx, (c) => {
        c.beginPath();
        c.rect(-0.68 * r, -0.15 * r, 1.36 * r, 0.30 * r);
      }, theme.pipOne, theme.pipInnerRim);
    } else if (faceId === "plus") {
      drawCarved(ctx, (c) => {
        c.beginPath();
        c.moveTo(-0.15 * r, -0.68 * r); c.lineTo(0.15 * r, -0.68 * r);
        c.lineTo(0.15 * r, -0.15 * r); c.lineTo(0.68 * r, -0.15 * r);
        c.lineTo(0.68 * r,  0.15 * r); c.lineTo(0.15 * r,  0.15 * r);
        c.lineTo(0.15 * r,  0.68 * r); c.lineTo(-0.15 * r, 0.68 * r);
        c.lineTo(-0.15 * r, 0.15 * r); c.lineTo(-0.68 * r, 0.15 * r);
        c.lineTo(-0.68 * r, -0.15 * r); c.lineTo(-0.15 * r, -0.15 * r);
        c.closePath();
      }, theme.pip, theme.pipInnerRim);
    } else if (faceId === "blank") {
      // Subtle engraved ring for clean Fate blank face
      ctx.beginPath();
      ctx.arc(0, 0, 0.18 * r, 0, Math.PI * 2);
      ctx.strokeStyle = theme.facetBorder || "rgba(128,128,128,0.35)";
      ctx.lineWidth = 4;
      ctx.stroke();
    } else if (faceId === "horns") {
      // Stylized Devil Horns Rock Hand
      drawCarved(ctx, (c) => {
        c.beginPath();
        c.moveTo(-0.46 * r, 0.78 * r);
        c.lineTo(-0.56 * r, 0.12 * r);
        // Index finger up
        c.lineTo(-0.62 * r, -0.78 * r);
        c.lineTo(-0.34 * r, -0.78 * r);
        c.lineTo(-0.24 * r, -0.06 * r);
        // Folded middle & ring knuckles
        c.lineTo(0.24 * r, -0.06 * r);
        // Pinky up
        c.lineTo(0.36 * r, -0.74 * r);
        c.lineTo(0.62 * r, -0.70 * r);
        c.lineTo(0.54 * r, 0.14 * r);
        // Palm + wrist
        c.lineTo(0.44 * r, 0.78 * r);
        c.closePath();
      }, theme.pipOne, theme.pipInnerRim);
      // Folded thumb bar cutout
      ctx.fillStyle = theme.base;
      ctx.fillRect(-0.24 * r, 0.04 * r, 0.48 * r, 0.13 * r);
    } else if (faceId === "bolt") {
      drawCarved(ctx, (c) => {
        c.beginPath();
        c.moveTo(0.14 * r, -0.92 * r);
        c.lineTo(-0.52 * r, 0.06 * r);
        c.lineTo(-0.04 * r, 0.06 * r);
        c.lineTo(-0.20 * r, 0.92 * r);
        c.lineTo(0.54 * r, -0.10 * r);
        c.lineTo(0.06 * r, -0.10 * r);
        c.closePath();
      }, theme.pip, theme.pipInnerRim);
    } else if (faceId === "guitar") {
      // Flying-V electric guitar angled 45 deg
      ctx.rotate(-Math.PI * 0.25);
      drawCarved(ctx, (c) => {
        c.beginPath();
        // Headstock + neck
        c.moveTo(0.86 * r, -0.12 * r);
        c.lineTo(0.62 * r, -0.16 * r);
        c.lineTo(0.58 * r, -0.07 * r);
        c.lineTo(-0.06 * r, -0.07 * r);
        // Upper V wing
        c.lineTo(-0.82 * r, -0.56 * r);
        c.lineTo(-0.90 * r, -0.34 * r);
        c.lineTo(-0.42 * r, 0);
        // Lower V wing
        c.lineTo(-0.90 * r, 0.34 * r);
        c.lineTo(-0.82 * r, 0.56 * r);
        c.lineTo(-0.06 * r, 0.07 * r);
        c.lineTo(0.58 * r, 0.07 * r);
        c.lineTo(0.62 * r, 0.16 * r);
        c.lineTo(0.86 * r, 0.06 * r);
        c.closePath();
      }, theme.pip, theme.pipInnerRim);
      ctx.fillStyle = theme.base;
      ctx.fillRect(-0.34 * r, -0.09 * r, 0.12 * r, 0.18 * r);
    } else if (faceId === "rskull") {
      // Mohawk Rock Skull with sunglasses
      drawCarved(ctx, (c) => {
        c.beginPath();
        // Spiked mohawk top
        c.moveTo(-0.38 * r, -0.52 * r);
        c.lineTo(-0.32 * r, -0.88 * r);
        c.lineTo(-0.12 * r, -0.66 * r);
        c.lineTo(0, -0.96 * r);
        c.lineTo(0.12 * r, -0.66 * r);
        c.lineTo(0.32 * r, -0.88 * r);
        c.lineTo(0.38 * r, -0.52 * r);
        c.bezierCurveTo(0.66 * r, -0.34 * r, 0.68 * r, 0.12 * r, 0.44 * r, 0.36 * r);
        c.lineTo(0.34 * r, 0.80 * r);
        c.lineTo(-0.34 * r, 0.80 * r);
        c.lineTo(-0.44 * r, 0.36 * r);
        c.bezierCurveTo(-0.68 * r, 0.12 * r, -0.66 * r, -0.34 * r, -0.38 * r, -0.52 * r);
        c.closePath();
      }, theme.pip, theme.pipInnerRim);
      // Rock shades cutouts
      ctx.fillStyle = theme.base;
      ctx.fillRect(-0.46 * r, -0.16 * r, 0.40 * r, 0.24 * r);
      ctx.fillRect(0.06 * r, -0.16 * r, 0.40 * r, 0.24 * r);
      ctx.fillRect(-0.10 * r, -0.10 * r, 0.20 * r, 0.08 * r);
      // Teeth
      for (const tx of [-0.18, 0, 0.18]) {
        ctx.fillRect(tx * r - 0.03 * r, 0.56 * r, 0.06 * r, 0.24 * r);
      }
    } else if (faceId === "star") {
      drawCarved(ctx, (c) => drawStar(c, 0, 0, 5, 0.94 * r, 0.40 * r, -Math.PI * 0.5), theme.pip, theme.pipInnerRim);
      drawStar(ctx, 0, 0, 5, 0.36 * r, 0.17 * r, -Math.PI * 0.5);
      ctx.fillStyle = theme.base;
      ctx.fill();
    } else if (faceId === "flame") {
      drawCarved(ctx, (c) => {
        c.beginPath();
        c.moveTo(0, -0.92 * r);
        c.bezierCurveTo(0.42 * r, -0.44 * r, 0.72 * r, -0.04 * r, 0.56 * r, 0.48 * r);
        c.bezierCurveTo(0.46 * r, 0.78 * r, 0.22 * r, 0.88 * r, 0, 0.88 * r);
        c.bezierCurveTo(-0.28 * r, 0.88 * r, -0.58 * r, 0.72 * r, -0.60 * r, 0.36 * r);
        c.bezierCurveTo(-0.62 * r, 0.04 * r, -0.34 * r, -0.22 * r, -0.36 * r, -0.52 * r);
        c.bezierCurveTo(-0.18 * r, -0.36 * r, -0.14 * r, -0.68 * r, 0, -0.92 * r);
        c.closePath();
      }, theme.pipOne, theme.pipInnerRim);
      // Inner flame core cutout
      ctx.beginPath();
      ctx.moveTo(0, -0.12 * r);
      ctx.bezierCurveTo(0.24 * r, 0.18 * r, 0.26 * r, 0.62 * r, 0, 0.66 * r);
      ctx.bezierCurveTo(-0.26 * r, 0.62 * r, -0.24 * r, 0.18 * r, 0, -0.12 * r);
      ctx.fillStyle = theme.base;
      ctx.fill();
    } else if (faceId === "bomb") {
      drawCarved(ctx, (c) => {
        c.beginPath();
        c.arc(-0.06 * r, 0.16 * r, 0.62 * r, 0, Math.PI * 2);
      }, theme.pipOne, theme.pipInnerRim);
      // Fuse cap + spark
      ctx.fillStyle = theme.pipOne;
      ctx.fillRect(0.10 * r, -0.56 * r, 0.24 * r, 0.22 * r);
      drawStar(ctx, 0.44 * r, -0.62 * r, 6, 0.28 * r, 0.11 * r, 0);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(-0.26 * r, -0.02 * r, 0.13 * r, 0, Math.PI * 2);
      ctx.fillStyle = theme.base;
      ctx.fill();
    } else if (faceId === "twist") {
      // Bold double-arrow swirl
      ctx.strokeStyle = theme.pip;
      ctx.lineWidth = 0.16 * r;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.arc(0, 0, 0.62 * r, 0.2, Math.PI * 0.95);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 0.62 * r, Math.PI + 0.2, Math.PI * 1.95);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 0.20 * r, 0, Math.PI * 2);
      ctx.fillStyle = theme.pipOne;
      ctx.fill();
    } else if (faceId === "shield") {
      drawCarved(ctx, (c) => {
        c.beginPath();
        c.moveTo(0, -0.84 * r);
        c.lineTo(0.70 * r, -0.56 * r);
        c.lineTo(0.64 * r, 0.10 * r);
        c.bezierCurveTo(0.56 * r, 0.56 * r, 0.24 * r, 0.78 * r, 0, 0.90 * r);
        c.bezierCurveTo(-0.24 * r, 0.78 * r, -0.56 * r, 0.56 * r, -0.64 * r, 0.10 * r);
        c.lineTo(-0.70 * r, -0.56 * r);
        c.closePath();
      }, theme.pip, theme.pipInnerRim);
      ctx.beginPath();
      ctx.moveTo(0, -0.52 * r);
      ctx.lineTo(0.36 * r, -0.36 * r);
      ctx.lineTo(0.32 * r, 0.08 * r);
      ctx.lineTo(0, 0.52 * r);
      ctx.lineTo(-0.32 * r, 0.08 * r);
      ctx.lineTo(-0.36 * r, -0.36 * r);
      ctx.closePath();
      ctx.fillStyle = theme.base;
      ctx.fill();
    } else if (faceId === "x2") {
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `800 ${Math.round(r * 1.25)}px "Inter", "Segoe UI", sans-serif`;
      ctx.fillStyle = theme.pipInnerRim;
      ctx.fillText("×2", 2, 4);
      ctx.fillStyle = theme.pip;
      ctx.fillText("×2", 0, 2);
    } else if (faceId === "target") {
      for (const [rad, col] of [[0.84, theme.pip], [0.58, theme.base], [0.36, theme.pipOne], [0.16, theme.base]]) {
        ctx.beginPath();
        ctx.arc(0, 0, rad * r, 0, Math.PI * 2);
        ctx.fillStyle = col;
        ctx.fill();
      }
    } else if (faceId === "crown") {
      drawCarved(ctx, (c) => {
        c.beginPath();
        c.moveTo(-0.76 * r, 0.56 * r);
        c.lineTo(-0.84 * r, -0.42 * r);
        c.lineTo(-0.36 * r, 0.04 * r);
        c.lineTo(0, -0.68 * r);
        c.lineTo(0.36 * r, 0.04 * r);
        c.lineTo(0.84 * r, -0.42 * r);
        c.lineTo(0.76 * r, 0.56 * r);
        c.closePath();
      }, theme.pipOne, theme.pipInnerRim);
      ctx.fillStyle = theme.base;
      ctx.fillRect(-0.62 * r, 0.28 * r, 1.24 * r, 0.14 * r);
    }

    ctx.restore();
  }

  function createSymbolicAtlasCanvas(dieType, theme) {
    const t = theme || {
      base: "#f4efe4", edgeShade: "#d9cfbc", pip: "#1d1b18",
      pipOne: "#a62b2b", pipInnerRim: "rgba(255,255,255,0.45)"
    };
    const tile = 384;
    const c = document.createElement("canvas");
    c.width = tile * 3;
    c.height = tile * 2;
    const ctx = c.getContext("2d");

    for (let val = 1; val <= 6; val++) {
      const col = (val - 1) % 3;
      const row = Math.floor((val - 1) / 3);
      const ox = col * tile;
      const oy = row * tile;

      if (typeof globalThis !== "undefined" && globalThis.DiceThemes) {
        globalThis.DiceThemes.paintTileBackground(ctx, ox, oy, tile, tile, t, val * 29 + dieType.length * 7);
      } else {
        ctx.fillStyle = t.base;
        ctx.fillRect(ox, oy, tile, tile);
      }

      const info = getSymbolicFaceInfo(dieType, val);
      if (info) {
        drawSymbolicFace(ctx, ox + tile * 0.5, oy + tile * 0.5, tile * 0.305, info.id, t);
      }
    }
    return c;
  }

  /* =====================================================================
   * 5. Safe DOM SVG Icons for HUD Chips
   * ===================================================================== */
  function svgEl(tag, attrs) {
    const el = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) {
      el.setAttribute(k, String(v));
    }
    return el;
  }

  function createSymbolicSvg(dieType, value) {
    if (dieType === "bb" && typeof globalThis !== "undefined" && globalThis.BloodBowlDice) {
      return globalThis.BloodBowlDice.createFaceSvg(value);
    }
    const info = getSymbolicFaceInfo(dieType, value);
    const svg = svgEl("svg", {
      viewBox: "0 0 24 24",
      width: "14",
      height: "14",
      fill: "none",
      stroke: "currentColor",
      "stroke-width": "2",
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      "aria-hidden": "true",
      class: "bb-chip-icon"
    });

    const id = info ? info.id : "";
    if (id === "minus") {
      svg.appendChild(svgEl("line", { x1: "5", y1: "12", x2: "19", y2: "12" }));
    } else if (id === "plus") {
      svg.appendChild(svgEl("line", { x1: "12", y1: "5", x2: "12", y2: "19" }));
      svg.appendChild(svgEl("line", { x1: "5", y1: "12", x2: "19", y2: "12" }));
    } else if (id === "blank") {
      svg.appendChild(svgEl("circle", { cx: "12", cy: "12", r: "4" }));
    } else if (id === "horns") {
      svg.appendChild(svgEl("path", { d: "M7 20V5l3 1v6h4V6l3-1v15Z" }));
    } else if (id === "bolt") {
      svg.appendChild(svgEl("polygon", { points: "13 2 4 14 11 14 10 22 20 10 13 10" }));
    } else if (id === "guitar") {
      svg.appendChild(svgEl("path", { d: "M19 5l-7 7m-2-1l-5 8 5-2 3 3 2-5" }));
      svg.appendChild(svgEl("circle", { cx: "19", cy: "5", r: "1.5" }));
    } else if (id === "rskull") {
      svg.appendChild(svgEl("path", { d: "M12 3l2 3 3-1 1 5c0 3-1.5 4.5-2.5 5.2V19h-7v-3.8C7.5 14.5 6 13 6 10l1-5 3 1Z" }));
      svg.appendChild(svgEl("rect", { x: "7.5", y: "9.5", width: "3.5", height: "2.2", fill: "currentColor", stroke: "none" }));
      svg.appendChild(svgEl("rect", { x: "13", y: "9.5", width: "3.5", height: "2.2", fill: "currentColor", stroke: "none" }));
    } else if (id === "star") {
      svg.appendChild(svgEl("polygon", { points: "12 2 15 9 22 9.5 16.5 14.5 18 22 12 18 6 22 7.5 14.5 2 9.5 9 9" }));
    } else if (id === "flame") {
      svg.appendChild(svgEl("path", { d: "M12 2c3 4 6 7 6 12a6 6 0 0 1-12 0c0-3 2-5 3-7 0 2 1 3 2 3 0-3 1-6 1-8Z" }));
    } else if (id === "bomb") {
      svg.appendChild(svgEl("circle", { cx: "11", cy: "14", r: "6" }));
      svg.appendChild(svgEl("path", { d: "M15 9l2-3 3 1" }));
    } else if (id === "twist") {
      svg.appendChild(svgEl("path", { d: "M21 12a9 9 0 0 0-15-6.7L3 8" }));
      svg.appendChild(svgEl("path", { d: "M3 12a9 9 0 0 0 15 6.7L21 16" }));
    } else if (id === "shield") {
      svg.appendChild(svgEl("path", { d: "M12 3l7 3v5c0 5-3 8.5-7 10-4-1.5-7-5-7-10V6l7-3Z" }));
    } else if (id === "x2") {
      svg.appendChild(svgEl("path", { d: "M5 9l5 6M10 9l-5 6M14 9a2.5 2.5 0 0 1 5 0c0 2-5 4-5 6h5" }));
    } else if (id === "target") {
      svg.appendChild(svgEl("circle", { cx: "12", cy: "12", r: "8" }));
      svg.appendChild(svgEl("circle", { cx: "12", cy: "12", r: "3.5" }));
    } else {
      // crown
      svg.appendChild(svgEl("polygon", { points: "3 18 5 7 9.5 11.5 12 5 14.5 11.5 19 7 21 18" }));
    }

    return svg;
  }

  /* =====================================================================
   * 6. Catalog Metadata & Mix Presets
   * ===================================================================== */
  const CATALOG_GROUPS = [
    {
      id: "poly",
      title: "Polyédriques (d2 → d100)",
      items: [
        { type: "d2",    label: "d2",   title: "Pièce (2 faces)" },
        { type: "d3",    label: "d3",   title: "Dé à 3 faces" },
        { type: "d4",    label: "d4",   title: "Tétraèdre (4 faces)" },
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
      id: "special",
      title: "Spéciaux, Fun & Rock & Roll",
      items: [
        { type: "bb",    label: "BB",   title: "Blood Bowl (Blocage 6 faces)" },
        { type: "fudge", label: "Fate", title: "Fate / Fudge (−, 0, +)" },
        { type: "rock",  label: "Rock", title: "Dé Rock & Roll (6 symboles)" },
        { type: "chaos", label: "Fun",  title: "Dé Fun & Chaos (6 effets)" }
      ]
    }
  ];

  const MIX_PRESETS = [
    { id: "pct",    label: "d100 (d%+d10)", pool: { d100p: 1, d10: 1 } },
    { id: "rpg",    label: "JDR (d20+2d6+d8)", pool: { d20: 1, d6: 2, d8: 1 } },
    { id: "bb",     label: "Blood Bowl (2 BB+d6)", pool: { bb: 2, d6: 1 } },
    { id: "rock",   label: "Rock Night (2 Rock+d20)", pool: { rock: 2, d20: 1 } },
    { id: "party",  label: "Chaos Fun (2 Fun+d12)", pool: { chaos: 2, d12: 1 } }
  ];

  const ALL_TYPES = CATALOG_GROUPS.flatMap((g) => g.items.map((it) => it.type));

  const api = {
    ALL_TYPES,
    CATALOG_GROUPS,
    MIX_PRESETS,
    buildExtendedPolyhedraSpecs,
    getSymbolicFaceInfo,
    createSymbolicAtlasCanvas,
    createSymbolicSvg
  };

  if (typeof globalThis !== "undefined") {
    globalThis.DiceCatalog = api;
  }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})();
