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

## Vérifier

```sh
npm run lint
npm run typecheck
npm run build && npm run build:server
npm start               # site construit + API sur http://localhost:3001
npm run verify          # tests Playwright (ordinateur 1440 px et iPhone 390 px), captures dans verification/
                        # (accueil → collections → chaque pièce, liens joueur ↔ pièce ↔ story, netteté des photos)
```

## Mettre en ligne

`docker compose up` lance la base et le site construit (définir `ADMIN_PASSWORD` dans `.env`).
