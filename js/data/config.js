// ============================================================
// MéritoPoly — Paramètres économiques (placeholders modifiables)
// Toutes les valeurs sont en € fictifs, un "an" = un tour du plateau.
// ============================================================

const CONFIG = {
  years: 10,                  // durée de partie : 10 ans (1 an = 1 tour du plateau)
  startMoney: 0,              // l'argent de départ vient du personnage
  passingGo: 200,             // salaire en passant par la case Départ
  jailFine: 50,
  maxHouses: 5,               // 5 = hôtel
  loanDuration: 10,           // ans
  povertyLine: 1000,          // € / unité de consommation / an
  precarityHousingRatio: 0.40 // effort de logement considéré précaire
};

// Paramètres modifiables par les lois votées (clonés au démarrage)
const PARAMS = {
  // Barème progressif sur les revenus du travail (par an)
  incomeTax: [
    { upTo: 1200, rate: 0.00 },
    { upTo: 2500, rate: 0.05 },
    { upTo: 5000, rate: 0.14 },
    { upTo: Infinity, rate: 0.30 }
  ],
  cotisations: 0.22,        // cotisations sociales sur salaires
  capitalTax: 0.15,         // flat tax sur revenus du capital
  wealthTax: 0.005,         // impôt sur la fortune
  wealthThreshold: 100000,
  familyAllowance: 120,     // par enfant et par an
  housingBenefitMax: 200,   // aide au logement max / an
  minimumIncome: 900,       // € / unité de consommation / an (complément automatique)
  healthReimb: 0.70,        // remboursement santé
  educationReimb: 0.30,     // remboursement éducation / garde
  transportReimb: 0.00,     // remboursement transport
  successions: 0.20,        // droits de succession
  rentIndex: 1.00,          // multiplicateur des loyers privés
  consumptionVAT: 0.00,     // taxe sur la consommation (finance les prestations)
  salaryFloorBoost: 1.00,   // multiplicateur des petits salaires
  capitalBoost: 1.00,       // multiplicateur des revenus du capital
  loanRate: 0.010,          // taux d'emprunt par an
  energyPrice: 1.00,        // multiplicateur des dépenses d'énergie
  pensionBoost: 1.00
};

// Couleurs des pions joueurs
const PAWN_COLORS = ['#c8392f', '#2b5fb8', '#1f7a4d', '#e8862d', '#8e44ad', '#b8860b'];

// Barème Progressif : impôt sur un revenu (par an)
function progressiveTax(income, brackets) {
  let tax = 0, prev = 0;
  for (const b of brackets) {
    if (income > prev) {
      tax += (Math.min(income, b.upTo) - prev) * b.rate;
      prev = b.upTo;
    } else break;
  }
  return Math.round(tax);
}

// Unités de consommation (échelle OCDE simplifiée)
function ucOf(p) {
  return 1 + 0.5 * (p.adults - 1) + 0.3 * p.children;
}
