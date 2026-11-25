# HANDOFF — 3ddice

## 1. Aperçu du Projet
- Application WebGL 3D autonome découpée en 7 fichiers (`index.html`, `styles.css`, `dice-themes.js`, `bloodbowl-dice.js`, `dice-catalog.js`, `table-boards.js`, `app.js`) sans dépendance externe, compatible ouverture hors-ligne (`file://`) via `<script defer>`.
- Simulation 3D temps réel : **19 types de dés** (`d2`→`d100`, `d%`, `BB` Blood Bowl, `Fate`, `Rock & Roll`, `Fun & Chaos`), **mix libre jusqu'à 16 dés**, **10 textures de dés**, **4 formes de plateau 3D** (Classique, Octogone, Hexagone, Arène ronde) avec collisions polygonales exactes et **8 surfaces/cadres de plateau** (Émeraude, Casino Pourpre, Stade Blood Bowl, Taverne Chêne, Donjon Pierre, Scène Rock, Table Astrale, Cuir Havane), audio Web Audio API, caméra 3/4 ou Zénith et historique mixte.

## 2. Santé de Référence (Baseline)
- Dépôt Git local initialisé sur la branche `main` (aucun commit créé pour l'instant, aucun remote GitHub configuré), pas de suite npm.
- Vérification Node.js (`node --check` sur les 5 fichiers JS, ordre `<script defer>`, 39 IDs DOM, 144 blocs CSS équilibrés, géométries des 4 formes + 19 dés, 10 textures de dés + 8 textures de plateau, simulation physique headless sur les 4 formes) : **PASS** (`0` erreur).
- Rendu WebGL visuel en navigateur : non automatisé ici (à contrôler en ouvrant `index.html`).

## 3. Plan Actif
- Aucun (dernier plan terminé : `plan/2026-11-24/plateaux-formes-textures.md`).

## 4. Travaux Ponctuels Récents
- **2026-11-24** : Intégration des 3 sons MP3 ElevenLabs de `Public/` (lancer/collision, rebond sur tapis, roulement sur table) via `HTMLAudioElement` compatible `file://` avec repli Web Audio synthétique.
- **2026-11-24** : Ombres 3D renforcées (double passe occlusion de contact + ombre portée directionnelle) et son procédural de dés qui roulent.
- **2026-11-24** : Ajout des 4 formes et 8 textures/couleurs de plateaux 3D (`table-boards.js`) avec bordures à onglets et collisions polygonales exactes.
- **2026-11-24** : Ajout des polyèdres `d2`→`d100`, dés `Fate`/`Rock`/`Fun`, mix jusqu'à 16 dés et 10 textures de dés (`dice-themes.js`, `dice-catalog.js`).
- **2026-11-24** : Ajout des dés Blood Bowl (`bloodbowl-dice.js`) et découpage initial HTML/CSS/JS.

## 5. Risques & Blocages Connus
- Rendu WebGL visuel dans un navigateur réel non exécuté par l'agent : à contrôler directement dans [index.html](file:///home/chabert/Projets/3ddice/index.html).

## 6. Prochaine Action Immédiate
- Ouvrir `index.html` dans un navigateur et tester le bouton **Plateau** (ex. *Stade Blood Bowl* + *Octogone*, ou *Scène Rock* + *Arène ronde* avec les dés *Rock* en texture *Rock Néon*).
