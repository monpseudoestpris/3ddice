# Plan — Dés 6 faces Blood Bowl (Dés de Blocage)

Créé le : 2026-11-24 · Statut : TERMINÉ

## 1. Demande & Objectif Vérifiable
- **Demande** : Ajouter des dés 6 faces Blood Bowl (dés de blocage officiels) à l'application WebGL 3D `3ddice`.
- **Critères de succès vérifiables** :
  1. Un nouveau type de dé `BB` (6 faces, géométrie de cube chanfreiné partagée avec le `d6`) est sélectionnable dans la barre de contrôle, compatible ouverture hors-ligne `file://`.
  2. Les 6 faces portent les symboles officiels Blood Bowl avec leur distribution exacte :
     - Face 1 (`+Y`) : **Attaquant plaqué** (Crâne) — 1/6
     - Face 2 (`+Z`) : **Les deux plaqués** (Crâne + Explosion) — 1/6
     - Face 3 (`+X`) : **Repoussé** (Flèche) — 1/6
     - Face 4 (`-X`) : **Repoussé** (Flèche) — 1/6 (total 2/6)
     - Face 5 (`-Z`) : **Défenseur bousculé** (Explosion + `!`) — 1/6
     - Face 6 (`-Y`) : **Défenseur plaqué** (POW!) — 1/6
  3. Les 3 finitions existantes (Ivoire, Obsidienne, Émeraude) s'appliquent proprement à l'atlas 3×2 des dés Blood Bowl.
  4. Le HUD de résultat et l'historique affichent les symboles SVG et libellés français (sans somme numérique absurde), tout en conservant le comportement intact pour `d4`, `d6`, `d8`, `d10`, `d12`, `d20`.
  5. Vérification Node.js (`node --check`, tests unitaires du module `bloodbowl-dice.js`, cohérence HTML/CSS/JS, simulation physique headless incluant `bb`) : `0` erreur.

## 2. Décisions Validées (One-Way Doors)
- Aucune porte à sens unique : ajout purement additif (`Two-Way Door`), extraction en module Sprout `bloodbowl-dice.js` chargé via `<script defer>` avant `app.js` pour préserver la compatibilité `file://` et éviter l'accrétion dans `app.js` (>2000 lignes).

## 3. Découpage & Suivi des Tranches
- [x] **T1** — Créer le module Sprout `bloodbowl-dice.js` (métadonnées des 6 faces, dessin vectoriel Canvas 2D de l'atlas 3×2 avec gravure et gestion des 3 thèmes, génération d'icônes SVG sûres via DOM pour le HUD).
  `[Two-Way] · [Runtime] · [~280 lignes / 1 fichier] · [Seams checked: N/A]`
- [x] **T2** — Intégrer le type `bb` dans `index.html`, `styles.css` et `app.js` (bouton `BB`, maillage d6 partagé, texture dédiée, HUD symbolique + historique adapté), puis exécuter la suite de vérification headless.
  `[Two-Way] · [Runtime] · [~110 lignes / 3 fichiers] · [Seams checked: N/A]`

## 4. Journal de Preuves
- **T1 & T2** :
  - Fichiers créés/modifiés : `bloodbowl-dice.js` (nouveau), `index.html`, `styles.css`, `app.js`.
  - Commande : `node --check bloodbowl-dice.js && node --check app.js` + suite Node.js headless (ordre `<script defer>`, 20 IDs DOM, 7 types de dés, 101 blocs CSS équilibrés, distribution des 6 faces Blood Bowl, génération d'atlas `1152×768` sur les 3 thèmes, génération SVG DOM, simulation physique 3 dés `bb` + bascule retour sur `d6`).
  - Résultat : `ALL CHECKS PASSED — DOM IDs: 20, CSS blocks: 101, Canvas draw calls: 5340, GL textures: 5` (`0` erreur).

## 5. Prochaine Tranche
- Aucune — plan terminé.
