/**
 * Le seul outil du site.
 *
 *   node outils/ingest.mjs              tout : images (incrémental) + data.js
 *   node outils/ingest.mjs --donnees    seulement data.js (rapide)
 *   node outils/ingest.mjs --refaire    reconvertit toutes les images
 *
 * Il lit deux choses, à côté du dossier « site » :
 *   ../ORGANISATION SITE INTERNET.xlsx   le classeur
 *   ../tableaux/[N°COLLECTION][N°TABLEAU].png   les scans (ex. 4F.png)
 *
 * Il écrit deux choses, dans « site » :
 *   tableaux/4F-md.webp  (mur, ~1200 px)   tableaux/4F-lg.webp  (fiche, ~2200 px)
 *   data.js            tout le contenu du site
 *
 * Colonnes attendues dans la feuille :
 *   A N°COLLECTION (page de garde)   B NOM DE COLLECTION   C N°TABLEAU
 *   D DATE   E HAUTEUR   F LARGEUR   G DIAMETRE
 *   H TECHNIQUE   I VENDU   J AUTRE
 * Le nom de fichier d'une œuvre, c'est la colonne A suivie de la colonne C.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { basename, extname, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { unzipSync, strFromU8 } from 'fflate';
import sharp from 'sharp';

const SITE = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_SCANS = process.env.TABLEAUX_DIR ?? resolve(SITE, '..', 'tableaux');
const CLASSEUR = process.env.XLSX_PATH ?? resolve(SITE, '..', 'ORGANISATION SITE INTERNET.xlsx');
const DEST_IMAGES = resolve(SITE, 'tableaux');
const DEST_DONNEES = resolve(SITE, 'data.js');

const SEULEMENT_DONNEES = process.argv.includes('--donnees');
const REFAIRE = process.argv.includes('--refaire');

/* Portrait de l'artiste, affiché sur le panneau « Le parcours ».
   Il est recadré en 4/5 sur toute la largeur disponible ; CADRAGE règle
   la hauteur du cadrage — 0 tout en haut de la photo, 1 tout en bas.
   Monter la valeur si le visage est trop haut, la baisser sinon. */
const PORTRAIT = {
  source: process.env.PORTRAIT_PATH ?? resolve(SITE, '..', 'photo_profil.jpeg'),
  sortie: resolve(SITE, 'portrait.webp'),
  rapport: 0.8,
  cadrage: 0.6,
  largeur: 900,
  quality: 82,
};

/* Deux tailles suffisent : la vignette du mur et l'image de la fiche. */
const TAILLES = [
  { suffixe: 'md', max: 1200, quality: 78 },
  /* q74 plutôt que 82 : le total passe sous les 100 Mo que Vercel accepte
     depuis le CLI (offre Hobby), sans toucher à la résolution du zoom. */
  { suffixe: 'lg', max: 2200, quality: 74 },
];
const CONCURRENCE = 4;

/* Les scans sont des détourages : l'œuvre est posée sur du transparent,
   souvent au milieu d'une grande page vide. On enlève ces bords
   entièrement transparents, et rien d'autre — seuls les pixels dont
   l'alpha vaut exactement zéro sont retirés, donc aucun risque de rogner
   dans la peinture. Les proportions retrouvées correspondent aux
   dimensions notées dans le classeur (28G → 1,98 pour 50 × 100 cm).
   Mettre à false pour garder les scans tels quels. */
const ROGNER_TRANSPARENCE = true;

/* ------------------------------------------------------------------ *
 * Regroupements demandés par l'artiste dans la colonne AUTRE :
 *   « tu peux regrouper les 3 Diplôme en un seul »
 *   « tu peux regroupes les 3 motifs en un seul »
 * Pour dégrouper, supprimez la ligne correspondante.
 * Les fichiers images gardent leur numéro d'origine (1B, 2C, 6D…).
 * ------------------------------------------------------------------ */
const REGROUPEMENTS = [
  { garde: '1', absorbe: ['2', '3'], titre: 'Diplôme, Beaux-Arts de Paris' },
  { garde: '5', absorbe: ['6', '7'], titre: 'Les motifs' },
];

/* Notes de la feuille qui s'adressent au webmestre, jamais au public. */
const NOTES_INTERNES = [
  /^tu peux regroup/i,
  /^fais deux collections/i,
  /bonne orthographe/i,
  /^attention, le titre/i,
  /je ne connais pas les tailles/i,
];

// ══ 1. les images ═══════════════════════════════════════════════════
async function convertirImages() {
  if (!existsSync(SOURCE_SCANS)) {
    console.error(`Scans introuvables : ${SOURCE_SCANS}`);
    console.error('Indiquez le dossier avec TABLEAUX_DIR=… si besoin.');
    process.exit(1);
  }
  mkdirSync(DEST_IMAGES, { recursive: true });

  const fichiers = readdirSync(SOURCE_SCANS)
    .filter((f) => /\.(png|jpe?g|tiff?|webp)$/i.test(f))
    .sort();
  console.log(`${fichiers.length} scans dans ${SOURCE_SCANS}`);

  const manifeste = {};
  let faits = 0;
  let entrant = 0;
  let sortant = 0;

  const traiter = async (fichier) => {
    const id = basename(fichier, extname(fichier)); // « 4F »
    const chemin = resolve(SOURCE_SCANS, fichier);
    entrant += statSync(chemin).size;

    const ouvrir = () => {
      const s = sharp(chemin, { limitInputPixels: 1e9 }).rotate();
      return ROGNER_TRANSPARENCE ? s.trim({ threshold: 0 }) : s;
    };

    // dimensions réelles de l'œuvre, une fois les bords vides enlevés
    const { info } = await ouvrir().raw().toBuffer({ resolveWithObject: true });
    const entree = { largeur: info.width, hauteur: info.height };

    for (const { suffixe, max, quality } of TAILLES) {
      const sortie = resolve(DEST_IMAGES, `${id}-${suffixe}.webp`);
      if (REFAIRE || !existsSync(sortie)) {
        const cote = Math.min(max, Math.max(info.width, info.height));
        await ouvrir()
          .resize({ width: cote, height: cote, fit: 'inside', withoutEnlargement: true })
          .webp({ quality, effort: 5 })
          .toFile(sortie);
      }
      sortant += statSync(sortie).size;
    }

    // vignette de 20 px, affichée floue le temps du chargement
    const flou = await ouvrir().resize({ width: 20, height: 20, fit: 'inside' }).webp({ quality: 45 }).toBuffer();
    entree.flou = `data:image/webp;base64,${flou.toString('base64')}`;

    manifeste[id] = entree;
    if (++faits % 40 === 0) console.log(`  … ${faits}/${fichiers.length}`);
  };

  const file = [...fichiers];
  await Promise.all(
    Array.from({ length: CONCURRENCE }, async () => {
      for (let f = file.shift(); f; f = file.shift()) {
        try {
          await traiter(f);
        } catch (e) {
          console.error(`✗ ${f} : ${e.message}`);
        }
      }
    })
  );

  const mo = (n) => (n / 1024 / 1024).toFixed(1) + ' Mo';
  console.log(`✓ ${faits} images · ${mo(entrant)} → ${mo(sortant)}`);
  return manifeste;
}

// ══ 1 bis. le portrait ══════════════════════════════════════════════
async function convertirPortrait() {
  if (!existsSync(PORTRAIT.source)) {
    console.warn(`⚠  portrait introuvable : ${PORTRAIT.source}`);
    return;
  }
  const { width, height } = await sharp(PORTRAIT.source).metadata();

  // le plus grand cadre 4/5 qui tienne dans la photo, placé verticalement
  const w = Math.round(Math.min(width, height * PORTRAIT.rapport));
  const h = Math.round(w / PORTRAIT.rapport);
  const top = Math.round((height - h) * PORTRAIT.cadrage);

  await sharp(PORTRAIT.source)
    .rotate()
    .extract({
      left: Math.round((width - w) / 2),
      top: Math.max(0, Math.min(top, height - h)),
      width: w,
      height: h,
    })
    .resize({ width: PORTRAIT.largeur, withoutEnlargement: true })
    .webp({ quality: PORTRAIT.quality })
    .toFile(PORTRAIT.sortie);

  console.log(`✓ portrait → ${basename(PORTRAIT.sortie)} (${(statSync(PORTRAIT.sortie).size / 1024).toFixed(0)} ko)`);
}

// ══ 2. le classeur ══════════════════════════════════════════════════
const decoder = (s) =>
  s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&amp;/g, '&');

function lireFeuille() {
  if (!existsSync(CLASSEUR)) {
    console.error(`Classeur introuvable : ${CLASSEUR}`);
    process.exit(1);
  }
  // On ignore xl/media : le classeur pèse 1 Go d'images incrustées.
  const zip = unzipSync(new Uint8Array(readFileSync(CLASSEUR)), {
    filter: (f) => !f.name.startsWith('xl/media/'),
  });
  const texte = (nom) => (zip[nom] ? strFromU8(zip[nom]) : null);

  const partagees = [];
  const sst = texte('xl/sharedStrings.xml');
  if (sst) {
    for (const [, si] of sst.matchAll(/<si>([\s\S]*?)<\/si>/g)) {
      partagees.push([...si.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((m) => decoder(m[1])).join(''));
    }
  }

  const xml = texte('xl/worksheets/sheet1.xml');
  if (!xml) throw new Error('Feuille « sheet1 » absente du classeur');

  const lignes = [];
  for (const [, attributs, corps] of xml.matchAll(/<row([^>]*)>([\s\S]*?)<\/row>/g)) {
    const n = Number(/\br="(\d+)"/.exec(attributs)?.[1] ?? 0);
    const cellules = {};
    // Une balise <c> ne s'imbrique jamais : soit auto-fermante, soit une paire.
    for (const [, attrs, autoFermante, dedans] of corps.matchAll(/<c\b([^>]*?)(\/>|>([\s\S]*?)<\/c>)/g)) {
      const colonne = /\br="([A-Z]+)\d+"/.exec(attrs)?.[1];
      if (!colonne || autoFermante === '/>') continue;
      const type = /\bt="(\w+)"/.exec(attrs)?.[1] ?? 'n';
      let valeur;
      if (type === 'inlineStr') {
        valeur = [...dedans.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((m) => decoder(m[1])).join('');
      } else {
        const brut = /<v>([\s\S]*?)<\/v>/.exec(dedans)?.[1];
        if (brut == null) continue;
        valeur = type === 's' ? partagees[Number(brut)] : decoder(brut);
      }
      valeur = (valeur ?? '').trim();
      if (valeur) cellules[colonne] = valeur;
    }
    if (Object.keys(cellules).length) lignes.push({ n, cellules });
  }
  return lignes;
}

// ══ 3. mise en forme ════════════════════════════════════════════════
const identifiant = (s) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['’]/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

const interne = (note) => NOTES_INTERNES.some((re) => re.test(note));

/** « 160 » + « 2x120 » → « 160 × 2×120 cm » ; un diamètre → « Ø 30 cm ». */
function formaterDimensions({ hauteur, largeur, diametre }) {
  const propre = (v) => String(v).replace(/\s*x\s*/gi, '×');
  if (diametre) return `Ø ${propre(diametre)} cm`;
  if (hauteur && largeur) return `${propre(hauteur)} × ${propre(largeur)} cm`;
  if (hauteur) return `H. ${propre(hauteur)} cm`;
  if (largeur) return `L. ${propre(largeur)} cm`;
  return null;
}

/**
 * Une mesure du classeur, en centimètres.
 * « 120 » → 120 ; « 3x60 » (triptyque) → 180 ; « (2x80) » → 160.
 */
function centimetres(valeur) {
  if (!valeur) return null;
  const m = /(\d+(?:[.,]\d+)?)\s*[x×]\s*(\d+(?:[.,]\d+)?)/i.exec(valeur);
  if (m) return Number(m[1].replace(',', '.')) * Number(m[2].replace(',', '.'));
  const seul = /(\d+(?:[.,]\d+)?)/.exec(valeur);
  return seul ? Number(seul[1].replace(',', '.')) : null;
}

/** « 1996-1997 » → 1996 et 1997 */
const annees = (date) => [...String(date).matchAll(/\d{4}/g)].map((m) => Number(m[0]));

function periode(oeuvres) {
  const tout = oeuvres.flatMap((o) => annees(o.annee));
  if (!tout.length) return '';
  const min = Math.min(...tout);
  const max = Math.max(...tout);
  return min === max ? String(min) : `${min} – ${max}`;
}

function construire(lignes, manifeste) {
  const brutes = [];
  let courante = null;

  for (const { n, cellules } of lignes) {
    if (n === 1) continue; // en-têtes

    if (cellules.A) {
      // ligne de garde : elle ouvre une collection et ne porte pas d'œuvre
      courante = {
        numero: cellules.A, // « 4 » ou « 4(Bis) »
        prefixe: /^\d+/.exec(cellules.A)?.[0] ?? cellules.A, // préfixe des fichiers
        titre: cellules.B ?? `Collection ${cellules.A}`,
        technique: cellules.H ?? '',
        oeuvres: [],
      };
      brutes.push(courante);
      continue;
    }
    if (!courante) throw new Error(`Ligne ${n} : une œuvre sans collection`);

    const id = courante.prefixe + (cellules.C ?? ''); // colonne A + colonne C
    if (!manifeste[id]) console.warn(`⚠  ligne ${n} : image « ${id}.png » introuvable`);
    const note = cellules.J ?? '';

    // Hauteur réelle en cm : c'est elle qui donne l'échelle sur le mur.
    // Un tondeau n'a qu'un diamètre, qui fait office de hauteur.
    const hauteurCm = centimetres(cellules.G) ?? centimetres(cellules.E);

    courante.oeuvres.push({
      id,
      lettre: cellules.C ?? '',
      annee: cellules.D ?? '',
      technique: cellules.H ?? '',
      dimensions: formaterDimensions({ hauteur: cellules.E, largeur: cellules.F, diametre: cellules.G }),
      hauteurCm,
      largeurCm: centimetres(cellules.G) ?? centimetres(cellules.F),
      vendue: (cellules.I ?? '').toLowerCase() === 'oui',
      note: note && !interne(note) ? note : null,
      // Les URL se déduisent de l'id : /tableaux/<id>-md.webp
      rapport: manifeste[id] ? Number((manifeste[id].largeur / manifeste[id].hauteur).toFixed(4)) : 0.75,
      flou: manifeste[id]?.flou ?? null,
    });
  }

  // regroupements
  const parNumero = new Map(brutes.map((c) => [c.numero, c]));
  for (const { garde, absorbe, titre } of REGROUPEMENTS) {
    const cible = parNumero.get(garde);
    if (!cible) continue;
    if (titre) cible.titre = titre;
    for (const numero of absorbe) {
      const source = parNumero.get(numero);
      if (!source) continue;
      cible.oeuvres.push(...source.oeuvres);
      cible.technique ||= source.technique;
      source.absorbee = true;
    }
  }

  const collections = brutes
    .filter((c) => !c.absorbee && c.oeuvres.length)
    .map((c, i) => {
      // technique la plus fréquente, quand la page de garde n'en donne pas
      const compte = new Map();
      for (const o of c.oeuvres) compte.set(o.technique, (compte.get(o.technique) ?? 0) + 1);
      const dominante = [...compte].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';

      // Le flou n'est utile que sur la page de garde, seule visible repliée.
      c.oeuvres.forEach((o, j) => {
        if (j > 0) o.flou = null;
      });

      return {
        id: identifiant(c.titre) || `collection-${c.numero}`,
        numero: c.numero,
        rang: String(i + 1).padStart(2, '0'),
        titre: c.titre,
        technique: c.technique || dominante,
        periode: periode(c.oeuvres),
        nombre: c.oeuvres.length,
        oeuvres: c.oeuvres,
      };
    });

  return {
    genereLe: new Date().toISOString().slice(0, 10),
    source: basename(CLASSEUR),
    nombreCollections: collections.length,
    nombreOeuvres: collections.reduce((n, c) => n + c.nombre, 0),
    collections,
  };
}

// ══ marche ══════════════════════════════════════════════════════════
let manifeste = {};
if (SEULEMENT_DONNEES) {
  // On repart des dérivés déjà convertis : ni les scans ni sharp ne
  // retouchent quoi que ce soit, c'est l'affaire de quelques secondes.
  for (const f of readdirSync(DEST_IMAGES).filter((f) => f.endsWith('-md.webp'))) {
    const id = basename(f, '-md.webp');
    const chemin = resolve(DEST_IMAGES, f);
    const m = await sharp(chemin).metadata();
    const flou = await sharp(chemin)
      .resize({ width: 20, height: 20, fit: 'inside' })
      .webp({ quality: 45 })
      .toBuffer();
    manifeste[id] = {
      largeur: m.width,
      hauteur: m.height,
      flou: `data:image/webp;base64,${flou.toString('base64')}`,
    };
  }
  console.log(`${Object.keys(manifeste).length} images déjà converties`);
} else {
  manifeste = await convertirImages();
}
await convertirPortrait();

const donnees = construire(lireFeuille(), manifeste);
/* On écrit un .js et non un .json : le site n'a alors rien à aller
   chercher, et index.html s'ouvre aussi bien par double-clic que sur
   un serveur. */
writeFileSync(
  DEST_DONNEES,
  '/* Produit par outils/ingest.mjs — ne pas modifier à la main. */\n' +
    'const DONNEES = ' +
    JSON.stringify(donnees) +
    ';\n'
);

console.log(`✓ ${donnees.nombreCollections} collections · ${donnees.nombreOeuvres} œuvres → data.js`);
const sansImage = donnees.collections.flatMap((c) => c.oeuvres).filter((o) => !manifeste[o.id]).length;
if (sansImage) console.warn(`⚠  ${sansImage} œuvres sans image`);
