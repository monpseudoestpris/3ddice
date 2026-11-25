# Plan — Plateaux : Formes, Couleurs & Textures

Créé le : 2026-11-24 · Statut : TERMINÉ

## 1. Demande & Objectif Vérifiable
- **Demande** : Ajouter différents plateaux de jeu (formes, couleurs et textures).
- **Critères de succès vérifiables** :
  1. **4 formes de plateau 3D** avec géométrie de sol + bordures à onglets sans fissure ET murs de collision physique strictement alignés : `rect` (Classique), `octagon` (Octogone), `hexagon` (Hexagone), `circle` (Arène ronde).
  2. **8 thèmes de plateau (surface + cadre)** procéduraux Canvas 2D : Émeraude, Casino Pourpre, Stade Blood Bowl, Taverne Chêne, Donjon Pierre, Scène Rock, Table Astrale, Cuir Havane.
  3. Sélecteur **Plateau** intégré au dock (compatible `file://`, accessible clavier/Escape, responsive mobile et desktop).
  4. Vérification Node.js headless : `0` erreur.

## 2. Décisions Validées (One-Way Doors)
- Ajout purement additif (`Two-Way Door`) dans un module Sprout dédié `table-boards.js` chargé via `<script defer>` avant `app.js`.

## 3. Découpage & Suivi des Tranches
- [x] **T1** — Module `table-boards.js` (4 formes + maillages 3D sol/bordures à onglets + plans de collision physique + 8 thèmes procéduraux surface/cadre).
  `[Two-Way] · [Runtime] · [~400 lignes / 1 fichier] · [Seams checked: N/A]`
- [x] **T2** — Intégration dans `index.html`, `styles.css` et `app.js` (panneau Plateau, rendu dynamique des maillages/textures, collisions polygonales) et vérification headless.
  `[Two-Way] · [Runtime] · [~190 lignes / 3 fichiers] · [Seams checked: N/A]`

## 4. Journal de Preuves
- **T1 & T2** :
  - Fichiers créés/modifiés : `table-boards.js` (nouveau), `index.html`, `styles.css`, `app.js`.
  - Commande : `node --check` sur les 5 fichiers JS + suite Node.js headless (ordre `<script defer>`, 39 IDs DOM, 144 blocs CSS équilibrés, validation des 4 formes + confinement `clampPointToBoard`, rendu des 8 thèmes de plateau, simulation physique sur les 4 formes).
  - Résultat : `ALL CHECKS PASSED — 4 board shapes, 8 board themes, DOM IDs: 39, CSS blocks: 144, GL textures: 20` (`0` erreur).

## 5. Prochaine Tranche
- Aucune — plan terminé.
