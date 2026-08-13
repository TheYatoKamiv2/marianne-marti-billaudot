/**
 * Les textes du site. C'est le seul fichier à modifier pour changer la
 * biographie, l'adresse e-mail ou les liens.
 * Les œuvres, elles, viennent du classeur Excel via outils/ingest.mjs.
 *
 * « email » est l'adresse à laquelle le formulaire de contact prépare
 * le message. Le site n'envoie rien lui-même : il ouvre le logiciel de
 * courrier du visiteur, message déjà rédigé (voir LISEZMOI).
 *
 * « bio » est le texte de l'artiste, à la première personne, tel qu'elle
 * l'a écrit. Une entrée du tableau = un paragraphe ; en ajouter ou en
 * retirer ne demande rien d'autre. Attention : chaque paragraphe tient
 * sur une seule ligne, entre apostrophes — un retour à la ligne au
 * milieu d'un texte empêcherait la page de s'afficher.
 */
const TEXTES = {
  nom: 'Marianne Marti-Billaudot',
  role: 'Peinture, dessin et photographie',
  lieu: 'Lyon',

  /* Titre d'accueil. Choix de formulation — les trois motifs cités
     reviennent dans les titres de collections (Herbes, Près d'herbes,
     Ronds d'herbes, Près du jardin, Grand bouquet, Ronds bouquets…). */
  heroLigne1: 'Herbes, prés,',
  heroLigne2: 'jardins.',
  accroche:
    '236 œuvres réunies en 39 collections, de 1993 à 2024 — huile sur toile, tondeau de broderie, dessin, aquarelle et photographie.',

  bio: [
    'Je suis artiste plasticienne, diplômée de l’École des Beaux-Arts de Paris depuis 1995. En 2003, j’ai ouvert mon atelier de peinture et de dessin dans le quartier de Trion, à Lyon, où je travaille et enseigne encore aujourd’hui.',
    'La transmission est au cœur de ma démarche artistique. J’accompagne des enfants et des adultes dans leur découverte et leur pratique du dessin et de la peinture, en proposant un enseignement adapté à chacun, quel que soit son niveau. Mon objectif est de développer la créativité, la sensibilité et la confiance de chacun à travers l’expression artistique.',
    'J’accompagne également les jeunes qui souhaitent intégrer une école d’art en les préparant aux concours d’entrée. Grâce à un suivi personnalisé, je les aide à construire leur dossier artistique, à affirmer leur démarche créative et à se préparer aux épreuves avec exigence et sérénité.',
    'J’interviens également en EHPAD, où j’anime des ateliers de dessin et de peinture. Ces moments de création sont pour moi l’occasion de favoriser les échanges, de stimuler l’imagination et d’offrir un espace d’expression et de plaisir partagé.',
    'À travers ce site, je vous invite à découvrir un aperçu de mon travail artistique, fruit de plus de trente années de création, de recherches et d’expérimentations. Chaque œuvre témoigne d’un parcours nourri par la passion de l’art et le désir de partager un regard sensible sur le monde.',
    'N’hésitez pas à me contacter pour toute demande d’information, pour découvrir mon atelier ou pour échanger autour de vos projets artistiques.',
  ],

  email: 'marti-billaudot@orange.fr',
  liens: [
    // { libelle: 'Instagram', url: 'https://instagram.com/…' },
  ],
};
