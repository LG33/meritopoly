// ============================================================
// MéritoPoly — Plateau de 40 cases (noms et montants fictifs)
// type : start | prop | housing | chance | commu | malheur | bank |
//        gotojail | jail | empty
// Chaque propriété = une activité économique + une consommation ponctuelle.
//   price : prix d'achat · dividend : revenu automatique / cycle pour le propriétaire
//   service : {label, cat, price} consommation subie par celui qui tombe dessus
//   reimb : taux de remboursement de base (modifié par les lois)
//   public : service public (non achetable si true)
// ============================================================

const BOARD = [
  { type: 'start', name: 'Départ' },
  { type: 'housing', name: 'Lotissement Basique', group: 'log-basic', price: 1200, houseCost: 500,
    service: { label: 'Petits travaux domestiques', cat: 'équipement', price: 80 } },
  { type: 'commu', name: 'Caisse de communauté' },
  { type: 'prop', name: 'Marché Couvert', group: 'marron', price: 600, houseCost: 300, dividend: 40,
    service: { label: 'Courses alimentaires', cat: 'alimentation', price: 35 } },
  { type: 'malheur', name: 'Porte-malheur : Impôts', sub: 'contrôle fiscal' },
  { type: 'bank', name: 'Banque Centrale' },
  { type: 'prop', name: 'Boulangerie Moisson', group: 'bleu', price: 600, houseCost: 300, dividend: 40,
    service: { label: 'Pain et viennoiseries', cat: 'alimentation', price: 30 } },
  { type: 'chance', name: 'Chance' },
  { type: 'prop', name: 'Café des Amis', group: 'bleu', price: 700, houseCost: 300, dividend: 50,
    service: { label: 'Sortie au café', cat: 'loisir', price: 25 } },
  { type: 'prop', name: 'Librairie du Coin', group: 'bleu', price: 800, houseCost: 300, dividend: 60,
    service: { label: 'Achat de livres', cat: 'culture', price: 20 } },
  { type: 'jail', name: 'Prison / Simple visite' },
  { type: 'prop', name: 'Cabinet Médical', group: 'rose', price: 1000, houseCost: 400, dividend: 70,
    service: { label: 'Consultation médicale', cat: 'santé', price: 60, reimb: 0.70 } },
  { type: 'malheur', name: 'Porte-malheur : Électricité', sub: 'facture salée' },
  { type: 'housing', name: 'Immeuble Privé', group: 'log-prive', price: 2000, houseCost: 700,
    service: { label: 'Charges de copropriété', cat: 'équipement', price: 100 } },
  { type: 'prop', name: 'Pharmacie Centrale', group: 'rose', price: 1000, houseCost: 400, dividend: 70,
    service: { label: 'Médicaments', cat: 'santé', price: 40, reimb: 0.70 } },
  { type: 'bank', name: 'Banque Populaire' },
  { type: 'prop', name: 'École Privée Les Lauriers', group: 'orange', price: 1200, houseCost: 500, dividend: 90,
    service: { label: 'Scolarité privée', cat: 'éducation', price: 150, reimb: 0.30 } },
  { type: 'commu', name: 'Caisse de communauté' },
  { type: 'prop', name: 'Crèche Les Petits Pas', group: 'orange', price: 1200, houseCost: 500, dividend: 90,
    service: { label: 'Garde d\'enfants', cat: 'éducation', price: 200, reimb: 0.30 } },
  { type: 'prop', name: 'Salle de Sport FlexiGym', group: 'orange', price: 1100, houseCost: 500, dividend: 80,
    service: { label: 'Abonnement sportif', cat: 'sport', price: 35 } },
  { type: 'empty', name: 'Parc municipal' },
  { type: 'prop', name: 'Usine MétalPlus', group: 'rouge', price: 1400, houseCost: 600, dividend: 100,
    service: { label: 'Équipement domestique', cat: 'équipement', price: 120 } },
  { type: 'chance', name: 'Chance' },
  { type: 'prop', name: 'Chaîne QuickMeal', group: 'rouge', price: 1400, houseCost: 600, dividend: 100,
    service: { label: 'Repas rapide en famille', cat: 'alimentation', price: 45 } },
  { type: 'prop', name: 'Studio MédiaVision', group: 'rouge', price: 1500, houseCost: 600, dividend: 110,
    service: { label: 'Abonnement streaming', cat: 'loisir', price: 15 } },
  { type: 'bank', name: 'Banque du Nord' },
  { type: 'housing', name: 'Lotissement Luxe', group: 'log-luxe', price: 4000, houseCost: 1200,
    service: { label: 'Entretien de prestige', cat: 'équipement', price: 180 } },
  { type: 'prop', name: 'Réseau TransVille', group: 'jaune', price: 1600, houseCost: 700, dividend: 120,
    service: { label: 'Abonnement transport', cat: 'transport', price: 60, reimb: 0.20 } },
  { type: 'malheur', name: 'Porte-malheur : Eau', sub: 'compteur grippé' },
  { type: 'prop', name: 'Groupe ÉnergieWatt', group: 'jaune', price: 1600, houseCost: 700, dividend: 130,
    service: { label: 'Facture d\'énergie', cat: 'énergie', price: 90 } },
  { type: 'gotojail', name: 'Allez en prison' },
  { type: 'prop', name: 'Clinique SantéPlus', group: 'vert', price: 1800, houseCost: 800, dividend: 140,
    service: { label: 'Intervention médicale', cat: 'santé', price: 200, reimb: 0.70 } },
  { type: 'prop', name: 'Transport Express Voyages', group: 'vert', price: 1800, houseCost: 800, dividend: 140,
    service: { label: 'Voyage en train', cat: 'transport', price: 120, reimb: 0.20 } },
  { type: 'commu', name: 'Caisse de communauté' },
  { type: 'housing', name: 'Immeuble HLM', group: 'log-hlm', price: 1600, houseCost: 600, public: true,
    service: { label: 'Participation aux charges HLM', cat: 'équipement', price: 40 } },
  { type: 'bank', name: 'Banque du Sud' },
  { type: 'chance', name: 'Chance' },
  { type: 'prop', name: 'Industrie AgroFrais', group: 'bleuf', price: 1900, houseCost: 800, dividend: 150,
    service: { label: 'Panier de produits surgelés', cat: 'alimentation', price: 55 } },
  { type: 'malheur', name: 'Porte-malheur : Taxe de luxe', sub: 'enveloppes cachetées' },
  { type: 'prop', name: 'Grande Entreprise TechCorp', group: 'bleuf', price: 2000, houseCost: 800, dividend: 160,
    service: { label: 'Électroménager high-tech', cat: 'équipement', price: 250 } }
];

// Catégories de consommation → effet positif éventuel sur le personnage
const CATEGORY_EFFECTS = {
  'alimentation': 'Foyer bien nourri',
  'santé': 'Santé préservée',
  'éducation': 'Compétences accrues',
  'transport': 'Mobilité facilitée',
  'culture': 'Culture et bien-être',
  'loisir': 'Moral au beau fixe',
  'sport': 'Forme physique',
  'énergie': 'Confort du foyer',
  'équipement': 'Équipement du foyer'
};
