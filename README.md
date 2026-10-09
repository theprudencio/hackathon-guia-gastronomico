# Zup — Guia Gastronômico - HACKATHON GRUPO SPACE PENGUINS 

Para teste no link publicado, pode-se criar um usuário novo ou usar o login demo:

Login: user@demo.com
senha: demo123

MVP do hackathon: descubra restaurantes perto de você por gostos, chat com IA,
em alta pela comunidade, novidades de anunciantes, avaliações locais + do Google Maps.

Stack: .NET 8 (API) + Postgres (Neon em prod, Docker/sqlite local) + React + Vite (Vercel).

## Subir local

**Com Docker** (banco + API):

1. Copie o env: `cp .env.example .env`
2. `docker compose up --build`
   - API: http://localhost:8080 (Swagger em `/swagger`, health em `/health`)
   - Postgres: localhost:5432
3. Front (outro terminal):
   ```bash
   cd frontend
   npm install
   npm run dev # http://localhost:5173
   ```
   Com `VITE_API_URL=http://localhost:8080` (padrão em `frontend/.env`).

**Sem Docker** (modo demo, sqlite):

```bash
DB_PROVIDER=sqlite DB_CONN=DataSource=guia_demo.db dotnet run --project backend/src/GuiaGastronomico.Api
```

Ou com Postgres local: `dotnet run --project backend/src/GuiaGastronomico.Api`.

Seed automático no startup: 15 restaurantes (SP), 2 promoções e as contas
`user@demo.com` / `anunciante@demo.com` (senha `demo123`).
Sem `GOOGLE_PLACES_KEY`/`LLM_API_KEY`, tudo roda no fallback local.

## Variáveis de ambiente

| Var | Onde | Para quê |
| --- | --- | --- |
| `DB_CONN` | API | Connection string Postgres (ou `DataSource=...` com `DB_PROVIDER=sqlite`) |
| `DB_PROVIDER` | API | `sqlite` p/ demo local; padrão é Postgres |
| `JWT_SECRET` | API | Segredo do JWT (≥ 32 chars; nunca commite o real) |
| `CORS_ORIGINS` | API | **Só o front chama a API.** Lista separada por vírgula, ex. `https://meu-app.vercel.app` |
| `GOOGLE_PLACES_KEY` | API | Busca, fotos, horários e opiniões (sem ela: fallback local) |
| `LLM_API_KEY` / `LLM_BASE_URL` / `LLM_MODEL` | API | Chat com tool use (sem ela: fallback heurístico) |
| `VITE_API_URL` | Front | URL pública da API (bake no build!) |

## Endpoints

- `POST /api/auth/register { name, email, password, role? }` · `POST /api/auth/login`
- `GET /api/me` · `PUT /api/me { name?, latitude?, longitude?, locationLabel? }` (Bearer)
- `PUT /api/me/preferences { latitude?, longitude?, locationLabel?, cuisines[] }`
- `GET /api/geocode/reverse?lat=&lng=` → `{ label: "Cidade, UF" }`
- `GET /api/restaurants/search?query=&lat=&lng=&limit=` · `GET /api/restaurants/top-rated?count=&excludeIds=`
- `GET /api/restaurants/{id}` (preço, aberto agora, horários seg–dom, opiniões do Google)
- `GET/POST /api/restaurants/{id}/reviews` (1 por usuário) · `GET/POST/DELETE /api/favorites`
- `POST /api/chat { message, lat?, lng? }` → `{ reply, restaurants[] }` (máx. 3)
- `GET /api/discoveries?count=&excludeIds=` · `GET /api/promotions` (pública) · `POST /api/promotions` (Advertiser)

Front: `/chat`, `/em-alta`, `/news`, `/restaurants/:id`, `/onboarding`, `/perfil`.

## Deploy (Fase 6) — Neon + Render + Vercel

Ordem: banco → API → front (o `CORS_ORIGINS` da API precisa da URL final do front).

### 1. Banco — Neon

1. Crie conta em https://neon.tech → **New Project** (região próxima, ex. US East).
2. No dashboard do projeto, copie a **connection string** ( pooled ou direta).
3. Converta p/ o formato Npgsql da `DB_CONN`:
   `Host=ep-xxxx.us-east-2.aws.neon.tech;Port=5432;Database=guia;Username=seu-user;Password=sua-senha;Ssl Mode=Require;Trust Server Certificate=true`
4. As migrations + seed rodam sozinhos no boot da API (`db.Database.Migrate()` + `SeedAsync`).

### 2. API — Render (`backend/Dockerfile` + `render.yaml`)

Via Blueprint (recomendado):

1. Suba o repo no GitHub. No Render: **New > Blueprint** → selecione o repo (usa o `render.yaml` da raiz).
2. Preencha as vars marcadas `sync: false`: `DB_CONN` (Neon, passo 1), `CORS_ORIGINS` (vai a URL da Vercel — pode por provisória e corrigir depois), `GOOGLE_PLACES_KEY`, `LLM_API_KEY`. `JWT_SECRET` é gerada sozinha.
3. Deploy. O Dockerfile escuta `$PORT` do Render (local cai em 8080). Health check em `/health`.

Via manual: **New > Web Service** → conecte o repo, **Runtime: Docker**, Dockerfile Path `./backend/Dockerfile`, Docker Context `./backend`, plano Free, Health Check Path `/health`, mesmas env vars.

Notas do plano Free: o serviço **dorme sem tráfego** (primeira requisição demora ~1 min); logs mostram `Banco pronto + seed ok`. Anote a URL: `https://SEU-SERVICO.onrender.com`.

### 3. Front — Vercel (`frontend/vercel.json` já com rewrites p/ SPA)

1. Na Vercel: **Add New > Project** → importe o repo → **Root Directory: `frontend`**, Framework: Vite.
2. Environment Variable: `VITE_API_URL=https://SEU-SERVICO.onrender.com` (sem barra no fim).
3. Deploy. Anote a URL: `https://SEU-APP.vercel.app`.

### 4. Amarre o CORS

De volta no Render, ajuste `CORS_ORIGINS=https://SEU-APP.vercel.app` (a API rejeita qualquer outra origem) e **redeploy** a API. Teste no navegador: login + `/em-alta` + abrir um restaurante.

### 5. Smoke test pós-deploy

```bash
API=https://SEU-SERVICO.onrender.com
curl $API/health
curl -X POST $API/api/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"user@demo.com","password":"demo123"}'
```

## Troubleshooting

- **CORS no navegador**: confira `CORS_ORIGINS` no Render == URL exata da Vercel (https + sem `/` no fim).
- **Front com tela em branco em `/restaurants/:id`**: faltou o `frontend/vercel.json` (rewrites) — já está no repo.
- **API lenta na 1ª chamada**: plano free do Render dorme; aguarde ~1 min.
- **Chat sem IA (`usando fallback` no log)**: cota do `LLM_MODEL` esgotada — troque `LLM_MODEL` (ex. `gemini-3.5-flash-lite`) ou suba o plano. Places é cota separada.
- **`VITE_API_URL` trocada depois do deploy**: precisa **rebuild** na Vercel (a var entra no build, não em runtime).
