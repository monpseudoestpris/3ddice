# Plan — Dés du jeu de société Nemesis

Créé le : 2026-11-25 · Statut : TERMINÉ

## 1. Demande & Objectif Vérifiable
Ajouter les deux dés officiels du jeu de société **Nemesis** (Awaken Realms) à l'application 3D WebGL :
- **Dé de Combat (`nem_combat`, 6 faces, cube biseauté)** :
  - `1` : Raté / Vide (1/6)
  - `2`, `3` : Rampant — 1 blessure sur Larve ou Rampant (2/6)
  - `4` : Adulte — 1 blessure sur Larve, Rampant ou Adulte (1/6)
  - `5` : 1 Touche — 1 blessure sur tout Intrus (1/6)
  - `6` : 2 Touches — 2 blessures à distance, 1 en mêlée (1/6)
- **Dé de Bruit (`nem_noise`, 10 faces, trapézoèdre pentagonal d10)** :
  - `1` : Danger (1/10)
  - `10` : Silence (1/10, opposé à Danger)
  - `2`, `6` : Couloir 1 (2/10)
  - `3`, `7` : Couloir 2 (2/10)
  - `4`, `8` : Couloir 3 (2/10)
  - `5`, `9` : Couloir 4 (2/10)

## 2. Décisions Validées (One-Way Doors)
- Aucun One-Way Door (ajout modulaire strictement rétrocompatible via le pattern Sprout `nemesis-dice.js`).

## 3. Découpage & Suivi des Tranches
- [x] **T1** : Créer le module Sprout `nemesis-dice.js` (métadonnées des 2 dés, dessin Canvas 2D des atlas 6 et 10 faces, icônes SVG DOM sûres, synthèse tactique `summarizeRoll`).
  `[Two-Way] · [Static] · [~425 lines / 1 file] · [Seams checked: N/A]`
- [x] **T2** : Brancher `nem_combat` et `nem_noise` dans `dice-catalog.js`, `index.html`, `app.js` et `styles.css` + exécuter la suite de vérification Node.js et mettre à jour `HANDOFF.md`.
  `[Two-Way] · [Runtime] · [~110 lines / 4 files] · [Seams checked: N/A]`

## 4. Journal de Preuves
- **T1 & T2** :
  - Fichiers créés/modifiés : `nemesis-dice.js`, `dice-catalog.js`, `index.html`, `app.js`, `styles.css`.
  - Commande exécutée : `node --check dice-themes.js bloodbowl-dice.js dice-forge.js dice-throne.js nemesis-dice.js dice-catalog.js table-boards.js app.js && node -e "..."` (vérification syntaxe, ordre des 8 scripts `defer`, 192 blocs CSS équilibrés, 24 types de dés, distributions exactes 6 faces Combat et 10 faces Bruit avec opposition Danger/Silence, et tests `summarizeRoll`).
  - Résultat : `ALL CHECKS PASSED: { scripts: 8, cssBlocks: 192, diceTypes: 24 }` (exit code `0`).

## 5. Prochaine Tranche
Aucune — plan terminé.
