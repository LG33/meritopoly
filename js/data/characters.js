// ============================================================
// MéritoPoly — Personnages (placeholders modifiables)
// origin : niveau de vie du milieu d'origine (€/UC/cycle) → ascenseur social
// ============================================================

const CHARACTERS = [
  {
    id: 'employe', name: 'Employé sous pression', age: 38,
    lieu: 'Appartement 3 pièces, quartier populaire',
    desc: 'Salarié du commerce, deux enfants, fin de mois difficile.',
    adults: 2, children: 2,
    salary: 1800, variable: false, retired: false, capitalIncome: 0,
    housing: { type: 'locataire', rent: 800, bail: 3 },
    loans: [], money: 400, assets: 0, origin: 1500, props: []
  },
  {
    id: 'cadre', name: 'Cadre endetté', age: 42,
    lieu: 'Maison en périphérie (encore à crédit)',
    desc: 'Cadre supérieur, bon salaire mais mensualités lourdes.',
    adults: 2, children: 1,
    salary: 3400, variable: false, retired: false, capitalIncome: 0,
    housing: { type: 'proprio', rent: 0 },
    loans: [{ label: 'Crédit immobilier maison', remaining: 60000, monthly: 700, rate: 0.008 }],
    money: 1500, assets: 60000, origin: 2600, props: []
  },
  {
    id: 'agriculteur', name: 'Agriculteur-commerçant', age: 50,
    lieu: 'Ferme familiale à la campagne',
    desc: 'Indépendant : revenus variables selon la météo et les marchés.',
    adults: 2, children: 1,
    salary: 1500, variable: true, retired: false, capitalIncome: 0,
    housing: { type: 'proprio', rent: 0 },
    loans: [{ label: 'Crédit matériel agricole', remaining: 8000, monthly: 250, rate: 0.008 }],
    money: 900, assets: 35000, origin: 1600, props: []
  },
  {
    id: 'retraitee', name: 'Retraitée', age: 74,
    lieu: 'Pavillon sans crédit, quartier calme',
    desc: 'Pension modeste, patrimoine confortable, santé fragile.',
    adults: 1, children: 0,
    salary: 1200, variable: false, retired: true, capitalIncome: 0,
    housing: { type: 'proprio', rent: 0 },
    loans: [], money: 4000, assets: 55000, origin: 1400, props: []
  },
  {
    id: 'heritier', name: 'Héritier rentier', age: 26,
    lieu: 'Appartement de standing en centre-ville (location)',
    desc: 'Ne travaille pas : vit de revenus du patrimoine hérité.',
    adults: 1, children: 0,
    salary: 0, variable: false, retired: false, capitalIncome: 700,
    housing: { type: 'locataire', rent: 900, bail: 3 },
    loans: [], money: 2000, assets: 80000, origin: 3000, props: []
  },
  {
    id: 'patron', name: 'Patronne fortunée', age: 55,
    lieu: 'Villa avec piscine',
    desc: 'Dirige une grande entreprise, revenus du travail ET du capital.',
    adults: 1, children: 0,
    salary: 8000, variable: false, retired: false, capitalIncome: 500,
    housing: { type: 'proprio', rent: 0 },
    loans: [], money: 5000, assets: 150000,
    origin: 2800,
    props: [{ tile: 39 }] // possède d'emblée TechCorp
  },
  {
    id: 'infirmiere', name: 'Infirmière en HLM', age: 34,
    lieu: 'Logement HLM, 2 pièces',
    desc: 'Mère solo, loyer modéré, métier utile mais sous-payé.',
    adults: 1, children: 1,
    salary: 2100, variable: false, retired: false, capitalIncome: 0,
    housing: { type: 'hlm', rent: 400 },
    loans: [], money: 700, assets: 0, origin: 1200, props: []
  },
  {
    id: 'intermittent', name: 'Intermittent précaire', age: 24,
    lieu: 'Chambre chez ses parents',
    desc: 'Petits boulots, revenus incertains, aucune épargne.',
    adults: 1, children: 0,
    salary: 900, variable: true, retired: false, capitalIncome: 0,
    housing: { type: 'locataire', rent: 200, bail: 99 },
    loans: [], money: 150, assets: 0, origin: 1100, props: []
  }
];
