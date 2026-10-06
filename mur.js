/**
 * Le mur : une longue cimaise horizontale.
 *
 * On y voit d'abord les pages de garde des collections. Un clic déplie
 * la collection choisie sur place, et le mur glisse pour l'amener à
 * hauteur de regard.
 *
 * Aucune dépendance, aucune compilation : du HTML fabriqué à la main et
 * une boucle d'animation. Le contenu vient de data.js (produit par
 * outils/ingest.mjs), les textes de textes.js.
 */
'use strict';

const textes = TEXTES; // textes.js
const donnees = DONNEES; // data.js
const collections = donnees.collections;

/* Les œuvres sont toujours accrochées à leur taille réelle, page de garde
   comprise : la hauteur affichée est proportionnelle à la hauteur en
   centimètres notée dans le classeur (le diamètre, pour un tondeau). L'échelle elle-même — combien de pixels
   valent un centimètre — est dans style.css, variable --cm.
   19 œuvres sur 236 n'ont aucune dimension au classeur ; faute de mieux,
   on leur en donne une, honnête et moyenne. */
const HAUTEUR_INCONNUE = 60;

const vignette = (id) => `tableaux/${id}-md.webp`;
const grande = (id) => `tableaux/${id}-lg.webp`;
const pluriel = (n, mot) => `${n} ${mot}${n > 1 ? 's' : ''}`;

// ── fabrique d'éléments ───────────────────────────────────────────────
function e(balise, attributs = {}, ...enfants) {
  const el = document.createElement(balise);
  for (const [cle, valeur] of Object.entries(attributs)) {
    if (valeur == null || valeur === false) continue;
    if (cle === 'class') el.className = valeur;
    else if (cle === 'texte') el.textContent = valeur;
    else if (cle === 'html') el.innerHTML = valeur;
    else if (cle === 'style') Object.assign(el.style, valeur);
    else if (cle === 'css') for (const [p, v] of Object.entries(valeur)) el.style.setProperty(p, v);
    else if (cle.startsWith('on')) el.addEventListener(cle.slice(2), valeur);
    else el.setAttribute(cle, valeur);
  }
  for (const enfant of enfants.flat()) {
    if (enfant == null || enfant === false) continue;
    el.append(enfant);
  }
  return el;
}

// ══ état ════════════════════════════════════════════════════════════
let ouverte = null; // id de la collection dépliée
let fiche = null; // { collection, rang }
const position = { courant: 0, cible: 0, max: 0 };

const racine = document.getElementById('site');
const bloque = () => Boolean(fiche || document.querySelector('.sommaire'));

// ══ le mur ══════════════════════════════════════════════════════════
const rail = e('div', { class: 'rail' });
const scene = e('div', { class: 'scene' }, rail);

const salle = e('div', { class: 'mono salle', texte: 'Entrée' });

racine.append(
  enTete(),
  scene,
  e('div', { class: 'pied' }, salle)
);

function enTete() {
  return e(
    'header',
    { class: 'entete' },
    e('button', { class: 'signature', texte: textes.nom, onclick: () => viser(0) }),
    e(
      'div',
      { style: { display: 'flex', alignItems: 'center', gap: '18px' } },
      e('span', { class: 'mono astuce', html: 'glisser <span class="indice">→</span>' }),
      e('button', { class: 'mono bouton-fin', texte: 'Sommaire', onclick: ouvrirSommaire }),
      e('button', { class: 'mono bouton-fin', texte: 'Contact', onclick: () => viser(position.max) })
    )
  );
}

// ── contenu du rail ───────────────────────────────────────────────────
rail.append(panneauTitre());

for (const collection of collections) {
  const contenu = e('div', { class: 'contenu' });
  const section = e(
    'section',
    { class: 'collection', 'data-col': collection.id },
    cartel(collection),
    contenu
  );
  collection._contenu = contenu;
  collection._section = section;
  rail.append(section);
  contenu.append(...contenuDe(collection, false)); // repliée au départ
}

rail.append(panneauBiographie(), panneauContact());

/* Garde-fou : l'adresse de contact doit être remplacée avant la mise en
   ligne (voir textes.js). */
if (/exemple\.fr|example\.com/.test(textes.email)) {
  console.warn(
    'Site — l’adresse e-mail de contact est encore un texte de remplacement (' +
      textes.email +
      '). À corriger dans textes.js avant la mise en ligne.'
  );
}

function panneauTitre() {
  return e(
    'section',
    { class: 'panneau', 'data-salle': 'Entrée' },
    e('div', { class: 'mono sur-titre', texte: `${textes.role} · ${textes.lieu}` }),
    e('h1', { class: 'serif', html: `${textes.heroLigne1} <em>${textes.heroLigne2}</em>` }),
    e('p', { texte: textes.accroche, style: { margin: '30px 0 0' } }),
    e('div', {
      class: 'mono',
      style: { marginTop: '36px', opacity: '.6' },
      html: `<span class="filet"></span>${donnees.nombreOeuvres} œuvres · ${donnees.nombreCollections} collections · 1993 – 2024`,
    })
  );
}

function panneauBiographie() {
  return e(
    'section',
    { class: 'biographie', 'data-salle': 'Le parcours' },
    e(
      'figure',
      { class: 'portrait' },
      e('img', {
        src: 'portrait.webp',
        alt: `${textes.nom}, portrait`,
        loading: 'lazy',
        decoding: 'async',
      })
    ),
    e(
      'div',
      { class: 'panneau' },
      e('div', { class: 'mono sur-titre', texte: 'Le parcours' }),
      e('h2', { class: 'serif', texte: textes.nom }),
      // sur deux colonnes : le texte est long, le mur n'est pas haut
      e(
        'div',
        { class: 'bio' },
        textes.bio.map((paragraphe) => e('p', { texte: paragraphe }))
      )
    )
  );
}

function panneauContact() {
  const champ = (nom, attrs) => e('input', { class: 'champ', name: nom, required: '', ...attrs });

  const formulaire = e(
    'form',
    {
      class: 'formulaire',
      onsubmit: (ev) => {
        ev.preventDefault();
        // Site statique, donc pas de serveur : on prépare le message
        // dans le logiciel de courrier du visiteur.
        const d = new FormData(ev.target);
        const corps = `${d.get('message')}\n\n— ${d.get('nom')} (${d.get('email')})`;
        location.href =
          `mailto:${textes.email}` +
          `?subject=${encodeURIComponent('Site — ' + d.get('nom'))}` +
          `&body=${encodeURIComponent(corps)}`;
        formulaire.replaceWith(
          e('p', {
            class: 'serif',
            style: { fontStyle: 'italic', fontSize: '30px', color: 'var(--accent)' },
            texte: 'Votre logiciel de courrier s’ouvre. Merci !',
          })
        );
      },
    },
    champ('nom', { placeholder: 'Votre nom' }),
    champ('email', { type: 'email', placeholder: 'Votre e-mail' }),
    e('textarea', {
      class: 'champ pleine',
      name: 'message',
      required: '',
      rows: '2',
      placeholder: 'Votre message…',
      style: { resize: 'vertical' },
    }),
    e(
      'div',
      {
        class: 'pleine',
        style: { display: 'flex', alignItems: 'center', gap: '24px', marginTop: '8px', flexWrap: 'wrap' },
      },
      e('button', { class: 'mono envoyer', type: 'submit', texte: 'Envoyer →' }),
      e('a', { class: 'lien-mail', href: `mailto:${textes.email}`, texte: textes.email })
    )
  );

  return e(
    'section',
    { class: 'panneau', 'data-salle': 'Contact', style: { width: 'min(62vw, 780px)' } },
    e('div', { class: 'mono sur-titre', texte: 'Fin du mur · Contact' }),
    e('h2', { class: 'serif', html: 'Une œuvre, une <em>question</em>.' }),
    e('p', {
      texte:
        'Disponibilités, dimensions exactes, expositions ou commande : écrivez, je réponds moi-même.',
      style: { margin: '0 0 28px' },
    }),
    formulaire,
    e(
      'div',
      { class: 'mono pied-liens' },
      textes.liens.map((l) => e('a', { href: l.url, texte: `${l.libelle} ↗` })),
      e('span', { texte: `© ${new Date().getFullYear()} ${textes.nom}` })
    )
  );
}

function cartel(collection) {
  const action = e('div', { class: 'mono action' }, e('span', { class: 'chevron', texte: '›' }), 'Déplier la collection');
  collection._action = action;
  return e(
    'button',
    { class: 'cartel', 'data-salle': collection.titre, onclick: () => basculer(collection) },
    e('div', { class: 'numero', texte: collection.rang }),
    e('div', { class: 'titre', texte: collection.titre }),
    e('div', {
      class: 'mono meta',
      texte: `${collection.periode} · ${pluriel(collection.nombre, 'œuvre')}`,
    }),
    e('hr'),
    e('p', { class: 'technique', texte: collection.technique }),
    action
  );
}

/** Page de garde : l'aperçu d'une collection repliée. */
function garde(collection) {
  const premiere = collection.oeuvres[0];
  return e(
    'figure',
    { class: 'oeuvre', css: { '--hauteur': String(premiere.hauteurCm ?? HAUTEUR_INCONNUE) } },
    e(
      'button',
      {
        class: 'declencheur',
        'aria-label': `Déplier ${collection.titre}`,
        onclick: () => basculer(collection),
      },
      e('div', { class: 'encadre' }, image(premiere, `${collection.titre} — page de garde`))
    ),
    e(
      'figcaption',
      {},
      e('div', {
        class: 'mono detail',
        texte: `${pluriel(collection.nombre, 'œuvre')} · déplier`,
      })
    )
  );
}

/** Une œuvre accrochée. */
function oeuvre(collection, rang) {
  const o = collection.oeuvres[rang];
  return e(
    'figure',
    {
      class: 'oeuvre',
      css: {
        '--hauteur': String(o.hauteurCm ?? HAUTEUR_INCONNUE),
        '--retard': `${Math.min(rang, 12) * 0.045}s`,
      },
      title: o.dimensions ?? 'Dimensions non communiquées',
    },
    e(
      'button',
      {
        class: 'declencheur',
        'aria-label': `Agrandir ${o.id} — ${o.technique}, ${o.annee}`,
        onclick: () => ouvrirFiche(collection, rang),
      },
      e('div', { class: 'encadre' }, image(o, `${o.technique}, ${o.annee}`))
    ),
    e(
      'figcaption',
      {},
      e('div', {
        class: 'mono detail',
        texte: `${o.dimensions ? o.dimensions + ' · ' : ''}${o.annee}`,
      }),
      o.vendue && e('div', { class: 'mono vendu', texte: 'Vendue' })
    )
  );
}

function image(o, alt) {
  const img = e('img', {
    src: vignette(o.id),
    alt,
    loading: 'lazy',
    decoding: 'async',
    style: { aspectRatio: String(o.rapport) },
  });
  if (o.flou) img.style.backgroundImage = `url(${o.flou})`;

  /* L'œuvre se révèle en fondu une fois chargée. La vignette floue reste
     derrière le temps du fondu, puis s'efface : sinon elle
     transparaîtrait derrière un scan détouré. */
  const revele = () => {
    img.classList.add('chargee');
    if (o.flou) setTimeout(() => (img.style.backgroundImage = ''), 600);
  };
  if (img.complete && img.naturalWidth) revele();
  else {
    img.addEventListener('load', revele, { once: true });
    img.addEventListener('error', revele, { once: true }); // ne jamais rester invisible
  }
  return img;
}

// ── déplier / replier ────────────────────────────────────────────────
const DUREE_PLI = 550; // doit correspondre à la transition de .contenu.plie
const DUREE_FONDU = 220;
const sansAnimation = matchMedia('(prefers-reduced-motion: reduce)').matches;
const patienter = (ms) => new Promise((r) => setTimeout(r, sansAnimation ? 0 : ms));

/* Déclarée en `function` et non en `const` : elle sert dès la
   construction du mur, plus haut dans le fichier. */
function contenuDe(collection, ouvert) {
  return ouvert
    ? collection.oeuvres.map((_, rang) => oeuvre(collection, rang))
    : [garde(collection)];
}

function marquerOuverte(collection, ouvert) {
  collection._section.classList.toggle('ouverte', ouvert);
  collection._action.lastChild.textContent = ouvert ? 'Replier' : 'Déplier la collection';
}

/**
 * Déplie ou replie sur place, en animant la largeur : les œuvres
 * sortent du cartel, ou y rentrent. Le regard n'est pas déplacé.
 */
async function plier(collection, ouvrir) {
  const boite = collection._contenu;
  if (boite._enCours) return;
  boite._enCours = true;

  const avant = boite.offsetWidth;

  // en repliant, les œuvres s'effacent d'abord, puis la place se referme
  if (!ouvrir) {
    boite.classList.add('efface');
    await patienter(DUREE_FONDU);
  }

  boite.style.width = 'auto';
  boite.replaceChildren(...contenuDe(collection, ouvrir));
  boite.classList.remove('efface');
  marquerOuverte(collection, ouvrir);
  const apres = boite.offsetWidth;

  // largeur de départ, puis largeur d'arrivée : la transition fait le reste
  boite.classList.add('plie');
  boite.style.width = `${avant}px`;
  void boite.offsetWidth; // force le calcul, sinon les deux valeurs fusionnent
  boite.style.width = `${apres}px`;

  await patienter(DUREE_PLI);
  boite.style.width = '';
  boite.classList.remove('plie');
  boite._enCours = false;
  surDefilement();
}

/**
 * Referme une collection sans rien animer, en compensant le défilement
 * si elle se trouve à gauche de ce que l'on regarde — sinon tout le mur
 * glisserait sous les yeux du visiteur.
 */
function replierSansBouger(collection) {
  const boite = collection._contenu;
  const avant = boite.offsetWidth;
  const debut = collection._section.offsetLeft;

  boite.replaceChildren(...contenuDe(collection, false));
  marquerOuverte(collection, false);

  const delta = boite.offsetWidth - avant;
  if (delta && debut < scene.scrollLeft) scene.scrollLeft += delta;
}

function basculer(collection) {
  if (scene.dataset.glisse) return; // simple fin de glissement
  const ouvrir = ouverte !== collection.id;

  // l'autre collection ouverte se referme discrètement, sans déplacer la vue
  const precedente = collections.find((c) => c.id === ouverte && c !== collection);
  if (precedente) replierSansBouger(precedente);

  ouverte = ouvrir ? collection.id : null;
  plier(collection, ouvrir);
  majAdresse();
}

/** Changement d'état sans animation : sommaire et liens profonds, qui
    déplacent volontairement le regard juste après. */
function appliquerOuverte(id) {
  if (ouverte === id) return;
  const precedente = collections.find((c) => c.id === ouverte);
  if (precedente) {
    precedente._contenu.replaceChildren(...contenuDe(precedente, false));
    marquerOuverte(precedente, false);
  }
  ouverte = id;
  const suivante = collections.find((c) => c.id === id);
  if (suivante) {
    suivante._contenu.replaceChildren(...contenuDe(suivante, true));
    marquerOuverte(suivante, true);
  }
}

/** Amène une collection près du bord gauche de l'écran. */
function cadrer(collection) {
  mesurer();
  viser(collection._section.offsetLeft - window.innerWidth * 0.07);
}

// ══ défilement ══════════════════════════════════════════════════════
/* La scène est une vraie zone de défilement horizontale : la barre de
   défilement du navigateur est donc celle du mur, et le clavier, le
   trackpad et le tactile fonctionnent sans qu'on s'en occupe. */
function mesurer() {
  position.max = Math.max(0, scene.scrollWidth - scene.clientWidth);
}

/** Va à la position demandée. `doux` : glissé, sinon immédiat. */
function viser(x, doux = true) {
  mesurer();
  scene.scrollTo({
    left: Math.max(0, Math.min(position.max, x)),
    behavior: doux ? 'smooth' : 'auto',
  });
}

let derniereSalle = '';
function majSalle() {
  // Le regard se pose au premier tiers, pas au milieu : sur une cimaise
  // horizontale, c'est la section qui vient d'arriver qui compte.
  const repere = window.innerWidth * 0.33;
  let meilleure = null;
  let ecart = Infinity;
  for (const el of rail.querySelectorAll('[data-salle]')) {
    const r = el.getBoundingClientRect();
    if (r.right < 0 || r.left > window.innerWidth) continue;
    const d = Math.abs(r.left + r.width / 2 - repere);
    if (d < ecart) {
      ecart = d;
      meilleure = el.dataset.salle;
    }
  }
  if (meilleure && meilleure !== derniereSalle) {
    derniereSalle = meilleure;
    salle.textContent = meilleure;
  }
}

/* Repère du bas : la salle courante, mise à jour au fil du défilement. */
let repeindre = false;
function surDefilement() {
  if (repeindre) return;
  repeindre = true;
  requestAnimationFrame(() => {
    repeindre = false;
    mesurer();
    majSalle();
  });
}
scene.addEventListener('scroll', surDefilement, { passive: true });

/* La molette verticale fait avancer le mur horizontalement. */
scene.addEventListener(
  'wheel',
  (ev) => {
    if (bloque()) return;
    const d = Math.abs(ev.deltaY) > Math.abs(ev.deltaX) ? ev.deltaY : ev.deltaX;
    if (!d) return;
    ev.preventDefault();
    scene.scrollLeft += d * 1.15;
  },
  { passive: false }
);

let tire = false;
let departX = 0;
let departPos = 0;
let parcouru = 0;

scene.addEventListener('pointerdown', (ev) => {
  // Au doigt, le navigateur fait déjà défiler : on ne s'en mêle pas.
  if (bloque() || ev.button === 2 || ev.pointerType === 'touch') return;
  tire = true;
  parcouru = 0;
  departX = ev.clientX;
  departPos = scene.scrollLeft;
  scene.classList.add('tire');
});
addEventListener(
  'pointermove',
  (ev) => {
    if (!tire) return;
    const dx = ev.clientX - departX;
    parcouru = Math.max(parcouru, Math.abs(dx));
    scene.scrollLeft = departPos - dx;
  },
  { passive: true }
);
const relacher = () => {
  if (!tire) return;
  tire = false;
  scene.classList.remove('tire');
  // un vrai glissement ne doit pas valider le clic qui le termine
  if (parcouru > 6) {
    scene.dataset.glisse = '1';
    setTimeout(() => delete scene.dataset.glisse, 0);
  }
};
addEventListener('pointerup', relacher);
addEventListener('pointercancel', relacher);

addEventListener('keydown', (ev) => {
  if (fiche || document.querySelector('.sommaire')) return; // ces vues gèrent leurs touches
  const pas = ev.shiftKey ? 1400 : 460;
  if (ev.key === 'ArrowRight') viser(scene.scrollLeft + pas);
  else if (ev.key === 'ArrowLeft') viser(scene.scrollLeft - pas);
  else if (ev.key === 'Home') viser(0);
  else if (ev.key === 'End') viser(position.max);
  else if (ev.key === 'Escape' && ouverte) {
    // même repli animé que par le cartel, sans déplacer le regard
    const courante = collections.find((c) => c.id === ouverte);
    ouverte = null;
    plier(courante, false);
    majAdresse();
  } else return;
  ev.preventDefault();
});

addEventListener('resize', mesurer);

// ══ fiche œuvre ═════════════════════════════════════════════════════
function ouvrirFiche(collection, rang) {
  if (scene.dataset.glisse) return;
  fiche = { collection, rang };
  dessinerFiche();
  majAdresse();
}

function fermerFiche() {
  fiche = null;
  document.querySelector('.fiche')?.remove();
  majAdresse();
}

function deplacerFiche(pas) {
  if (!fiche) return;
  const n = fiche.rang + pas;
  if (n < 0 || n >= fiche.collection.oeuvres.length) return;
  fiche.rang = n;
  dessinerFiche();
  majAdresse();
}

function dessinerFiche() {
  const { collection, rang } = fiche;
  const o = collection.oeuvres[rang];
  let zoom = false;

  const img = e('img', { src: grande(o.id), alt: `${collection.titre} — ${o.technique}, ${o.annee}` });

  const cadre = e(
    'div',
    {
      class: 'fiche-image',
      onclick: (ev) => {
        ev.stopPropagation();
        zoom = !zoom;
        cadre.classList.toggle('zoome', zoom);
        img.style.transform = zoom ? 'scale(2.4)' : '';
      },
      onmousemove: (ev) => {
        if (!zoom) return;
        const r = cadre.getBoundingClientRect();
        img.style.transformOrigin = `${((ev.clientX - r.left) / r.width) * 100}% ${
          ((ev.clientY - r.top) / r.height) * 100
        }%`;
      },
    },
    img
  );

  const ligne = (etiquette, valeur, couleur) => [
    e('dt', { texte: etiquette }),
    e('dd', { texte: valeur, style: couleur ? { color: couleur } : {} }),
  ];

  const panneau = e(
    'div',
    { class: 'fiche-texte', onclick: (ev) => ev.stopPropagation() },
    e('div', {
      class: 'mono',
      style: { color: 'var(--accent)', marginBottom: '16px' },
      texte: `${collection.rang} · ${collection.titre}`,
    }),
    e('h3', { texte: o.annee }),
    e('p', { class: 'sous-titre', texte: o.technique }),
    e(
      'dl',
      { class: 'fiche-liste' },
      ligne('Référence', o.id),
      ligne('Dimensions', o.dimensions ?? 'Non communiquées'),
      ligne('Technique', o.technique),
      ligne('Statut', o.vendue ? 'Vendue' : 'Disponible', o.vendue ? 'rgba(242,236,224,.6)' : 'var(--accent)'),
      o.note ? ligne('Note', o.note) : []
    ),
    e(
      'div',
      { class: 'fiche-nav' },
      e('button', {
        class: 'mono',
        texte: '← Précédente',
        disabled: rang === 0,
        onclick: () => deplacerFiche(-1),
      }),
      e('button', {
        class: 'mono',
        texte: 'Suivante →',
        disabled: rang === collection.oeuvres.length - 1,
        onclick: () => deplacerFiche(1),
      }),
      e('span', {
        class: 'mono',
        style: { opacity: '.5' },
        texte: `${rang + 1} / ${collection.nombre}`,
      })
    ),
    e('p', {
      class: 'mono',
      style: { opacity: '.4', marginTop: '22px' },
      texte: 'Cliquer l’image pour zoomer',
    })
  );

  // À l'ouverture on crée la vue ; en passant d'une œuvre à l'autre on
  // remplace seulement son contenu, sinon le fondu se rejouerait à chaque
  // fois et donnerait un clignotement.
  const existante = document.querySelector('.fiche');
  if (existante) {
    existante.setAttribute('aria-label', `Œuvre ${o.id}`);
    existante.replaceChildren(boutonFermer(), cadre, panneau);
    return;
  }

  document.body.append(
    e(
      'div',
      {
        class: 'fiche',
        role: 'dialog',
        'aria-modal': 'true',
        'aria-label': `Œuvre ${o.id}`,
        onclick: fermerFiche,
      },
      boutonFermer(),
      cadre,
      panneau
    )
  );
}

function boutonFermer() {
  return e('button', { class: 'mono fermer', texte: 'Fermer ✕', onclick: fermerFiche });
}

// ══ sommaire ════════════════════════════════════════════════════════
function ouvrirSommaire() {
  if (document.querySelector('.sommaire')) return;

  const liste = e('ul', { class: 'sommaire-liste' });

  const remplir = (filtre = '') => {
    const q = filtre.trim().toLowerCase();
    const visibles = q
      ? collections.filter((c) => `${c.titre} ${c.technique} ${c.periode}`.toLowerCase().includes(q))
      : collections;

    liste.replaceChildren(
      ...(visibles.length
        ? visibles.map((c) =>
            e(
              'li',
              {},
              e(
                'button',
                {
                  onclick: () => {
                    fermerSommaire();
                    appliquerOuverte(c.id);
                    cadrer(c);
                    majAdresse();
                  },
                },
                e('span', {
                  class: 'serif',
                  texte: c.rang,
                  style: {
                    fontStyle: 'italic',
                    color: ouverte === c.id ? 'var(--accent)' : 'rgba(var(--encre-rgb),.4)',
                  },
                }),
                e(
                  'span',
                  {},
                  e('span', { class: 'nom', texte: c.titre }),
                  e('br'),
                  e('span', { class: 'mono', style: { opacity: '.5' }, texte: c.technique })
                ),
                e('span', {
                  class: 'mono an',
                  html: `${c.periode}<br>${pluriel(c.nombre, 'œuvre')}`,
                })
              )
            )
          )
        : [e('li', {}, e('p', { texte: 'Aucune collection ne correspond.', style: { opacity: '.5', padding: '18px 6px' } }))])
    );
  };
  remplir();

  const recherche = e('input', {
    class: 'champ',
    placeholder: 'Chercher une collection, une technique…',
    style: { marginTop: '24px' },
    oninput: (ev) => remplir(ev.target.value),
  });

  const vue = e(
    'div',
    { class: 'sommaire', onclick: fermerSommaire },
    e(
      'div',
      { class: 'sommaire-panneau', onclick: (ev) => ev.stopPropagation() },
      e(
        'div',
        { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' } },
        e(
          'div',
          {},
          e('h2', { texte: 'Sommaire' }),
          e('div', {
            class: 'mono',
            style: { opacity: '.55' },
            texte: `${donnees.nombreCollections} collections · ${donnees.nombreOeuvres} œuvres`,
          })
        ),
        e('button', { class: 'mono bouton-fin', texte: 'Fermer ✕', onclick: fermerSommaire })
      ),
      recherche,
      liste
    )
  );

  document.body.append(vue);
  recherche.focus();
}

function fermerSommaire() {
  document.querySelector('.sommaire')?.remove();
}

addEventListener(
  'keydown',
  (ev) => {
    if (ev.key !== 'Escape' && !fiche) return;
    if (document.querySelector('.sommaire') && ev.key === 'Escape') {
      ev.stopPropagation();
      fermerSommaire();
      return;
    }
    if (!fiche) return;
    if (ev.key === 'Escape') fermerFiche();
    else if (ev.key === 'ArrowRight') deplacerFiche(1);
    else if (ev.key === 'ArrowLeft') deplacerFiche(-1);
    else return;
    ev.stopPropagation();
    ev.preventDefault();
  },
  true // en capture, pour passer avant le défilement du mur
);

// ══ liens profonds ══════════════════════════════════════════════════
//   #/nom-de-collection        déplie la collection
//   #/nom-de-collection/26D    ouvre en plus la fiche de l'œuvre
function lireAdresse() {
  const [, idCollection, idOeuvre] = decodeURIComponent(location.hash.slice(1)).split('/');
  const collection = collections.find((c) => c.id === idCollection);

  if (!collection) {
    appliquerOuverte(null);
    if (fiche) fermerFiche();
    return;
  }
  appliquerOuverte(collection.id);
  cadrer(collection);

  const rang = idOeuvre ? collection.oeuvres.findIndex((o) => o.id === idOeuvre) : -1;
  if (rang >= 0) {
    fiche = { collection, rang };
    dessinerFiche();
  } else if (fiche) {
    fermerFiche();
  }
}

/* replaceState n'émet pas « hashchange » : pas de boucle avec lireAdresse,
   et l'historique reste propre. */
function majAdresse() {
  const cible = fiche
    ? `#/${fiche.collection.id}/${fiche.collection.oeuvres[fiche.rang].id}`
    : ouverte
      ? `#/${ouverte}`
      : '';
  if (location.hash === cible) return;
  history.replaceState(null, '', cible || location.pathname + location.search);
}

addEventListener('hashchange', lireAdresse);

// ══ départ ══════════════════════════════════════════════════════════
mesurer();
if (location.hash.startsWith('#/')) {
  lireAdresse();
  // arrivée par un lien : on saute le rideau d'entrée
  document.querySelector('.intro')?.classList.add('parti');
}
surDefilement();
setTimeout(mesurer, 500);
setTimeout(mesurer, 1600);
