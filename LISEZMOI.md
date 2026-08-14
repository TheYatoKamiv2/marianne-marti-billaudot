# Site de Marianne Marti-Billaudot

Un site d'une seule page : une cimaise horizontale que l'on fait défiler.
On y voit la page de garde de chaque collection ; un clic la déplie sur place.

Pas de framework, pas de compilation. Cinq fichiers, et un outil que l'on
lance quand le contenu change.

## Les fichiers

| Fichier      | À quoi ça sert                                                     |
| ------------ | ------------------------------------------------------------------ |
| `index.html` | La page. Titre, description, ordre des scripts.                     |
| `style.css`  | Toute la mise en forme.                                             |
| `mur.js`     | Tout le comportement : défilement, dépliage, fiches, sommaire.      |
| `textes.js`  | **Biographie, e-mail, liens.** Le fichier à modifier à la main.     |
| `data.js`    | Les 236 œuvres. **Produit automatiquement, ne pas modifier.**       |
| `portrait.webp` | Le portrait de l'artiste. **Produit automatiquement.**           |
| `tableaux/`  | Les images du site, en WebP.                                        |
| `outils/`    | Le script qui lit le classeur Excel et convertit les scans.         |

Pour voir le site : ouvrir `index.html` dans un navigateur. C'est tout.

## Changer un texte

Ouvrir `textes.js`, modifier, enregistrer, recharger la page. On y trouve
le nom, l'accroche d'accueil, la biographie, l'adresse de contact et les
liens (Instagram et autres, vides pour l'instant).

La biographie est le texte de l'artiste, dans `bio` : **une ligne du
tableau = un paragraphe**. Pour en ajouter un, ajouter une ligne entre
apostrophes, suivie d'une virgule. Attention, chaque paragraphe doit
tenir sur une seule ligne : un retour à la ligne au milieu d'un texte
empêche la page entière de s'afficher.

Sur grand écran le texte s'affiche sur deux colonnes à côté du portrait ;
sur téléphone, sur une colonne que l'on fait défiler.

## Ajouter ou modifier des œuvres

Le classeur Excel fait foi. Il vit à côté du dossier `site` :

```
Website marianne marti/
├── ORGANISATION SITE INTERNET.xlsx   ← le classeur
├── tableaux/                          ← les scans d'origine (PNG)
└── site/                              ← ce qui est mis en ligne
```

1. Modifier le classeur, et/ou déposer les nouveaux scans dans `tableaux/`.
   Le nom du fichier, c'est la **colonne A** suivie de la **colonne C** :
   la collection 4, tableau F, donne `4F.png`.
2. Lancer, une seule fois :

   ```bash
   cd site/outils
   npm install        # la première fois seulement
   cd ..
   node outils/ingest.mjs
   ```

3. Recharger la page.

L'outil ne reconvertit que ce qui a bougé : un scan **nouveau ou
retouché depuis la dernière fois** (il compare les dates de
modification). Les autres ne sont même pas rouverts. Retoucher dix
tableaux prend donc quelques secondes, pas dix minutes.

Deux raccourcis :

- `node outils/ingest.mjs --donnees` — recalcule seulement `data.js`
  (quelques secondes ; à utiliser quand seul le classeur a changé) ;
- `node outils/ingest.mjs --refaire` — reconvertit tout, de zéro.

### Ce que l'outil fait des images

Les scans pèsent 1,06 Go au total : beaucoup trop pour un site.
Chaque œuvre devient deux fichiers WebP — `4F-md.webp` pour le mur,
`4F-lg.webp` pour la fiche — soit **83 Mo** en tout.

Les scans étant des détourages sur fond transparent, l'outil retire les
bords entièrement vides pour que chaque œuvre remplisse son cadre. Seuls
les pixels totalement transparents sont enlevés : la peinture n'est jamais
entamée. Pour désactiver, mettre `ROGNER_TRANSPARENCE = false` en haut de
`outils/ingest.mjs`.

### Le portrait

Il est fabriqué à partir de `../photo_profil.jpeg`, à côté du dossier
`site`. L'outil le recadre en 4/5 et l'enregistre en `portrait.webp`.

Pour changer de photo : remplacer `photo_profil.jpeg`, puis relancer
`node outils/ingest.mjs --donnees`.

Si le visage tombe trop haut ou trop bas dans le cadre, ajuster
`PORTRAIT.cadrage` en haut de `outils/ingest.mjs` : `0` cale le cadrage
tout en haut de la photo, `1` tout en bas, `0.6` actuellement.

### Deux réglages dans `outils/ingest.mjs`

- `REGROUPEMENTS` — les collections réunies en une seule, comme demandé
  dans la colonne AUTRE du classeur (« tu peux regrouper les 3 Diplôme en
  un seul », « … les 3 motifs … »). Supprimer une ligne pour les séparer
  de nouveau.
- `NOTES_INTERNES` — les remarques du classeur qui s'adressent au
  webmestre et ne doivent jamais s'afficher sur le site.

## Mettre en ligne sur Vercel

Le site est entièrement statique : aucune configuration, aucune étape de
compilation. Trois commandes, dans le dossier `site` :

```bash
cd "d:\Documentes\Website marianne marti\site"

npx vercel login    # une seule fois : ouvre le navigateur
npx vercel          # met en ligne une adresse d'aperçu, à soi
npx vercel --prod   # publie pour de bon
```

À la première exécution, Vercel pose quelques questions ; les réponses par
défaut conviennent toutes. Pour *In which directory is your code located?*
répondre `./`, et pour le framework, `Other`.

Le dossier `outils/` est exclu du déploiement par `.vercelignore` : il ne
sert qu'à préparer le contenu.

### Le poids, à surveiller

Vercel refuse les envois par le CLI au-delà de **100 Mo** sur l'offre
gratuite (Hobby) — 1 Go sur l'offre Pro. Le site pèse **84 Mo**, dont
83 Mo d'images : il passe, mais la marge n'est pas énorme.

En ajoutant beaucoup d'œuvres, deux solutions :

- baisser `quality` pour la taille `lg` dans `outils/ingest.mjs`
  (74 aujourd'hui), puis `node outils/ingest.mjs --refaire` ;
- ou passer par GitHub plutôt que par le CLI : pousser le dossier `site`
  sur un dépôt, l'importer dans Vercel, réglages par défaut. La limite des
  100 Mo ne s'applique plus, et chaque `git push` republie le site.

## Naviguer

- **Barre de défilement**, **glisser** à la souris, **molette**, ou
  **← →** au clavier (avec `Maj` pour aller plus vite, `Début` / `Fin`
  pour les extrémités).
- **Sommaire** : la liste des 39 collections, avec un champ de recherche.
  C'est le seul endroit qui déplace volontairement le regard, puisqu'on
  demande explicitement à aller quelque part.
- **Échap** replie la collection ouverte, ferme la fiche ou le sommaire.

Déplier ou replier une collection **ne déplace jamais le visiteur** : les
œuvres sortent du cartel, ou y rentrent, en glissant. Quand une autre
collection était ouverte, elle se referme discrètement et le défilement
est corrigé d'autant, pour que rien ne bouge sous les yeux.

Chaque collection a son adresse, que l'on peut partager :

```
…/#/les-motifs           déplie la collection
…/#/rencontres/28G       ouvre en plus la fiche de l'œuvre 28G
```

## Comment fonctionne le formulaire de contact

**Le site n'envoie aucun e-mail lui-même.** Il n'a pas de serveur : c'est
un dossier de fichiers, il ne peut donc rien expédier.

Quand un visiteur remplit le formulaire et clique sur *Envoyer*, la page
ouvre **son propre logiciel de courrier** (Mail, Outlook, Gmail…) avec un
message déjà rédigé : destinataire `marti-billaudot@orange.fr`, objet
« Site — son nom », et son message dans le corps. **C'est lui qui appuie
sur envoyer**, depuis sa propre adresse.

Conséquences, à connaître :

- Le message arrive bien à `marti-billaudot@orange.fr`, et l'on peut
  répondre directement au visiteur puisqu'il écrit de sa propre boîte.
- Mais si le visiteur n'a pas de logiciel de courrier configuré — cas
  fréquent sur un ordinateur de bureau où l'on ne relève son courrier que
  sur le web — **il ne se passe rien**, et le message est perdu.
  C'est pourquoi l'adresse est aussi affichée en toutes lettres à côté du
  bouton, cliquable, pour qu'on puisse toujours la copier.
- Rien n'est enregistré nulle part : aucune trace des messages côté site.

Pour que les messages arrivent à coup sûr, sans dépendre du logiciel du
visiteur, il faut un service de formulaires — Formspree ou Web3Forms
(gratuits pour un petit volume) reçoivent l'envoi et le réexpédient par
courrier. Cela demande de créer un compte et de remplacer une dizaine de
lignes dans `mur.js`. À demander si c'est souhaité.

Changer l'adresse : `textes.js`, ligne `email`.

## L'échelle des œuvres

En bas de l'écran, le bouton **Échelle réelle** commande la taille
d'accrochage :

- **allumé** (par défaut) : chaque œuvre occupe la hauteur que lui donne
  le classeur. Un diplôme de 195 cm écrase un dessin de 20 cm, comme sur
  une vraie cimaise. Les polyptyques comptent en entier — « 3x60 » vaut
  180 cm de large.
- **éteint** : toutes les œuvres à la même hauteur, plus commode pour
  parcourir une collection.

Le choix est retenu d'une visite à l'autre.

L'échelle elle-même se règle dans `style.css`, variable `--cm` : elle dit
combien de pixels vaut un centimètre. Par défaut, deux mètres de haut
occupent au plus 540 px.

**19 œuvres sur 236 n'ont aucune dimension au classeur** (la collection
où figure la note « je ne connais pas les tailles »). Faute de mieux, on
leur donne 60 cm — `HAUTEUR_INCONNUE`, en haut de `mur.js`. Leur fiche
indique bien « Dimensions non communiquées ».

### L'avertissement « l'image ne correspond pas aux dimensions »

À chaque passage, l'outil compare les proportions de chaque scan aux
dimensions notées au classeur, et signale les écarts importants —
**29 œuvres aujourd'hui**. Deux causes, toujours :

- **le scan réunit plusieurs pièces.** Les cinq tondeaux de « Près de
  noix » sont photographiés deux par deux, l'un au-dessus de l'autre :
  l'image est deux fois plus haute que le Ø 15 cm annoncé, et s'affiche
  donc deux fois trop petite. Idem pour « Papillons » et « Hybiscus ».
- **la hauteur et la largeur ont été interverties** au classeur. « Elle,
  Lui, Eux » G est noté 120 × 160 cm alors que l'image est plus haute que
  large.

L'outil ne corrige rien de lui-même : il n'y a pas moyen de deviner
laquelle des deux valeurs est la bonne. À reprendre au classeur, ou en
découpant les scans groupés en une image par œuvre. Tant que ce n'est pas
fait, ces 29 œuvres s'affichent à une taille fausse **en échelle réelle
seulement** — la bascule éteinte, elles sont correctes.
