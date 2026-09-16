# InternetDAT Track — backend

Standalone backend bundle for the existing InternetDAT Track demo. It includes shipment CRUD, reset/seed behavior, and local copies of the API validation and database schema packages so it can be installed with npm outside the original workspace.

## Requirements

- Node.js 20+
- PostgreSQL
- `SUPABASE_DATABASE_URL` containing the Supabase Session pooler URI, or `DATABASE_URL` pointing to a PostgreSQL database

## Run with npm

```bash
npm install
npm run db:push
PORT=8080 npm run dev
```

For the Replit backend, add the Supabase URI as the `SUPABASE_DATABASE_URL` secret. The backend uses that secret without putting the password in source code.

The API listens on `PORT` and exposes routes under `/api/shipments`.

## Other commands

```bash
npm run typecheck
npm run build
npm run start
```
