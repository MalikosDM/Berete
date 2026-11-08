# Berete Jewellers

Site de la maison Berete Jewellers (Dubaï) : Vite + React + TypeScript, Tailwind, GSAP + Lenis.
API : Express + Prisma + PostgreSQL (catalogue, admin, formulaires).

## Lancer le site en local

```sh
npm install
npm run db:local        # crée puis démarre une base PostgreSQL locale (.local/postgres, port 5433)
cp .env.example .env    # puis choisir ADMIN_PASSWORD
npm run db:migrate
npm run dev:server      # API sur http://localhost:3001
npm run dev             # site sur http://localhost:5173
```

Le site s'affiche aussi sans l'API : il utilise alors le catalogue intégré.
Safari avec un bloqueur de pubs (uBlock…) peut bloquer certains fichiers en mode développement : tester dans Chrome, ou désactiver le bloqueur pour `localhost`.

## Les contenus

- **Une seule source de données** : `src/data/` — `catalogue.ts` (joueurs, stories), `pieces.ts`
  (les pièces et les écrins), `collections.ts` (une collection par type de bijou), `relations.ts`
  (liens entre stories, joueurs et pièces).
- **Les pièces** : 39 pièces trouvées dans les stories et les dossiers. Leurs textes sont des brouillons
  (`draft: true`, « Brouillon » dans l'admin) à faire valider par le client ; aucun chiffre n'est inventé.
- **Les collections** : `/creations/pendants`, `/chains`, `/rings`, `/watches`, `/bracelets`.
  L'accueil montre une tuile par type qui a au moins 2 pièces.
- **Les médias** sont produits par `npm run import-media`, qui relit les dossiers du Bureau
  (`Berete - Stories`, `01 Audiovisuel/Berete - Envoi ODORO`, `02 Projets/Sites clients/Boutique Bijoutier`, le logo)
  et écrit `public/media/` ainsi que `src/data/stories.generated.json` et `src/data/media.generated.json`.
  Les photos principales tirées des stories (image d'une vidéo, recadrage sur le bijou) et les photos des écrins
  sont décrites dans `scripts/piece-media.mjs`.
  On peut le relancer après avoir ajouté des fichiers : rien n'est créé en double, seuls les nouveaux fichiers sont traités.
  Le dossier « 99 - NE PAS ENVOYER » n'est jamais lu.
- **L'admin** (`/admin`, mot de passe `ADMIN_PASSWORD`) modifie les stories, joueurs, pièces et écrins dans la base,
  et affiche les messages et demandes de rappel. Au démarrage, l'API ajoute à la base ce qui est nouveau dans `src/data/`
  (nouvelles stories, nouvelles photos, nouveaux textes) sans jamais écraser un texte modifié depuis l'admin.
- **Le numéro WhatsApp, l'email, Instagram** : `src/lib/site.ts` (seul fichier à modifier).

## Les langues

Le site existe en anglais (`/creations`), français (`/fr/creations`), espagnol (`/es/...`), allemand (`/de/...`),
néerlandais (`/nl/...`) et arabe (`/ar/...`, lu de droite à gauche). Le menu de langue (barre du haut, menu mobile, pied de page) garde la même page.

- **Les mots des pages** : `src/i18n/ui/en.ts` (la source), puis `fr.ts`, `es.ts`, `de.ts`, `nl.ts`, `ar.ts`. TypeScript refuse
  une langue à laquelle il manque une phrase. Les titres et descriptions Google de chaque page sont dans `seoPages`
  (l'anglais dans `src/extensions/seo/seo.json`).
- **Les textes du catalogue** (pièces, joueurs, stories, écrins) sont écrits en anglais dans `src/data/` ; chaque langue
  les traduit dans `src/i18n/content/<langue>.ts`, rangés par texte anglais. `npm run i18n:check` dit ce qui manque.
- **Depuis l'admin** : chaque fiche a un bloc « Traductions » (français, espagnol, allemand, néerlandais, arabe). Vide, la fiche garde la
  traduction du site (affichée en gris) ; rempli, il la remplace. Un texte anglais modifié dans l'admin reste en anglais
  dans les autres langues tant que sa traduction n'est pas écrite dans ce bloc.
- **Arabe** : polices Amiri (titres) et IBM Plex Sans Arabic (texte), sans espacement entre les lettres ; mise en page,
  flèches, galeries et stories en miroir (on avance vers la gauche).
- **WhatsApp et formulaires** : les messages préremplis sont écrits dans la langue de la page ; les messages et demandes
  de rappel indiquent dans l'admin la langue du visiteur.
- **Google** : chaque langue a ses pages pré-rendues, son plan du site et ses liens `hreflang`. Pour que ces liens
  figurent dans les pages construites, définir l'adresse publique au moment du build : `SITE_URL=https://… npm run build`.

## Vérifier

```sh
npm run lint
npm run typecheck
npm run i18n:check      # aucune traduction ne manque (fr, es, de, nl, ar)
npm run build && npm run build:server
npm start               # site construit + API sur http://localhost:3001
npm run verify          # tests Playwright (ordinateur 1440 px et iPhone 390 px), captures dans verification/
                        # (accueil → collections → chaque pièce, liens joueur ↔ pièce ↔ story, netteté des photos,
                        #  chaque langue : aucun mot anglais oublié, arabe de droite à gauche, menu de langue)
```

## Mettre en ligne

`docker compose up` lance la base et le site construit (définir `ADMIN_PASSWORD` dans `.env`).
