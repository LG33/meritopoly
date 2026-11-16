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
js/data/config.js     Paramètres économiques (barèmes, prestations, taux…)
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

1. Création de partie (prénoms) → attribution des personnages au dé physique.
2. Chaque tour : lancer des dés physiques → saisie → case d'arrivée → action contextuelle
   (consommation, achat, achat à crédit ou à plusieurs, événement, banque).
3. Chaque case propriété déclenche une **consommation personnalisée** (prix, remboursement,
   reste à charge, effet positif) ; si l'activité est possédée par un joueur, il encaisse.
4. Fin de cycle : **phase démocratique** (législateur tournant, 5 cartes loi, vote à la majorité,
   le législateur tranche en cas d'égalité) puis **flux automatiques** (salaires, dividendes,
   loyers, impôts, prestations, mensualités de crédit) avec récapitulatif par joueur.
5. Événements collectifs : mêmes chocs, **destins différents** affichés joueur par joueur.
6. Mort (vieillesse ou carte) : le joueur continue avec un **descendant**, patrimoine net
   transmis après droits de succession.
7. Après 10 cycles : **victoire collective** si au moins un objectif est atteint
   (banqueroute, inégalités revenus/patrimoine, précarité, ascenseur social).

## Tests

```
node test/smoke.js
```

Simule des parties complètes (dés aléatoires, achats, crédits, votes, successions,
transactions) et vérifie les règles clés.
