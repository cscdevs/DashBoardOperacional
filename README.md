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

```
DashboardOrganizacional/
├── src/                          # Frontend (React + Vite)
│   ├── pages/RotasSupervisao.jsx # Página do relatório
│   ├── components/map/RotasMap.jsx
│   └── services/api.js           # Cliente HTTP da API
├── server/                       # Backend (Express + mssql)
│   ├── src/server.js             # API + cache em memória
│   ├── src/db.js                 # Pool de conexão SQL Server
│   ├── src/reports/
│   │   ├── rotas-supervisao.sql  # A query
│   │   └── rotas-supervisao.js   # Normalização + agrupamento p/ mapa
│   └── src/geo/coordenadas.js    # Coordenadas por cidade/UF
└── vite.config.js                # Proxy /api -> http://localhost:3001
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
| POST | `/api/cache/limpar` | Invalida o cache em memória |

## Adicionando novos relatórios

1. Crie `server/src/reports/<nome>.sql` e `<nome>.js` (espelhe `rotas-supervisao`).
2. Exponha um endpoint em `server/src/server.js`.
3. Crie a página em `src/pages/` e adicione a função no `src/services/api.js`.
4. Registre a rota em `src/App.jsx` e o item no menu em `src/components/layout/AppLayout.jsx`
   (e no catálogo em `src/pages/Dashboard.jsx`).