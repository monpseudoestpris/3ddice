(() => {
  "use strict";

  /* =====================================================================
   * Procedural Dice Themes & Surface Textures (10 finishes)
   * ===================================================================== */
  const THEMES = {
    ivory: {
      id: "ivory",
      label: "Ivoire",
      swatch: "#f4efe4",
      swatchRing: "rgba(255,255,255,0.3)",
      pattern: "grain",
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
      id: "obsidian",
      label: "Obsidienne",
      swatch: "#1f2226",
      swatchRing: "#d4af6a",
      pattern: "grain",
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
      id: "emerald",
      label: "Émeraude",
      swatch: "#134e3a",
      swatchRing: "#e2be74",
      pattern: "grain",
      base: "#134e3a",
      edgeShade: "#0a2f22",
      facetBorder: "rgba(226, 190, 116, 0.25)",
      pip: "#f4efe2",
      pipOne: "#e2be74",
      pipInnerRim: "rgba(0,0,0,0.45)",
      specStrength: 0.65,
      shininess: 56.0
    },
    ruby: {
      id: "ruby",
      label: "Rubis",
      swatch: "#8e1c2c",
      swatchRing: "#f4d38c",
      pattern: "marble",
      veinColor: "rgba(255, 196, 196, 0.16)",
      veinDark: "rgba(42, 4, 10, 0.26)",
      base: "#8a1b2b",
      edgeShade: "#4b0b15",
      facetBorder: "rgba(244, 211, 140, 0.30)",
      pip: "#f9e7bc",
      pipOne: "#ffffff",
      pipInnerRim: "rgba(0,0,0,0.45)",
      specStrength: 0.80,
      shininess: 74.0
    },
    amethyst: {
      id: "amethyst",
      label: "Améthyste",
      swatch: "#4e2876",
      swatchRing: "#d6c8f5",
      pattern: "crystal",
      shardLight: "rgba(218, 196, 255, 0.14)",
      shardDark: "rgba(26, 10, 48, 0.26)",
      base: "#4c2773",
      edgeShade: "#261040",
      facetBorder: "rgba(218, 196, 255, 0.30)",
      pip: "#f0eaff",
      pipOne: "#ffd37a",
      pipInnerRim: "rgba(0,0,0,0.5)",
      specStrength: 0.86,
      shininess: 88.0
    },
    galaxy: {
      id: "galaxy",
      label: "Galaxie",
      swatch: "#131c3d",
      swatchRing: "#7ae2ff",
      pattern: "galaxy",
      nebulaA: "rgba(116, 62, 198, 0.32)",
      nebulaB: "rgba(42, 178, 214, 0.24)",
      base: "#101733",
      edgeShade: "#070a19",
      facetBorder: "rgba(122, 226, 255, 0.28)",
      pip: "#eaf7ff",
      pipOne: "#ffd86b",
      pipInnerRim: "rgba(0,0,0,0.6)",
      specStrength: 0.84,
      shininess: 82.0
    },
    lava: {
      id: "lava",
      label: "Lave",
      swatch: "#2c1a17",
      swatchRing: "#ff6b2b",
      pattern: "lava",
      crackGlow: "rgba(255, 96, 26, 0.58)",
      crackCore: "rgba(255, 206, 84, 0.72)",
      base: "#261b19",
      edgeShade: "#120c0b",
      facetBorder: "rgba(255, 118, 46, 0.34)",
      pip: "#ffae42",
      pipOne: "#ffe47a",
      pipInnerRim: "rgba(0,0,0,0.7)",
      specStrength: 0.50,
      shininess: 36.0
    },
    chrome: {
      id: "chrome",
      label: "Chrome",
      swatch: "#b8c0c8",
      swatchRing: "#ffffff",
      pattern: "metal",
      streakLight: "rgba(255, 255, 255, 0.20)",
      streakDark: "rgba(28, 34, 42, 0.16)",
      base: "#b9c2cb",
      edgeShade: "#747e88",
      facetBorder: "rgba(255, 255, 255, 0.36)",
      pip: "#14171c",
      pipOne: "#b8202c",
      pipInnerRim: "rgba(255,255,255,0.52)",
      specStrength: 0.96,
      shininess: 110.0
    },
    gold: {
      id: "gold",
      label: "Or Royal",
      swatch: "#cfa349",
      swatchRing: "#fff0b8",
      pattern: "metal",
      streakLight: "rgba(255, 245, 198, 0.24)",
      streakDark: "rgba(86, 56, 12, 0.18)",
      base: "#c89b3f",
      edgeShade: "#7c5818",
      facetBorder: "rgba(255, 236, 176, 0.35)",
      pip: "#211506",
      pipOne: "#8f1919",
      pipInnerRim: "rgba(255,244,200,0.45)",
      specStrength: 0.94,
      shininess: 98.0
    },
    rock: {
      id: "rock",
      label: "Rock Néon",
      swatch: "#1b1024",
      swatchRing: "#ff3d6e",
      pattern: "rock",
      boltA: "rgba(255, 56, 108, 0.44)",
      boltB: "rgba(255, 196, 46, 0.38)",
      base: "#181020",
      edgeShade: "#0b0710",
      facetBorder: "rgba(255, 61, 110, 0.36)",
      pip: "#ff4778",
      pipOne: "#ffd43b",
      pipInnerRim: "rgba(0,0,0,0.7)",
      specStrength: 0.82,
      shininess: 76.0
    }
  };

  const THEME_ORDER = [
    "ivory", "obsidian", "emerald", "ruby", "amethyst",
    "galaxy", "lava", "chrome", "gold", "rock"
  ];

  function makeRng(seed) {
    let s = (seed >>> 0) || 1;
    return () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  function paintTileBackground(ctx, ox, oy, w, h, theme, seed) {
    const t = theme || THEMES.ivory;
    const rng = makeRng((seed || 1) * 2654435761);
    const cx = ox + w * 0.5;
    const cy = oy + h * 0.5;
    const minDim = Math.min(w, h);

    // Base radial shading
    const bg = ctx.createRadialGradient(cx, cy, minDim * 0.06, cx, cy, minDim * 0.66);
    bg.addColorStop(0, t.base);
    bg.addColorStop(0.75, t.base);
    bg.addColorStop(1, t.edgeShade);
    ctx.fillStyle = bg;
    ctx.fillRect(ox, oy, w, h);

    ctx.save();
    if (typeof ctx.rect === "function" && typeof ctx.clip === "function") {
      ctx.beginPath();
      ctx.rect(ox, oy, w, h);
      ctx.clip();
    }

    if (t.pattern === "marble") {
      for (let k = 0; k < 6; k++) {
        ctx.beginPath();
        let x = ox + rng() * w;
        let y = oy;
        ctx.moveTo(x, y);
        for (let step = 1; step <= 6; step++) {
          x += (rng() - 0.5) * w * 0.28;
          y = oy + (step / 6) * h;
          ctx.lineTo(x, y);
        }
        ctx.strokeStyle = k % 2 === 0 ? t.veinColor : t.veinDark;
        ctx.lineWidth = Math.max(1.5, minDim * (0.012 + rng() * 0.022));
        ctx.stroke();
      }
    } else if (t.pattern === "crystal") {
      for (let k = 0; k < 7; k++) {
        const px = ox + rng() * w;
        const py = oy + rng() * h;
        const r = minDim * (0.14 + rng() * 0.22);
        const a0 = rng() * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(px + Math.cos(a0) * r, py + Math.sin(a0) * r);
        ctx.lineTo(px + Math.cos(a0 + 2.1) * r, py + Math.sin(a0 + 2.1) * r);
        ctx.lineTo(px + Math.cos(a0 + 4.2) * r, py + Math.sin(a0 + 4.2) * r);
        ctx.closePath();
        ctx.fillStyle = k % 2 === 0 ? t.shardLight : t.shardDark;
        ctx.fill();
      }
    } else if (t.pattern === "galaxy") {
      // Soft nebula clouds
      for (let k = 0; k < 3; k++) {
        const nx = ox + (0.2 + rng() * 0.6) * w;
        const ny = oy + (0.2 + rng() * 0.6) * h;
        const nr = minDim * (0.26 + rng() * 0.25);
        const neb = ctx.createRadialGradient(nx, ny, nr * 0.05, nx, ny, nr);
        neb.addColorStop(0, k % 2 === 0 ? t.nebulaA : t.nebulaB);
        neb.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = neb;
        ctx.fillRect(ox, oy, w, h);
      }
      // Crisp starfield
      const stars = Math.min(70, Math.max(24, Math.floor(minDim * 0.16)));
      for (let s = 0; s < stars; s++) {
        const sx = ox + rng() * w;
        const sy = oy + rng() * h;
        const sr = 0.8 + rng() * 1.8;
        ctx.fillStyle = s % 5 === 0 ? "rgba(255, 224, 140, 0.85)" : "rgba(232, 245, 255, 0.75)";
        ctx.beginPath();
        ctx.arc(sx, sy, sr, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (t.pattern === "lava") {
      // Glowing magma fissures around edges
      for (let k = 0; k < 5; k++) {
        ctx.beginPath();
        let x = ox + rng() * w;
        let y = oy + (k % 2 === 0 ? 0 : h);
        ctx.moveTo(x, y);
        const dirY = k % 2 === 0 ? 1 : -1;
        for (let step = 1; step <= 5; step++) {
          x += (rng() - 0.5) * w * 0.28;
          y += dirY * (h * 0.19);
          ctx.lineTo(x, y);
        }
        ctx.strokeStyle = t.crackGlow;
        ctx.lineWidth = Math.max(2.5, minDim * 0.022);
        ctx.stroke();
        ctx.strokeStyle = t.crackCore;
        ctx.lineWidth = Math.max(1, minDim * 0.008);
        ctx.stroke();
      }
    } else if (t.pattern === "metal") {
      // Fine brushed directional sheen
      const lines = Math.min(48, Math.max(20, Math.floor(minDim * 0.14)));
      for (let i = 0; i < lines; i++) {
        const ly = oy + (i / lines) * h + (rng() - 0.5) * 4;
        ctx.fillStyle = i % 2 === 0 ? t.streakLight : t.streakDark;
        ctx.fillRect(ox, ly, w, Math.max(1, minDim * 0.006));
      }
    } else if (t.pattern === "rock") {
      // Electric lightning bolts near perimeter
      for (let k = 0; k < 4; k++) {
        ctx.beginPath();
        let x = ox + (k < 2 ? 0 : w);
        let y = oy + (0.15 + rng() * 0.7) * h;
        ctx.moveTo(x, y);
        const dirX = k < 2 ? 1 : -1;
        for (let seg = 1; seg <= 4; seg++) {
          x += dirX * w * (0.14 + rng() * 0.12);
          y += (rng() - 0.5) * h * 0.22;
          ctx.lineTo(x, y);
        }
        ctx.strokeStyle = k % 2 === 0 ? t.boltA : t.boltB;
        ctx.lineWidth = Math.max(1.8, minDim * 0.014);
        ctx.stroke();
      }
    } else {
      // Classic micro-grain
      const dots = Math.min(120, Math.max(36, Math.floor(minDim * 0.25)));
      ctx.fillStyle = "rgba(128,128,128,0.028)";
      for (let g = 0; g < dots; g++) {
        ctx.fillRect(ox + rng() * w, oy + rng() * h, 2, 2);
      }
    }

    ctx.restore();
  }

  function getTheme(key) {
    return THEMES[key] || THEMES.ivory;
  }

  const api = {
    THEMES,
    THEME_ORDER,
    getTheme,
    paintTileBackground
  };

  if (typeof globalThis !== "undefined") {
    globalThis.DiceThemes = api;
  }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})();
