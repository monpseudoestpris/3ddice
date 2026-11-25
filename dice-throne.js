(() => {
  "use strict";

  /* =====================================================================
   * Dice Throne Module (Sprout)
   *  - 6 Season 1 Heroes (Barbarian, Moon Elf, Pyromancer, Paladin,
   *    Shadow Thief, Monk)
   *  - Official 6-face layouts combining Number (1-6) + Hero Symbol
   *  - Dynamic Canvas 2D vector face atlas + SVG HUD icons
   *  - Automatic Combo & Ability Detector (Straights, Ultimates, Symbols)
   * ===================================================================== */

  const SVG_NS = "http://www.w3.org/2000/svg";

  const SYMBOLS = {
    sword:  { id: "sword",  label: "Épée",    short: "Épée" },
    heart:  { id: "heart",  label: "Cœur",    short: "Cœur" },
    bolt:   { id: "bolt",   label: "Éclair",  short: "Éclair" },
    bow:    { id: "bow",    label: "Arc",     short: "Arc" },
    boot:   { id: "boot",   label: "Esquive", short: "Pied" },
    moon:   { id: "moon",   label: "Lune",    short: "Lune" },
    flame:  { id: "flame",  label: "Flamme",  short: "Flamme" },
    soul:   { id: "soul",   label: "Âme Feu", short: "Âme" },
    meteor: { id: "meteor", label: "Météore", short: "Météore" },
    helm:   { id: "helm",   label: "Heaume",  short: "Heaume" },
    pray:   { id: "pray",   label: "Prière",  short: "Prière" },
    dagger: { id: "dagger", label: "Dague",   short: "Dague" },
    bag:    { id: "bag",    label: "Butin",   short: "Butin" },
    card:   { id: "card",   label: "Ruse",    short: "Ruse" },
    shadow: { id: "shadow", label: "Ombre",   short: "Ombre" },
    fist:   { id: "fist",   label: "Poing",   short: "Poing" },
    palm:   { id: "palm",   label: "Paume",   short: "Paume" },
    lotus:  { id: "lotus",  label: "Lotus",   short: "Lotus" },
    zen:    { id: "zen",    label: "Zen",     short: "Zen" }
  };

  const HEROES = {
    barbarian: {
      id: "barbarian",
      name: "Barbare",
      subtitle: "Frappe brute & rage",
      accent: "#e05243",
      accentSoft: "rgba(224, 82, 67, 0.22)",
      ultimateName: "Rage du Berserker",
      faces: [
        { value: 1, symbol: "sword", tone: "neutral" },
        { value: 2, symbol: "sword", tone: "neutral" },
        { value: 3, symbol: "sword", tone: "neutral" },
        { value: 4, symbol: "heart", tone: "good" },
        { value: 5, symbol: "heart", tone: "good" },
        { value: 6, symbol: "bolt",  tone: "max" }
      ],
      combos: [
        { name: "Frappe Puissante", req: { sword: 2, bolt: 2 }, tier: "epic", desc: "2 Épées + 2 Éclairs" },
        { name: "Coup Critique",    req: { bolt: 3 },           tier: "rare", desc: "3 Éclairs" },
        { name: "Fortitude",        req: { heart: 3 },          tier: "good", desc: "3 Cœurs (Soin)" },
        { name: "Assaut Sauvage",   req: { sword: 3 },          tier: "good", desc: "3+ Épées" }
      ]
    },
    moon_elf: {
      id: "moon_elf",
      name: "Elfe Lunaire",
      subtitle: "Archère agile & éclipse",
      accent: "#4ea8de",
      accentSoft: "rgba(78, 168, 222, 0.22)",
      ultimateName: "Éclipse Lunaire",
      faces: [
        { value: 1, symbol: "bow",  tone: "neutral" },
        { value: 2, symbol: "bow",  tone: "neutral" },
        { value: 3, symbol: "bow",  tone: "neutral" },
        { value: 4, symbol: "boot", tone: "good" },
        { value: 5, symbol: "boot", tone: "good" },
        { value: 6, symbol: "moon", tone: "max" }
      ],
      combos: [
        { name: "Flèche Aveuglante", req: { bow: 2, moon: 2 }, tier: "epic", desc: "2 Arcs + 2 Lunes" },
        { name: "Tir d'Ombre",       req: { moon: 3 },         tier: "rare", desc: "3 Lunes" },
        { name: "Tir Évasif",        req: { boot: 3 },         tier: "good", desc: "3 Esquives" },
        { name: "Salve d'Arcs",      req: { bow: 3 },          tier: "good", desc: "3+ Arcs" }
      ]
    },
    pyromancer: {
      id: "pyromancer",
      name: "Pyromancien",
      subtitle: "Maîtrise du feu & météores",
      accent: "#f97316",
      accentSoft: "rgba(249, 115, 22, 0.22)",
      ultimateName: "Incinération Totale",
      faces: [
        { value: 1, symbol: "flame",  tone: "neutral" },
        { value: 2, symbol: "flame",  tone: "neutral" },
        { value: 3, symbol: "flame",  tone: "neutral" },
        { value: 4, symbol: "soul",   tone: "warning" },
        { value: 5, symbol: "meteor", tone: "max" },
        { value: 6, symbol: "meteor", tone: "max" }
      ],
      combos: [
        { name: "Pluie de Météores", req: { meteor: 4 },          tier: "epic", desc: "4 Météores" },
        { name: "Âme Ardente",       req: { soul: 2, flame: 2 },  tier: "rare", desc: "2 Âmes + 2 Flammes" },
        { name: "Pyroblaste",        req: { meteor: 2, flame: 2 },tier: "rare", desc: "2 Météores + 2 Flammes" },
        { name: "Boule de Feu",      req: { flame: 3 },           tier: "good", desc: "3+ Flammes" }
      ]
    },
    paladin: {
      id: "paladin",
      name: "Paladin",
      subtitle: "Justice sacrée & défense",
      accent: "#eab308",
      accentSoft: "rgba(234, 179, 8, 0.22)",
      ultimateName: "Fureur Divine",
      faces: [
        { value: 1, symbol: "sword", tone: "neutral" },
        { value: 2, symbol: "sword", tone: "neutral" },
        { value: 3, symbol: "sword", tone: "neutral" },
        { value: 4, symbol: "helm",  tone: "good" },
        { value: 5, symbol: "helm",  tone: "good" },
        { value: 6, symbol: "pray",  tone: "max" }
      ],
      combos: [
        { name: "Jugement Sacré",  req: { sword: 2, pray: 2 }, tier: "epic", desc: "2 Épées + 2 Prières" },
        { name: "Lumière Divine",  req: { pray: 3 },           tier: "rare", desc: "3 Prières" },
        { name: "Rempart Sacré",   req: { helm: 3 },           tier: "good", desc: "3 Heaumes" },
        { name: "Frappe Vertueuse",req: { sword: 3 },          tier: "good", desc: "3+ Épées" }
      ]
    },
    shadow_thief: {
      id: "shadow_thief",
      name: "Voleur de l'Ombre",
      subtitle: "Furtivité, poisons & butin",
      accent: "#a855f7",
      accentSoft: "rgba(168, 85, 247, 0.22)",
      ultimateName: "Assassinat de l'Ombre",
      faces: [
        { value: 1, symbol: "dagger", tone: "neutral" },
        { value: 2, symbol: "dagger", tone: "neutral" },
        { value: 3, symbol: "bag",    tone: "warning" },
        { value: 4, symbol: "bag",    tone: "warning" },
        { value: 5, symbol: "card",   tone: "good" },
        { value: 6, symbol: "shadow", tone: "max" }
      ],
      combos: [
        { name: "Danse des Ombres", req: { dagger: 2, shadow: 2 }, tier: "epic", desc: "2 Dagues + 2 Ombres" },
        { name: "Voile d'Ombre",    req: { shadow: 3 },            tier: "rare", desc: "3 Ombres" },
        { name: "Pickpocket",       req: { bag: 3 },               tier: "good", desc: "3 Butins" },
        { name: "Coup Sournois",    req: { dagger: 2, card: 1 },   tier: "good", desc: "2 Dagues + 1 Ruse" }
      ]
    },
    monk: {
      id: "monk",
      name: "Moine",
      subtitle: "Arts martiaux & maîtrise du Chi",
      accent: "#22c55e",
      accentSoft: "rgba(34, 197, 94, 0.22)",
      ultimateName: "Transcendance du Chi",
      faces: [
        { value: 1, symbol: "fist",  tone: "neutral" },
        { value: 2, symbol: "fist",  tone: "neutral" },
        { value: 3, symbol: "palm",  tone: "good" },
        { value: 4, symbol: "palm",  tone: "good" },
        { value: 5, symbol: "lotus", tone: "warning" },
        { value: 6, symbol: "zen",   tone: "max" }
      ],
      combos: [
        { name: "Frappe du Lotus", req: { fist: 2, lotus: 2 }, tier: "epic", desc: "2 Poings + 2 Lotus" },
        { name: "Harmonie Zen",    req: { zen: 3 },            tier: "rare", desc: "3 Zen" },
        { name: "Paume du Chi",    req: { palm: 3 },           tier: "good", desc: "3 Paumes" },
        { name: "Combo Poing",     req: { fist: 3 },           tier: "good", desc: "3 Poings" }
      ]
    }
  };

  const HERO_ORDER = ["barbarian", "moon_elf", "pyromancer", "paladin", "shadow_thief", "monk"];
  let activeHeroId = "barbarian";

  function getActiveHeroId() {
    return activeHeroId;
  }

  function getHero(heroId) {
    return HEROES[heroId || activeHeroId] || HEROES.barbarian;
  }

  function getActiveHero() {
    return getHero(activeHeroId);
  }

  function setActiveHero(heroId) {
    if (!HEROES[heroId]) return false;
    activeHeroId = heroId;
    return true;
  }

  function getFaceInfo(value, heroId) {
    const hero = getHero(heroId);
    const idx = Math.max(0, Math.min(5, (value | 0) - 1));
    const f = hero.faces[idx];
    const sym = SYMBOLS[f.symbol] || SYMBOLS.sword;
    return {
      value: f.value,
      id: f.symbol,
      symbol: f.symbol,
      shortLabel: `${f.value} ${sym.short}`,
      label: `${f.value} · ${sym.label}`,
      description: `${hero.name} — Face ${f.value} (${sym.label})`,
      tone: f.tone
    };
  }

  /* =====================================================================
   * Combo & Ability Detection (Yahtzee Straights + Hero Symbol Combos)
   * ===================================================================== */
  function hasConsecutiveRun(uniqueSorted, needed) {
    if (uniqueSorted.length < needed) return false;
    let run = 1;
    for (let i = 1; i < uniqueSorted.length; i++) {
      if (uniqueSorted[i] === uniqueSorted[i - 1] + 1) {
        run++;
        if (run >= needed) return true;
      } else {
        run = 1;
      }
    }
    return false;
  }

  function detectCombos(values, heroId) {
    const hero = getHero(heroId);
    const vals = (values || []).map((v) => v | 0).filter((v) => v >= 1 && v <= 6);
    if (vals.length === 0) return [];

    const matches = [];

    // 1. Ultimate (5x face 6)
    const sixCount = vals.filter((v) => v === 6).length;
    if (sixCount >= 5) {
      matches.push({
        name: `ULTIME : ${hero.ultimateName}`,
        tier: "ultimate",
        desc: "5× face 6"
      });
    }

    // 2. Large & Small Straights
    const uniqueSorted = Array.from(new Set(vals)).sort((a, b) => a - b);
    if (hasConsecutiveRun(uniqueSorted, 5)) {
      matches.push({
        name: "Grande Suite",
        tier: "epic",
        desc: uniqueSorted.includes(1) ? "1-2-3-4-5" : "2-3-4-5-6"
      });
    } else if (hasConsecutiveRun(uniqueSorted, 4)) {
      matches.push({
        name: "Petite Suite",
        tier: "rare",
        desc: "4 dés consécutifs"
      });
    }

    // 3. Symbol counts for hero abilities
    const symCounts = {};
    for (const v of vals) {
      const f = hero.faces[v - 1];
      if (f) symCounts[f.symbol] = (symCounts[f.symbol] || 0) + 1;
    }

    for (const combo of hero.combos) {
      let ok = true;
      for (const [sym, reqCount] of Object.entries(combo.req)) {
        if ((symCounts[sym] || 0) < reqCount) {
          ok = false;
          break;
        }
      }
      if (ok) {
        matches.push({ name: combo.name, tier: combo.tier, desc: combo.desc });
      }
    }

    return matches;
  }

  /* =====================================================================
   * Canvas 2D Vector Symbol Drawing (centered at 0,0 with radius r)
   * ===================================================================== */
  function drawHeroSymbol(ctx, symId, r, color, accent) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(4, r * 0.13);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    if (symId === "sword") {
      ctx.rotate(-Math.PI * 0.25);
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.96);
      ctx.lineTo(r * 0.19, -r * 0.62);
      ctx.lineTo(r * 0.15, r * 0.34);
      ctx.lineTo(-r * 0.15, r * 0.34);
      ctx.lineTo(-r * 0.19, -r * 0.62);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(-r * 0.48, r * 0.28, r * 0.96, r * 0.16);
      ctx.fillRect(-r * 0.11, r * 0.44, r * 0.22, r * 0.42);
      ctx.beginPath();
      ctx.arc(0, r * 0.88, r * 0.15, 0, Math.PI * 2);
      ctx.fill();
    } else if (symId === "heart") {
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.moveTo(0, r * 0.85);
      ctx.bezierCurveTo(-r * 1.05, r * 0.25, -r * 0.95, -r * 0.72, -r * 0.42, -r * 0.72);
      ctx.bezierCurveTo(-r * 0.15, -r * 0.72, 0, -r * 0.46, 0, -r * 0.36);
      ctx.bezierCurveTo(0, -r * 0.46, r * 0.15, -r * 0.72, r * 0.42, -r * 0.72);
      ctx.bezierCurveTo(r * 0.95, -r * 0.72, r * 1.05, r * 0.25, 0, r * 0.85);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (symId === "bolt") {
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.moveTo(r * 0.18, -r * 0.95);
      ctx.lineTo(-r * 0.56, r * 0.08);
      ctx.lineTo(-r * 0.04, r * 0.08);
      ctx.lineTo(-r * 0.22, r * 0.95);
      ctx.lineTo(r * 0.58, -r * 0.12);
      ctx.lineTo(r * 0.05, -r * 0.12);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (symId === "bow") {
      ctx.beginPath();
      ctx.arc(-r * 0.18, 0, r * 0.76, -Math.PI * 0.46, Math.PI * 0.46);
      ctx.stroke();
      ctx.lineWidth = Math.max(3, r * 0.08);
      ctx.beginPath();
      ctx.moveTo(-r * 0.08, -r * 0.74);
      ctx.lineTo(-r * 0.08, r * 0.74);
      ctx.stroke();
      ctx.lineWidth = Math.max(4, r * 0.12);
      ctx.beginPath();
      ctx.moveTo(-r * 0.65, 0);
      ctx.lineTo(r * 0.84, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(r * 0.92, 0);
      ctx.lineTo(r * 0.54, -r * 0.24);
      ctx.lineTo(r * 0.54, r * 0.24);
      ctx.closePath();
      ctx.fill();
    } else if (symId === "boot") {
      ctx.beginPath();
      ctx.moveTo(-r * 0.45, -r * 0.75);
      ctx.lineTo(r * 0.08, -r * 0.75);
      ctx.lineTo(r * 0.12, r * 0.12);
      ctx.lineTo(r * 0.78, r * 0.32);
      ctx.lineTo(r * 0.78, r * 0.72);
      ctx.lineTo(-r * 0.52, r * 0.72);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = accent;
      ctx.beginPath();
      ctx.moveTo(-r * 0.72, -r * 0.35);
      ctx.lineTo(-r * 0.48, -r * 0.35);
      ctx.moveTo(-r * 0.82, 0);
      ctx.lineTo(-r * 0.52, 0);
      ctx.stroke();
    } else if (symId === "moon") {
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.85, 0.35 * Math.PI, 1.65 * Math.PI, false);
      ctx.arc(r * 0.36, -r * 0.08, r * 0.68, 1.5 * Math.PI, 0.5 * Math.PI, true);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (symId === "flame") {
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.95);
      ctx.bezierCurveTo(r * 0.58, -r * 0.42, r * 0.82, r * 0.15, r * 0.52, r * 0.68);
      ctx.bezierCurveTo(r * 0.28, r * 0.98, -r * 0.28, r * 0.98, -r * 0.52, r * 0.68);
      ctx.bezierCurveTo(-r * 0.82, r * 0.15, -r * 0.58, -r * 0.35, -r * 0.18, -r * 0.68);
      ctx.bezierCurveTo(-r * 0.24, -r * 0.26, -r * 0.04, -r * 0.22, 0, -r * 0.95);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (symId === "soul") {
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(0, r * 0.1, r * 0.56, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-r * 0.42, -r * 0.38);
      ctx.quadraticCurveTo(0, -r * 1.05, r * 0.42, -r * 0.38);
      ctx.stroke();
    } else if (symId === "meteor") {
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(-r * 0.22, r * 0.24, r * 0.46, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.08);
      ctx.lineTo(r * 0.82, -r * 0.85);
      ctx.moveTo(r * 0.18, r * 0.18);
      ctx.lineTo(r * 0.88, -r * 0.36);
      ctx.moveTo(-r * 0.24, -r * 0.24);
      ctx.lineTo(r * 0.36, -r * 0.88);
      ctx.stroke();
    } else if (symId === "helm") {
      ctx.beginPath();
      ctx.arc(0, -r * 0.12, r * 0.64, Math.PI, 0);
      ctx.lineTo(r * 0.64, r * 0.55);
      ctx.lineTo(0, r * 0.86);
      ctx.lineTo(-r * 0.64, r * 0.55);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = accent;
      ctx.beginPath();
      ctx.moveTo(-r * 0.42, r * 0.08);
      ctx.lineTo(r * 0.42, r * 0.08);
      ctx.moveTo(0, -r * 0.35);
      ctx.lineTo(0, r * 0.62);
      ctx.stroke();
    } else if (symId === "pray") {
      ctx.fillStyle = accent;
      for (let i = 0; i < 8; i++) {
        const ang = (i * Math.PI) / 4;
        const rad = i % 2 === 0 ? r * 0.96 : r * 0.36;
        const x = Math.cos(ang) * rad;
        const y = Math.sin(ang) * rad;
        if (i === 0) ctx.beginPath(), ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (symId === "dagger") {
      ctx.rotate(Math.PI * 0.22);
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.94);
      ctx.lineTo(r * 0.22, -r * 0.22);
      ctx.lineTo(r * 0.09, r * 0.34);
      ctx.lineTo(-r * 0.09, r * 0.34);
      ctx.lineTo(-r * 0.22, -r * 0.22);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(-r * 0.36, r * 0.28, r * 0.72, r * 0.14);
      ctx.fillRect(-r * 0.1, r * 0.42, r * 0.2, r * 0.4);
    } else if (symId === "bag") {
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(0, r * 0.22, r * 0.62, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-r * 0.36, -r * 0.74);
      ctx.lineTo(r * 0.36, -r * 0.74);
      ctx.lineTo(r * 0.18, -r * 0.34);
      ctx.lineTo(-r * 0.18, -r * 0.34);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (symId === "card") {
      ctx.fillStyle = accent;
      ctx.fillRect(-r * 0.52, -r * 0.74, r * 1.04, r * 1.48);
      ctx.strokeRect(-r * 0.52, -r * 0.74, r * 1.04, r * 1.48);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.36);
      ctx.lineTo(r * 0.26, 0);
      ctx.lineTo(0, r * 0.36);
      ctx.lineTo(-r * 0.26, 0);
      ctx.closePath();
      ctx.fill();
    } else if (symId === "shadow") {
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.9);
      ctx.bezierCurveTo(r * 0.72, -r * 0.6, r * 0.78, r * 0.32, r * 0.55, r * 0.82);
      ctx.lineTo(r * 0.2, r * 0.52);
      ctx.lineTo(0, r * 0.82);
      ctx.lineTo(-r * 0.2, r * 0.52);
      ctx.lineTo(-r * 0.55, r * 0.82);
      ctx.bezierCurveTo(-r * 0.78, r * 0.32, -r * 0.72, -r * 0.6, 0, -r * 0.9);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (symId === "fist") {
      const rx = -r * 0.56, ry = -r * 0.52, rw = r * 1.12, rh = r * 1.04, rad = r * 0.24;
      ctx.beginPath();
      ctx.moveTo(rx + rad, ry);
      ctx.lineTo(rx + rw - rad, ry);
      ctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + rad);
      ctx.lineTo(rx + rw, ry + rh - rad);
      ctx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - rad, ry + rh);
      ctx.lineTo(rx + rad, ry + rh);
      ctx.quadraticCurveTo(rx, ry + rh, rx, ry + rh - rad);
      ctx.lineTo(rx, ry + rad);
      ctx.quadraticCurveTo(rx, ry, rx + rad, ry);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = accent;
      ctx.beginPath();
      ctx.moveTo(-r * 0.22, -r * 0.5);
      ctx.lineTo(-r * 0.22, -r * 0.08);
      ctx.moveTo(r * 0.06, -r * 0.5);
      ctx.lineTo(r * 0.06, -r * 0.08);
      ctx.moveTo(r * 0.32, -r * 0.5);
      ctx.lineTo(r * 0.32, -r * 0.08);
      ctx.stroke();
    } else if (symId === "palm") {
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(0, r * 0.16, r * 0.48, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      for (const ang of [-0.55, -0.22, 0.12, 0.46]) {
        ctx.beginPath();
        ctx.moveTo(Math.sin(ang) * r * 0.32, -r * 0.2);
        ctx.lineTo(Math.sin(ang) * r * 0.65, -r * 0.84);
        ctx.stroke();
      }
    } else if (symId === "lotus") {
      ctx.fillStyle = accent;
      for (const ang of [-0.6, 0, 0.6]) {
        ctx.save();
        ctx.rotate(ang);
        ctx.beginPath();
        ctx.ellipse(0, -r * 0.25, r * 0.26, r * 0.62, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    } else {
      // zen (yin-yang inspired circle)
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.42, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  function createAtlasCanvas(theme, heroId) {
    const hero = getHero(heroId);
    const t = theme || {
      base: "#f4efe4", edgeShade: "#d9cfbc", pip: "#1d1b18",
      pipOne: hero.accent, pipInnerRim: "rgba(255,255,255,0.45)"
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
      const face = hero.faces[val - 1];

      if (typeof globalThis !== "undefined" && globalThis.DiceThemes) {
        globalThis.DiceThemes.paintTileBackground(ctx, ox, oy, tile, tile, t, val * 37 + hero.name.length * 11);
      } else {
        ctx.fillStyle = t.base;
        ctx.fillRect(ox, oy, tile, tile);
      }

      // Hero accent recessed frame
      const pad = tile * 0.075;
      ctx.save();
      ctx.strokeStyle = hero.accent;
      ctx.globalAlpha = val === 6 ? 0.88 : 0.45;
      ctx.lineWidth = val === 6 ? tile * 0.026 : tile * 0.014;
      ctx.strokeRect(ox + pad, oy + pad, tile - pad * 2, tile - pad * 2);
      ctx.restore();

      // Central Hero Symbol
      ctx.save();
      ctx.translate(ox + tile * 0.53, oy + tile * 0.54);
      drawHeroSymbol(ctx, face.symbol, tile * 0.26, t.pip, hero.accent);
      ctx.restore();

      // Official Dice Throne Corner Number Medallion (top-left)
      const bx = ox + tile * 0.21;
      const by = oy + tile * 0.21;
      const br = tile * 0.115;
      ctx.save();
      ctx.fillStyle = val === 6 ? hero.accent : t.pip;
      ctx.beginPath();
      ctx.arc(bx, by, br, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = t.base;
      ctx.lineWidth = tile * 0.016;
      ctx.stroke();

      ctx.fillStyle = val === 6 ? "#ffffff" : t.base;
      ctx.font = `900 ${Math.round(tile * 0.145)}px "Inter", system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(val), bx, by + 2);
      ctx.restore();
    }
    return c;
  }

  /* =====================================================================
   * Safe DOM SVG Icons for HUD Chips & Hero Panel
   * ===================================================================== */
  function svgEl(tag, attrs) {
    const el = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) {
      el.setAttribute(k, String(v));
    }
    return el;
  }

  function createSymbolSvg(symId) {
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

    if (symId === "sword" || symId === "dagger") {
      svg.appendChild(svgEl("path", { d: "M19 5L9 15M6 12l6 6M5 19l3-3" }));
    } else if (symId === "heart") {
      svg.appendChild(svgEl("path", { d: "M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10Z" }));
    } else if (symId === "bolt") {
      svg.appendChild(svgEl("polygon", { points: "13 2 4 14 11 14 10 22 20 10 13 10" }));
    } else if (symId === "bow") {
      svg.appendChild(svgEl("path", { d: "M8 4a10 10 0 0 1 0 16M5 12h14M16 9l3 3-3 3" }));
    } else if (symId === "boot") {
      svg.appendChild(svgEl("path", { d: "M7 5h5v8l6 2v4H7Z" }));
    } else if (symId === "moon") {
      svg.appendChild(svgEl("path", { d: "M20 14.5A8.5 8.5 0 0 1 9.5 4a7 7 0 1 0 10.5 10.5Z" }));
    } else if (symId === "flame" || symId === "soul") {
      svg.appendChild(svgEl("path", { d: "M12 2c3 4 6 7 6 12a6 6 0 0 1-12 0c0-3 2-5 3-7 0 2 1 3 2 3 0-3 1-6 1-8Z" }));
    } else if (symId === "meteor") {
      svg.appendChild(svgEl("circle", { cx: "9", cy: "15", r: "4" }));
      svg.appendChild(svgEl("path", { d: "M12 12l7-7M15 14l5-5" }));
    } else if (symId === "helm") {
      svg.appendChild(svgEl("path", { d: "M6 10a6 6 0 0 1 12 0v6l-6 4-6-4Z" }));
    } else if (symId === "pray" || symId === "lotus") {
      svg.appendChild(svgEl("polygon", { points: "12 2 15 9 22 12 15 15 12 22 9 15 2 12 9 9" }));
    } else if (symId === "bag") {
      svg.appendChild(svgEl("circle", { cx: "12", cy: "14", r: "6" }));
      svg.appendChild(svgEl("path", { d: "M9 5h6l-1 3h-4Z" }));
    } else if (symId === "card") {
      svg.appendChild(svgEl("rect", { x: "6", y: "4", width: "12", height: "16", rx: "2" }));
    } else if (symId === "shadow") {
      svg.appendChild(svgEl("path", { d: "M12 3c4 0 7 3 7 8v8l-3-2-4 2-4-2-3 2v-8c0-5 3-8 7-8Z" }));
    } else if (symId === "fist" || symId === "palm") {
      svg.appendChild(svgEl("rect", { x: "5", y: "6", width: "14", height: "12", rx: "4" }));
    } else {
      svg.appendChild(svgEl("circle", { cx: "12", cy: "12", r: "8" }));
      svg.appendChild(svgEl("circle", { cx: "12", cy: "12", r: "3" }));
    }
    return svg;
  }

  function createFaceSvg(value, heroId) {
    const info = getFaceInfo(value, heroId);
    return createSymbolSvg(info.symbol);
  }

  const api = {
    SYMBOLS,
    HEROES,
    HERO_ORDER,
    getActiveHeroId,
    getHero,
    getActiveHero,
    setActiveHero,
    getFaceInfo,
    detectCombos,
    createAtlasCanvas,
    createSymbolSvg,
    createFaceSvg
  };

  if (typeof globalThis !== "undefined") {
    globalThis.DiceThrone = api;
  }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})();
