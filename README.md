# Berete Jewellers

Vite + React + TypeScript, React Router, Tailwind CSS, lucide-react.
API: Node.js + TypeScript (Express), Prisma, PostgreSQL.

## Develop

```sh
npm install
npm run dev
```

The API needs PostgreSQL. Copy `.env.example` to `.env`, set `DATABASE_URL`, then:

```sh
npx prisma migrate deploy
npm run dev:server
```

`docker compose up` runs the database and the built site together.

## Build

```sh
npm run build
npm run build:server
npm start
```
