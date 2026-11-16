// ============================================================
// MéritoPoly — Événements (placeholders modifiables)
// Trois decks : chance, malheur, communauté (collectifs).
// Types d'effets interprétés par le moteur :
//  money, salaryPct, capitalIncomeAdd, loseJob, findJob, inherit, assetsAdd,
//  rentPct, birth, death, jail, propValuePct, energyCrisis, foodCrisis,
//  ratesDelta, allMoney, solidarity, randomJobLoss, moneyIfChildren
// ============================================================

const EVENTS = {

  chance: [
    { title: 'Votre entreprise fait le buzz', text: 'Vos activités cartonnent : dividendes exceptionnels.',
      effects: [{ t: 'money', v: 500, ifOwner: true, fallback: 100 }] },
    { title: 'Héritage surprise', text: 'Votre grand-mère vous lègue sa maison.',
      effects: [{ t: 'inherit', v: 12000 }] },
    { title: 'Promotion', text: 'Votre travail est reconnu : augmentation.',
      effects: [{ t: 'salaryPct', p: 0.15 }] },
    { title: 'Heureux événement', text: 'Une naissance agrandit le foyer (allocations en hausse).',
      effects: [{ t: 'birth' }] },
    { title: 'Meilleur logement', text: 'Vous trouvez un logement moins cher.',
      effects: [{ t: 'rentPct', p: -0.10 }] },
    { title: 'Prime exceptionnelle', text: 'Votre employeur verse une prime.',
      effects: [{ t: 'money', v: 800, ifWorking: true, fallback: 300 }] },
    { title: 'Vos placements performent', text: 'Vos revenus du capital augmentent durablement.',
      effects: [{ t: 'capitalIncomeAdd', v: 100 }] },
    { title: 'Loterie du quartier', text: 'Un ticket gagnant dans votre journal.',
      effects: [{ t: 'money', v: 150 }] },
    { title: 'Bourse d\'études', text: 'La scolarité de vos enfants est partiellement financée.',
      effects: [{ t: 'moneyIfChildren', v: 400, v2: 100 }] },
    { title: 'Coup de chance immobilier', text: 'Vos biens prennent de la valeur (+10 %).',
      effects: [{ t: 'propValuePct', p: 0.10, scope: 'own' }] },
    { title: 'Embauche immédiate', text: 'On vous propose un emploi stable.',
      effects: [{ t: 'findJob', v: 1600 }] },
    { title: 'Accident fatal', text: 'Votre personnage décède. Son descendant reprend la partie.',
      effects: [{ t: 'death' }] }
  ],

  malheur: [
    { title: 'Maladie longue durée', text: 'Hospitalisation : frais et salaire amputé.',
      effects: [{ t: 'money', v: -600 }, { t: 'salaryPct', p: -0.20 }] },
    { title: 'Licenciement', text: 'Votre poste est supprimé.',
      effects: [{ t: 'loseJob' }] },
    { title: 'Loyer en hausse', text: 'Votre propriétaire augmente le loyer de 10 %.',
      effects: [{ t: 'rentPct', p: 0.10 }] },
    { title: 'Panne de voiture', text: 'Réparation obligatoire.',
      effects: [{ t: 'money', v: -300 }] },
    { title: 'Divorce', text: 'Séparation : frais immédiats et foyer réduit.',
      effects: [{ t: 'money', v: -800 }, { t: 'divorce' }] },
    { title: 'Arrestation', text: 'Ennuis avec la justice : allez en prison.',
      effects: [{ t: 'jail' }] },
    { title: 'Inspection anti-fraude', text: 'Régularisation forcée.',
      effects: [{ t: 'money', v: -400 }] },
    { title: 'Dépense urgente', text: 'Chaudière et toiture en même temps.',
      effects: [{ t: 'money', v: -250 }] },
    { title: 'Délocalisation', text: 'Votre entreprise délocalise : vous perdez votre emploi.',
      effects: [{ t: 'loseJob' }, { t: 'money', v: -200 }] },
    { title: 'Obsèques d\'un proche', text: 'Frais de famille imprévus.',
      effects: [{ t: 'money', v: -500 }] },
    { title: 'Facture d\'énergie salée', text: 'Le compteur s\'emballe.',
      effects: [{ t: 'money', v: -200, energyScaled: true }] },
    { title: 'Vol', text: 'On vous vole vélo et téléphone.',
      effects: [{ t: 'money', v: -150 }] }
  ],

  commu: [
    { title: 'Sécheresse', text: 'Les prix alimentaires flambent : chacun paie selon son foyer. Les propriétaires d\'AgroFrais en profitent.',
      collective: true, effects: [{ t: 'foodCrisis', v: 60 }] },
    { title: 'Crise énergétique', text: 'Les prix de l\'énergie explosent : les ménages modestes souffrent, ÉnergieWatt s\'enrichit.',
      collective: true, effects: [{ t: 'energyCrisis', v: 100 }] },
    { title: 'Hausse des taux', text: 'La banque centrale relève les taux : les crédits renchérissent.',
      collective: true, effects: [{ t: 'ratesDelta', d: 0.010 }] },
    { title: 'Crise immobilière', text: 'Chaque bien immobilier perd 15 % de sa valeur.',
      collective: true, effects: [{ t: 'propValuePct', p: -0.15, scope: 'all' }] },
    { title: 'Instabilité politique', text: 'Grèves et incertitudes : tout le monde puise dans son portefeuille.',
      collective: true, effects: [{ t: 'allMoney', v: -100 }] },
    { title: 'Hausse du chômage', text: 'Un salarié au hasard perd son emploi.',
      collective: true, effects: [{ t: 'randomJobLoss' }] },
    { title: 'Grève des transports', text: 'Impossible de se déplacer : manque à gagner pour tous.',
      collective: true, effects: [{ t: 'allMoney', v: -60 }] },
    { title: 'Récolte exceptionnelle', text: 'Les agriculteurs s\'enrichissent, les paniers sont moins chers.',
      collective: true, effects: [{ t: 'foodCrisis', v: -40 }] },
    { title: 'Baisse des taux', text: 'Le crédit devient moins cher.',
      collective: true, effects: [{ t: 'ratesDelta', d: -0.005 }] },
    { title: 'Embellie économique', text: 'Croissance ! Une manne pour tous.',
      collective: true, effects: [{ t: 'allMoney', v: 200 }] },
    { title: 'Fonds de solidarité', text: 'Les plus fortunés abondent un fonds pour les plus précaires.',
      collective: true, effects: [{ t: 'solidarity', v: 300 }] },
    { title: 'Flambée des prix de l\'énergie', text: 'Même événement, destins différents : regardez l\'impact sur chacun.',
      collective: true, effects: [{ t: 'energyCrisis', v: 80 }] }
  ]
};
