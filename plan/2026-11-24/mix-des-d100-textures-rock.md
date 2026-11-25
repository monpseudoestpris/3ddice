# Plan — Polyèdres jusqu'à d100, Mix de dés, Textures & Dés Fun / Rock & Roll

Créé le : 2026-11-24 · Statut : TERMINÉ

## 1. Demande & Objectif Vérifiable
- **Demande** : Ajouter les autres types de dés existants jusqu'à 100 faces, permettre de mixer plusieurs types de dés dans un même lancer, enrichir les textures/couleurs de dés, et ajouter des dés fun et rock & roll.
- **Critères de succès vérifiables** :
  1. **Polyèdres complets (d2 → d100)** : `d2`, `d3`, `d4`, `d6`, `d8`, `d10`, `d%` (00–90), `d12`, `d14`, `d16`, `d20`, `d24`, `d30`, `d60`, `d100` (Zocchihedron convexe à 100 faces planes exactes par découpe de demi-espaces).
  2. **Dés spéciaux, Fun & Rock & Roll** : `bb` (Blood Bowl), `fudge` (Fate `-`/`0`/`+`), `rock` (Rock & Roll : Corne, Éclair, Guitare, Crâne Metal, Star, En Feu), `chaos` (Fun/Chaos : Boom!, Twist, Safe, ×2, Crit!, Jackpot).
  3. **Mix de dés (Pool)** : jusqu'à 16 dés mixés librement, presets rapides, panneau Mixeur, Shift+clic rapide, HUD et historique mixtes.
  4. **10 textures & couleurs procédurales** : Ivoire, Obsidienne, Émeraude, Rubis marbré, Améthyste cristal, Galaxie étoilée, Lave volcanique, Chrome brossé, Or Royal, Rock Néon.
  5. **Vérification Node.js headless** : `0` erreur.

## 2. Décisions Validées (One-Way Doors)
- Architecture additive en modules Sprout (`dice-themes.js`, `dice-catalog.js`) chargés via `<script defer>` avant `app.js` pour conserver la compatibilité hors-ligne `file://`.

## 3. Découpage & Suivi des Tranches
- [x] **T1** — Module `dice-themes.js` (10 thèmes/couleurs avec motifs procéduraux Canvas 2D) et raccordement de `bloodbowl-dice.js`.
  `[Two-Way] · [Runtime] · [~240 lignes / 2 fichiers] · [Seams checked: N/A]`
- [x] **T2** — Module `dice-catalog.js` (polyèdres `d2`, `d3`, `d%`, `d14`, `d16`, `d24`, `d30`, `d60`, `d100` + dés symboliques `fudge`, `rock`, `chaos`).
  `[Two-Way] · [Runtime] · [~560 lignes / 1 fichier] · [Seams checked: N/A]`
- [x] **T3** — Intégration du Mix de dés, des 10 textures et des 19 types dans `index.html`, `styles.css` et `app.js`, puis vérification headless complète.
  `[Two-Way] · [Runtime] · [~450 lignes / 3 fichiers] · [Seams checked: N/A]`

## 4. Journal de Preuves
- **T1, T2 & T3** :
  - Fichiers créés/modifiés : `dice-themes.js`, `dice-catalog.js`, `bloodbowl-dice.js`, `index.html`, `styles.css`, `app.js`.
  - Commande : `node --check dice-themes.js && node --check bloodbowl-dice.js && node --check dice-catalog.js && node --check app.js` + suite Node.js headless (planéité & CCW sur tous les polyèdres jusqu'à `d100`, 196 sommets sur `d100`, 10 textures, simulation physique headless `2d100`, `2 Rock`, `2 Fun`, et pool mixte `1d20 + 1d100 + 1 BB + 2 Rock`).
  - Résultat : `ALL CHECKS PASSED — 19 die types, 10 themes, DOM IDs: 33, CSS blocks: 135, d100 verts: 196, Canvas ops: 9018, GL textures: 16` (`0` erreur).

## 5. Prochaine Tranche
- Aucune — plan terminé.
