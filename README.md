# MéritoPoly — Prototype PoC

Version revisitée du Monopoly consacrée aux **inégalités, à la fiscalité et à la redistribution**.
Application web mobile-first, **un seul téléphone partagé**, 2 à 6 joueurs, **10 tours de plateau**.

## Lancer le prototype

Aucune installation, aucun build :

- Ouvrir `index.html` dans un navigateur (mobile de préférence), **ou**
- `python3 -m http.server 8000` puis `http://localhost:8000`

La partie est **sauvegardée automatiquement** dans le navigateur (localStorage) et peut être reprise.

## Structure

```
index.html            Écrans (accueil, attribution, plateau, fin) + modale générique
css/style.css         Style rétro Monopoly, mobile-first
js/data/config.js     Paramètres économiques (barèmes, prestations, taux…) · 10 ans par partie
js/data/characters.js 8 personnages (revenus, foyer, logement, bail, crédits, patrimoine)
js/data/board.js      Plateau 40 cases : 18 activités économiques, 4 logements,
                      4 banques, 3 chance, 3 communauté, 4 porte-malheur, prison…
js/data/events.js     3 decks d'événements (chance, malheur, communauté/collectifs)
js/data/laws.js       16 cartes LOI modifiant les paramètres économiques
js/engine.js          Moteur de jeu (règles centralisées, testable sans navigateur)
js/ui.js              Interface (écrans, modales contextuelles, votes, dashboard)
test/smoke.js         Simulation automatisée de parties complètes
```

Tous les contenus et montants sont des **placeholders modifiables** dans `js/data/`.

## Boucle de jeu

1. Création de partie (prénoms) → **une seule étape** : saisie du résultat du dé de chaque
   joueur, puis génération des personnages. Le **dé le plus fort = personnage le plus riche**,
   profils diversifiés, certains possèdent d'emblée 1 ou plusieurs propriétés.
2. Chaque tour : lancer les dés physiquement → saisie → case d'arrivée → action contextuelle.
3. Chaque case propriété déclenche une **consommation obligatoire** (prix, remboursement,
   reste à charge, effet positif) ; si l'activité est possédée par un joueur, il encaisse.
4. **Les achats d'activités et de logements se font uniquement dans les 4 cases Banque**
   (seul, à plusieurs en parts égales, à crédit automatique), ainsi que les emprunts,
   remboursements et améliorations maison → hôtel.
5. **1 an = 1 tour du plateau.** La fin d'année est déclenchée quand le **1er joueur** arrive
   sur ou dépasse la case Départ : impôts, charges, loyers, prestations et crédits appliqués
   automatiquement, puis **bilan de fin d'année** avec indicateurs colorés (🟢 amélioration /
   🔴 détérioration vs année précédente), puis **vote de la loi**.
6. **Phase démocratique** : législateur tournant, 5 cartes loi, puis une seule question au
   groupe — majorité POUR ou CONTRE ; en cas d'égalité, le législateur départage.
7. Événements collectifs : mêmes chocs, **destins différents** affichés joueur par joueur.
8. Mort (vieillesse ou carte) : le joueur continue avec un **descendant**, patrimoine net
   transmis après droits de succession.
9. Après 10 ans : **victoire collective** si au moins un objectif est atteint
   (banqueroute, inégalités revenus/patrimoine, précarité, ascenseur social).

## Tests

```
node test/smoke.js
```

Simule des parties complètes (dés aléatoires, achats, crédits, votes, successions,
transactions) et vérifie les règles clés.
