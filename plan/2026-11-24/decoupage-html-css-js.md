# Plan — Découpage de `index.html` en HTML, CSS et JS

Créé le : 2026-11-24 · Statut : TERMINÉ

## 1. Demande & Objectif Vérifiable
- **Demande** : Découper le fichier monolithique `index.html` en 3 fichiers distincts (`index.html`, `styles.css`, `app.js`).
- **Critères de succès mesurables** :
  1. `styles.css` contient l'intégralité des règles CSS extraites sans perte ni modification de comportement.
  2. `app.js` contient l'intégralité du code JavaScript extrait (mode script classique IIFE compatible `file://` hors-ligne, sans `type="module"` qui bloquerait sur CORS en local) et passe `node --check`.
  3. `index.html` référence `styles.css` (`<link rel="stylesheet" href="styles.css" />`) et `app.js` (`<script src="app.js" defer></script>`), ne contient plus de `<style>` ni de `<script>` inline, et tous les IDs/sélecteurs DOM correspondent exactement à `app.js`.
  4. Les tests de caractérisation (géométrie + physique headless sur les 6 polyèdres + cohérence DOM) passent à 100 % sur `app.js` et `index.html`.

## 2. Décisions Validées (One-Way Doors)
- Aucun One-Way Door : découpage purement structurel (`Two-Way Door`, `[Static]`), en script classique `defer` pour préserver l'ouverture directe en `file://` sans serveur HTTP.

## 3. Découpage & Suivi des Tranches
- [x] **T1 — Extraction de `styles.css` et liaison dans `index.html`**
  `[Two-Way] · [Static] · [~769 lines moved / 2 files] · [Seams checked: N/A]`
- [x] **T2 — Extraction de `app.js`, liaison `defer` dans `index.html` & vérification**
  `[Two-Way] · [Static] · [~2060 lines moved / 2 files] · [Seams checked: N/A]`

## 4. Journal de Preuves
- **Fichiers créés / modifiés** : `index.html` (166 lignes, 8,5 Ko), `styles.css` (769 lignes, 15 Ko), `app.js` (2060 lignes, 68 Ko).
- **Vérification syntaxe, liens, CSS & moteur 3D/physique** :
  - Commande : `node --check /home/chabert/Projets/3ddice/app.js && node /home/chabert/.gemini/antigravity/brain/f19a2785-385b-403c-adc0-f5a3642c67a8/scratch/verify_polyhedra.mjs`
  - Résultat : `exit 0` — `app.js` valide, `index.html` lié à `styles.css` et `app.js` sans balises `<style>`/`<script>` inline résiduelles, 19/19 IDs DOM vérifiés, 96 blocs CSS équilibrés, 6/6 polyèdres (`d4` à `d20`) vérifiés en géométrie et simulation physique headless.

## 5. Prochaine Tranche
- Aucune (plan terminé).
