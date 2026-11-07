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

- **Une seule source de données** : `src/data/` (types, catalogue, liens entre stories, joueurs et pièces).
- **Les médias** sont produits par `npm run import-media`, qui relit les dossiers du Bureau
  (`Berete - Stories`, `01 Audiovisuel/Berete - Envoi ODORO`, le logo) et écrit `public/media/`
  ainsi que `src/data/stories.generated.json` et `src/data/media.generated.json`.
  On peut le relancer après avoir ajouté des fichiers : rien n'est créé en double, seuls les nouveaux fichiers sont traités.
  Le dossier « 99 - NE PAS ENVOYER » n'est jamais lu.
- **L'admin** (`/admin`, mot de passe `ADMIN_PASSWORD`) modifie les stories, joueurs, pièces et écrins dans la base,
  et affiche les messages et demandes de rappel. Au démarrage, l'API ajoute à la base ce qui est nouveau dans `src/data/`
  (nouvelles stories, nouvelles photos) sans écraser les textes modifiés depuis l'admin.
- **Le numéro WhatsApp, l'email, Instagram** : `src/lib/site.ts` (seul fichier à modifier).

## Vérifier

```sh
npm run lint
npm run typecheck
npm run build && npm run build:server
npm start               # site construit + API sur http://localhost:3001
npm run verify          # tests Playwright (ordinateur 1440 px et iPhone 390 px), captures dans verification/
```

## Mettre en ligne

`docker compose up` lance la base et le site construit (définir `ADMIN_PASSWORD` dans `.env`).
