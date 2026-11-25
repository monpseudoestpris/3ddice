(() => {
  "use strict";

  /* =====================================================================
   * Dice Forge Module (Sprout)
   *  - 2 customizable 6-sided dice (df1: Light Die, df2: Dark Die)
   *  - 20 Sanctuary & starter removable die faces
   *  - Dynamic Canvas 2D vector face atlas + SVG HUD icons
   *  - Automatic resource aggregation (Gold, Sun, Moon, Glory, Specials)
   * ===================================================================== */

  const SVG_NS = "http://www.w3.org/2000/svg";

  const FACE_CATALOG = {
    gold1: {
      id: "gold1",
      category: "gold",
      shortLabel: "1 Or",
      label: "1 Or",
      description: "Face de départ : +1 pièce d'Or",
      tone: "warning",
      bg: "#3b2c0d",
      border: "#e5b84b",
      accent: "#ffd56b",
      icon: "gold",
      amount: "1",
      res: { gold: 1 }
    },
    gold3: {
      id: "gold3",
      category: "gold",
      shortLabel: "3 Or",
      label: "3 Or",
      description: "Sanctuaire (2 Or) : +3 pièces d'Or",
      tone: "warning",
      bg: "#47330c",
      border: "#f0c24b",
      accent: "#ffe07d",
      icon: "gold",
      amount: "3",
      res: { gold: 3 }
    },
    gold4: {
      id: "gold4",
      category: "gold",
      shortLabel: "4 Or",
      label: "4 Or",
      description: "Sanctuaire (3 Or) : +4 pièces d'Or",
      tone: "warning",
      bg: "#523a0d",
      border: "#f5c84c",
      accent: "#ffe68a",
      icon: "gold",
      amount: "4",
      res: { gold: 4 }
    },
    gold6: {
      id: "gold6",
      category: "gold",
      shortLabel: "6 Or",
      label: "6 Or",
      description: "Sanctuaire (4 Or) : +6 pièces d'Or",
      tone: "max",
      bg: "#5e410b",
      border: "#ffd75e",
      accent: "#fff0a6",
      icon: "gold",
      amount: "6",
      res: { gold: 6 }
    },
    sun1: {
      id: "sun1",
      category: "shards",
      shortLabel: "1 Sol.",
      label: "1 Éclat Solaire",
      description: "Face de départ / Sanctuaire : +1 Éclat Solaire",
      tone: "danger",
      bg: "#4a1b10",
      border: "#f27138",
      accent: "#ff9b5e",
      icon: "sun",
      amount: "1",
      res: { sun: 1 }
    },
    sun2: {
      id: "sun2",
      category: "shards",
      shortLabel: "2 Sol.",
      label: "2 Éclats Solaires",
      description: "Sanctuaire (8 Or) : +2 Éclats Solaires",
      tone: "danger",
      bg: "#5c1f0e",
      border: "#ff7e3d",
      accent: "#ffb273",
      icon: "sun",
      amount: "2",
      res: { sun: 2 }
    },
    moon1: {
      id: "moon1",
      category: "shards",
      shortLabel: "1 Lune",
      label: "1 Éclat Lunaire",
      description: "Face de départ / Sanctuaire : +1 Éclat Lunaire",
      tone: "good",
      bg: "#122645",
      border: "#5ba4f5",
      accent: "#93c5fd",
      icon: "moon",
      amount: "1",
      res: { moon: 1 }
    },
    moon2: {
      id: "moon2",
      category: "shards",
      shortLabel: "2 Lune",
      label: "2 Éclats Lunaires",
      description: "Sanctuaire (6 Or) : +2 Éclats Lunaires",
      tone: "good",
      bg: "#142f59",
      border: "#6cb4ff",
      accent: "#bae0ff",
      icon: "moon",
      amount: "2",
      res: { moon: 2 }
    },
    vp2: {
      id: "vp2",
      category: "glory",
      shortLabel: "2 Gl.",
      label: "2 Points de Gloire",
      description: "Face de départ (Dé Sombre) : +2 Points de Gloire",
      tone: "max",
      bg: "#173629",
      border: "#52c48c",
      accent: "#8ee6b8",
      icon: "vp",
      amount: "2",
      res: { vp: 2 }
    },
    vp3: {
      id: "vp3",
      category: "glory",
      shortLabel: "3 Gl.",
      label: "3 Points de Gloire",
      description: "Sanctuaire (8 Or) : +3 Points de Gloire",
      tone: "max",
      bg: "#174230",
      border: "#5cd69a",
      accent: "#a3f2c9",
      icon: "vp",
      amount: "3",
      res: { vp: 3 }
    },
    vp4: {
      id: "vp4",
      category: "glory",
      shortLabel: "4 Gl.",
      label: "4 Points de Gloire",
      description: "Sanctuaire (12 Or) : +4 Points de Gloire",
      tone: "max",
      bg: "#194f39",
      border: "#6ee7ab",
      accent: "#c2fae0",
      icon: "vp",
      amount: "4",
      res: { vp: 4 }
    },
    gold1_sun1: {
      id: "gold1_sun1",
      category: "combo",
      shortLabel: "1Or+1Sol",
      label: "1 Or + 1 Soleil",
      description: "Face combinée : +1 Or et +1 Éclat Solaire",
      tone: "warning",
      bg: "#422312",
      border: "#f09943",
      accent: "#ffd28a",
      icon: "combo",
      parts: [{ icon: "gold", amount: "1" }, { icon: "sun", amount: "1" }],
      res: { gold: 1, sun: 1 }
    },
    gold2_moon1: {
      id: "gold2_moon1",
      category: "combo",
      shortLabel: "2Or+1Lun",
      label: "2 Or + 1 Lune",
      description: "Face combinée : +2 Or et +1 Éclat Lunaire",
      tone: "good",
      bg: "#1e2c3d",
      border: "#7bb2e8",
      accent: "#d6e6ff",
      icon: "combo",
      parts: [{ icon: "gold", amount: "2" }, { icon: "moon", amount: "1" }],
      res: { gold: 2, moon: 1 }
    },
    vp1_sun1: {
      id: "vp1_sun1",
      category: "combo",
      shortLabel: "1Gl+1Sol",
      label: "1 Gloire + 1 Soleil",
      description: "Face combinée : +1 Gloire et +1 Éclat Solaire",
      tone: "danger",
      bg: "#3b2619",
      border: "#ea8f4d",
      accent: "#ffcf99",
      icon: "combo",
      parts: [{ icon: "vp", amount: "1" }, { icon: "sun", amount: "1" }],
      res: { vp: 1, sun: 1 }
    },
    vp2_moon2: {
      id: "vp2_moon2",
      category: "combo",
      shortLabel: "2Gl+2Lun",
      label: "2 Gloire + 2 Lune",
      description: "Face héroïque : +2 Gloire et +2 Éclats Lunaires",
      tone: "max",
      bg: "#163547",
      border: "#68c7d4",
      accent: "#b8f3fa",
      icon: "combo",
      parts: [{ icon: "vp", amount: "2" }, { icon: "moon", amount: "2" }],
      res: { vp: 2, moon: 2 }
    },
    all1: {
      id: "all1",
      category: "special",
      shortLabel: "1 Tout",
      label: "Face Céleste (+1 de chaque)",
      description: "Face Céleste : +1 Or, +1 Soleil, +1 Lune et +1 Gloire",
      tone: "max",
      bg: "#2d1f47",
      border: "#d9a8ff",
      accent: "#f3dcff",
      icon: "all",
      amount: "+1",
      res: { gold: 1, sun: 1, moon: 1, vp: 1 }
    },
    choice_gsm: {
      id: "choice_gsm",
      category: "special",
      shortLabel: "Choix 1",
      label: "1 Or / 1 Soleil / 1 Lune",
      description: "Au choix : +1 Or, +1 Éclat Solaire ou +1 Éclat Lunaire",
      tone: "warning",
      bg: "#2b2540",
      border: "#c4a7f5",
      accent: "#e5d4ff",
      icon: "choice",
      amount: "1 ?",
      res: {},
      special: "Choix (1 Or/Sol/Lune)"
    },
    choice_2g_2vp: {
      id: "choice_2g_2vp",
      category: "special",
      shortLabel: "2Or/2Gl",
      label: "2 Or OU 2 Gloire",
      description: "Au choix : +2 pièces d'Or ou +2 Points de Gloire",
      tone: "warning",
      bg: "#2f3320",
      border: "#d4c36a",
      accent: "#f2e7a7",
      icon: "choice",
      amount: "2 ?",
      res: {},
      special: "Choix (2 Or ou 2 Gloire)"
    },
    x3_other: {
      id: "x3_other",
      category: "special",
      shortLabel: "×3 Autre",
      label: "Multiplicateur ×3",
      description: "Triple le gain obtenu sur votre autre dé !",
      tone: "max",
      bg: "#3d1842",
      border: "#f07ce8",
      accent: "#ffd1fc",
      icon: "x3",
      amount: "×3",
      res: {},
      special: "×3 autre dé"
    },
    shield_2g: {
      id: "shield_2g",
      category: "special",
      shortLabel: "Bouclier",
      label: "Bouclier du Gardien",
      description: "+2 Or (ou +1 Soleil en défense)",
      tone: "good",
      bg: "#1f3038",
      border: "#78c2d4",
      accent: "#bfeef7",
      icon: "shield",
      amount: "2",
      res: { gold: 2 },
      special: "Bouclier"
    }
  };

  const FACE_ORDER = [
    "gold1", "gold3", "gold4", "gold6",
    "sun1", "sun2", "moon1", "moon2",
    "vp2", "vp3", "vp4",
    "gold1_sun1", "gold2_moon1", "vp1_sun1", "vp2_moon2",
    "all1", "choice_gsm", "choice_2g_2vp", "x3_other", "shield_2g"
  ];

  const PRESETS = [
    {
      id: "starter",
      label: "Départ",
      df1: ["gold1", "gold1", "gold1", "gold1", "gold1", "sun1"],
      df2: ["gold1", "gold1", "gold1", "gold1", "moon1", "vp2"]
    },
    {
      id: "midgame",
      label: "Sanctuaire",
      df1: ["gold3", "gold4", "sun1", "sun2", "gold1_sun1", "choice_gsm"],
      df2: ["gold3", "moon1", "moon2", "vp3", "gold2_moon1", "vp1_sun1"]
    },
    {
      id: "divine",
      label: "Forge Divine",
      df1: ["gold6", "sun2", "sun2", "vp4", "all1", "x3_other"],
      df2: ["gold6", "moon2", "vp4", "vp2_moon2", "choice_2g_2vp", "all1"]
    }
  ];

  const diceState = {
    df1: PRESETS[0].df1.slice(),
    df2: PRESETS[0].df2.slice()
  };

  const versions = {
    df1: 1,
    df2: 1
  };

  function isDiceForgeType(type) {
    return type === "df1" || type === "df2";
  }

  function getDieFaces(slotId) {
    const key = slotId === "df2" ? "df2" : "df1";
    return diceState[key].slice();
  }

  function setDieFace(slotId, faceIndex, faceId) {
    const key = slotId === "df2" ? "df2" : "df1";
    const idx = Math.max(0, Math.min(5, faceIndex | 0));
    if (!FACE_CATALOG[faceId]) return false;
    diceState[key][idx] = faceId;
    versions[key]++;
    return true;
  }

  function applyPreset(presetId) {
    const preset = PRESETS.find((p) => p.id === presetId) || PRESETS[0];
    diceState.df1 = preset.df1.slice();
    diceState.df2 = preset.df2.slice();
    versions.df1++;
    versions.df2++;
    return preset;
  }

  function getVersion(slotId) {
    return versions[slotId === "df2" ? "df2" : "df1"];
  }

  function getFaceById(faceId) {
    return FACE_CATALOG[faceId] || FACE_CATALOG.gold1;
  }

  function getFaceInfo(slotId, value) {
    const key = slotId === "df2" ? "df2" : "df1";
    const idx = Math.max(0, Math.min(5, (value | 0) - 1));
    const faceId = diceState[key][idx] || "gold1";
    return getFaceById(faceId);
  }

  function summarizeRoll(results) {
    const totals = { gold: 0, sun: 0, moon: 0, vp: 0 };
    const specials = [];
    let hasX3 = false;
    const faceResults = [];

    for (const r of results) {
      if (!isDiceForgeType(r.type)) continue;
      const face = getFaceInfo(r.type, r.value);
      faceResults.push(face);
      if (face.id === "x3_other") hasX3 = true;
    }

    // If exactly 2 Dice Forge dice and one is x3_other, triple the other die's numeric resources
    const mult = hasX3 && faceResults.length === 2 ? 3 : 1;

    for (const face of faceResults) {
      const res = face.res || {};
      const m = face.id === "x3_other" ? 1 : mult;
      if (res.gold) totals.gold += res.gold * m;
      if (res.sun) totals.sun += res.sun * m;
      if (res.moon) totals.moon += res.moon * m;
      if (res.vp) totals.vp += res.vp * m;
      if (face.special) specials.push(face.special);
    }

    const parts = [];
    if (totals.gold > 0) parts.push(`${totals.gold} Or`);
    if (totals.sun > 0) parts.push(`${totals.sun} Sol.`);
    if (totals.moon > 0) parts.push(`${totals.moon} Lune`);
    if (totals.vp > 0) parts.push(`${totals.vp} Gloire`);
    for (const sp of specials) {
      if (sp === "×3 autre dé" && mult === 3) continue;
      parts.push(sp);
    }

    const totalResources = totals.gold + totals.sun + totals.moon + totals.vp;
    return {
      totals,
      specials,
      multiplied: mult === 3,
      summaryText: parts.length > 0 ? parts.join(" · ") : "Aucun gain",
      compactTotal: parts.length > 0 ? parts.slice(0, 2).join(" · ") : `${totalResources}`
    };
  }

  /* =====================================================================
   * Canvas 2D Vector Drawing Helpers
   * ===================================================================== */
  function drawIcon(ctx, icon, cx, cy, r, accent, border) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    if (icon === "gold") {
      // Stylized minted gold coin
      const grad = ctx.createRadialGradient(-r * 0.25, -r * 0.25, r * 0.1, 0, 0, r);
      grad.addColorStop(0, "#fff2b2");
      grad.addColorStop(0.55, "#f0b93a");
      grad.addColorStop(1, "#a87114");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#fff6cf";
      ctx.lineWidth = Math.max(2, r * 0.1);
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.76, 0, Math.PI * 2);
      ctx.stroke();
    } else if (icon === "sun") {
      // Radiant sun shard
      ctx.fillStyle = accent;
      ctx.strokeStyle = border;
      ctx.lineWidth = Math.max(2, r * 0.09);
      const rays = 10;
      ctx.beginPath();
      for (let i = 0; i < rays * 2; i++) {
        const ang = (i * Math.PI) / rays - Math.PI * 0.5;
        const rad = i % 2 === 0 ? r * 1.05 : r * 0.58;
        const x = Math.cos(ang) * rad;
        const y = Math.sin(ang) * rad;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#fff3d6";
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.42, 0, Math.PI * 2);
      ctx.fill();
    } else if (icon === "moon") {
      // Glowing lunar crescent
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.92, 0.35 * Math.PI, 1.65 * Math.PI, false);
      ctx.arc(r * 0.38, -r * 0.08, r * 0.74, 1.5 * Math.PI, 0.5 * Math.PI, true);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = Math.max(1.5, r * 0.07);
      ctx.stroke();
    } else if (icon === "vp") {
      // Glory laurel crest / star-shield
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.moveTo(0, -r);
      ctx.lineTo(r * 0.85, -r * 0.45);
      ctx.lineTo(r * 0.68, r * 0.52);
      ctx.lineTo(0, r);
      ctx.lineTo(-r * 0.68, r * 0.52);
      ctx.lineTo(-r * 0.85, -r * 0.45);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#e6fff2";
      ctx.lineWidth = Math.max(2, r * 0.09);
      ctx.stroke();
    } else if (icon === "shield") {
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.moveTo(0, -r);
      ctx.lineTo(r * 0.85, -r * 0.6);
      ctx.quadraticCurveTo(r * 0.82, r * 0.45, 0, r);
      ctx.quadraticCurveTo(-r * 0.82, r * 0.45, -r * 0.85, -r * 0.6);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = Math.max(2, r * 0.09);
      ctx.stroke();
    } else if (icon === "all") {
      // 4-point celestial diamond
      ctx.fillStyle = accent;
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const ang = (i * Math.PI) / 4;
        const rad = i % 2 === 0 ? r * 1.05 : r * 0.42;
        const x = Math.cos(ang) * rad;
        const y = Math.sin(ang) * rad;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = Math.max(2, r * 0.08);
      ctx.stroke();
    } else if (icon === "choice") {
      // Split prism diamond
      ctx.strokeStyle = accent;
      ctx.lineWidth = Math.max(3, r * 0.14);
      ctx.beginPath();
      ctx.moveTo(-r * 0.78, r * 0.68);
      ctx.lineTo(r * 0.78, -r * 0.68);
      ctx.stroke();
      ctx.fillStyle = "#ffd56b";
      ctx.beginPath();
      ctx.arc(-r * 0.48, -r * 0.38, r * 0.28, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ff9b5e";
      ctx.beginPath();
      ctx.arc(r * 0.48, r * 0.38, r * 0.28, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#93c5fd";
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.24, 0, Math.PI * 2);
      ctx.fill();
    } else if (icon === "x3") {
      // Radiant multiplier ring
      ctx.strokeStyle = accent;
      ctx.lineWidth = Math.max(3, r * 0.14);
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.88, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawFaceTile(ctx, ox, oy, tile, face, slotId, theme) {
    // 1. Base die body texture around the snap-in tile frame
    if (typeof globalThis !== "undefined" && globalThis.DiceThemes) {
      globalThis.DiceThemes.paintTileBackground(ctx, ox, oy, tile, tile, theme, slotId === "df2" ? 41 : 17);
    } else {
      ctx.fillStyle = slotId === "df2" ? "#1c2230" : "#e8e0cf";
      ctx.fillRect(ox, oy, tile, tile);
    }

    // 2. Removable Dice Forge face plate (distinctive beveled snap-in frame)
    const pad = tile * 0.095;
    const w = tile - pad * 2;
    const r = tile * 0.11;
    const x = ox + pad;
    const y = oy + pad;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + w - r);
    ctx.quadraticCurveTo(x + w, y + w, x + w - r, y + w);
    ctx.lineTo(x + r, y + w);
    ctx.quadraticCurveTo(x, y + w, x, y + w - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();

    const plateGrad = ctx.createLinearGradient(x, y, x + w, y + w);
    plateGrad.addColorStop(0, face.bg);
    plateGrad.addColorStop(1, "#0e1116");
    ctx.fillStyle = plateGrad;
    ctx.fill();

    ctx.strokeStyle = face.border;
    ctx.lineWidth = tile * 0.032;
    ctx.stroke();

    // Inner hairline highlight
    ctx.strokeStyle = "rgba(255,255,255,0.22)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // 3. Draw resource icon(s) + value
    const cx = ox + tile * 0.5;
    const cy = oy + tile * 0.5;

    if (face.parts && face.parts.length === 2) {
      // Split combo face
      const p0 = face.parts[0];
      const p1 = face.parts[1];
      drawIcon(ctx, p0.icon, cx - tile * 0.16, cy - tile * 0.13, tile * 0.13, face.accent, face.border);
      drawIcon(ctx, p1.icon, cx + tile * 0.16, cy + tile * 0.14, tile * 0.13, face.accent, face.border);

      ctx.fillStyle = "#ffffff";
      ctx.font = `900 ${Math.round(tile * 0.16)}px "Inter", system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(p0.amount, cx + tile * 0.16, cy - tile * 0.13);
      ctx.fillText(p1.amount, cx - tile * 0.16, cy + tile * 0.15);

      // Subtle diagonal divider
      ctx.strokeStyle = "rgba(255,255,255,0.25)";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(x + w * 0.22, y + w * 0.78);
      ctx.lineTo(x + w * 0.78, y + w * 0.22);
      ctx.stroke();
    } else {
      drawIcon(ctx, face.icon, cx, cy - tile * 0.06, tile * 0.22, face.accent, face.border);

      if (face.amount) {
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "rgba(0,0,0,0.68)";
        ctx.lineWidth = tile * 0.028;
        ctx.font = `900 ${Math.round(tile * (face.icon === "x3" ? 0.24 : 0.20))}px "Inter", system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const ty = face.icon === "x3" ? cy - tile * 0.04 : cy + tile * 0.24;
        ctx.strokeText(face.amount, cx, ty);
        ctx.fillText(face.amount, cx, ty);
      }
    }

    // Small corner dot indicating Die 1 (Light) vs Die 2 (Dark)
    ctx.fillStyle = slotId === "df2" ? "rgba(147, 197, 253, 0.85)" : "rgba(255, 224, 125, 0.85)";
    ctx.beginPath();
    ctx.arc(x + w - tile * 0.075, y + tile * 0.075, tile * 0.025, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function createAtlasCanvas(slotId, theme) {
    const key = slotId === "df2" ? "df2" : "df1";
    const t = theme || {
      base: key === "df2" ? "#20242c" : "#f4efe4",
      edgeShade: key === "df2" ? "#111419" : "#d9cfbc",
      pip: "#1d1b18",
      pipOne: "#a62b2b"
    };
    const tile = 384;
    const c = document.createElement("canvas");
    c.width = tile * 3;
    c.height = tile * 2;
    const ctx = c.getContext("2d");

    for (let val = 1; val <= 6; val++) {
      const col = (val - 1) % 3;
      const row = Math.floor((val - 1) / 3);
      const face = getFaceInfo(key, val);
      drawFaceTile(ctx, col * tile, row * tile, tile, face, key, t);
    }
    return c;
  }

  /* =====================================================================
   * Safe DOM SVG Icons for HUD & Forge Panel
   * ===================================================================== */
  function svgEl(tag, attrs) {
    const el = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) {
      el.setAttribute(k, String(v));
    }
    return el;
  }

  function createFaceSvg(faceId) {
    const face = getFaceById(faceId);
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

    const ic = face.icon;
    if (ic === "gold") {
      svg.appendChild(svgEl("circle", { cx: "12", cy: "12", r: "8" }));
      svg.appendChild(svgEl("circle", { cx: "12", cy: "12", r: "4" }));
    } else if (ic === "sun") {
      svg.appendChild(svgEl("circle", { cx: "12", cy: "12", r: "4" }));
      svg.appendChild(svgEl("path", { d: "M12 2v3M12 19v3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M2 12h3M19 12h3M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12" }));
    } else if (ic === "moon") {
      svg.appendChild(svgEl("path", { d: "M20 14.5A8.5 8.5 0 0 1 9.5 4a7 7 0 1 0 10.5 10.5Z" }));
    } else if (ic === "vp") {
      svg.appendChild(svgEl("polygon", { points: "12 2 19 6 17 17 12 22 7 17 5 6" }));
    } else if (ic === "shield") {
      svg.appendChild(svgEl("path", { d: "M12 3l7 3v5c0 5-3 8.5-7 10-4-1.5-7-5-7-10V6l7-3Z" }));
    } else if (ic === "x3") {
      svg.appendChild(svgEl("path", { d: "M4 8l5 8M9 8l-5 8M13 8h6l-3.5 4H19a2.5 2.5 0 0 1 0 5h-6" }));
    } else if (ic === "choice") {
      svg.appendChild(svgEl("path", { d: "M5 19L19 5" }));
      svg.appendChild(svgEl("circle", { cx: "7.5", cy: "7.5", r: "2.5" }));
      svg.appendChild(svgEl("circle", { cx: "16.5", cy: "16.5", r: "2.5" }));
    } else {
      // combo / all
      svg.appendChild(svgEl("polygon", { points: "12 2 15 9 22 12 15 15 12 22 9 15 2 12 9 9" }));
    }
    return svg;
  }

  function createDieFaceSvg(slotId, value) {
    const face = getFaceInfo(slotId, value);
    return createFaceSvg(face.id);
  }

  const api = {
    FACE_CATALOG,
    FACE_ORDER,
    PRESETS,
    isDiceForgeType,
    getDieFaces,
    setDieFace,
    applyPreset,
    getVersion,
    getFaceById,
    getFaceInfo,
    summarizeRoll,
    createAtlasCanvas,
    createFaceSvg,
    createDieFaceSvg
  };

  if (typeof globalThis !== "undefined") {
    globalThis.DiceForge = api;
  }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})();
