# Plan — Ajout des dés polyédriques (d4, d6, d8, d10, d12, d20)

Créé le : 2026-11-24 · Statut : TERMINÉ

## 1. Demande & Objectif Vérifiable
- **Demande** : Ajouter des dés à 8 faces, 10 faces, et les autres dés polyédriques standards (d4, d8, d10, d12, d20) en complément du d6 existant dans `index.html` (page HTML autonome hors-ligne).
- **Critères de succès mesurables** :
  1. Les 6 types de dés (`d4`, `d6`, `d8`, `d10`, `d12`, `d20`) disposent chacun d'un maillage 3D convexe exact (normales sortantes, enroulement CCW compatible `CULL_FACE`) et d'une texture procédurale lisible dans les 3 thèmes (Ivoire, Obsidienne, Émeraude), avec conservation du d6 chanfreiné à points creusés.
  2. Le moteur physique corps rigides utilise les sommets, rayons d'encombrement, hauteurs de repos (rayon inscrit) et normales de faces propres à chaque polyèdre, y compris la lecture par sommet supérieur du `d4` et l'alignement à plat sans dé coincé sur une arête.
  3. Le sélecteur de type de dé dans le dock permet de choisir `d4 / d6 / d8 / d10 / d12 / d20`, met à jour le HUD de résultats (avec mise en valeur du maximum propre au dé et gestion des nombres à 2 chiffres) et l'historique (`XdY : ...`).
  4. Vérification mathématique (Node.js sur les géométries/normales/détection de face) et vérification visuelle/interactive réelle dans le navigateur (ou signalement explicite si indisponible).

## 2. Décisions Validées (One-Way Doors)
- Aucun One-Way Door bloquant : conservation du format autonome `index.html` sans dépendance externe (fonctionnement hors-ligne / `file://` préservé).
- Jeu de dés retenu : les 6 polyèdres standards `d4`, `d6`, `d8`, `d10` (valeurs 1–10), `d12`, `d20`.
- Lecture du `d4` : convention classique à lecture au sommet supérieur (les 3 faces visibles autour du sommet pointant vers `+Y` affichent la valeur gagnante près de la pointe).

## 3. Découpage & Suivi des Tranches
- [x] **T1 — Moteur polyédrique (géométries, atlas procéduraux, physique & rendu)**
  `[Two-Way] · [Runtime] · [~560 lines / 1 file] · [Seams checked: N/A]`
  - Spécifications mathématiques exactes pour `d4`, `d6`, `d8`, `d10`, `d12`, `d20` (`buildPolyhedraSpecs`, `orientFaceCCW`, `computeFaceUVLayout`, `assignOppositeValues`).
  - Maillages 3D (`buildPolyhedronMesh`) et atlas procéduraux chiffrés (`createPolyhedronAtlasCanvas`, soulignement `6`/`9` sur d10/d12/d20, 3 thèmes, mise en cache paresseuse WebGL `getDieTexture`).
  - Physique généralisée (`resolvePlaneCollision`, `detectTopFace`, `snapQuaternionFlat`, `createRestingDice`, `launchDice`, collisions inter-dés) et rendu par type de dé.
- [x] **T2 — Interface utilisateur, HUD, historique & vérification**
  `[Two-Way] · [Runtime] · [~90 lines / 1 file] · [Seams checked: N/A]`
  - Sélecteur `d4 / d6 / d8 / d10 / d12 / d20` ajouté dans le dock inférieur avec responsivité mobile/desktop.
  - HUD résultats adapté aux nombres à 2 chiffres (`min-width: 28px; padding: 0 6px`), surbrillance du max selon `dieType`, libellé `XdY` et historique `XdY : ...`.

## 4. Journal de Preuves
- **Fichier modifié** : `index.html`
- **Vérification mathématique & physique headless** :
  - Commande : `node /home/chabert/.gemini/antigravity/brain/f19a2785-385b-403c-adc0-f5a3642c67a8/scratch/verify_polyhedra.mjs`
  - Résultat : `exit 0` — Syntaxe JS valide ; 6/6 polyèdres vérifiés (planéité `< 1e-5`, normales sortantes, enroulement CCW sur tous les triangles, sommes opposées `N+1`, coins `d4`, aller-retour `detectTopFace`/`snapQuaternionFlat`, simulation physique 4 dés stabilisée en `1.42s`–`2.38s` à `restHeight` exact). Correction d'un bug de dualité sur les normales du `d12` détecté lors de la première exécution.
- **Vérification DOM** :
  - Commande : `node -e '...'` (vérification des IDs `getElementById` et boutons `.die-type-btn`)
  - Résultat : `exit 0` — 19/19 IDs DOM présents, 6 boutons `d4, d6, d8, d10, d12, d20`.
- **Vérification navigateur (Chrome DevTools)** : Non exécutée (`chrome_devtools` MCP indisponible dans cette session).

## 5. Prochaine Tranche
- Aucune (plan terminé).
