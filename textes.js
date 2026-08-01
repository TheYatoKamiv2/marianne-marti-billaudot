/**
 * Les textes du site. C'est le seul fichier à modifier pour changer la
 * biographie, l'adresse e-mail ou les liens.
 * Les œuvres, elles, viennent du classeur Excel via outils/ingest.mjs.
 *
 * ┌──────────────────────────────────────────────────────────────────┐
 * │  À FAIRE AVANT LA MISE EN LIGNE                                  │
 * │  Remplacer « email » ci-dessous par la vraie adresse.            │
 * │  Tant que ce n'est pas fait, le site affiche une adresse fausse. │
 * └──────────────────────────────────────────────────────────────────┘
 *
 * Les paragraphes de biographie et les repères ne contiennent que des
 * informations vérifiables dans le classeur : dates, techniques, nombres
 * d'œuvres et noms d'expositions tels qu'ils figurent dans les titres de
 * collections. Rien n'y est supposé. À remplacer, bien sûr, par le texte
 * de l'artiste si elle en a un.
 */
const TEXTES = {
  nom: 'Marianne Marti-Billaudot',
  role: 'Peinture, dessin et photographie',
  lieu: 'France',

  /* Titre d'accueil. Choix de formulation — les trois motifs cités
     reviennent dans les titres de collections (Herbes, Près d'herbes,
     Ronds d'herbes, Près du jardin, Grand bouquet, Ronds bouquets…). */
  heroLigne1: 'Herbes, prés,',
  heroLigne2: 'bouquets.',
  accroche:
    '236 œuvres réunies en 39 collections, de 1993 à 2024 — huile sur toile, tondeau de broderie, dessin, aquarelle et photographie.',

  bio1:
    'Marianne Marti-Billaudot est diplômée des Beaux-Arts de Paris en décembre 1995. Les œuvres rassemblées ici couvrent trente ans, de 1993 à 2024 : 236 pièces réparties en 39 collections. L’huile sur toile domine — 76 œuvres — devant l’huile sur tondeau de broderie, qui en compte 30.',
  bio2:
    'Le reste du travail passe par le dessin à la mine de plomb, l’aquarelle sur papier lavis, le collage et la photographie : argentique noir et blanc au début, puis couleur marouflée sur plaque d’aluminium. Les titres des collections gardent la trace des lieux où elles ont été montrées — le salon de la Jeune Peinture, la villa Steinbach et le Crac Alsace en 1999, la MAPRA à Lyon en 2002, le 5e Art en 2006.',

  // À COMPLÉTER — adresse réelle, obligatoire avant la mise en ligne
  email: 'adresse-a-completer@exemple.fr',
  liens: [
    // { libelle: 'Instagram', url: 'https://instagram.com/…' },
  ],
};
