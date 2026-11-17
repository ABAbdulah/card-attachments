# SubTrack (working name)

Find every subscription charging your card from a bank statement, with no bank login.

- [PLAN.md](PLAN.md): product plan
- [TASKS.md](TASKS.md): tasks by phase, with status
- [DESIGN.md](DESIGN.md): design guide

## Layout

- `mobile/`: React Native CLI app (TypeScript, no Expo)
- `backend/`: Node.js + Express API with Prisma and PostgreSQL
- `docker-compose.yml`: local Postgres on port 5440
- `statements/`: your real statements for testing. Git-ignored; never commit it.

## Run the backend

```sh
docker compose up -d          # local Postgres
cd backend
cp .env.example .env          # first time only
npm install
npx prisma migrate deploy     # create tables
npm run db:seed               # merchant catalog
npm run dev                   # http://localhost:3000/health/ready
```

Checks: `npm test` (needs the `subtrack_test` database: `docker compose exec postgres psql -U subtrack -c "CREATE DATABASE subtrack_test;"` once, then `DATABASE_URL=postgresql://subtrack:subtrack@localhost:5440/subtrack_test npx prisma migrate deploy`), `npm run typecheck`.

Without `RESEND_API_KEY` the sign-in code is printed in the API log and shown in the app (development only).

Try the detector on a statement without the app:

```sh
npx tsx scripts/spike.ts ../statements/<file>.pdf
```

## Run the app (Android)

On Windows, install a newer CMake once so native builds do not hit the 260-character path limit (the build picks it up automatically):

```sh
sdkmanager "cmake;3.31.6"
```

Start an emulator from Android Studio's Device Manager, then:

```sh
cd mobile
npm install
npm start                     # Metro, keep it running
npm run android               # in a second terminal
```

The app reaches the local API at `localhost:3000` through `adb reverse tcp:3000 tcp:3000` (`npm run android` sets it up; run it again after reconnecting a phone or restarting the emulator). If port 8081 is taken by another project, run `npm start -- --port 8088` and also run `adb reverse tcp:8081 tcp:8088`.

Checks: `npm test`, `npm run typecheck`, `npm run lint`.

iOS builds need macOS; see the development setup section in PLAN.md.

## Deploy the backend to Railway

1. Create a Railway project with a **Postgres** service and a service from this repository with root directory `backend`.
2. Set variables on the API service: `DATABASE_URL` (reference the Postgres service), `NODE_ENV=production`, `JWT_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`, and optionally `ANTHROPIC_API_KEY` and `REVENUECAT_WEBHOOK_SECRET`.
3. `backend/railway.json` builds the API, runs migrations and the catalog seed before each deploy, and health-checks `/health/ready`.
4. Put the public API URL in `mobile/src/config.ts` (`PROD_API_URL`).
