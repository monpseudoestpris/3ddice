# Plan — Support Dice Forge & Dice Throne

- **Créé le** : 2026-11-25
- **Statut** : TERMINÉ

## 1. Demande & Objectif Vérifiable
Ajouter le support complet de **Dice Forge** et **Dice Throne** à l'application WebGL 3D autonome (sans dépendance externe, compatible `file://`) :
- **Dice Forge** : 2 dés d6 à faces interchangeables (`df1` Dé Clair, `df2` Dé Sombre), catalogue du Sanctuaire (20 faces), éditeur interactif face par face mettant à jour la texture WebGL 3D en direct, presets de progression (Départ / Sanctuaire / Forge Divine), et cumul automatique des ressources (Or, Éclats Solaires, Éclats Lunaires, Points de Gloire, Choix/Spéciaux, `×3`) dans le HUD et l'historique.
- **Dice Throne** : 6 héros Saison 1 (Barbare, Elfe Lunaire, Pyromancien, Paladin, Voleur de l'Ombre, Moine), 5 dés d6 combinant chiffre `1–6` + symbole du héros, mécanique de **verrouillage / relance sélective** (clic sur les puces du HUD, jusqu'à 3 lancers par tour + bouton Nouveau tour, anneau doré au sol sous les dés verrouillés en 3D), et **détection automatique des combos** (suites, ultimes, capacités du héros).

## 2. Décisions Validées (One-Way Doors)
- **Dice Forge** : Forge interactive face par face (2 dés personnalisables + Sanctuaire + cumul des ressources).
- **Dice Throne** : Pack de 6 héros Saison 1 + verrouillage/relance des dés (3 lancers) + détection automatique des combos.
- **Séquence** : Implémentation complète des deux jeux via modules Sprout dédiés (`dice-forge.js` et `dice-throne.js`).

## 3. Découpage & Suivi des Tranches
- [x] **T1 — Module Sprout Dice Forge (`dice-forge.js`)**
  `[Two-Way] · [Static] · [~450 lines / 1 file] · [Seams checked: N/A]`
- [x] **T2 — Module Sprout Dice Throne (`dice-throne.js`)**
  `[Two-Way] · [Static] · [~490 lines / 1 file] · [Seams checked: N/A]`
- [x] **T3 — Socle moteur, catalogue & relance sélective (`dice-catalog.js`, `app.js`)**
  `[Two-Way] · [Runtime] · [~220 lines / 2 files] · [Seams checked: N/A]`
- [x] **T4 — Interface UI Forge & Héros (`index.html`, `styles.css`, `app.js`)**
  `[Two-Way] · [Runtime] · [~450 lines / 3 files] · [Seams checked: N/A]`
- [x] **T5 — Vérification adversariale & clôture**
  `[Two-Way] · [Static] · [~0 lines / 0 files] · [Seams checked: Yes]`

## 4. Journal de Preuves
- **T1–T5** : `dice-forge.js`, `dice-throne.js`, `dice-catalog.js`, `app.js`, `index.html`, `styles.css`.
- Commande : `node --check` sur les 7 fichiers JS + suite de validation Node (ordre des 7 scripts `<script defer>`, 51 IDs DOM vérifiés, 190 blocs CSS équilibrés, 22 types de dés, 20 faces Dice Forge + multiplicateur `×3` + presets, 6 héros Dice Throne × 6 faces + détection Ultime / Grande Suite / Petite Suite / combos de héros) → **PASS** (`0` erreur).

## 5. Prochaine Tranche
- Aucune (plan terminé).
