# SubTrack (working name)

Find every subscription charging your card from a bank statement, with no bank login.

- [PLAN.md](PLAN.md): product plan
- [TASKS.md](TASKS.md): tasks by phase
- [DESIGN.md](DESIGN.md): design guide

## Layout

- `mobile/`: React Native CLI app (TypeScript, no Expo)
- `backend/`: Node.js + Express API with Prisma and PostgreSQL
- `docker-compose.yml`: local Postgres on port 5440

## Run the backend

```sh
docker compose up -d          # local Postgres
cd backend
cp .env.example .env          # first time only
npm install
npm run db:migrate
npm run dev                   # http://localhost:3000/health
```

Checks: `npm test`, `npm run typecheck`.

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

Checks: `npm test`, `npm run typecheck`, `npm run lint`.

iOS builds need macOS; see the development setup section in PLAN.md.
