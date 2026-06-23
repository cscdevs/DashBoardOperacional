# Plataforma de Relatórios

Plataforma web para visualização de relatórios operacionais, baseada no design system do
DashboardOrganizacional (React + Vite + Leaflet). O backend conecta ao **SQL Server**, executa
as queries dos relatórios e serve os dados para o front.

## Primeiro relatório: Rotas de Supervisão

Locais de serviço ativos por empresa, base operacional e supervisor. Inclui:

- **KPIs**: total de locais, clientes, supervisores e cidades.
- **Mapa** (Leaflet/OpenStreetMap): pontos agrupados por **cidade/UF**. Como a query não
  retorna latitude/longitude, as coordenadas vêm de uma tabela fixa
  (`server/src/geo/coordenadas.js`); cidades não mapeadas usam o centro da UF (marcado como
  *posição aproximada* no popup).
- **Filtros**: busca livre + empresa, base operacional, UF e supervisor.
- **Tabela** com exportação para **CSV** (compatível com Excel).

## Estrutura

Cada relatório é um **módulo autocontido**. Só a *home* e o *login* ficam fora dos
módulos; o que é compartilhado (UI, layout, contexto de auth, helper HTTP, infra do
backend) também fica fora.

```
DashboardOrganizacional/
├── src/                              # Frontend (React + Vite)
│   ├── pages/                        # Telas fora dos módulos
│   │   ├── Dashboard.jsx             #   home / catálogo de relatórios
│   │   └── Login.jsx
│   ├── modules/                      # Um módulo por relatório (autocontido)
│   │   └── rotas-supervisao/
│   │       ├── RotasSupervisao.jsx   #   página do relatório
│   │       ├── api.js                #   chamadas de API do relatório
│   │       ├── components/RotasMap.jsx
│   │       └── utils/cores.js        #   cores por supervisor
│   ├── components/ui/ + layout/      # Compartilhado (Button, Card, AppLayout)
│   ├── context/AuthContext.jsx       # Compartilhado
│   ├── services/api.js               # Helper HTTP compartilhado (getJSON, health)
│   └── utils/texto.js                # Compartilhado (tituloCase)
├── server/                           # Backend (Express + mssql)
│   ├── src/server.js                 # API + cache em memória (registra cada relatório)
│   ├── src/db.js                     # Pool de conexão SQL Server (compartilhado)
│   ├── src/geo/                      # Coordenadas/geocode por cidade/UF (compartilhado)
│   ├── src/sync/                     # Motor SQL Server -> Supabase (compartilhado)
│   └── src/reports/                  # Um módulo por relatório
│       └── rotas-supervisao/
│           ├── rotas-supervisao.sql        # a query
│           ├── rotas-supervisao.js         # normalização (fonte SQL Server)
│           ├── rotas-supervisao-nuvem.js   # leitura do snapshot Supabase
│           └── supervisores.js             # de-para rótulo da rota -> supervisor
└── vite.config.js                    # Proxy /api -> http://localhost:3001
```

## Como rodar (desenvolvimento)

Pré-requisito: **Node.js 20+**.

### 1. Backend

```bash
cd server
cp .env.example .env      # edite com as credenciais do SQL Server
npm install
npm run dev               # sobe em http://localhost:3001
```

Configure o `.env`:

```
DB_SERVER=...
DB_PORT=1433
DB_DATABASE=...
DB_USER=...
DB_PASSWORD=...
DB_ENCRYPT=false
DB_TRUST_SERVER_CERTIFICATE=true
PORT=3001
CACHE_TTL_SECONDS=300
```

### 2. Frontend

```bash
npm install
npm run dev               # sobe em http://localhost:5173
```

O Vite encaminha `/api/*` para o backend automaticamente (ver `vite.config.js`).

Login de teste (mock, herdado do projeto base): `admin@pportz.com.br` / `admin`.

## Endpoints da API

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/health` | Healthcheck |
| GET | `/api/rotas-supervisao` | Relatório completo (`rotas` + `mapa`). `?mapa=false` omite o agrupamento. |
| GET | `/api/fluxo-atestados-faltas` | Atestados + faltas por cliente + faltas disciplinares. Período via `?dataInicial=AAAA-MM-DD&dataFinal=AAAA-MM-DD` (padrão: ano corrente). Cada linha traz `ehDemitido`. |
| POST | `/api/cache/limpar` | Invalida o cache em memória |

## Adicionando novos relatórios

Cada relatório é um módulo. Para criar `<nome>`:

1. **Backend**: crie a pasta `server/src/reports/<nome>/` com `<nome>.sql` + `<nome>.js`
   (espelhe `rotas-supervisao`) e exponha um endpoint em `server/src/server.js`.
2. **Frontend**: crie a pasta `src/modules/<nome>/` com a página `<Nome>.jsx`, um `api.js`
   (usando o helper `getJSON` de `src/services/api.js`) e, se precisar, `components/` e
   `utils/` próprios do módulo.
3. Registre a rota em `src/App.jsx`, o item no menu em
   `src/components/layout/AppLayout.jsx` e o card no catálogo da home
   (`src/pages/Dashboard.jsx`).