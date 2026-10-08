# Guia Gastronômico — Fase 1

Base do MVP: auth JWT + rotas protegidas.

## Subir local

1. Copie o env: `cp .env.example .env`
2. Suba o banco + API: `docker compose up --build`
   - API: http://localhost:8080 (Swagger em `/swagger`)
   - Postgres: localhost:5432
3. Front (outro terminal):
   ```bash
   cd frontend
   npm install
   npm run dev # http://localhost:5173
   ```
   Configure `VITE_API_URL=http://localhost:8080` se preciso.

Sem Docker (modo demo): a API roda com Sqlite local —
`DB_PROVIDER=sqlite DB_CONN=DataSource=guia_demo.db dotnet run --project backend/src/GuiaGastronomico.Api`
— e o front com `VITE_API_URL` apontando para a API. Seed automático cria
`user@demo.com` e `anunciante@demo.com` (senha `demo123`).

Sem Docker: rode o Postgres local e `dotnet run --project backend/src/GuiaGastronomico.Api`.

## Endpoints (Fase 2)

- `POST /api/auth/register { name, email, password, role? }`
- `POST /api/auth/login { email, password }`
- `GET /api/me` (Bearer JWT)
- `PUT /api/me/preferences { latitude?, longitude?, locationLabel?, cuisines[] }`
- `GET /api/restaurants/search?query=&lat=&lng=&limit=` (prévia/debug do PlacesService)
- `GET /api/restaurants/{id}`
- `POST /api/chat { message, lat?, lng? }` → `{ reply, restaurants[] }` (máx. 3). Sem `LLM_API_KEY`, usa fallback heurístico + Places; com chave (OpenAI-compatible via `LLM_BASE_URL`/`LLM_MODEL`), faz tool use `buscar_restaurantes`.
- `GET /api/discoveries` (3–4 da semana, cache semanal por usuário)
- `GET /api/restaurants/{id}` (com média local) · `GET/POST /api/restaurants/{id}/reviews` (1 avaliação por usuário, atualiza se repetir)
- `GET /api/promotions` (ativas, pública) · `POST /api/promotions` (só Advertiser, checkout simulado → Paid)

Contas demo (senha `demo123`): `user@demo.com` (User), `anunciante@demo.com` (Advertiser). Seed automático no startup: 15 restaurantes (SP), 2 promoções ativas. Sem `GOOGLE_PLACES_KEY`/`LLM_API_KEY`, a demo roda 100% no fallback.

Front: `/chat`, `/discoveries`, `/news` (+ formulário do anunciante), `/restaurants/:id`, `/onboarding`. BottomNav no mobile, sidebar no desktop.

Sem `GOOGLE_PLACES_KEY`, o `PlacesService` usa cache local + fallback (15 restaurantes de exemplo em SP). Com a chave, chama Text Search (New) com `locationBias` de 3 km e `FieldMask` mínimo, com cache de 12h (`Google:CacheHours`).

Front: `/onboarding` (geolocalização + fallback manual + chips + prévias), `/` redireciona p/ onboarding se sem gostos.

Próximas fases: onboarding + Places (F2), chat LLM (F3), descobertas/avaliações (F4), novidades (F5), deploy (F6).
