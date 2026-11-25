(() => {
  "use strict";

  /* =====================================================================
   * 1. Configuration & Constants
   * ===================================================================== */
  const MIN_DICE = 1;
  const MAX_DICE = 16;
  const DIE_HALF = 0.5; // d6 1x1x1 world units
  const GRAVITY = -34.0;
  const INV_MASS = 1.0;
  const INV_INERTIA = 6.0;
  const MAX_HISTORY = 30;
  const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const DIE_DAMP_START_SEC = REDUCED_MOTION ? 1.4 : 2.8;
  const DIE_MAX_ROLL_SEC = REDUCED_MOTION ? 2.4 : 4.5;
  const DIE_TYPES = (window.DiceCatalog && window.DiceCatalog.ALL_TYPES)
    ? window.DiceCatalog.ALL_TYPES.slice()
    : ["d6", "d8", "d10", "d12", "d20", "bb"];

  // Standard western d6 face normals (opposite faces sum to 7)
  const D6_FACES = [
    { value: 1, n: [0, 1, 0] },
    { value: 6, n: [0, -1, 0] },
    { value: 2, n: [0, 0, 1] },
    { value: 5, n: [0, 0, -1] },
    { value: 3, n: [1, 0, 0] },
    { value: 4, n: [-1, 0, 0] }
  ];

  const CUBE_CORNERS = [
    [-DIE_HALF, -DIE_HALF, -DIE_HALF],
    [ DIE_HALF, -DIE_HALF, -DIE_HALF],
    [-DIE_HALF,  DIE_HALF, -DIE_HALF],
    [ DIE_HALF,  DIE_HALF, -DIE_HALF],
    [-DIE_HALF, -DIE_HALF,  DIE_HALF],
    [ DIE_HALF, -DIE_HALF,  DIE_HALF],
    [-DIE_HALF,  DIE_HALF,  DIE_HALF],
    [ DIE_HALF,  DIE_HALF,  DIE_HALF]
  ];

  const FALLBACK_THEMES = {
    ivory: {
      base: "#f4efe4",
      edgeShade: "#d9cfbc",
      facetBorder: "rgba(92, 78, 56, 0.24)",
      pip: "#1d1b18",
      pipOne: "#a62b2b",
      pipInnerRim: "rgba(255,255,255,0.45)",
      specStrength: 0.55,
      shininess: 48.0
    },
    obsidian: {
      base: "#1f2226",
      edgeShade: "#111316",
      facetBorder: "rgba(212, 175, 106, 0.28)",
      pip: "#e2be74",
      pipOne: "#f0d394",
      pipInnerRim: "rgba(0,0,0,0.65)",
      specStrength: 0.72,
      shininess: 64.0
    },
    emerald: {
      base: "#134e3a",
      edgeShade: "#0a2f22",
      facetBorder: "rgba(226, 190, 116, 0.25)",
      pip: "#f4efe2",
      pipOne: "#e2be74",
      pipInnerRim: "rgba(0,0,0,0.45)",
      specStrength: 0.65,
      shininess: 56.0
    }
  };
  const DIE_THEMES = (window.DiceThemes && window.DiceThemes.THEMES) || FALLBACK_THEMES;

  /* =====================================================================
   * 2. Vector, Matrix & Quaternion Math
   * ===================================================================== */
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

  function qNorm(q) {
    const l = Math.hypot(q[0], q[1], q[2], q[3]) || 1;
    return [q[0]/l, q[1]/l, q[2]/l, q[3]/l];
  }

  function qMul(a, b) {
    return [
      a[3]*b[0] + a[0]*b[3] + a[1]*b[2] - a[2]*b[1],
      a[3]*b[1] - a[0]*b[2] + a[1]*b[3] + a[2]*b[0],
      a[3]*b[2] + a[0]*b[1] - a[1]*b[0] + a[2]*b[3],
      a[3]*b[3] - a[0]*b[0] - a[1]*b[1] - a[2]*b[2]
    ];
  }

  function qFromAxisAngle(axis, angle) {
    const s = Math.sin(angle * 0.5);
    return qNorm([axis[0]*s, axis[1]*s, axis[2]*s, Math.cos(angle * 0.5)]);
  }

  function qRotateVec(q, v) {
    const qx = q[0], qy = q[1], qz = q[2], qw = q[3];
    const vx = v[0], vy = v[1], vz = v[2];
    const tx = 2 * (qy * vz - qz * vy);
    const ty = 2 * (qz * vx - qx * vz);
    const tz = 2 * (qx * vy - qy * vx);
    return [
      vx + qw * tx + (qy * tz - qz * ty),
      vy + qw * ty + (qz * tx - qx * tz),
      vz + qw * tz + (qx * ty - qy * tx)
    ];
  }

  function qRandom() {
    const u1 = Math.random();
    const u2 = Math.random() * Math.PI * 2;
    const u3 = Math.random() * Math.PI * 2;
    const sq1 = Math.sqrt(1 - u1);
    const sq2 = Math.sqrt(u1);
    return [
      sq1 * Math.sin(u2),
      sq1 * Math.cos(u2),
      sq2 * Math.sin(u3),
      sq2 * Math.cos(u3)
    ];
  }

  function m4Perspective(fovy, aspect, near, far) {
    const f = 1.0 / Math.tan(fovy * 0.5);
    const nf = 1 / (near - far);
    return new Float32Array([
      f / aspect, 0, 0, 0,
      0, f, 0, 0,
      0, 0, (far + near) * nf, -1,
      0, 0, (2 * far * near) * nf, 0
    ]);
  }

  function m4LookAt(eye, target, up) {
    const z = v3Norm([eye[0] - target[0], eye[1] - target[1], eye[2] - target[2]]);
    const x = v3Norm(v3Cross(up, z));
    const y = v3Cross(z, x);
    return new Float32Array([
      x[0], y[0], z[0], 0,
      x[1], y[1], z[1], 0,
      x[2], y[2], z[2], 0,
      -v3Dot(x, eye), -v3Dot(y, eye), -v3Dot(z, eye), 1
    ]);
  }

  function m4Mul(a, b) {
    const out = new Float32Array(16);
    for (let c = 0; c < 4; c++) {
      for (let r = 0; r < 4; r++) {
        out[c*4 + r] =
          a[0*4 + r]*b[c*4 + 0] +
          a[1*4 + r]*b[c*4 + 1] +
          a[2*4 + r]*b[c*4 + 2] +
          a[3*4 + r]*b[c*4 + 3];
      }
    }
    return out;
  }

  function m4FromPosQuatScale(pos, q, scale) {
    const x = q[0], y = q[1], z = q[2], w = q[3];
    const x2 = x + x, y2 = y + y, z2 = z + z;
    const xx = x*x2, xy = x*y2, xz = x*z2;
    const yy = y*y2, yz = y*z2, zz = z*z2;
    const wx = w*x2, wy = w*y2, wz = w*z2;
    const sx = scale[0], sy = scale[1], sz = scale[2];
    return new Float32Array([
      (1 - (yy + zz)) * sx, (xy + wz) * sx, (xz - wy) * sx, 0,
      (xy - wz) * sy, (1 - (xx + zz)) * sy, (yz + wx) * sy, 0,
      (xz + wy) * sz, (yz - wx) * sz, (1 - (xx + yy)) * sz, 0,
      pos[0], pos[1], pos[2], 1
    ]);
  }

  /* =====================================================================
   * 2b. Polyhedral Dice Specifications (d4, d6, d8, d10, d12, d20)
   * ===================================================================== */
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
    if (v3Dot(n, center) < 0) {
      n = [-n[0], -n[1], -n[2]];
    }

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

  function computeFaceUVLayout(vertices, face, upHint) {
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
    const scale = 0.43 / maxR;
    const uvPts = localPts.map(([x, y]) => [0.5 + x * scale, 0.5 + y * scale]);
    return { uvPts };
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

  function buildPolyhedraSpecs() {
    const specs = {};

    // --- d6: Rounded Beveled Cube (classic pips) ---
    specs.d6 = {
      type: "d6",
      sides: 6,
      label: "d6",
      bottomRead: false,
      vertices: CUBE_CORNERS,
      faces: D6_FACES,
      restHeight: DIE_HALF,
      collisionRadius: DIE_HALF * 1.06,
      shadowScale: 1.65
    };

    // --- bb: Blood Bowl 6-Sided Block Die (shared beveled cube) ---
    specs.bb = {
      type: "bb",
      sides: 6,
      label: "BB",
      symbolic: true,
      beveledCube: true,
      bottomRead: false,
      vertices: CUBE_CORNERS,
      faces: D6_FACES,
      restHeight: DIE_HALF,
      collisionRadius: DIE_HALF * 1.06,
      shadowScale: 1.65
    };

    // --- d8: Regular Octahedron ---
    {
      const R = 0.84;
      const vertices = [
        [ R, 0, 0], [-R, 0, 0],
        [ 0, R, 0], [ 0,-R, 0],
        [ 0, 0, R], [ 0, 0,-R]
      ];
      const rawFaces = [
        { value: 1, idx: [0, 2, 4] },
        { value: 8, idx: [1, 3, 5] },
        { value: 2, idx: [1, 2, 4] },
        { value: 7, idx: [0, 3, 5] },
        { value: 3, idx: [1, 2, 5] },
        { value: 6, idx: [0, 3, 4] },
        { value: 4, idx: [0, 2, 5] },
        { value: 5, idx: [1, 3, 4] }
      ];
      const faces = rawFaces.map((rf) => {
        const f = orientFaceCCW(vertices, rf.idx);
        const upHint = [0, f.n[1] > 0 ? 1 : -1, 0];
        const { uvPts } = computeFaceUVLayout(vertices, f, upHint);
        return { value: rf.value, n: f.n, center: f.center, indices: f.indices, uvPts };
      });
      const restHeight = v3Dot(vertices[faces[0].indices[0]], faces[0].n);
      specs.d8 = {
        type: "d8",
        sides: 8,
        label: "d8",
        bottomRead: false,
        vertices,
        faces,
        restHeight,
        collisionRadius: 0.64,
        shadowScale: 1.68,
        atlasCols: 4,
        atlasRows: 2,
        atlasW: 1024,
        atlasH: 512,
        fontScale: 0.34
      };
    }

    // --- d10: Pentagonal Trapezohedron (planar kites, values 1-10) ---
    {
      const H = 0.82;
      const R = 0.78;
      const cos36 = Math.cos(Math.PI / 5);
      const y0 = H * (1 - cos36) / (1 + cos36);
      const vertices = [
        [0,  H, 0], // 0: North pole
        [0, -H, 0]  // 1: South pole
      ];
      for (let k = 0; k < 5; k++) {
        const a = (2 * Math.PI * k) / 5;
        vertices.push([R * Math.cos(a), y0, R * Math.sin(a)]);
      }
      for (let k = 0; k < 5; k++) {
        const a = ((2 * k + 1) * Math.PI) / 5;
        vertices.push([R * Math.cos(a), -y0, R * Math.sin(a)]);
      }

      const upperVals = [1, 7, 3, 9, 5];
      const faces = [];
      for (let k = 0; k < 5; k++) {
        const uNext = 2 + ((k + 1) % 5);
        const fUp = orientFaceCCW(vertices, [0, 2 + k, 7 + k, uNext]);
        const { uvPts: uvUp } = computeFaceUVLayout(vertices, fUp, [0, 1, 0]);
        faces.push({ value: upperVals[k], n: fUp.n, center: fUp.center, indices: fUp.indices, uvPts: uvUp });

        const lNext = 7 + ((k + 1) % 5);
        const fLo = orientFaceCCW(vertices, [1, 7 + k, uNext, lNext]);
        const { uvPts: uvLo } = computeFaceUVLayout(vertices, fLo, [0, -1, 0]);
        // Lower kite (k + 2) % 5 is directly opposite upper kite k
        const oppUpperIdx = (k + 3) % 5;
        faces.push({ value: 11 - upperVals[oppUpperIdx], n: fLo.n, center: fLo.center, indices: fLo.indices, uvPts: uvLo });
      }

      const restHeight = v3Dot(vertices[faces[0].indices[0]], faces[0].n);
      specs.d10 = {
        type: "d10",
        sides: 10,
        label: "d10",
        bottomRead: false,
        vertices,
        faces,
        restHeight,
        collisionRadius: 0.66,
        shadowScale: 1.72,
        atlasCols: 4,
        atlasRows: 4,
        atlasW: 1024,
        atlasH: 1024,
        fontScale: 0.28,
        underline69: true
      };
    }

    // --- d12: Regular Dodecahedron ---
    {
      const phi = (1 + Math.sqrt(5)) * 0.5;
      const invPhi = 1 / phi;
      const R = 0.72;
      const s = R / Math.sqrt(3);
      const rawVerts = [];
      for (const sx of [-1, 1]) {
        for (const sy of [-1, 1]) {
          for (const sz of [-1, 1]) {
            rawVerts.push([sx * s, sy * s, sz * s]);
          }
        }
      }
      for (const sa of [-1, 1]) {
        for (const sb of [-1, 1]) {
          rawVerts.push([0, sa * invPhi * s, sb * phi * s]);
          rawVerts.push([sa * invPhi * s, sb * phi * s, 0]);
          rawVerts.push([sa * phi * s, 0, sb * invPhi * s]);
        }
      }

      // 12 face normals = dual icosahedron vertices aligned to dodecahedron faces
      const icoNorms = [];
      for (const sa of [-1, 1]) {
        for (const sb of [-1, 1]) {
          icoNorms.push(v3Norm([0, sa * phi, sb]));
          icoNorms.push(v3Norm([sa * phi, sb, 0]));
          icoNorms.push(v3Norm([sa, 0, sb * phi]));
        }
      }

      const faces = icoNorms.map((fn) => {
        const scored = rawVerts.map((v, idx) => ({ idx, d: v3Dot(v, fn) }));
        scored.sort((a, b) => b.d - a.d);
        const f = orientFaceCCW(rawVerts, scored.slice(0, 5).map((x) => x.idx));
        const v0 = rawVerts[f.indices[0]];
        const upHint = [v0[0] - f.center[0], v0[1] - f.center[1], v0[2] - f.center[2]];
        const { uvPts } = computeFaceUVLayout(rawVerts, f, upHint);
        return { value: 0, n: f.n, center: f.center, indices: f.indices, uvPts };
      });
      assignOppositeValues(faces);

      const restHeight = v3Dot(rawVerts[faces[0].indices[0]], faces[0].n);
      specs.d12 = {
        type: "d12",
        sides: 12,
        label: "d12",
        bottomRead: false,
        vertices: rawVerts,
        faces,
        restHeight,
        collisionRadius: 0.66,
        shadowScale: 1.72,
        atlasCols: 4,
        atlasRows: 4,
        atlasW: 1024,
        atlasH: 1024,
        fontScale: 0.34,
        underline69: true
      };
    }

    // --- d20: Regular Icosahedron ---
    {
      const phi = (1 + Math.sqrt(5)) * 0.5;
      const R = 0.74;
      const s = R / Math.sqrt(1 + phi * phi);
      const vertices = [];
      for (const sa of [-1, 1]) {
        for (const sb of [-1, 1]) {
          vertices.push([0, sa * s, sb * phi * s]);
          vertices.push([sa * s, sb * phi * s, 0]);
          vertices.push([sa * phi * s, 0, sb * s]);
        }
      }
      const edgeLen = 2 * s;
      const tol = edgeLen * 0.08;
      const isEdge = (i, j) => {
        const a = vertices[i], b = vertices[j];
        return Math.abs(Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) - edgeLen) < tol;
      };

      const faces = [];
      for (let i = 0; i < vertices.length; i++) {
        for (let j = i + 1; j < vertices.length; j++) {
          if (!isEdge(i, j)) continue;
          for (let k = j + 1; k < vertices.length; k++) {
            if (isEdge(i, k) && isEdge(j, k)) {
              const f = orientFaceCCW(vertices, [i, j, k]);
              const v0 = vertices[f.indices[0]];
              const upHint = [v0[0] - f.center[0], v0[1] - f.center[1], v0[2] - f.center[2]];
              const { uvPts } = computeFaceUVLayout(vertices, f, upHint);
              faces.push({ value: 0, n: f.n, center: f.center, indices: f.indices, uvPts });
            }
          }
        }
      }
      assignOppositeValues(faces);

      const restHeight = v3Dot(vertices[faces[0].indices[0]], faces[0].n);
      specs.d20 = {
        type: "d20",
        sides: 20,
        label: "d20",
        bottomRead: false,
        vertices,
        faces,
        restHeight,
        collisionRadius: 0.68,
        shadowScale: 1.74,
        atlasCols: 8,
        atlasRows: 4,
        atlasW: 2048,
        atlasH: 1024,
        fontScale: 0.27,
        underline69: true
      };
    }

    if (window.DiceCatalog && typeof window.DiceCatalog.buildExtendedPolyhedraSpecs === "function") {
      Object.assign(specs, window.DiceCatalog.buildExtendedPolyhedraSpecs(CUBE_CORNERS, D6_FACES, DIE_HALF));
    }

    return specs;
  }

  const DIE_SPECS = buildPolyhedraSpecs();

  /* =====================================================================
   * 3. Hybrid Sample + Procedural Audio (Public/*.mp3 + Web Audio fallback)
   * ===================================================================== */
  const AUDIO_SAMPLES = {
    toss: "Public/ElevenLabs_Quick_toss_of_dice,_sharp_sound_of_collision.mp3",
    bounce: "Public/ElevenLabs_Dice_bouncing_off_a_gaming_mat,_lively_impact.mp3",
    roll: "Public/ElevenLabs_Dice_rolling_on_a_wooden_table,_gentle_clatter.mp3"
  };

  class DiceAudio {
    constructor() {
      this.ctx = null;
      this.enabled = true;
      this.lastSoundTime = 0;
      this.lastTickTime = 0;
      this.lastSampleMs = { toss: 0, bounce: 0, roll: 0 };
      this.noiseBuffer = null;
      this.rollNoiseBuffer = null;
      this.rollSource = null;
      this.rollFilter = null;
      this.rollGain = null;

      this.samplePools = {};
      this.sampleIdx = { toss: 0, bounce: 0 };
      this.sampleFailed = { toss: false, bounce: false, roll: false };
      this.rollAudio = null;
      this.initSamples();
    }

    initSamples() {
      if (typeof Audio === "undefined") {
        this.sampleFailed = { toss: true, bounce: true, roll: true };
        return;
      }
      for (const key of ["toss", "bounce"]) {
        const pool = [];
        for (let i = 0; i < 4; i++) {
          const a = new Audio(AUDIO_SAMPLES[key]);
          a.preload = "auto";
          a.addEventListener("error", () => { this.sampleFailed[key] = true; });
          pool.push(a);
        }
        this.samplePools[key] = pool;
      }
      const ra = new Audio(AUDIO_SAMPLES.roll);
      ra.preload = "auto";
      ra.loop = true;
      ra.addEventListener("error", () => { this.sampleFailed.roll = true; });
      this.rollAudio = ra;
    }

    playSample(key, volume, minIntervalMs, pitchJitter = true) {
      if (!this.enabled || this.sampleFailed[key]) return false;
      const pool = this.samplePools[key];
      if (!pool || pool.length === 0) return false;
      const nowMs = performance.now();
      if (minIntervalMs > 0 && (nowMs - this.lastSampleMs[key]) < minIntervalMs) {
        return true; // throttled cleanly without triggering synth fallback
      }
      this.lastSampleMs[key] = nowMs;

      const idx = this.sampleIdx[key] % pool.length;
      this.sampleIdx[key] = (idx + 1) % pool.length;
      const a = pool[idx];
      try {
        a.pause();
        a.currentTime = 0;
        a.volume = Math.min(1, Math.max(0.05, volume));
        if (pitchJitter) {
          a.playbackRate = 0.92 + Math.random() * 0.18;
        } else {
          a.playbackRate = 1.0;
        }
        const p = a.play();
        if (p && typeof p.catch === "function") {
          p.catch(() => {});
        }
        return true;
      } catch (err) {
        this.sampleFailed[key] = true;
        return false;
      }
    }

    unlock() {
      if (!this.enabled) return;
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        this.ctx = new AudioCtx();
        const len = Math.floor(this.ctx.sampleRate * 0.08);
        this.noiseBuffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const data = this.noiseBuffer.getChannelData(0);
        for (let i = 0; i < len; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.22));
        }

        // Continuous seamless textured noise buffer for procedural fallback rolling bed
        const rollLen = Math.floor(this.ctx.sampleRate * 1.2);
        this.rollNoiseBuffer = this.ctx.createBuffer(1, rollLen, this.ctx.sampleRate);
        const rData = this.rollNoiseBuffer.getChannelData(0);
        let prev = 0;
        for (let i = 0; i < rollLen; i++) {
          const white = Math.random() * 2 - 1;
          prev = prev * 0.62 + white * 0.38;
          rData[i] = prev;
        }
      }
      if (this.ctx.state === "suspended") {
        this.ctx.resume().catch(() => {});
      }
    }

    ensureRollBed() {
      if (!this.ctx || !this.rollNoiseBuffer || this.rollSource) return;
      const src = this.ctx.createBufferSource();
      src.buffer = this.rollNoiseBuffer;
      src.loop = true;

      const filter = this.ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 460;
      filter.Q.value = 1.6;

      const gain = this.ctx.createGain();
      gain.gain.value = 0.0001;

      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      src.start();

      this.rollSource = src;
      this.rollFilter = filter;
      this.rollGain = gain;
    }

    playLaunchRattle(count) {
      if (!this.enabled) return;
      const vol = Math.min(0.95, 0.52 + count * 0.06);
      if (this.playSample("toss", vol, 0, true)) return;

      if (!this.ctx || this.ctx.state !== "running") return;
      const now = this.ctx.currentTime;
      const hits = Math.min(5, Math.max(2, count));
      for (let i = 0; i < hits; i++) {
        const t = now + i * 0.024 + Math.random() * 0.01;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        const freq = 950 + Math.random() * 650;
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, t);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.55, t + 0.022);
        g.gain.setValueAtTime(0.065, t);
        g.gain.exponentialRampToValueAtTime(0.0008, t + 0.026);
        osc.connect(g);
        g.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.03);
      }
    }

    updateRollSound(groundEnergy, maxAngSpeed) {
      if (!this.enabled) {
        this.stopRollSound();
        return;
      }

      const clamped = Math.min(1, Math.max(0, groundEnergy));
      if (this.rollAudio && !this.sampleFailed.roll) {
        if (clamped > 0.04) {
          this.rollAudio.volume = Math.min(0.85, 0.14 + clamped * 0.7);
          this.rollAudio.playbackRate = 0.86 + clamped * 0.32;
          if (this.rollAudio.paused) {
            const p = this.rollAudio.play();
            if (p && typeof p.catch === "function") p.catch(() => {});
          }
        } else if (!this.rollAudio.paused) {
          this.rollAudio.pause();
          this.rollAudio.currentTime = 0;
        }
        return;
      }

      if (!this.ctx || this.ctx.state !== "running") {
        this.stopRollSound();
        return;
      }
      this.ensureRollBed();
      if (!this.rollGain || !this.rollFilter) return;

      const now = this.ctx.currentTime;
      const targetGain = clamped > 0.03 ? clamped * 0.14 : 0.0001;
      const targetFreq = 320 + clamped * 520;
      this.rollGain.gain.setTargetAtTime(targetGain, now, 0.035);
      this.rollFilter.frequency.setTargetAtTime(targetFreq, now, 0.04);

      const tickInterval = Math.max(0.032, 0.15 - clamped * 0.11);
      if (clamped > 0.06 && maxAngSpeed > 1.2 && (now - this.lastTickTime) >= tickInterval) {
        this.lastTickTime = now;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        const freq = (520 + Math.random() * 480) * (0.85 + clamped * 0.35);
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.48, now + 0.018);
        const vol = Math.min(0.09, 0.022 + clamped * 0.065);
        g.gain.setValueAtTime(vol, now);
        g.gain.exponentialRampToValueAtTime(0.0006, now + 0.022);
        osc.connect(g);
        g.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.025);
      }
    }

    stopRollSound() {
      if (this.rollAudio && !this.rollAudio.paused) {
        this.rollAudio.pause();
        this.rollAudio.currentTime = 0;
      }
      if (!this.ctx || !this.rollGain) return;
      const now = this.ctx.currentTime;
      this.rollGain.gain.setTargetAtTime(0.0001, now, 0.04);
    }

    playImpact(intensity, kind) {
      if (!this.enabled) return;
      const clamped = Math.min(1, Math.max(0.05, intensity));
      if (clamped < 0.07) return;

      // Primary: real audio samples from Public/
      if (kind === "felt") {
        if (this.playSample("bounce", Math.min(0.95, 0.25 + clamped * 0.7), 120, true)) return;
      } else if (kind === "die" || kind === "rail") {
        const key = kind === "die" ? "toss" : "bounce";
        if (this.playSample(key, Math.min(0.85, 0.20 + clamped * 0.65), 110, true)) return;
      }

      if (!this.ctx || this.ctx.state !== "running") return;
      const now = this.ctx.currentTime;
      if (now - this.lastSoundTime < 0.022) return;
      this.lastSoundTime = now;

      // Resonant wooden/ivory click
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      const baseFreq = kind === "die" ? 1350 : (kind === "rail" ? 420 : 280);
      const jitter = 0.85 + Math.random() * 0.35;
      osc.type = kind === "die" ? "triangle" : "sine";
      osc.frequency.setValueAtTime(baseFreq * jitter, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * jitter * 0.45, now + 0.035);

      const vol = clamped * (kind === "die" ? 0.16 : kind === "rail" ? 0.22 : 0.14);
      oscGain.gain.setValueAtTime(vol, now);
      oscGain.gain.exponentialRampToValueAtTime(0.0008, now + 0.045);

      osc.connect(oscGain);
      oscGain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.05);

      // Filtered tactile noise burst
      if (this.noiseBuffer) {
        const src = this.ctx.createBufferSource();
        src.buffer = this.noiseBuffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.value = (kind === "die" ? 2600 : kind === "rail" ? 1100 : 750) * jitter;
        filter.Q.value = kind === "die" ? 2.4 : 1.4;
        const nGain = this.ctx.createGain();
        nGain.gain.setValueAtTime(vol * 0.85, now);
        nGain.gain.exponentialRampToValueAtTime(0.0008, now + 0.04);
        src.connect(filter);
        filter.connect(nGain);
        nGain.connect(this.ctx.destination);
        src.start(now);
      }
    }
  }

  /* =====================================================================
   * 4. Procedural Textures (Felt, Walnut Wood, Die Atlas, Soft Shadow)
   * ===================================================================== */
  function createFeltCanvas() {
    const size = 512;
    const c = document.createElement("canvas");
    c.width = size;
    c.height = size;
    const ctx = c.getContext("2d");

    const grad = ctx.createRadialGradient(size*0.5, size*0.48, size*0.05, size*0.5, size*0.5, size*0.72);
    grad.addColorStop(0, "#1c5740");
    grad.addColorStop(0.55, "#134230");
    grad.addColorStop(1, "#0b2a1e");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    // Fine woven baize noise
    const img = ctx.getImageData(0, 0, size, size);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (Math.random() - 0.5) * 14;
      d[i] = Math.min(255, Math.max(0, d[i] + n));
      d[i+1] = Math.min(255, Math.max(0, d[i+1] + n));
      d[i+2] = Math.min(255, Math.max(0, d[i+2] + n));
    }
    ctx.putImageData(img, 0, 0);

    // Subtle inlaid brass border line
    ctx.strokeStyle = "rgba(212, 175, 106, 0.24)";
    ctx.lineWidth = 2.5;
    ctx.strokeRect(26, 26, size - 52, size - 52);
    ctx.strokeStyle = "rgba(212, 175, 106, 0.11)";
    ctx.lineWidth = 1;
    ctx.strokeRect(34, 34, size - 68, size - 68);

    return c;
  }

  function createWoodCanvas() {
    const size = 256;
    const c = document.createElement("canvas");
    c.width = size;
    c.height = size;
    const ctx = c.getContext("2d");

    ctx.fillStyle = "#342014";
    ctx.fillRect(0, 0, size, size);

    for (let y = 0; y < size; y++) {
      const wave = Math.sin(y * 0.11) * 10 + Math.sin(y * 0.37) * 5;
      const shade = 0.5 + 0.5 * Math.sin((y + wave) * 0.22);
      const r = Math.floor(46 + shade * 30);
      const g = Math.floor(26 + shade * 18);
      const b = Math.floor(15 + shade * 10);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(0, y, size, 1);
    }

    // Subtle dark grain streaks
    ctx.fillStyle = "rgba(15, 7, 3, 0.14)";
    for (let i = 0; i < 42; i++) {
      const y = Math.random() * size;
      ctx.fillRect(0, y, size, 1 + Math.random() * 2);
    }

    return c;
  }

  function createShadowCanvas() {
    const size = 128;
    const c = document.createElement("canvas");
    c.width = size;
    c.height = size;
    const ctx = c.getContext("2d");
    const grad = ctx.createRadialGradient(size/2, size/2, size*0.06, size/2, size/2, size*0.48);
    grad.addColorStop(0, "rgba(2, 5, 4, 0.88)");
    grad.addColorStop(0.45, "rgba(2, 5, 4, 0.62)");
    grad.addColorStop(0.75, "rgba(2, 5, 4, 0.24)");
    grad.addColorStop(1, "rgba(2, 5, 4, 0.0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    return c;
  }

  function createDieAtlasCanvas(themeKey) {
    const theme = DIE_THEMES[themeKey] || DIE_THEMES.ivory;
    const tile = 384;
    const c = document.createElement("canvas");
    c.width = tile * 3;
    c.height = tile * 2;
    const ctx = c.getContext("2d");

    // Atlas layout:
    // Row 0: [1, 2, 3]
    // Row 1: [4, 5, 6]
    const pipCoords = {
      1: [[0.5, 0.5]],
      2: [[0.28, 0.28], [0.72, 0.72]],
      3: [[0.28, 0.28], [0.5, 0.5], [0.72, 0.72]],
      4: [[0.28, 0.28], [0.72, 0.28], [0.28, 0.72], [0.72, 0.72]],
      5: [[0.28, 0.28], [0.72, 0.28], [0.5, 0.5], [0.28, 0.72], [0.72, 0.72]],
      6: [[0.28, 0.25], [0.72, 0.25], [0.28, 0.5], [0.72, 0.5], [0.28, 0.75], [0.72, 0.75]]
    };

    for (let val = 1; val <= 6; val++) {
      const col = (val - 1) % 3;
      const row = Math.floor((val - 1) / 3);
      const ox = col * tile;
      const oy = row * tile;

      // Base procedural texture / shading
      if (window.DiceThemes) {
        window.DiceThemes.paintTileBackground(ctx, ox, oy, tile, tile, theme, val * 13);
      } else {
        const bg = ctx.createRadialGradient(
          ox + tile*0.5, oy + tile*0.5, tile*0.08,
          ox + tile*0.5, oy + tile*0.5, tile*0.68
        );
        bg.addColorStop(0, theme.base);
        bg.addColorStop(0.76, theme.base);
        bg.addColorStop(1, theme.edgeShade);
        ctx.fillStyle = bg;
        ctx.fillRect(ox, oy, tile, tile);
      }

      // Recessed pips
      const pips = pipCoords[val];
      const radius = val === 1 ? tile * 0.115 : tile * 0.082;
      for (const [px, py] of pips) {
        const cx = ox + px * tile;
        const cy = oy + py * tile;

        // Subtle highlight rim on bottom-right of carved pip
        ctx.beginPath();
        ctx.arc(cx + 2, cy + 2.5, radius * 1.03, 0, Math.PI * 2);
        ctx.fillStyle = theme.pipInnerRim;
        ctx.fill();

        // Main recessed pip
        const pGrad = ctx.createRadialGradient(
          cx - radius*0.25, cy - radius*0.25, radius*0.1,
          cx, cy, radius
        );
        const mainCol = val === 1 ? theme.pipOne : theme.pip;
        pGrad.addColorStop(0, mainCol);
        pGrad.addColorStop(1, mainCol);
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fillStyle = pGrad;
        ctx.fill();

        // Inner top-left depth shadow
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(0,0,0,0.28)";
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    }

    return c;
  }

  /* =====================================================================
   * 5. 3D Mesh Generators (Rounded Beveled Die, Box, Quad)
   * ===================================================================== */
  function buildBeveledDieMesh() {
    const positions = [];
    const normals = [];
    const uvs = [];
    const indices = [];

    // Non-uniform grid puts extra density on the rounded bevels
    const steps = [-1.0, -0.94, -0.84, -0.74, 0.0, 0.74, 0.84, 0.94, 1.0];
    const bevel = 0.22;
    const inner = 1.0 - bevel;

    // 6 faces matching FACE_NORMALS:
    // value -> [uTile, vTile] in 3x2 atlas
    const faces = [
      { val: 1, n: [0, 1, 0],  u: [1, 0, 0],  v: [0, 0, 1]  }, // +Y
      { val: 6, n: [0, -1, 0], u: [1, 0, 0],  v: [0, 0, -1] }, // -Y
      { val: 2, n: [0, 0, 1],  u: [1, 0, 0],  v: [0, -1, 0] }, // +Z
      { val: 5, n: [0, 0, -1], u: [-1, 0, 0], v: [0, -1, 0] }, // -Z
      { val: 3, n: [1, 0, 0],  u: [0, 0, -1], v: [0, -1, 0] }, // +X
      { val: 4, n: [-1, 0, 0], u: [0, 0, 1],  v: [0, -1, 0] }  // -X
    ];

    const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
    const gridN = steps.length;
    let vertexOffset = 0;

    for (const f of faces) {
      const tileCol = (f.val - 1) % 3;
      const tileRow = Math.floor((f.val - 1) / 3);
      const uMin = tileCol / 3;
      const vMin = tileRow / 2;

      for (let j = 0; j < gridN; j++) {
        const sv = steps[j];
        for (let i = 0; i < gridN; i++) {
          const su = steps[i];
          // Point on [-1, 1]^3 cube
          const x = f.n[0] + f.u[0]*su + f.v[0]*sv;
          const y = f.n[1] + f.u[1]*su + f.v[1]*sv;
          const z = f.n[2] + f.u[2]*su + f.v[2]*sv;

          // Project onto rounded box
          const cx = clamp(x, -inner, inner);
          const cy = clamp(y, -inner, inner);
          const cz = clamp(z, -inner, inner);
          let dx = x - cx, dy = y - cy, dz = z - cz;
          const dl = Math.hypot(dx, dy, dz) || 1;
          dx /= dl; dy /= dl; dz /= dl;

          const px = (cx + dx * bevel) * DIE_HALF;
          const py = (cy + dy * bevel) * DIE_HALF;
          const pz = (cz + dz * bevel) * DIE_HALF;

          positions.push(px, py, pz);
          normals.push(dx, dy, dz);

          // Inset UVs slightly within tile to avoid atlas bleeding
          const lu = 0.02 + ((su + 1) * 0.5) * 0.96;
          const lv = 0.02 + ((sv + 1) * 0.5) * 0.96;
          uvs.push(uMin + lu / 3, vMin + lv / 2);
        }
      }

      for (let j = 0; j < gridN - 1; j++) {
        for (let i = 0; i < gridN - 1; i++) {
          const a = vertexOffset + j * gridN + i;
          const b = a + 1;
          const c = a + gridN;
          const d = c + 1;
          indices.push(a, c, b, b, c, d);
        }
      }
      vertexOffset += gridN * gridN;
    }

    return {
      positions: new Float32Array(positions),
      normals: new Float32Array(normals),
      uvs: new Float32Array(uvs),
      indices: new Uint16Array(indices)
    };
  }

  function createPolyhedronAtlasCanvas(spec, themeKey) {
    const theme = DIE_THEMES[themeKey] || DIE_THEMES.ivory;
    const c = document.createElement("canvas");
    c.width = spec.atlasW;
    c.height = spec.atlasH;
    const ctx = c.getContext("2d");

    ctx.fillStyle = theme.edgeShade;
    ctx.fillRect(0, 0, c.width, c.height);

    const tileW = spec.atlasW / spec.atlasCols;
    const tileH = spec.atlasH / spec.atlasRows;
    const tileMin = Math.min(tileW, tileH);

    let scoringIdx = 0;
    for (let fi = 0; fi < spec.faces.length; fi++) {
      const face = spec.faces[fi];
      if (face.noScore) continue;
      const col = scoringIdx % spec.atlasCols;
      const row = Math.floor(scoringIdx / spec.atlasCols);
      scoringIdx++;
      const ox = col * tileW;
      const oy = row * tileH;
      const cx = ox + tileW * 0.5;
      const cy = oy + tileH * 0.5;

      // Base procedural texture / shading on the tile
      if (window.DiceThemes) {
        window.DiceThemes.paintTileBackground(ctx, ox, oy, tileW, tileH, theme, fi * 19 + spec.sides);
      } else {
        const bg = ctx.createRadialGradient(cx, cy, tileMin * 0.05, cx, cy, tileMin * 0.56);
        bg.addColorStop(0, theme.base);
        bg.addColorStop(0.74, theme.base);
        bg.addColorStop(1, theme.edgeShade);
        ctx.fillStyle = bg;
        ctx.fillRect(ox, oy, tileW, tileH);
      }

      // Crisp inlaid facet border along the polygon outline
      if (face.uvPts && face.uvPts.length >= 3) {
        ctx.save();
        ctx.beginPath();
        for (let p = 0; p < face.uvPts.length; p++) {
          const px = ox + face.uvPts[p][0] * tileW;
          const py = oy + face.uvPts[p][1] * tileH;
          if (p === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.strokeStyle = theme.facetBorder;
        ctx.lineWidth = Math.max(2, tileMin * 0.016);
        ctx.lineJoin = "round";
        ctx.stroke();
        ctx.restore();
      }

      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      if (spec.bottomRead && face.cornerValues) {
        // d4: draw the 3 vertex values near each corner, oriented upright toward the apex
        const fontSize = Math.round(tileMin * spec.fontScale);
        ctx.font = `700 ${fontSize}px "Georgia", "Times New Roman", serif`;
        for (let ci = 0; ci < face.uvPts.length; ci++) {
          const vx = ox + face.uvPts[ci][0] * tileW;
          const vy = oy + face.uvPts[ci][1] * tileH;
          const px = cx + (vx - cx) * 0.56;
          const py = cy + (vy - cy) * 0.56;
          const angle = Math.atan2(vy - cy, vx - cx) + Math.PI * 0.5;
          const val = face.cornerValues[ci];
          const colTxt = val === spec.sides ? theme.pipOne : theme.pip;

          ctx.save();
          ctx.translate(px, py);
          ctx.rotate(angle);
          ctx.fillStyle = theme.pipInnerRim;
          ctx.fillText(String(val), 1.5, 1.8);
          ctx.fillStyle = colTxt;
          ctx.fillText(String(val), 0, 0);
          ctx.restore();
        }
      } else {
        const txt = face.displayText !== undefined ? face.displayText : String(face.value);
        const lenScale = txt.length >= 3 ? 0.68 : txt.length === 2 ? 0.84 : 1.0;
        const fontSize = Math.round(tileMin * spec.fontScale * lenScale);
        ctx.font = `700 ${fontSize}px "Georgia", "Times New Roman", serif`;
        const maxHighlight = spec.maxDisplayValue !== undefined ? spec.maxDisplayValue : spec.sides;
        const colTxt = face.value === maxHighlight ? theme.pipOne : theme.pip;

        // Slight vertical tweak for triangles so digit sits cleanly in visual center
        const yShift = face.indices.length === 3 ? tileH * 0.025 : 0;

        ctx.fillStyle = theme.pipInnerRim;
        ctx.fillText(txt, cx + 1.5, cy + yShift + 2.0);
        ctx.fillStyle = colTxt;
        ctx.fillText(txt, cx, cy + yShift);

        // Disambiguation bar under 6 and 9 on d10 / d12 / d20
        if (spec.underline69 && (face.value === 6 || face.value === 9)) {
          const barW = fontSize * 0.44;
          const barH = Math.max(2.5, fontSize * 0.085);
          const barY = cy + yShift + fontSize * 0.52;
          ctx.fillStyle = colTxt;
          ctx.fillRect(cx - barW * 0.5, barY, barW, barH);
        }
      }
    }

    return c;
  }

  function buildPolyhedronMesh(spec) {
    const positions = [];
    const normals = [];
    const uvs = [];
    const indices = [];
    let vOffset = 0;

    let scoringIdx = 0;
    for (let fi = 0; fi < spec.faces.length; fi++) {
      const face = spec.faces[fi];
      const tileIdx = face.noScore ? 0 : scoringIdx++;
      const col = tileIdx % spec.atlasCols;
      const row = Math.floor(tileIdx / spec.atlasCols);
      const uBase = col / spec.atlasCols;
      const vBase = row / spec.atlasRows;
      const uSpan = 1 / spec.atlasCols;
      const vSpan = 1 / spec.atlasRows;

      for (let i = 0; i < face.indices.length; i++) {
        const v = spec.vertices[face.indices[i]];
        positions.push(v[0], v[1], v[2]);
        normals.push(face.n[0], face.n[1], face.n[2]);
        const [lu, lv] = face.noScore ? [0.06, 0.06] : face.uvPts[i];
        uvs.push(uBase + lu * uSpan, vBase + lv * vSpan);
      }

      // Triangle fan (convex polygon, already sorted CCW)
      for (let i = 1; i < face.indices.length - 1; i++) {
        indices.push(vOffset, vOffset + i, vOffset + i + 1);
      }
      vOffset += face.indices.length;
    }

    return {
      positions: new Float32Array(positions),
      normals: new Float32Array(normals),
      uvs: new Float32Array(uvs),
      indices: new Uint16Array(indices)
    };
  }

  function buildBoxMesh() {
    const p = [
      // +Y
      -0.5, 0.5, -0.5,  -0.5, 0.5, 0.5,   0.5, 0.5, 0.5,   0.5, 0.5, -0.5,
      // -Y
      -0.5,-0.5,  0.5,  -0.5,-0.5,-0.5,   0.5,-0.5,-0.5,   0.5,-0.5,  0.5,
      // +Z
      -0.5, 0.5,  0.5,  -0.5,-0.5, 0.5,   0.5,-0.5, 0.5,   0.5, 0.5,  0.5,
      // -Z
       0.5, 0.5, -0.5,   0.5,-0.5,-0.5,  -0.5,-0.5,-0.5,  -0.5, 0.5, -0.5,
      // +X
       0.5, 0.5,  0.5,   0.5,-0.5, 0.5,   0.5,-0.5,-0.5,   0.5, 0.5, -0.5,
      // -X
      -0.5, 0.5, -0.5,  -0.5,-0.5,-0.5,  -0.5,-0.5, 0.5,  -0.5, 0.5,  0.5
    ];
    const n = [
      0,1,0, 0,1,0, 0,1,0, 0,1,0,
      0,-1,0, 0,-1,0, 0,-1,0, 0,-1,0,
      0,0,1, 0,0,1, 0,0,1, 0,0,1,
      0,0,-1, 0,0,-1, 0,0,-1, 0,0,-1,
      1,0,0, 1,0,0, 1,0,0, 1,0,0,
      -1,0,0, -1,0,0, -1,0,0, -1,0,0
    ];
    const uv = [];
    const idx = [];
    for (let f = 0; f < 6; f++) {
      uv.push(0,0, 0,1, 1,1, 1,0);
      const o = f * 4;
      idx.push(o, o+1, o+2, o, o+2, o+3);
    }
    return {
      positions: new Float32Array(p),
      normals: new Float32Array(n),
      uvs: new Float32Array(uv),
      indices: new Uint16Array(idx)
    };
  }

  function buildPlaneMesh() {
    return {
      positions: new Float32Array([
        -0.5, 0, -0.5,
        -0.5, 0,  0.5,
         0.5, 0,  0.5,
         0.5, 0, -0.5
      ]),
      normals: new Float32Array([
        0,1,0, 0,1,0, 0,1,0, 0,1,0
      ]),
      uvs: new Float32Array([
        0,0, 0,1, 1,1, 1,0
      ]),
      indices: new Uint16Array([0, 1, 2, 0, 2, 3])
    };
  }

  /* =====================================================================
   * 6. WebGL Renderer
   * ===================================================================== */
  class DiceRenderer {
    constructor(canvas) {
      this.canvas = canvas;
      this.gl = canvas.getContext("webgl", { antialias: true, alpha: false, powerPreference: "high-performance" });
      if (!this.gl) {
        throw new Error("WebGL non supporté");
      }
      this.initShaders();
      this.initMeshes();
      this.initTextures();
      this.gl.enable(this.gl.DEPTH_TEST);
      this.gl.enable(this.gl.CULL_FACE);
      this.gl.clearColor(0.043, 0.055, 0.051, 1.0);
    }

    compileShader(type, src) {
      const gl = this.gl;
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        throw new Error(gl.getShaderInfoLog(s));
      }
      return s;
    }

    initShaders() {
      const gl = this.gl;
      const vs = `
        attribute vec3 aPos;
        attribute vec3 aNorm;
        attribute vec2 aUv;
        uniform mat4 uModel;
        uniform mat4 uViewProj;
        varying vec3 vWorldPos;
        varying vec3 vNormal;
        varying vec2 vUv;
        void main() {
          vec4 wp = uModel * vec4(aPos, 1.0);
          vWorldPos = wp.xyz;
          vNormal = normalize(mat3(uModel) * aNorm);
          vUv = aUv;
          gl_Position = uViewProj * wp;
        }
      `;
      const fs = `
        precision mediump float;
        varying vec3 vWorldPos;
        varying vec3 vNormal;
        varying vec2 vUv;
        uniform sampler2D uTex;
        uniform vec3 uCamPos;
        uniform vec3 uLightPos;
        uniform float uSpecStrength;
        uniform float uShininess;
        uniform float uAlpha;
        uniform float uUnlit;
        void main() {
          vec4 texCol = texture2D(uTex, vUv);
          if (uUnlit > 0.5) {
            gl_FragColor = vec4(texCol.rgb, texCol.a * uAlpha);
            return;
          }
          vec3 N = normalize(vNormal);
          vec3 L = normalize(uLightPos - vWorldPos);
          vec3 V = normalize(uCamPos - vWorldPos);
          vec3 H = normalize(L + V);

          // Warm overhead key light + soft cool ambient fill
          float diff = max(dot(N, L), 0.0);
          float spec = pow(max(dot(N, H), 0.0), uShininess) * uSpecStrength;

          // Secondary soft rim light from opposite side
          vec3 L2 = normalize(vec3(-6.0, 8.0, -5.0) - vWorldPos);
          float diff2 = max(dot(N, L2), 0.0) * 0.22;

          // Subtle Fresnel sheen on beveled edges
          float fresnel = pow(1.0 - max(dot(N, V), 0.0), 3.0) * 0.12 * uSpecStrength;

          vec3 ambient = texCol.rgb * vec3(0.32, 0.34, 0.33);
          vec3 keyColor = vec3(1.0, 0.96, 0.89);
          vec3 fillColor = vec3(0.78, 0.88, 0.92);

          vec3 color = ambient
            + texCol.rgb * keyColor * diff * 0.84
            + texCol.rgb * fillColor * diff2
            + keyColor * (spec + fresnel);

          gl_FragColor = vec4(color, texCol.a * uAlpha);
        }
      `;
      const p = gl.createProgram();
      gl.attachShader(p, this.compileShader(gl.VERTEX_SHADER, vs));
      gl.attachShader(p, this.compileShader(gl.FRAGMENT_SHADER, fs));
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(p));
      }
      this.prog = p;
      this.loc = {
        aPos: gl.getAttribLocation(p, "aPos"),
        aNorm: gl.getAttribLocation(p, "aNorm"),
        aUv: gl.getAttribLocation(p, "aUv"),
        uModel: gl.getUniformLocation(p, "uModel"),
        uViewProj: gl.getUniformLocation(p, "uViewProj"),
        uTex: gl.getUniformLocation(p, "uTex"),
        uCamPos: gl.getUniformLocation(p, "uCamPos"),
        uLightPos: gl.getUniformLocation(p, "uLightPos"),
        uSpecStrength: gl.getUniformLocation(p, "uSpecStrength"),
        uShininess: gl.getUniformLocation(p, "uShininess"),
        uAlpha: gl.getUniformLocation(p, "uAlpha"),
        uUnlit: gl.getUniformLocation(p, "uUnlit")
      };
    }

    uploadMesh(data) {
      const gl = this.gl;
      const makeBuf = (target, arr) => {
        const b = gl.createBuffer();
        gl.bindBuffer(target, b);
        gl.bufferData(target, arr, gl.STATIC_DRAW);
        return b;
      };
      return {
        pos: makeBuf(gl.ARRAY_BUFFER, data.positions),
        norm: makeBuf(gl.ARRAY_BUFFER, data.normals),
        uv: makeBuf(gl.ARRAY_BUFFER, data.uvs),
        idx: makeBuf(gl.ELEMENT_ARRAY_BUFFER, data.indices),
        count: data.indices.length
      };
    }

    initMeshes() {
      const beveledCube = this.uploadMesh(buildBeveledDieMesh());
      const diceMeshes = { d6: beveledCube };
      for (const type of DIE_TYPES) {
        const spec = DIE_SPECS[type];
        if (!spec) continue;
        if (type === "d6" || spec.beveledCube) {
          diceMeshes[type] = beveledCube;
        } else {
          diceMeshes[type] = this.uploadMesh(buildPolyhedronMesh(spec));
        }
      }
      this.meshes = {
        dice: diceMeshes,
        box: this.uploadMesh(buildBoxMesh()),
        plane: this.uploadMesh(buildPlaneMesh()),
        boardCache: {}
      };
    }

    getBoardMeshes(shapeId, hw, hd) {
      if (!window.TableBoards) return null;
      const key = `${shapeId}:${hw.toFixed(2)}:${hd.toFixed(2)}`;
      if (!this.meshes.boardCache[key]) {
        const geom = window.TableBoards.buildBoardGeometry(shapeId, hw, hd);
        this.meshes.boardCache[key] = {
          floor: this.uploadMesh(geom.floorMesh),
          rail: this.uploadMesh(geom.railMesh)
        };
      }
      return this.meshes.boardCache[key];
    }

    uploadTexture(canvas, clamp) {
      const gl = this.gl;
      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
      const isPow2 = (v) => (v & (v - 1)) === 0;
      if (isPow2(canvas.width) && isPow2(canvas.height)) {
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      } else {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      }
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      const wrap = clamp ? gl.CLAMP_TO_EDGE : gl.REPEAT;
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
      return tex;
    }

    initTextures() {
      this.textures = {
        felt: this.uploadTexture(createFeltCanvas(), true),
        wood: this.uploadTexture(createWoodCanvas(), false),
        shadow: this.uploadTexture(createShadowCanvas(), true),
        diceCache: {},
        boardCache: {}
      };
    }

    getBoardTextures(boardThemeId) {
      if (!window.TableBoards) {
        return { surface: this.textures.felt, rail: this.textures.wood };
      }
      const key = boardThemeId || "emerald";
      if (!this.textures.boardCache[key]) {
        this.textures.boardCache[key] = {
          surface: this.uploadTexture(window.TableBoards.createSurfaceCanvas(key), true),
          rail: this.uploadTexture(window.TableBoards.createRailCanvas(key), false)
        };
      }
      return this.textures.boardCache[key];
    }

    getDieTexture(dieType, themeKey) {
      const key = `${dieType}:${themeKey}`;
      if (!this.textures.diceCache[key]) {
        const themeCfg = DIE_THEMES[themeKey] || DIE_THEMES.ivory;
        const spec = DIE_SPECS[dieType] || DIE_SPECS.d6;
        let canvas;
        if (dieType === "d6") {
          canvas = createDieAtlasCanvas(themeKey);
        } else if (dieType === "bb" && window.BloodBowlDice) {
          canvas = window.BloodBowlDice.createAtlasCanvas(themeCfg);
        } else {
          canvas = createPolyhedronAtlasCanvas(spec, themeKey);
        }
        this.textures.diceCache[key] = this.uploadTexture(canvas, true);
      }
      return this.textures.diceCache[key];
    }

    resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.floor(this.canvas.clientWidth * dpr));
      const h = Math.max(1, Math.floor(this.canvas.clientHeight * dpr));
      if (this.canvas.width !== w || this.canvas.height !== h) {
        this.canvas.width = w;
        this.canvas.height = h;
      }
      this.gl.viewport(0, 0, w, h);
      return w / h;
    }

    drawMesh(mesh, model, tex, opts) {
      const gl = this.gl;
      const loc = this.loc;

      gl.bindBuffer(gl.ARRAY_BUFFER, mesh.pos);
      gl.enableVertexAttribArray(loc.aPos);
      gl.vertexAttribPointer(loc.aPos, 3, gl.FLOAT, false, 0, 0);

      gl.bindBuffer(gl.ARRAY_BUFFER, mesh.norm);
      gl.enableVertexAttribArray(loc.aNorm);
      gl.vertexAttribPointer(loc.aNorm, 3, gl.FLOAT, false, 0, 0);

      gl.bindBuffer(gl.ARRAY_BUFFER, mesh.uv);
      gl.enableVertexAttribArray(loc.aUv);
      gl.vertexAttribPointer(loc.aUv, 2, gl.FLOAT, false, 0, 0);

      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.idx);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.uniform1i(loc.uTex, 0);
      gl.uniformMatrix4fv(loc.uModel, false, model);
      gl.uniform1f(loc.uSpecStrength, opts.specStrength ?? 0.2);
      gl.uniform1f(loc.uShininess, opts.shininess ?? 24.0);
      gl.uniform1f(loc.uAlpha, opts.alpha ?? 1.0);
      gl.uniform1f(loc.uUnlit, opts.unlit ? 1.0 : 0.0);

      gl.drawElements(gl.TRIANGLES, mesh.count, gl.UNSIGNED_SHORT, 0);
    }

    render(state) {
      const gl = this.gl;
      const aspect = this.resize();
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.useProgram(this.prog);

      const isTop = state.cameraMode === "top";
      const distScale = aspect < 1 ? (1.15 / Math.max(0.55, aspect)) : 1.0;
      const camPos = isTop
        ? [0, 14.5 * distScale, 0.01]
        : [0, 10.6 * distScale, 8.8 * distScale];
      const target = [0, 0, isTop ? 0 : 0.35];
      const lightPos = [4.5, 13.5, 4.0];

      const proj = m4Perspective(42 * Math.PI / 180, aspect, 0.5, 60.0);
      const view = m4LookAt(camPos, target, isTop ? [0, 0, -1] : [0, 1, 0]);
      const viewProj = m4Mul(proj, view);

      gl.uniformMatrix4fv(this.loc.uViewProj, false, viewProj);
      gl.uniform3fv(this.loc.uCamPos, camPos);
      gl.uniform3fv(this.loc.uLightPos, lightPos);

      const idQ = [0, 0, 0, 1];
      const hw = state.tableHalfW;
      const hd = state.tableHalfD;

      // 1 & 2. Dynamic Board Surface & Mitered Frame Rails
      const boardMeshes = this.getBoardMeshes(state.boardShape || "rect", hw, hd);
      const boardTex = this.getBoardTextures(state.boardTheme || "emerald");
      const boardCfg = (window.TableBoards && window.TableBoards.getTheme(state.boardTheme)) || {
        surfaceSpec: 0.08, surfaceShininess: 12.0,
        railSpec: 0.35, railShininess: 32.0
      };
      if (boardMeshes) {
        const idMat = m4FromPosQuatScale([0, 0, 0], idQ, [1, 1, 1]);
        this.drawMesh(boardMeshes.floor, idMat, boardTex.surface, {
          specStrength: boardCfg.surfaceSpec,
          shininess: boardCfg.surfaceShininess
        });
        this.drawMesh(boardMeshes.rail, idMat, boardTex.rail, {
          specStrength: boardCfg.railSpec,
          shininess: boardCfg.railShininess
        });
      } else {
        this.drawMesh(
          this.meshes.plane,
          m4FromPosQuatScale([0, 0, 0], idQ, [hw * 2, 1, hd * 2]),
          this.textures.felt,
          { specStrength: 0.08, shininess: 12.0 }
        );
      }

      // 3. Pronounced contact AO + directional cast shadows under each die
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.depthMask(false);
      for (const die of state.dice) {
        const spec = DIE_SPECS[die.type] || DIE_SPECS.d6;
        const h = Math.max(0, die.pos[1] - spec.restHeight);

        // 3a. Tight dark contact shadow directly underneath the die
        const aoAlpha = Math.max(0.0, 0.82 - h * 0.52);
        if (aoAlpha > 0.03) {
          const aoScale = spec.shadowScale * 0.86 + h * 0.14;
          this.drawMesh(
            this.meshes.plane,
            m4FromPosQuatScale([die.pos[0], 0.005, die.pos[2]], idQ, [aoScale, 1, aoScale]),
            this.textures.shadow,
            { unlit: true, alpha: aoAlpha }
          );
        }

        // 3b. Directional cast shadow projected away from the key light
        const projFactor = (die.pos[1] * 1.18) / Math.max(2, lightPos[1]);
        const sx = die.pos[0] - (lightPos[0] - die.pos[0]) * projFactor;
        const sz = die.pos[2] - (lightPos[2] - die.pos[2]) * projFactor;
        const scale = spec.shadowScale * 1.06 + h * 0.26;
        const alpha = Math.max(0.24, 0.94 - h * 0.13);
        this.drawMesh(
          this.meshes.plane,
          m4FromPosQuatScale([sx, 0.007, sz], idQ, [scale, 1, scale]),
          this.textures.shadow,
          { unlit: true, alpha }
        );
      }
      gl.depthMask(true);
      gl.disable(gl.BLEND);

      // 4. 3D Polyhedral Dice
      const themeCfg = DIE_THEMES[state.theme] || DIE_THEMES.ivory;
      for (const die of state.dice) {
        const dieMesh = this.meshes.dice[die.type] || this.meshes.dice.d6;
        const dieTex = this.getDieTexture(die.type, state.theme);
        this.drawMesh(
          dieMesh,
          m4FromPosQuatScale(die.pos, die.quat, [1, 1, 1]),
          dieTex,
          { specStrength: themeCfg.specStrength, shininess: themeCfg.shininess }
        );
      }
    }
  }

  /* =====================================================================
   * 7. Rigid-Body Physics Engine
   * ===================================================================== */
  function detectTopFace(quat, spec) {
    const s = spec || DIE_SPECS.d6;
    const sign = s.bottomRead ? -1 : 1;
    let bestVal = 1;
    let bestDot = -Infinity;
    for (const f of s.faces) {
      if (f.noScore) continue;
      const wn = qRotateVec(quat, f.n);
      const score = wn[1] * sign;
      if (score > bestDot) {
        bestDot = score;
        bestVal = f.value;
      }
    }
    return { value: bestVal, alignment: bestDot };
  }

  function quatAlignVec(fromVec, toVec) {
    const d = v3Dot(fromVec, toVec);
    if (d > 0.99999) return [0, 0, 0, 1];
    if (d < -0.99999) {
      const ref = Math.abs(fromVec[0]) < 0.9 ? [1, 0, 0] : [0, 0, 1];
      const ortho = v3Norm(v3Cross(fromVec, ref));
      return qFromAxisAngle(ortho, Math.PI);
    }
    const axis = v3Norm(v3Cross(fromVec, toVec));
    const angle = Math.acos(Math.max(-1, Math.min(1, d)));
    return qFromAxisAngle(axis, angle);
  }

  function snapQuaternionFlat(quat, spec) {
    const s = spec || DIE_SPECS.d6;
    const sign = s.bottomRead ? -1 : 1;
    const target = [0, sign, 0];
    let bestN = s.faces[0].n;
    let bestDot = -Infinity;
    for (const f of s.faces) {
      if (f.noScore) continue;
      const wn = qRotateVec(quat, f.n);
      const score = wn[1] * sign;
      if (score > bestDot) {
        bestDot = score;
        bestN = f.n;
      }
    }
    const wn = qRotateVec(quat, bestN);
    const corr = quatAlignVec(wn, target);
    return qNorm(qMul(corr, quat));
  }

  function forceSettleDie(die, spec, state) {
    die.quat = snapQuaternionFlat(die.quat, spec);
    die.pos[1] = spec.restHeight;
    const pad = (spec.collisionRadius || 0.6) + 0.12;
    if (state.boardWalls && state.boardWalls.length && window.TableBoards) {
      const [cx, cz] = window.TableBoards.clampPointToBoard(die.pos[0], die.pos[2], state.boardWalls, pad);
      die.pos[0] = cx;
      die.pos[2] = cz;
    } else {
      die.pos[0] = Math.max(-state.tableHalfW + pad, Math.min(state.tableHalfW - pad, die.pos[0]));
      die.pos[2] = Math.max(-state.tableHalfD + pad, Math.min(state.tableHalfD - pad, die.pos[2]));
    }
    die.vel = [0, 0, 0];
    die.angVel = [0, 0, 0];
    die.settled = true;
    die.forceSettled = true;
  }

  function createRestingDice(poolList, halfW, halfD, boardWalls) {
    const types = poolList.length > 0 ? poolList : ["d6"];
    const count = types.length;
    const dice = [];
    const cols = Math.min(count, count <= 3 ? count : count <= 8 ? 4 : 5);
    const rows = Math.ceil(count / cols);
    const spacing = Math.min(1.75, Math.max(1.38, (halfW * 1.55) / Math.max(1, cols)));

    for (let i = 0; i < count; i++) {
      const type = DIE_SPECS[types[i]] ? types[i] : "d6";
      const spec = DIE_SPECS[type];
      const target = [0, spec.bottomRead ? -1 : 1, 0];
      const scoringFaces = spec.faces.filter((f) => !f.noScore).sort((a, b) => b.value - a.value);
      const col = i % cols;
      const row = Math.floor(i / cols);
      const rowCount = row === rows - 1 ? count - row * cols : cols;
      let x = (col - (rowCount - 1) * 0.5) * spacing;
      let z = (row - (rows - 1) * 0.5) * spacing;
      if (boardWalls && boardWalls.length && window.TableBoards) {
        [x, z] = window.TableBoards.clampPointToBoard(x, z, boardWalls, 0.9);
      } else {
        x = Math.max(-halfW + 0.85, Math.min(halfW - 0.85, x));
        z = Math.max(-halfD + 0.85, Math.min(halfD - 0.85, z));
      }
      const yaw = qFromAxisAngle([0, 1, 0], (Math.random() - 0.5) * 0.55);
      const face = scoringFaces[i % scoringFaces.length];
      const initRot = quatAlignVec(face.n, target);
      dice.push({
        type,
        pos: [x, spec.restHeight, z],
        vel: [0, 0, 0],
        quat: qNorm(qMul(yaw, initRot)),
        angVel: [0, 0, 0],
        settled: true,
        settleTimer: 1.0,
        rollTime: 0,
        forceSettled: false
      });
    }
    return dice;
  }

  function launchDice(poolList, halfW, halfD, boardWalls) {
    const types = poolList.length > 0 ? poolList : ["d6"];
    const count = types.length;
    const dice = [];
    const fromLeft = Math.random() < 0.5;
    const speedScale = REDUCED_MOTION ? 0.55 : 1.0;

    for (let i = 0; i < count; i++) {
      const type = DIE_SPECS[types[i]] ? types[i] : "d6";
      const spreadIdx = i - (count - 1) * 0.5;
      let startX = (fromLeft ? -1 : 1) * (halfW * 0.55) + (Math.random() - 0.5) * 0.6;
      let startZ = spreadIdx * 0.85 + (Math.random() - 0.5) * 0.5;
      if (boardWalls && boardWalls.length && window.TableBoards) {
        [startX, startZ] = window.TableBoards.clampPointToBoard(startX, startZ, boardWalls, 0.95);
      } else {
        startZ = Math.max(-halfD + 1.0, Math.min(halfD - 1.0, startZ));
      }
      const startY = 2.4 + Math.random() * 1.6 + (i % 3) * 0.45;

      const vx = (fromLeft ? 1 : -1) * (5.5 + Math.random() * 4.5) * speedScale;
      const vy = (-1.5 - Math.random() * 2.5) * speedScale;
      const vz = (-startZ * 0.55 + (Math.random() - 0.5) * 4.0) * speedScale;

      const spin = (8.0 + Math.random() * 10.0) * speedScale;
      const spinAxis = v3Norm([Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5]);

      dice.push({
        type,
        pos: [startX, startY, startZ],
        vel: [vx, vy, vz],
        quat: qRandom(),
        angVel: [spinAxis[0]*spin, spinAxis[1]*spin, spinAxis[2]*spin],
        settled: false,
        locked: false,
        settleTimer: 0,
        rollTime: 0,
        forceSettled: false
      });
    }
    return dice;
  }

  function resolvePlaneCollision(die, spec, normal, distFn, restitution, friction, audio, kind) {
    let maxPen = 0;
    let maxImpact = 0;
    const verts = spec.vertices;

    for (let c = 0; c < verts.length; c++) {
      const r = qRotateVec(die.quat, verts[c]);
      const px = die.pos[0] + r[0];
      const py = die.pos[1] + r[1];
      const pz = die.pos[2] + r[2];
      const pen = distFn(px, py, pz);

      if (pen > 0) {
        if (pen > maxPen) maxPen = pen;
        const wxr = v3Cross(die.angVel, r);
        const vc = [
          die.vel[0] + wxr[0],
          die.vel[1] + wxr[1],
          die.vel[2] + wxr[2]
        ];
        const vn = v3Dot(vc, normal);

        if (vn < 0) {
          if (-vn > maxImpact) maxImpact = -vn;
          const rcn = v3Cross(r, normal);
          const denom = INV_MASS + INV_INERTIA * v3Dot(rcn, rcn);
          const e = Math.abs(vn) > 1.1 ? restitution : 0.0;
          const j = -(1 + e) * vn / denom;

          die.vel[0] += normal[0] * j * INV_MASS;
          die.vel[1] += normal[1] * j * INV_MASS;
          die.vel[2] += normal[2] * j * INV_MASS;

          const torque = v3Cross(r, [normal[0]*j, normal[1]*j, normal[2]*j]);
          die.angVel[0] += torque[0] * INV_INERTIA;
          die.angVel[1] += torque[1] * INV_INERTIA;
          die.angVel[2] += torque[2] * INV_INERTIA;

          // Coulomb friction impulse
          const vt = [
            vc[0] - normal[0] * vn,
            vc[1] - normal[1] * vn,
            vc[2] - normal[2] * vn
          ];
          const vtLen = v3Len(vt);
          if (vtLen > 1e-4) {
            const t = [vt[0]/vtLen, vt[1]/vtLen, vt[2]/vtLen];
            const rct = v3Cross(r, t);
            const denomT = INV_MASS + INV_INERTIA * v3Dot(rct, rct);
            let jt = -v3Dot(vc, t) / denomT;
            const maxJt = j * friction;
            jt = Math.max(-maxJt, Math.min(maxJt, jt));

            die.vel[0] += t[0] * jt * INV_MASS;
            die.vel[1] += t[1] * jt * INV_MASS;
            die.vel[2] += t[2] * jt * INV_MASS;

            const fTorque = v3Cross(r, [t[0]*jt, t[1]*jt, t[2]*jt]);
            die.angVel[0] += fTorque[0] * INV_INERTIA;
            die.angVel[1] += fTorque[1] * INV_INERTIA;
            die.angVel[2] += fTorque[2] * INV_INERTIA;
          }
        }
      }
    }

    if (maxPen > 0) {
      const corr = maxPen * 0.85;
      die.pos[0] += normal[0] * corr;
      die.pos[1] += normal[1] * corr;
      die.pos[2] += normal[2] * corr;
    }
    if (maxImpact > 1.2 && audio) {
      audio.playImpact(maxImpact / 14.0, kind);
    }
  }

  function stepPhysics(state, dt, audio) {
    const substeps = 4;
    const frameDt = Math.min(Math.max(dt, 0), 0.05);
    const h = Math.min(frameDt, 0.033) / substeps;
    const hw = state.tableHalfW;
    const hd = state.tableHalfD;
    let anyActive = false;

    for (let s = 0; s < substeps; s++) {
      for (const die of state.dice) {
        if (die.settled) continue;
        anyActive = true;
        const spec = DIE_SPECS[die.type] || DIE_SPECS.d6;

        // Gravity, subtle air damping & progressive brake for stuck/long-spinning dice
        die.vel[1] += GRAVITY * h;
        const overtime = Math.max(0, (die.rollTime || 0) - DIE_DAMP_START_SEC);
        const brakeT = Math.min(1, overtime / Math.max(0.1, DIE_MAX_ROLL_SEC - DIE_DAMP_START_SEC));
        const linBase = spec.sides >= 60 ? 0.976 : 0.985;
        const angBase = spec.sides >= 60 ? 0.956 : spec.sides >= 12 ? 0.966 : 0.975;
        const linDamp = Math.pow(linBase - brakeT * 0.14, h * 60);
        const angDamp = Math.pow(angBase - brakeT * 0.18, h * 60);
        die.vel[0] *= linDamp;
        die.vel[1] *= linDamp;
        die.vel[2] *= linDamp;
        die.angVel[0] *= angDamp;
        die.angVel[1] *= angDamp;
        die.angVel[2] *= angDamp;

        // Integrate position
        die.pos[0] += die.vel[0] * h;
        die.pos[1] += die.vel[1] * h;
        die.pos[2] += die.vel[2] * h;

        // Integrate orientation quaternion
        const w = die.angVel;
        const dq = qMul([w[0], w[1], w[2], 0], die.quat);
        die.quat = qNorm([
          die.quat[0] + 0.5 * h * dq[0],
          die.quat[1] + 0.5 * h * dq[1],
          die.quat[2] + 0.5 * h * dq[2],
          die.quat[3] + 0.5 * h * dq[3]
        ]);

        // Table floor & convex polygon board rail walls
        resolvePlaneCollision(die, spec, [0, 1, 0], (x, y) => -y, 0.42, 0.58, audio, "felt");
        if (state.boardWalls && state.boardWalls.length > 0) {
          for (const w of state.boardWalls) {
            resolvePlaneCollision(
              die, spec, w.inNormal,
              (x, y, z) => x * w.ox + z * w.oz - w.dist,
              0.56, 0.28, audio, "rail"
            );
          }
        } else {
          resolvePlaneCollision(die, spec, [1, 0, 0], (x) => -hw - x, 0.56, 0.28, audio, "rail");
          resolvePlaneCollision(die, spec, [-1, 0, 0], (x) => x - hw, 0.56, 0.28, audio, "rail");
          resolvePlaneCollision(die, spec, [0, 0, 1], (x, y, z) => -hd - z, 0.56, 0.28, audio, "rail");
          resolvePlaneCollision(die, spec, [0, 0, -1], (x, y, z) => z - hd, 0.56, 0.28, audio, "rail");
        }
      }

      // Pairwise die-to-die collisions
      const nDice = state.dice.length;
      for (let i = 0; i < nDice; i++) {
        for (let j = i + 1; j < nDice; j++) {
          const a = state.dice[i];
          const b = state.dice[j];
          if (a.settled && b.settled) continue;

          const specA = DIE_SPECS[a.type] || DIE_SPECS.d6;
          const specB = DIE_SPECS[b.type] || DIE_SPECS.d6;
          const minDist = specA.collisionRadius + specB.collisionRadius;

          const dx = b.pos[0] - a.pos[0];
          const dy = b.pos[1] - a.pos[1];
          const dz = b.pos[2] - a.pos[2];
          const dist = Math.hypot(dx, dy, dz);

          if (dist < minDist && dist > 1e-5) {
            const nx = dx / dist, ny = dy / dist, nz = dz / dist;
            const aStatic = !!(a.locked || a.forceSettled);
            const bStatic = !!(b.locked || b.forceSettled);
            if (aStatic && bStatic) continue;

            const overlap = minDist - dist;
            if (aStatic) {
              b.pos[0] += nx * overlap; b.pos[1] = Math.max(specB.restHeight, b.pos[1] + ny * overlap); b.pos[2] += nz * overlap;
            } else if (bStatic) {
              a.pos[0] -= nx * overlap; a.pos[1] = Math.max(specA.restHeight, a.pos[1] - ny * overlap); a.pos[2] -= nz * overlap;
            } else {
              const halfOv = overlap * 0.52;
              a.pos[0] -= nx * halfOv; a.pos[1] = Math.max(specA.restHeight, a.pos[1] - ny * halfOv); a.pos[2] -= nz * halfOv;
              b.pos[0] += nx * halfOv; b.pos[1] = Math.max(specB.restHeight, b.pos[1] + ny * halfOv); b.pos[2] += nz * halfOv;
            }

            const rvx = b.vel[0] - a.vel[0];
            const rvy = b.vel[1] - a.vel[1];
            const rvz = b.vel[2] - a.vel[2];
            const vn = rvx * nx + rvy * ny + rvz * nz;

            if (vn < 0) {
              if (!aStatic) a.settled = false;
              if (!bStatic) b.settled = false;
              const imp = -(1 + 0.52) * vn * (aStatic || bStatic ? 1.0 : 0.5);
              if (!aStatic) {
                a.vel[0] -= nx * imp; a.vel[1] -= ny * imp; a.vel[2] -= nz * imp;
              }
              if (!bStatic) {
                b.vel[0] += nx * imp; b.vel[1] += ny * imp; b.vel[2] += nz * imp;
              }

              // Impart natural tumble spin on clack
              const spinKick = imp * 1.4;
              if (!aStatic) {
                a.angVel[0] += (Math.random() - 0.5) * spinKick;
                a.angVel[2] += (Math.random() - 0.5) * spinKick;
              }
              if (!bStatic) {
                b.angVel[0] += (Math.random() - 0.5) * spinKick;
                b.angVel[2] += (Math.random() - 0.5) * spinKick;
              }

              if (-vn > 1.2 && audio) {
                audio.playImpact(-vn / 12.0, "die");
              }
            }
          }
        }
      }
    }

    // Settle check, gentle anti-cocked-die alignment & hard timeout anti-spin lock
    for (const die of state.dice) {
      if (die.settled) continue;
      const spec = DIE_SPECS[die.type] || DIE_SPECS.d6;
      die.rollTime = (die.rollTime || 0) + frameDt;
      if (die.rollTime >= DIE_MAX_ROLL_SEC) {
        forceSettleDie(die, spec, state);
        continue;
      }

      const speed = v3Len(die.vel);
      const angSpeed = v3Len(die.angVel);
      const faceInfo = detectTopFace(die.quat, spec);

      if (speed < 0.36 && angSpeed < 0.95 && die.pos[1] < spec.restHeight + 0.25) {
        if (faceInfo.alignment < 0.992) {
          // Nudge slightly if balanced on an edge/corner
          const targetQ = snapQuaternionFlat(die.quat, spec);
          die.quat = qNorm([
            die.quat[0] + (targetQ[0] - die.quat[0]) * 0.16,
            die.quat[1] + (targetQ[1] - die.quat[1]) * 0.16,
            die.quat[2] + (targetQ[2] - die.quat[2]) * 0.16,
            die.quat[3] + (targetQ[3] - die.quat[3]) * 0.16
          ]);
          die.vel[0] *= 0.86;
          die.vel[2] *= 0.86;
          die.angVel[0] *= 0.8;
          die.angVel[1] *= 0.8;
          die.angVel[2] *= 0.8;
        }
        die.settleTimer += frameDt;
        if (die.settleTimer > (REDUCED_MOTION ? 0.12 : 0.26)) {
          die.quat = snapQuaternionFlat(die.quat, spec);
          die.pos[1] = spec.restHeight;
          die.vel = [0, 0, 0];
          die.angVel = [0, 0, 0];
          die.settled = true;
        }
      } else {
        die.settleTimer = 0;
      }
    }

    // Continuous rolling sound driven by dice tumbling on the surface
    if (audio && typeof audio.updateRollSound === "function") {
      let energySum = 0;
      let maxAng = 0;
      for (const die of state.dice) {
        if (die.settled) continue;
        const spec = DIE_SPECS[die.type] || DIE_SPECS.d6;
        if (die.pos[1] < spec.restHeight + 0.38) {
          const linHoriz = Math.hypot(die.vel[0], die.vel[2]);
          const ang = v3Len(die.angVel);
          if (ang > maxAng) maxAng = ang;
          energySum += Math.min(1, (linHoriz * 0.11 + ang * 0.065));
        }
      }
      audio.updateRollSound(Math.min(1, energySum * 0.55), maxAng);
    }

    return anyActive;
  }

  /* =====================================================================
   * 8. Application State & UI Controller (Mixed Pool, Catalog & Themes)
   * ===================================================================== */
  const canvas = document.getElementById("gl-canvas");
  const fallbackEl = document.getElementById("webgl-fallback");
  const resultLabelEl = document.getElementById("result-label");
  const totalEl = document.getElementById("result-total");
  const diceListEl = document.getElementById("result-dice-list");
  const resultExtraEl = document.getElementById("result-extra");
  const singleCountGroup = document.getElementById("single-count-group");
  const countDisplayEl = document.getElementById("dice-count-display");
  const mixPoolBar = document.getElementById("mix-pool-bar");
  const btnDec = document.getElementById("btn-dec");
  const btnInc = document.getElementById("btn-inc");
  const btnRoll = document.getElementById("btn-roll");
  const btnSound = document.getElementById("btn-sound");
  const iconSoundOn = document.getElementById("icon-sound-on");
  const iconSoundOff = document.getElementById("icon-sound-off");
  const btnCamera = document.getElementById("btn-camera");
  const cameraLabel = document.getElementById("camera-label");
  const btnHistory = document.getElementById("btn-history");
  const historyCountEl = document.getElementById("history-count");
  const historyPanel = document.getElementById("history-panel");
  const historyListEl = document.getElementById("history-list");
  const btnClearHistory = document.getElementById("btn-clear-history");
  const btnMixer = document.getElementById("btn-mixer");
  const mixerPanel = document.getElementById("mixer-panel");
  const mixerPoolCountEl = document.getElementById("mixer-pool-count");
  const btnMixerReset = document.getElementById("btn-mixer-reset");
  const mixerPresetsEl = document.getElementById("mixer-presets");
  const mixerCatalogEl = document.getElementById("mixer-catalog");
  const btnThemes = document.getElementById("btn-themes");
  const themesPanel = document.getElementById("themes-panel");
  const themesGridEl = document.getElementById("themes-grid");
  const activeThemeSwatch = document.getElementById("active-theme-swatch");
  const activeThemeLabel = document.getElementById("active-theme-label");
  const btnBoard = document.getElementById("btn-board");
  const boardPanel = document.getElementById("board-panel");
  const boardShapesRowEl = document.getElementById("board-shapes-row");
  const boardThemesGridEl = document.getElementById("board-themes-grid");
  const activeBoardSwatch = document.getElementById("active-board-swatch");
  const activeBoardLabel = document.getElementById("active-board-label");
  const tableHintEl = document.getElementById("table-hint");
  const dieTypeBtns = Array.from(document.querySelectorAll(".die-type-btn"));

  let renderer = null;
  try {
    renderer = new DiceRenderer(canvas);
  } catch (err) {
    canvas.style.display = "none";
    fallbackEl.classList.add("visible");
    return;
  }

  const audio = new DiceAudio();

  const state = {
    pool: { d6: 2 }, // { [dieType]: count }
    theme: "ivory",
    boardShape: "rect",
    boardTheme: "emerald",
    boardWalls: [],
    cameraMode: "angled", // "angled" | "top"
    tableHalfW: 5.6,
    tableHalfD: 3.9,
    dice: [],
    rolling: false,
    hasRolledOnce: false,
    history: []
  };

  function getActivePoolEntries() {
    const out = [];
    for (const type of DIE_TYPES) {
      const cnt = state.pool[type] || 0;
      if (cnt > 0 && DIE_SPECS[type]) out.push([type, cnt]);
    }
    return out;
  }

  function getPoolList() {
    const list = [];
    for (const [type, cnt] of getActivePoolEntries()) {
      for (let i = 0; i < cnt; i++) list.push(type);
    }
    return list;
  }

  function getTotalDiceCount() {
    let sum = 0;
    for (const [, cnt] of getActivePoolEntries()) sum += cnt;
    return sum;
  }

  function getDieLabel(type) {
    return (DIE_SPECS[type] && DIE_SPECS[type].label) || type;
  }

  function formatPoolFormula(entries) {
    return entries.map(([t, c]) => `${c}${getDieLabel(t)}`).join(" + ");
  }

  function getSymbolicInfo(type, value) {
    if (window.DiceCatalog) return window.DiceCatalog.getSymbolicFaceInfo(type, value);
    if (type === "bb" && window.BloodBowlDice) return window.BloodBowlDice.getFaceInfo(value);
    return null;
  }

  function createSymbolicIcon(type, value) {
    if (window.DiceCatalog) return window.DiceCatalog.createSymbolicSvg(type, value);
    if (type === "bb" && window.BloodBowlDice) return window.BloodBowlDice.createFaceSvg(value);
    return null;
  }

  function refreshBoardGeometry() {
    if (window.TableBoards) {
      const geom = window.TableBoards.buildBoardGeometry(state.boardShape, state.tableHalfW, state.tableHalfD);
      state.boardWalls = geom.walls;
    } else {
      state.boardWalls = [];
    }
  }

  function updateTableBounds() {
    const aspect = window.innerWidth / Math.max(1, window.innerHeight);
    if (aspect < 0.85) {
      state.tableHalfW = 3.8;
      state.tableHalfD = 4.9;
    } else {
      state.tableHalfW = 5.6;
      state.tableHalfD = 3.9;
    }
    refreshBoardGeometry();
  }

  function summarizeResults(results) {
    const distinctTypes = new Set(results.map((r) => r.type));
    const singleType = distinctTypes.size === 1 ? results[0].type : null;
    const singleSpec = singleType ? DIE_SPECS[singleType] : null;

    let numericSum = 0;
    let hasNumeric = false;
    for (const r of results) {
      const spec = DIE_SPECS[r.type] || DIE_SPECS.d6;
      if (spec.symbolic) {
        if (spec.hasNumericValue) {
          const info = getSymbolicInfo(r.type, r.value);
          numericSum += info && typeof info.numericValue === "number" ? info.numericValue : 0;
          hasNumeric = true;
        }
      } else {
        numericSum += r.value;
        hasNumeric = true;
      }
    }

    let hudLabel = "Total";
    let hudTotal = String(numericSum);

    if (singleSpec && singleSpec.symbolic) {
      hudLabel = singleType === "bb" ? "Blocage" : singleSpec.label;
      hudTotal = `${results.length}D`;
    } else if (!hasNumeric) {
      hudLabel = "Mix";
      hudTotal = `${results.length}D`;
    }

    return { hudLabel, hudTotal, numericSum, hasNumeric, isMixed: distinctTypes.size > 1 };
  }

  function renderResultExtra() {
    if (!resultExtraEl) return;
    resultExtraEl.textContent = "";
    resultExtraEl.style.display = "none";
  }

  function renderResultHUD(mode, results) {
    const entries = getActivePoolEntries();
    const totalCount = getTotalDiceCount();
    const singleType = entries.length === 1 ? entries[0][0] : null;
    const singleSpec = singleType ? DIE_SPECS[singleType] : null;

    if (mode !== "settled") {
      if (resultLabelEl) {
        if (singleSpec && singleSpec.symbolic) {
          resultLabelEl.textContent = singleType === "bb" ? "Blocage" : singleSpec.label;
        } else {
          resultLabelEl.textContent = "Total";
        }
      }
    }

    diceListEl.textContent = "";
    if (mode === "idle") {
      totalEl.textContent = "—";
      const span = document.createElement("span");
      span.className = "result-status";
      span.textContent = `${formatPoolFormula(entries)} ${totalCount > 1 ? "prêts" : "prêt"}`;
      diceListEl.appendChild(span);
      renderResultExtra();
      return;
    }

    if (mode === "rolling") {
      totalEl.textContent = "…";
      for (let i = 0; i < totalCount; i++) {
        const chip = document.createElement("span");
        chip.className = "die-chip is-rolling";
        chip.textContent = "•";
        diceListEl.appendChild(chip);
      }
      renderResultExtra();
      return;
    }

    const summary = summarizeResults(results);
    if (resultLabelEl) resultLabelEl.textContent = summary.hudLabel;
    totalEl.textContent = summary.hudTotal;

    results.forEach((r) => {
      const spec = DIE_SPECS[r.type] || DIE_SPECS.d6;
      const chip = document.createElement("span");

      if (spec.symbolic) {
        const info = getSymbolicInfo(r.type, r.value);
        const toneClass = info && info.tone && info.tone !== "neutral" ? ` is-${info.tone}` : "";
        chip.className = `die-chip is-symbolic${toneClass}`;
        if (info) chip.title = info.description;
        if (summary.isMixed) {
          const tag = document.createElement("span");
          tag.className = "die-chip-tag";
          tag.textContent = spec.label;
          chip.appendChild(tag);
        }
        const icon = createSymbolicIcon(r.type, r.value);
        if (icon) chip.appendChild(icon);
        const lbl = document.createElement("span");
        lbl.textContent = info ? info.shortLabel : String(r.value);
        chip.appendChild(lbl);
      } else {
        const maxVal = spec.maxDisplayValue !== undefined ? spec.maxDisplayValue : spec.sides;
        chip.className = r.value === maxVal ? "die-chip is-max" : "die-chip";
        if (summary.isMixed) {
          const tag = document.createElement("span");
          tag.className = "die-chip-tag";
          tag.textContent = spec.label;
          chip.appendChild(tag);
        }
        const valSpan = document.createElement("span");
        valSpan.textContent = spec.percentile && r.value === 0 ? "00" : String(r.value);
        chip.appendChild(valSpan);
      }

      diceListEl.appendChild(chip);
    });

    renderResultExtra();
  }

  function renderHistory() {
    historyCountEl.textContent = String(state.history.length);
    historyListEl.textContent = "";
    if (state.history.length === 0) {
      const empty = document.createElement("div");
      empty.className = "history-empty";
      empty.textContent = "Aucun lancer enregistré pour le moment.";
      historyListEl.appendChild(empty);
      return;
    }

    for (const entry of state.history) {
      const row = document.createElement("div");
      row.className = "history-item";

      const meta = document.createElement("div");
      meta.className = "history-item-meta";

      const diceTxt = document.createElement("span");
      diceTxt.className = "history-item-dice";
      const parts = entry.results.map((r) => {
        const spec = DIE_SPECS[r.type] || DIE_SPECS.d6;
        if (spec.symbolic) {
          const info = getSymbolicInfo(r.type, r.value);
          const lbl = info ? info.shortLabel : String(r.value);
          return entry.isMixed ? `${spec.label}:${lbl}` : lbl;
        }
        const vStr = spec.percentile && r.value === 0 ? "00" : String(r.value);
        return entry.isMixed ? `${spec.label}:${vStr}` : vStr;
      });
      diceTxt.textContent = `${entry.formula} : ${parts.join(" · ")}`;

      const timeTxt = document.createElement("span");
      timeTxt.className = "history-item-time";
      timeTxt.textContent = entry.time;

      const tot = document.createElement("span");
      tot.className = "history-item-total";
      tot.textContent = entry.hudTotal;

      meta.appendChild(diceTxt);
      meta.appendChild(timeTxt);
      row.appendChild(meta);
      row.appendChild(tot);
      historyListEl.appendChild(row);
    }
  }

  function renderPoolUI() {
    const entries = getActivePoolEntries();
    const totalCount = getTotalDiceCount();
    const isSingle = entries.length === 1;
    const singleType = isSingle ? entries[0][0] : null;

    for (const btn of dieTypeBtns) {
      const dt = btn.dataset.type;
      btn.setAttribute("aria-pressed", String(isSingle && dt === singleType));
    }

    if (isSingle) {
      singleCountGroup.style.display = "";
      mixPoolBar.style.display = "none";
      countDisplayEl.textContent = String(totalCount);
      btnDec.disabled = totalCount <= MIN_DICE;
      btnInc.disabled = totalCount >= MAX_DICE;
    } else {
      singleCountGroup.style.display = "none";
      mixPoolBar.style.display = "flex";
      mixPoolBar.textContent = "";
      for (const [type, cnt] of entries) {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "pool-chip";
        chip.title = `Retirer 1 ${getDieLabel(type)} du mix`;
        chip.textContent = `${cnt}${getDieLabel(type)} ×`;
        chip.addEventListener("click", () => adjustPoolType(type, -1));
        mixPoolBar.appendChild(chip);
      }
    }

    if (mixerPoolCountEl) {
      mixerPoolCountEl.textContent = `${totalCount} / ${MAX_DICE}`;
    }

    // Refresh counts inside mixer catalog if rendered
    if (mixerCatalogEl) {
      const items = mixerCatalogEl.querySelectorAll(".catalog-item");
      for (const item of items) {
        const t = item.dataset.type;
        const cnt = state.pool[t] || 0;
        item.classList.toggle("is-active", cnt > 0);
        const cntEl = item.querySelector(".catalog-item-count");
        if (cntEl) cntEl.textContent = cnt > 0 ? `×${cnt}` : "0";
        const decBtn = item.querySelector(".catalog-dec");
        const incBtn = item.querySelector(".catalog-inc");
        if (decBtn) decBtn.disabled = cnt <= 0 || (cnt === 1 && totalCount <= MIN_DICE);
        if (incBtn) incBtn.disabled = totalCount >= MAX_DICE;
      }
    }
  }

  function applyPoolChange() {
    state.rolling = false;
    audio.stopRollSound();
    state.dice = createRestingDice(getPoolList(), state.tableHalfW, state.tableHalfD, state.boardWalls);
    renderPoolUI();
    renderResultHUD("idle");
  }

  function setSingleDieType(nextType, keepCount) {
    if (!DIE_SPECS[nextType]) return;
    const cnt = keepCount ? Math.max(MIN_DICE, Math.min(MAX_DICE, getTotalDiceCount())) : 2;
    state.pool = { [nextType]: cnt };
    applyPoolChange();
  }

  function adjustPoolType(type, delta) {
    if (!DIE_SPECS[type]) return;
    const total = getTotalDiceCount();
    const cur = state.pool[type] || 0;
    const next = cur + delta;
    if (delta > 0 && total >= MAX_DICE) return;
    if (delta < 0 && (next < 0 || total <= MIN_DICE)) return;
    if (next <= 0) {
      delete state.pool[type];
    } else {
      state.pool[type] = next;
    }
    if (getTotalDiceCount() === 0) {
      state.pool = { d6: 1 };
    }
    applyPoolChange();
  }

  function applyMixPreset(presetPool) {
    const next = {};
    let total = 0;
    for (const [t, c] of Object.entries(presetPool)) {
      if (DIE_SPECS[t] && c > 0 && total + c <= MAX_DICE) {
        next[t] = c;
        total += c;
      }
    }
    if (total > 0) {
      state.pool = next;
      applyPoolChange();
    }
  }

  function setTheme(themeKey) {
    if (!DIE_THEMES[themeKey]) return;
    state.theme = themeKey;
    const t = DIE_THEMES[themeKey];
    if (activeThemeSwatch) {
      activeThemeSwatch.style.background = t.swatch || t.base;
      activeThemeSwatch.style.borderColor = t.swatchRing || "rgba(255,255,255,0.25)";
    }
    if (activeThemeLabel) {
      activeThemeLabel.textContent = t.label || themeKey;
    }
    if (themesGridEl) {
      for (const b of themesGridEl.querySelectorAll(".theme-card-btn")) {
        b.setAttribute("aria-pressed", String(b.dataset.theme === themeKey));
      }
    }
  }

  function buildMixerCatalogUI() {
    if (!window.DiceCatalog) return;
    if (mixerPresetsEl) {
      mixerPresetsEl.textContent = "";
      for (const preset of window.DiceCatalog.MIX_PRESETS) {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "mix-preset-btn";
        b.textContent = preset.label;
        b.addEventListener("click", () => applyMixPreset(preset.pool));
        mixerPresetsEl.appendChild(b);
      }
    }
    if (mixerCatalogEl) {
      mixerCatalogEl.textContent = "";
      for (const group of window.DiceCatalog.CATALOG_GROUPS) {
        const sec = document.createElement("div");
        const title = document.createElement("div");
        title.className = "catalog-group-title";
        title.textContent = group.title;
        sec.appendChild(title);

        const grid = document.createElement("div");
        grid.className = "catalog-grid";
        for (const item of group.items) {
          const card = document.createElement("div");
          card.className = "catalog-item";
          card.dataset.type = item.type;
          card.title = item.title;

          const dec = document.createElement("button");
          dec.type = "button";
          dec.className = "catalog-step-btn catalog-dec";
          dec.textContent = "−";
          dec.setAttribute("aria-label", `Retirer un ${item.label}`);
          dec.addEventListener("click", () => adjustPoolType(item.type, -1));

          const mid = document.createElement("div");
          mid.className = "catalog-item-mid";
          const lbl = document.createElement("span");
          lbl.className = "catalog-item-label";
          lbl.textContent = item.label;
          const cnt = document.createElement("span");
          cnt.className = "catalog-item-count";
          cnt.textContent = "0";
          mid.appendChild(lbl);
          mid.appendChild(cnt);

          const inc = document.createElement("button");
          inc.type = "button";
          inc.className = "catalog-step-btn catalog-inc";
          inc.textContent = "+";
          inc.setAttribute("aria-label", `Ajouter un ${item.label}`);
          inc.addEventListener("click", () => adjustPoolType(item.type, 1));

          card.appendChild(dec);
          card.appendChild(mid);
          card.appendChild(inc);
          grid.appendChild(card);
        }
        sec.appendChild(grid);
        mixerCatalogEl.appendChild(sec);
      }
    }
  }

  function buildThemesUI() {
    if (!themesGridEl) return;
    themesGridEl.textContent = "";
    const order = (window.DiceThemes && window.DiceThemes.THEME_ORDER) || Object.keys(DIE_THEMES);
    for (const key of order) {
      const t = DIE_THEMES[key];
      if (!t) continue;
      const b = document.createElement("button");
      b.type = "button";
      b.className = "theme-card-btn";
      b.dataset.theme = key;
      b.setAttribute("aria-pressed", String(state.theme === key));

      const sw = document.createElement("span");
      sw.className = "swatch";
      sw.style.background = t.swatch || t.base;
      sw.style.borderColor = t.swatchRing || "rgba(255,255,255,0.25)";
      sw.setAttribute("aria-hidden", "true");

      const lbl = document.createElement("span");
      lbl.textContent = t.label || key;

      b.appendChild(sw);
      b.appendChild(lbl);
      b.addEventListener("click", () => setTheme(key));
      themesGridEl.appendChild(b);
    }
  }

  function setBoardShape(shapeId) {
    state.boardShape = shapeId;
    refreshBoardGeometry();
    if (boardShapesRowEl) {
      for (const b of boardShapesRowEl.querySelectorAll(".shape-btn")) {
        b.setAttribute("aria-pressed", String(b.dataset.shape === shapeId));
      }
    }
    if (!state.rolling && window.TableBoards && state.boardWalls.length) {
      for (const d of state.dice) {
        const [cx, cz] = window.TableBoards.clampPointToBoard(d.pos[0], d.pos[2], state.boardWalls, 0.9);
        d.pos[0] = cx;
        d.pos[2] = cz;
      }
    }
  }

  function setBoardTheme(themeId) {
    if (!window.TableBoards) return;
    const t = window.TableBoards.getTheme(themeId);
    state.boardTheme = t.id;
    if (activeBoardSwatch) {
      activeBoardSwatch.style.background = t.swatch;
      activeBoardSwatch.style.borderColor = t.swatchRing || "rgba(255,255,255,0.25)";
    }
    if (activeBoardLabel) {
      activeBoardLabel.textContent = t.label;
    }
    if (boardThemesGridEl) {
      for (const b of boardThemesGridEl.querySelectorAll(".theme-card-btn")) {
        b.setAttribute("aria-pressed", String(b.dataset.boardTheme === t.id));
      }
    }
  }

  function createShapeIcon(shapeId) {
    const NS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "1.9");
    svg.setAttribute("aria-hidden", "true");
    let el;
    if (shapeId === "octagon") {
      el = document.createElementNS(NS, "polygon");
      el.setAttribute("points", "8 3 16 3 21 8 21 16 16 21 8 21 3 16 3 8");
    } else if (shapeId === "hexagon") {
      el = document.createElementNS(NS, "polygon");
      el.setAttribute("points", "12 2.5 20.5 7.2 20.5 16.8 12 21.5 3.5 16.8 3.5 7.2");
    } else if (shapeId === "circle") {
      el = document.createElementNS(NS, "circle");
      el.setAttribute("cx", "12");
      el.setAttribute("cy", "12");
      el.setAttribute("r", "9");
    } else {
      el = document.createElementNS(NS, "rect");
      el.setAttribute("x", "3");
      el.setAttribute("y", "5");
      el.setAttribute("width", "18");
      el.setAttribute("height", "14");
      el.setAttribute("rx", "2");
    }
    svg.appendChild(el);
    return svg;
  }

  function buildBoardUI() {
    if (!window.TableBoards) return;
    if (boardShapesRowEl) {
      boardShapesRowEl.textContent = "";
      for (const sh of window.TableBoards.BOARD_SHAPES) {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "shape-btn";
        b.dataset.shape = sh.id;
        b.setAttribute("aria-pressed", String(state.boardShape === sh.id));
        b.appendChild(createShapeIcon(sh.id));
        const lbl = document.createElement("span");
        lbl.textContent = sh.label;
        b.appendChild(lbl);
        b.addEventListener("click", () => setBoardShape(sh.id));
        boardShapesRowEl.appendChild(b);
      }
    }
    if (boardThemesGridEl) {
      boardThemesGridEl.textContent = "";
      for (const id of window.TableBoards.BOARD_THEME_ORDER) {
        const t = window.TableBoards.getTheme(id);
        const b = document.createElement("button");
        b.type = "button";
        b.className = "theme-card-btn";
        b.dataset.boardTheme = t.id;
        b.setAttribute("aria-pressed", String(state.boardTheme === t.id));
        const sw = document.createElement("span");
        sw.className = "swatch";
        sw.style.background = t.swatch;
        sw.style.borderColor = t.swatchRing || "rgba(255,255,255,0.25)";
        sw.setAttribute("aria-hidden", "true");
        const lbl = document.createElement("span");
        lbl.textContent = t.label;
        b.appendChild(sw);
        b.appendChild(lbl);
        b.addEventListener("click", () => setBoardTheme(t.id));
        boardThemesGridEl.appendChild(b);
      }
    }
  }

  function closeAllPanels(except) {
    if (except !== "history") {
      historyPanel.classList.remove("open");
      btnHistory.setAttribute("aria-pressed", "false");
      btnHistory.setAttribute("aria-expanded", "false");
    }
    if (except !== "mixer" && mixerPanel) {
      mixerPanel.classList.remove("open");
      btnMixer.setAttribute("aria-pressed", "false");
      btnMixer.setAttribute("aria-expanded", "false");
    }
    if (except !== "themes" && themesPanel) {
      themesPanel.classList.remove("open");
      btnThemes.setAttribute("aria-pressed", "false");
      btnThemes.setAttribute("aria-expanded", "false");
    }
    if (except !== "board" && boardPanel) {
      boardPanel.classList.remove("open");
      btnBoard.setAttribute("aria-pressed", "false");
      btnBoard.setAttribute("aria-expanded", "false");
    }
  }

  function togglePanel(name, panelEl, btnEl) {
    const willOpen = !panelEl.classList.contains("open");
    closeAllPanels(willOpen ? name : null);
    panelEl.classList.toggle("open", willOpen);
    btnEl.setAttribute("aria-pressed", String(willOpen));
    btnEl.setAttribute("aria-expanded", String(willOpen));
  }

  function anyPanelOpen() {
    return historyPanel.classList.contains("open")
      || (mixerPanel && mixerPanel.classList.contains("open"))
      || (themesPanel && themesPanel.classList.contains("open"))
      || (boardPanel && boardPanel.classList.contains("open"));
  }

  function triggerRoll() {
    audio.unlock();
    state.hasRolledOnce = true;
    tableHintEl.classList.add("hidden");
    closeAllPanels(null);
    const pool = getPoolList();
    audio.playLaunchRattle(Math.max(1, pool.length));
    state.dice = launchDice(pool, state.tableHalfW, state.tableHalfD, state.boardWalls);
    state.rolling = true;
    renderResultHUD("rolling");
  }

  function onRollSettled() {
    state.rolling = false;
    audio.stopRollSound();
    const results = state.dice.map((d) => ({
      type: d.type,
      value: detectTopFace(d.quat, DIE_SPECS[d.type]).value
    }));
    renderResultHUD("settled", results);

    const summary = summarizeResults(results);
    const now = new Date();
    const time = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    state.history.unshift({
      formula: formatPoolFormula(getActivePoolEntries()),
      results,
      hudTotal: summary.hudTotal,
      isMixed: summary.isMixed,
      time
    });
    if (state.history.length > MAX_HISTORY) {
      state.history.length = MAX_HISTORY;
    }
    renderHistory();
  }

  /* Event Listeners */
  for (const btn of dieTypeBtns) {
    btn.addEventListener("click", (e) => {
      const dt = btn.dataset.type;
      if (e && e.shiftKey) {
        adjustPoolType(dt, 1);
      } else {
        setSingleDieType(dt, true);
      }
    });
  }

  btnDec.addEventListener("click", () => {
    const entries = getActivePoolEntries();
    if (entries.length === 1) adjustPoolType(entries[0][0], -1);
  });
  btnInc.addEventListener("click", () => {
    const entries = getActivePoolEntries();
    if (entries.length === 1) adjustPoolType(entries[0][0], 1);
  });
  btnRoll.addEventListener("click", triggerRoll);

  if (btnMixer && mixerPanel) {
    btnMixer.addEventListener("click", () => togglePanel("mixer", mixerPanel, btnMixer));
  }
  if (btnMixerReset) {
    btnMixerReset.addEventListener("click", () => setSingleDieType("d6", false));
  }
  if (btnThemes && themesPanel) {
    btnThemes.addEventListener("click", () => togglePanel("themes", themesPanel, btnThemes));
  }
  if (btnBoard && boardPanel) {
    btnBoard.addEventListener("click", () => togglePanel("board", boardPanel, btnBoard));
  }

  btnSound.addEventListener("click", () => {
    audio.enabled = !audio.enabled;
    if (audio.enabled) audio.unlock();
    else audio.stopRollSound();
    btnSound.setAttribute("aria-pressed", String(audio.enabled));
    iconSoundOn.style.display = audio.enabled ? "" : "none";
    iconSoundOff.style.display = audio.enabled ? "none" : "";
  });

  btnCamera.addEventListener("click", () => {
    const isTop = state.cameraMode === "angled";
    state.cameraMode = isTop ? "top" : "angled";
    btnCamera.setAttribute("aria-pressed", String(isTop));
    cameraLabel.textContent = isTop ? "Zénith" : "3/4";
  });

  btnHistory.addEventListener("click", () => togglePanel("history", historyPanel, btnHistory));

  btnClearHistory.addEventListener("click", () => {
    state.history = [];
    renderHistory();
  });

  canvas.addEventListener("click", () => {
    if (anyPanelOpen()) {
      closeAllPanels(null);
      return;
    }
    triggerRoll();
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && anyPanelOpen()) {
      closeAllPanels(null);
      return;
    }
    if (e.code === "Space" && document.activeElement?.tagName !== "BUTTON") {
      e.preventDefault();
      triggerRoll();
    }
  });

  window.addEventListener("resize", () => {
    updateTableBounds();
    if (!state.rolling) {
      for (const d of state.dice) {
        if (window.TableBoards && state.boardWalls.length) {
          const [cx, cz] = window.TableBoards.clampPointToBoard(d.pos[0], d.pos[2], state.boardWalls, 0.85);
          d.pos[0] = cx;
          d.pos[2] = cz;
        } else {
          d.pos[0] = Math.max(-state.tableHalfW + 0.7, Math.min(state.tableHalfW - 0.7, d.pos[0]));
          d.pos[2] = Math.max(-state.tableHalfD + 0.7, Math.min(state.tableHalfD - 0.7, d.pos[2]));
        }
      }
    }
  });

  /* Initialize & Animation Loop */
  updateTableBounds();
  buildMixerCatalogUI();
  buildThemesUI();
  buildBoardUI();
  setTheme("ivory");
  setBoardTheme("emerald");
  applyPoolChange();
  renderHistory();

  let lastTime = performance.now();
  function frame(now) {
    const dt = (now - lastTime) * 0.001;
    lastTime = now;

    if (state.rolling) {
      const stillMoving = stepPhysics(state, dt, audio);
      const allSettled = state.dice.every((d) => d.settled);
      if (!stillMoving || allSettled) {
        onRollSettled();
      }
    }

    renderer.render(state);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
