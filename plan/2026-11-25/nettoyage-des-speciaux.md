# Plan — Nettoyage des dés spéciaux (d6 → d100 + Blood Bowl uniquement)

Créé le : 2026-11-25 · Statut : TERMINÉ

## 1. Demande & Objectif Vérifiable
Conserver uniquement :
- Les dés polyédriques normaux de **6 à 100 faces** : `d6`, `d8`, `d10`, `d%` (`d100p`), `d12`, `d14`, `d16`, `d20`, `d24`, `d30`, `d60`, `d100` (12 types).
- Le dé de blocage **Blood Bowl** (`bb`, 6 faces).

Supprimer de l'application (`index.html`, `dice-catalog.js`, `app.js`) :
- Les dés `< 6` faces (`d2`, `d3`, `d4`).
- Tous les autres dés spéciaux / jeux de société : `Dice Forge` (`df1`, `df2`), `Dice Throne` (`dt`), `Nemesis` (`nem_combat`, `nem_noise`), `Fate` (`fudge`), `Rock & Roll` (`rock`) et `Fun & Chaos` (`chaos`).
- Supprimer le fichier orphelin créé dans cette session (`nemesis-dice.js`) et signaler les anciens fichiers `dice-forge.js` / `dice-throne.js` sans les supprimer sans accord explicite.

## 2. Décisions Validées (One-Way Doors)
- Validation explicite de l'utilisateur : conserver uniquement les dés normaux de 6 à 100 faces et les dés Blood Bowl.

## 3. Découpage & Suivi des Tranches
- [x] **T1** : Nettoyer `dice-catalog.js` et `index.html` (13 types de dés : `d6`→`d100` + `bb`, boutons rapides dock `d6 d8 d10 d12 d20 d100 BB`, suppression popovers Forge/Throne et scripts non utilisés).
  `[Two-Way] · [Static] · [~690 lines removed / 2 files] · [Seams checked: N/A]`
- [x] **T2** : Nettoyer `app.js` (suppression `d4`, Forge, Throne, Nemesis, Fate/Rock/Fun et logique de verrouillage), supprimer `nemesis-dice.js`, exécuter la vérification Node.js et mettre à jour `HANDOFF.md`.
  `[Two-Way] · [Runtime] · [~620 lines removed / 1 file] · [Seams checked: N/A]`

## 4. Journal de Preuves
- **T1 & T2** :
  - Fichiers modifiés : `index.html`, `dice-catalog.js`, `app.js` ; supprimé : `nemesis-dice.js`.
  - Commande exécutée : `rm -f nemesis-dice.js && node --check dice-themes.js bloodbowl-dice.js dice-catalog.js table-boards.js app.js && node -e "..."`.
  - Résultat : `ALL CHECKS PASSED: { scripts: 5, domIds: 40, cssBlocks: 192, diceTypes: 13, dockTypes: ['d6', 'd8', 'd10', 'd12', 'd20', 'd100', 'bb'] }` (`exit code 0`).

## 5. Prochaine Tranche
Aucune — plan terminé.
