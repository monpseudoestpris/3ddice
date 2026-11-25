(() => {
  "use strict";

  /* =====================================================================
   * Blood Bowl 6-Sided Block Die Module (Sprout)
   * Official 6 faces:
   *   1 (+Y): Attacker Down (Skull)          — 1/6
   *   2 (+Z): Both Down (Skull & Pow)        — 1/6
   *   3 (+X): Push Back (Arrow)              — 1/6
   *   4 (-X): Push Back (Arrow)              — 1/6 (total 2/6)
   *   5 (-Z): Defender Stumbles (Pow & !)    — 1/6
   *   6 (-Y): Defender Down (POW!)           — 1/6
   * ===================================================================== */

  const SVG_NS = "http://www.w3.org/2000/svg";

  const BB_FACES = {
    1: {
      value: 1,
      id: "skull",
      shortLabel: "Crâne",
      label: "Attaquant plaqué",
      description: "Attaquant plaqué — Turnover immédiat",
      tone: "danger"
    },
    2: {
      value: 2,
      id: "both-down",
      shortLabel: "Les 2",
      label: "Les deux plaqués",
      description: "Les deux joueurs plaqués (annulé par Blocage)",
      tone: "warning"
    },
    3: {
      value: 3,
      id: "push",
      shortLabel: "Repoussé",
      label: "Repoussé",
      description: "Le défenseur est repoussé d'une case",
      tone: "neutral"
    },
    4: {
      value: 4,
      id: "push",
      shortLabel: "Repoussé",
      label: "Repoussé",
      description: "Le défenseur est repoussé d'une case",
      tone: "neutral"
    },
    5: {
      value: 5,
      id: "stumble",
      shortLabel: "Bousculé",
      label: "Défenseur bousculé",
      description: "Repoussé et plaqué (sauf Esquive sans Tacle)",
      tone: "good"
    },
    6: {
      value: 6,
      id: "pow",
      shortLabel: "POW!",
      label: "Défenseur plaqué",
      description: "Repoussé et plaqué automatiquement (POW!)",
      tone: "max"
    }
  };

  function getFaceInfo(value) {
    return BB_FACES[value] || BB_FACES[3];
  }

  /* ---------------------------------------------------------------------
   * Canvas 2D Vector Drawing Helpers (centered at 0,0 with radius r)
   * --------------------------------------------------------------------- */
  function traceStarburstPath(ctx, points, outerR, innerR, rotOffset, jitterScale) {
    const total = points * 2;
    ctx.beginPath();
    for (let i = 0; i < total; i++) {
      const ang = rotOffset + (i * Math.PI) / points;
      const isOuter = i % 2 === 0;
      let rad = isOuter ? outerR : innerR;
      if (isOuter && jitterScale) {
        rad *= 1 + (i % 4 === 0 ? jitterScale : -jitterScale * 0.65);
      }
      const x = Math.cos(ang) * rad;
      const y = Math.sin(ang) * rad;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  function traceSkullSilhouette(ctx, s) {
    ctx.beginPath();
    // Rounded cranium from left temple over top to right temple
    ctx.moveTo(-0.62 * s, 0.08 * s);
    ctx.bezierCurveTo(-0.78 * s, -0.42 * s, -0.52 * s, -0.88 * s, 0, -0.88 * s);
    ctx.bezierCurveTo(0.52 * s, -0.88 * s, 0.78 * s, -0.42 * s, 0.62 * s, 0.08 * s);
    // Right cheek indent to jaw
    ctx.bezierCurveTo(0.56 * s, 0.28 * s, 0.44 * s, 0.34 * s, 0.42 * s, 0.56 * s);
    ctx.lineTo(0.34 * s, 0.80 * s);
    ctx.lineTo(-0.34 * s, 0.80 * s);
    ctx.lineTo(-0.42 * s, 0.56 * s);
    // Left cheek indent back to temple
    ctx.bezierCurveTo(-0.44 * s, 0.34 * s, -0.56 * s, 0.28 * s, -0.62 * s, 0.08 * s);
    ctx.closePath();
  }

  function drawSkullCutouts(ctx, s, cutoutColor) {
    ctx.fillStyle = cutoutColor;
    // Left & right eye sockets (slightly angled for fierce Blood Bowl look)
    for (const dir of [-1, 1]) {
      ctx.save();
      ctx.translate(dir * 0.27 * s, -0.06 * s);
      ctx.rotate(dir * -0.14);
      ctx.beginPath();
      ctx.ellipse(0, 0, 0.175 * s, 0.195 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Nasal cavity
    ctx.beginPath();
    ctx.moveTo(0, 0.10 * s);
    ctx.lineTo(0.10 * s, 0.34 * s);
    ctx.lineTo(0, 0.29 * s);
    ctx.lineTo(-0.10 * s, 0.34 * s);
    ctx.closePath();
    ctx.fill();

    // Teeth gaps in lower jaw
    const toothW = 0.065 * s;
    const toothH = 0.24 * s;
    const toothY = 0.57 * s;
    for (const tx of [-0.18, 0, 0.18]) {
      ctx.fillRect(tx * s - toothW * 0.5, toothY, toothW, toothH);
    }
  }

  function tracePushArrow(ctx, s) {
    // Bold diagonal up-right arrow
    ctx.save();
    ctx.rotate(-Math.PI * 0.25);
    ctx.beginPath();
    ctx.moveTo(0.84 * s, 0);
    ctx.lineTo(0.08 * s, -0.66 * s);
    ctx.lineTo(0.08 * s, -0.28 * s);
    ctx.lineTo(-0.78 * s, -0.28 * s);
    ctx.lineTo(-0.56 * s, 0);
    ctx.lineTo(-0.78 * s, 0.28 * s);
    ctx.lineTo(0.08 * s, 0.28 * s);
    ctx.lineTo(0.08 * s, 0.66 * s);
    ctx.closePath();
    ctx.restore();
  }

  function drawCarvedPath(ctx, traceFn, mainColor, rimColor, strokeWidth) {
    // 1. Subtle bottom-right rim highlight for recessed carved look
    ctx.save();
    ctx.translate(2.0, 2.5);
    traceFn(ctx);
    ctx.fillStyle = rimColor;
    ctx.fill();
    ctx.restore();

    // 2. Main inked fill
    traceFn(ctx);
    ctx.fillStyle = mainColor;
    ctx.fill();

    // 3. Crisp inner depth outline
    ctx.strokeStyle = "rgba(0, 0, 0, 0.26)";
    ctx.lineWidth = strokeWidth;
    ctx.lineJoin = "round";
    ctx.stroke();
  }

  function drawFaceSymbol(ctx, cx, cy, r, faceId, theme) {
    ctx.save();
    ctx.translate(cx, cy);

    if (faceId === "skull") {
      drawCarvedPath(ctx, (c) => traceSkullSilhouette(c, r * 0.96), theme.pipOne, theme.pipInnerRim, 3);
      drawSkullCutouts(ctx, r * 0.96, theme.base);
    } else if (faceId === "both-down") {
      // Outer starburst
      drawCarvedPath(
        ctx,
        (c) => traceStarburstPath(c, 10, r * 1.04, r * 0.60, -Math.PI * 0.1, 0.08),
        theme.pip,
        theme.pipInnerRim,
        2.5
      );
      // Clean separation halo around central skull
      traceSkullSilhouette(ctx, r * 0.64);
      ctx.fillStyle = theme.base;
      ctx.fill();
      // Compact inner skull
      traceSkullSilhouette(ctx, r * 0.54);
      ctx.fillStyle = theme.pipOne;
      ctx.fill();
      drawSkullCutouts(ctx, r * 0.54, theme.base);
    } else if (faceId === "push") {
      drawCarvedPath(ctx, (c) => tracePushArrow(c, r * 0.98), theme.pip, theme.pipInnerRim, 3);
    } else if (faceId === "stumble") {
      drawCarvedPath(
        ctx,
        (c) => traceStarburstPath(c, 10, r * 1.04, r * 0.56, -Math.PI * 0.05, 0.07),
        theme.pip,
        theme.pipInnerRim,
        2.5
      );
      // Bold cutout exclamation mark (!)
      ctx.fillStyle = theme.base;
      ctx.beginPath();
      ctx.moveTo(-0.12 * r, -0.44 * r);
      ctx.lineTo(0.12 * r, -0.44 * r);
      ctx.lineTo(0.08 * r, 0.14 * r);
      ctx.lineTo(-0.08 * r, 0.14 * r);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.arc(0, 0.34 * r, 0.115 * r, 0, Math.PI * 2);
      ctx.fill();
    } else if (faceId === "pow") {
      drawCarvedPath(
        ctx,
        (c) => traceStarburstPath(c, 12, r * 1.06, r * 0.52, -Math.PI * 0.08, 0.11),
        theme.pipOne,
        theme.pipInnerRim,
        2.5
      );
      // Inner impact cutout ring + solid center star for authentic POW punch
      traceStarburstPath(ctx, 12, r * 0.44, r * 0.25, -Math.PI * 0.08 + Math.PI / 12, 0.06);
      ctx.fillStyle = theme.base;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(0, 0, r * 0.17, 0, Math.PI * 2);
      ctx.fillStyle = theme.pipOne;
      ctx.fill();
    }

    ctx.restore();
  }

  function createAtlasCanvas(theme) {
    const t = theme || {
      base: "#f4efe4",
      edgeShade: "#d9cfbc",
      pip: "#1d1b18",
      pipOne: "#a62b2b",
      pipInnerRim: "rgba(255,255,255,0.45)"
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

      // Base radial / procedural surface texture
      if (typeof globalThis !== "undefined" && globalThis.DiceThemes) {
        globalThis.DiceThemes.paintTileBackground(ctx, ox, oy, tile, tile, t, val * 17);
      } else {
        const bg = ctx.createRadialGradient(
          ox + tile * 0.5, oy + tile * 0.5, tile * 0.08,
          ox + tile * 0.5, oy + tile * 0.5, tile * 0.68
        );
        bg.addColorStop(0, t.base);
        bg.addColorStop(0.76, t.base);
        bg.addColorStop(1, t.edgeShade);
        ctx.fillStyle = bg;
        ctx.fillRect(ox, oy, tile, tile);
      }

      const info = getFaceInfo(val);
      drawFaceSymbol(ctx, ox + tile * 0.5, oy + tile * 0.5, tile * 0.305, info.id, t);
    }

    return c;
  }

  /* ---------------------------------------------------------------------
   * Safe DOM SVG Icons for HUD Chips (no innerHTML)
   * --------------------------------------------------------------------- */
  function svgEl(tag, attrs) {
    const el = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) {
      el.setAttribute(k, String(v));
    }
    return el;
  }

  function createFaceSvg(value) {
    const info = getFaceInfo(value);
    const svg = svgEl("svg", {
      viewBox: "0 0 24 24",
      width: "14",
      height: "14",
      fill: "none",
      stroke: "currentColor",
      "stroke-width": "1.9",
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      "aria-hidden": "true",
      class: "bb-chip-icon"
    });

    if (info.id === "skull") {
      svg.appendChild(svgEl("path", {
        d: "M12 3.5c-4.1 0-7 2.8-7 6.5 0 2.1 1 3.7 2.4 4.7V18a1.5 1.5 0 0 0 1.5 1.5h6.2a1.5 1.5 0 0 0 1.5-1.5v-3.3C18 13.7 19 12.1 19 10c0-3.7-2.9-6.5-7-6.5Z"
      }));
      svg.appendChild(svgEl("circle", { cx: "9.4", cy: "10.3", r: "1.35", fill: "currentColor", stroke: "none" }));
      svg.appendChild(svgEl("circle", { cx: "14.6", cy: "10.3", r: "1.35", fill: "currentColor", stroke: "none" }));
      svg.appendChild(svgEl("path", { d: "M10.2 19.5V17M13.8 19.5V17" }));
    } else if (info.id === "both-down") {
      svg.appendChild(svgEl("polygon", {
        points: "12 2.2 14.3 6.2 18.8 5.2 17.8 9.7 21.8 12 17.8 14.3 18.8 18.8 14.3 17.8 12 21.8 9.7 17.8 5.2 18.8 6.2 14.3 2.2 12 6.2 9.7 5.2 5.2 9.7 6.2"
      }));
      svg.appendChild(svgEl("circle", { cx: "12", cy: "12", r: "3.1", fill: "currentColor", stroke: "none" }));
    } else if (info.id === "push") {
      svg.appendChild(svgEl("path", { d: "M6 18L18 6" }));
      svg.appendChild(svgEl("polyline", { points: "9.5 6 18 6 18 14.5" }));
    } else if (info.id === "stumble") {
      svg.appendChild(svgEl("polygon", {
        points: "12 2.2 14.6 6.4 19.4 5.4 18 10 21.8 12.5 17.5 14.8 18.6 19.5 13.8 18.1 12 21.8 10.2 18.1 5.4 19.5 6.5 14.8 2.2 12.5 6 10 4.6 5.4 9.4 6.4"
      }));
      svg.appendChild(svgEl("line", { x1: "12", y1: "8.2", x2: "12", y2: "12.8" }));
      svg.appendChild(svgEl("circle", { cx: "12", cy: "15.5", r: "0.95", fill: "currentColor", stroke: "none" }));
    } else {
      // pow
      svg.appendChild(svgEl("polygon", {
        points: "12 1.8 14.3 6.6 19.4 4.6 17.6 9.8 22.2 12 17.6 14.2 19.4 19.4 14.3 17.4 12 22.2 9.7 17.4 4.6 19.4 6.4 14.2 1.8 12 6.4 9.8 4.6 4.6 9.7 6.6",
        fill: "currentColor",
        "fill-opacity": "0.22"
      }));
      svg.appendChild(svgEl("circle", { cx: "12", cy: "12", r: "2.2", fill: "currentColor", stroke: "none" }));
    }

    return svg;
  }

  const api = {
    DIE_TYPE: "bb",
    FACES: BB_FACES,
    getFaceInfo,
    createAtlasCanvas,
    createFaceSvg
  };

  if (typeof globalThis !== "undefined") {
    globalThis.BloodBowlDice = api;
  }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})();
