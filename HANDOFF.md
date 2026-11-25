# HANDOFF — 3ddice

## 1. Aperçu du Projet
- Application WebGL 3D autonome découpée en 7 fichiers actifs (`index.html`, `styles.css`, `dice-themes.js`, `bloodbowl-dice.js`, `dice-catalog.js`, `table-boards.js`, `app.js`) sans dépendance externe, compatible ouverture hors-ligne (`file://`) via `<script defer>`.
- Simulation 3D temps réel : **13 types de dés** — polyédriques normaux de **6 à 100 faces** (`d6`, `d8`, `d10`, `d%`, `d12`, `d14`, `d16`, `d20`, `d24`, `d30`, `d60`, `d100`) et dé de blocage **Blood Bowl** (`BB`), **mix libre jusqu'à 16 dés**, **10 textures de dés**, **4 formes** et **8 surfaces de plateau**, audio hybride MP3 + Web Audio, caméra 3/4 ou Zénith et historique mixte.

## 2. Santé de Référence (Baseline)
- Dépôt Git local sur `main`, pas de suite npm.
- Vérification Node.js (`node --check` sur les 5 fichiers JS actifs, ordre des 5 `<script defer>`, 40 IDs DOM vérifiés, 192 blocs CSS équilibrés, 13 types de dés `d6`→`d100` + `bb`, 7 boutons rapides dans le dock) : **PASS** (`0` erreur).
- Rendu WebGL visuel en navigateur : non automatisé ici (à contrôler en ouvrant `index.html`).

## 3. Plan Actif
- Aucun (dernier plan terminé : `plan/2026-11-25/nettoyage-des-speciaux.md`).

## 4. Travaux Ponctuels Récents
- **2026-11-25** : Nettoyage des dés spéciaux — conservation exclusive des polyédriques `d6`→`d100` (12 types) et de **Blood Bowl** (`bb`), simplification du dock (`d6`, `d8`, `d10`, `d12`, `d20`, `d100`, `BB`), retrait des popovers/logiques Dice Forge, Dice Throne, Nemesis, Fate, Rock, Fun et `d2`/`d3`/`d4`.
- **2026-11-25** : Timer anti-blocage des dés dans `app.js` (freinage progressif à `2.8s`, verrouillage à plat garanti à `4.5s`).

## 5. Risques & Blocages Connus
- Fichiers préexistants non chargés (code mort laissé intact sans suppression destructrice) : `dice-forge.js` et `dice-throne.js` (peuvent être supprimés sur demande explicite).
- Rendu WebGL visuel dans un navigateur réel non exécuté par l'agent : à contrôler directement dans [index.html](file:///home/chabert/Projets/3ddice/index.html).

## 6. Prochaine Action Immédiate
- Ouvrir [index.html](file:///home/chabert/Projets/3ddice/index.html) dans un navigateur et vérifier les boutons rapides du dock (`d6`, `d8`, `d10`, `d12`, `d20`, `d100`, `BB`) ainsi que le catalogue **Mix / Tous**.
