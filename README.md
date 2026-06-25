# 💼 Portal CSC - Dashboard Operacional

Plataforma web premium para visualização e acompanhamento de relatórios operacionais. O backend lê os dados **ao vivo** do **SQL Server** corporativo e apresenta visualizações de alta performance em mapas e grids interativos. Em produção, a plataforma roda online (VPS) e alcança o banco interno por uma **rede privada Tailscale** — o SQL Server **nunca é exposto à internet**. Opcionalmente, um motor de sincronização pode exportar snapshots para o **Supabase** (nuvem).

> 🔌 **Acesso externo / deploy:** a topologia que liga a plataforma online ao banco interno (serviço provedor de dados + Tailscale + Traefik) está documentada em **[infra/README.md](infra/README.md)** e **[TUNEL-VPS.md](TUNEL-VPS.md)**.

---

## 🚀 Como Rodar

### Pré-requisitos

O backend requer um arquivo `.env` na pasta `server/` (copie `.env.example`):

```env
# Conexão com SQL Server (Desenvolvimento / Motor)
DB_SERVER=ip_do_banco
DB_PORT=1433
DB_DATABASE=nome_do_banco
DB_USER=usuario
DB_PASSWORD=senha
DB_ENCRYPT=false
DB_TRUST_SERVER_CERTIFICATE=true

# Configuração do Backend
PORT=3001
CACHE_TTL_SECONDS=30   # 30s = dados "ao vivo"; aumente para aliviar o banco
DATA_SOURCE=sqlserver  # 'sqlserver' = lê o banco ao vivo | 'supabase' = lê snapshot da nuvem

# Conexão Supabase (Nuvem)
SUPABASE_DB_HOST=aws-1-sa-east-1.pooler.supabase.com
SUPABASE_DB_PORT=6543
SUPABASE_DB_USER=postgres.SEU_PROJECT_REF
SUPABASE_DB_PASSWORD=sua_senha_do_banco
SUPABASE_DB_NAME=postgres

# API STC (Rastreamento Veicular)
STC_BASE_URL=https://ap3.stc.srv.br/integration/prod
STC_KEY=sua_integration_key
STC_USER=usuario_da_api
STC_PASS=senha_da_api
```

---

### Opção A: Ambiente de Desenvolvimento Completo

**1. Subir o Backend (Node.js)**
```bash
cd server
npm install
npm run dev
# O backend subirá em http://localhost:3001
```

**2. Subir o Frontend (Vite)**
Em um novo terminal na raiz do projeto:
```bash
npm install
npm run dev
# O frontend subirá em http://localhost:5173
```
*Nota: O Vite está configurado para fazer proxy automático de `/api/*` para a porta 3001.*

---

### Opção B: Sincronização de Dados (Motor)

Para rodar o motor que extrai os dados do SQL Server (intranet) e injeta no Supabase (internet):

```bash
cd server
node src/sync/gerar-e-enviar.js
```
*Deve ser agendado no Windows Task Scheduler para rodar 1x ao dia.*

---

## 📊 Funcionalidades

### Rotas de Supervisão
- **Mapa Interativo (Leaflet)**: Plotagem exata de todos os locais de serviço ativos com agrupamento de clusters.
- **Rastreamento STC**: Integração para exibir a posição ao vivo dos veículos e supervisores no mapa.
- **Validação Geográfica**: Coordenadas do banco são checadas em relação ao centro da cidade. Casos > 60km recebem flag visual de "coordenada suspeita".
- **Filtros e Exportação**: Filtragem por empresa, base operacional, UF, supervisor e cliente. Exportação total para CSV.

### Fluxo de Atestados / Faltas
- **Dashboard Analítico**: Acompanhamento de atestados, faltas por cliente e faltas disciplinares.
- **Regras Embutidas**: Identificação automática de funcionários demitidos e segmentação de faltas por período customizado.

### Geração de Cartão de Ponto
- Visão completa do faturamento e controle de cartões de ponto entregues vs. pendências.
- Detalhamento progressivo por supervisão.

### Design System "Premium"
- **Glassmorphism**: Efeitos de vidro fosco em menus e barras laterais.
- **Animações em Cascata**: Entrada fluída de cartões (Staggered Animations).
- **Temas**: Suporte nativo e persistente para Claro / Escuro (Dark Mode automático no mapa e nas sombras volumétricas).

---

## 🧠 Arquitetura

### Stack
| Camada | Tecnologia |
|--------|-----------|
| Backend | Node.js + Express + `mssql` |
| Frontend | React + Vite + Leaflet + Lucide Icons |
| CSS | Vanilla CSS (Variáveis, Glassmorphism, Micro-animações) |
| Nuvem / DB | Supabase (PostgreSQL) + SQL Server |
| Geolocalização| OpenStreetMap (Fallback) + Integração STC |

### Acesso externo em produção (containers na VPS + Tailscale)

Topologia adotada para a plataforma online ler o banco **ao vivo** sem expô-lo:

```
Navegador ─HTTPS─▶ Traefik ─▶ frontend (nginx) ─/api─▶ backend (Node) ─▶ [Tailscale] ─▶ SQL Server ao vivo
   domínio          basic-auth   container VPS          container VPS      subnet router    (nunca exposto)
```

- **Frontend e backend rodam em containers na VPS** (Docker + Portainer), ver [docker-compose-prd.yml](docker-compose-prd.yml).
- O backend alcança o SQL Server interno (`192.168.0.58`) por uma **rede privada Tailscale**: a máquina interna anuncia a rota (`--advertise-routes`) e a VPS a aceita (`--accept-routes`). O banco **nunca** vai pra internet.
- **Segredos** ficam no Portainer (env da stack), nunca no YAML. Dados "ao vivo": cache de 30s + botão **↻ Atualizar** no header.
- Detalhes e passo-a-passo: **[infra/README.md](infra/README.md)** e **[TUNEL-VPS.md](TUNEL-VPS.md)**.

### Padrão de Sincronização (Motor) — alternativa para nuvem
Topologia opcional, hoje usada pelo relatório de Rotas de Supervisão:
- O banco interno (SQL Server) **nunca** é exposto à internet.
- Um script (Motor) rodando na infraestrutura interna consulta, limpa os dados, cruza supervisores, e executa um envio em transação (TRUNCATE + INSERT) para o Supabase.
- A API no VPS consome os dados read-only do Supabase (`DATA_SOURCE=supabase`). Ver [DEPLOY.md](DEPLOY.md).

### Limpeza de Dados
- Exclusão de contratos encerrados (redução de 4.753 para 3.623 linhas operacionais).
- Extração inteligente do nome do supervisor a partir de strings sujas da base legada (Ex: `(F) SME - ZONA SUL - CLEITON` → `Cleiton`).

---

## 📁 Estrutura

```
├── src/                               # Frontend (React + Vite)
│   ├── components/layout/             # Sidebar, Header, Background dinâmico
│   ├── modules/                       # Relatórios isolados por módulo
│   │   ├── fluxo-atestados-faltas/
│   │   ├── geracao-cartao-ponto/
│   │   └── rotas-supervisao/
│   ├── pages/                         # Dashboard principal e Login
│   ├── services/                      # Axios e Helpers de API
│   └── index.css                      # Design System (Tokens, Animations)
├── server/                            # Backend (Express)
│   ├── src/db.js                      # Pool MSSQL
│   ├── src/geo/                       # Lógica de fallback de Coordenadas
│   ├── src/reports/                   # Queries e formatação dos relatórios
│   ├── src/sync/                      # Motor SQL Server -> Supabase
│   └── server.js                      # Rotas da API e Cache em Memória
├── infra/                             # Provisionamento da máquina interna (provedor de dados)
│   ├── setup-service.ps1              #   recria o serviço Windows DashboardsAPI (NSSM)
│   ├── setup-firewall.ps1            #   restringe a porta 3001 à rede Tailscale
│   └── README.md                      #   referência completa da infra de acesso externo
├── TUNEL-VPS.md                       # Guia de deploy do VPS (Tailscale + Traefik + basic-auth)
├── DEPLOY.md                          # Topologia alternativa (Motor -> Supabase) e agendamento
├── DESIGN_SYSTEM.md                   # Documentação visual da marca
├── README.md                          # Este documento
├── nginx.conf / Dockerfile / docker-compose.yml  # Build e deploy do frontend (VPS)
└── vite.config.js                     # Configurações de Proxy do React
```

### Endpoints Principais

| Rota | Descrição |
|------|-----------|
| `GET /api/rotas-supervisao` | Traz o payload das rotas (`?mapa=false` desativa clusters) |
| `GET /api/fluxo-atestados...` | Dados de atestados com filtro de data (`?dataInicial=...`) |
| `POST /api/cache/limpar` | Força a renovação do cache em memória do backend |
| `GET /api/health` | Healthcheck (verifica conexão ao banco baseando-se no `DATA_SOURCE`) |

---

## 🔮 Melhorias Futuras

- [x] Acesso externo ao banco interno **ao vivo** via Tailscale (subnet router), sem expor o SQL Server.
- [x] Deploy da plataforma em **containers** (Docker + Portainer) — ver `docker-compose-prd.yml`.
- [ ] Wirar **Traefik + basic-auth + HTTPS** na stack de container (hoje publica porta 80 direto).
- [ ] Autenticação real no app (OAuth2/JWT) substituindo o login mock.
- [ ] Criação do agendamento diário automático do motor via *Windows Task Scheduler*.
- [ ] Rotatividade de credenciais de banco presentes no `.env`.