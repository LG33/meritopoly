// ============================================================
// MéritoPoly — Cartes LOI (placeholders modifiables)
// Chaque loi modifie les PARAMS pour les tours suivants.
// apply : 'params' (modifie les paramètres) ou 'once' (effet immédiat répété)
// ============================================================

const LAWS = [
  { id: 'progressivite', title: 'Progressivité accrue', text: '+5 points d\'impôt sur les hauts revenus (au-delà de 2 500 €).',
    apply: 'params', fn: P => { P.incomeTax[2].rate += 0.05; P.incomeTax[3].rate += 0.05; } },
  { id: 'transports', title: 'Gratuité des transports', text: 'Les transports sont remboursés à 100 % (financé par +2 points de consommation).',
    apply: 'params', fn: P => { P.transportReimb = 1; P.consumptionVAT += 0.02; } },
  { id: 'allocations', title: 'Allocations familiales +50 %', text: 'Les allocations par enfant augmentent de moitié.',
    apply: 'params', fn: P => { P.familyAllowance = Math.round(P.familyAllowance * 1.5); } },
  { id: 'secu', title: '100 % Sécu', text: 'La santé est remboursée à 100 % (cotisations salariales +2 points).',
    apply: 'params', fn: P => { P.healthReimb = 1; P.cotisations += 0.02; } },
  { id: 'patrimoine', title: 'Taxation du patrimoine', text: 'Impôt sur la fortune : 1 % au-delà de 50 000 €.',
    apply: 'params', fn: P => { P.wealthTax = 0.01; P.wealthThreshold = 50000; } },
  { id: 'revenubase', title: 'Revenu de base', text: 'Le revenu minimum garanti augmente de 200 € par unité de consommation.',
    apply: 'params', fn: P => { P.minimumIncome += 200; } },
  { id: 'tva', title: 'TVA sociale', text: '+10 % sur toutes les consommations, allocations familiales +60 €.',
    apply: 'params', fn: P => { P.consumptionVAT += 0.10; P.familyAllowance += 60; } },
  { id: 'baisseimpots', title: 'Baisse des impôts', text: '-3 points sur tous les barèmes, -5 points sur le capital. Favorise les hauts revenus.',
    apply: 'params', fn: P => { P.incomeTax.forEach(b => b.rate = Math.max(0, b.rate - 0.03)); P.capitalTax = Math.max(0, P.capitalTax - 0.05); } },
  { id: 'loyers', title: 'Encadrement des loyers', text: 'Les loyers privés baissent de 10 %.',
    apply: 'params', fn: P => { P.rentIndex = Math.max(0.5, P.rentIndex - 0.10); } },
  { id: 'smic', title: 'Salaire minimum revalorisé', text: 'Les salaires inférieurs à 2 200 € augmentent de 10 % (immédiat).',
    apply: 'once', fn: (P, players) => { players.forEach(p => { if (p.employed && p.salary < 2200 && !p.retired) p.salary = Math.round(p.salary * 1.1); }); } },
  { id: 'capitaux', title: 'Faveurs aux capitaux', text: '-10 points de taxe sur le capital, +10 % de dividendes. Favorise les rentiers.',
    apply: 'params', fn: P => { P.capitalTax = Math.max(0, P.capitalTax - 0.10); P.capitalBoost *= 1.10; } },
  { id: 'succession', title: 'Successions renforcées', text: '+15 points de droits de succession : l\'héritage est plus taxé.',
    apply: 'params', fn: P => { P.successions = Math.min(0.6, P.successions + 0.15); } },
  { id: 'logement', title: 'Aide au logement renforcée', text: 'L\'aide personnalisée au logement augmente de 150 €.',
    apply: 'params', fn: P => { P.housingBenefitMax += 150; } },
  { id: 'priveSante', title: 'Concurrence sur la santé', text: 'Remboursement santé -20 points, dividendes +5 %. Favorise les cliniques privées.',
    apply: 'params', fn: P => { P.healthReimb = Math.max(0, P.healthReimb - 0.20); P.capitalBoost *= 1.05; } },
  { id: 'energie', title: 'Énergie bonifiée', text: 'Les prix de l\'énergie baissent de 20 % (taxe capital +3 points).',
    apply: 'params', fn: P => { P.energyPrice = Math.max(0.4, P.energyPrice - 0.2); P.capitalTax += 0.03; } },
  { id: 'retraites', title: 'Retraites revalorisées', text: 'Les pensions augmentent de 10 % (immédiat).',
    apply: 'once', fn: (P, players) => { players.forEach(p => { if (p.retired) p.salary = Math.round(p.salary * 1.1); }); } }
];
