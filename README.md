# 🌍 Dashboard Organizacional - Portal CSC

Plataforma de visualização e monitoramento geográfico de projetos e bases operacionais. Permite o acompanhamento em tempo real do status das bases espalhadas pelo Brasil, exibição de alertas críticos e KPIs através de um mapa dinâmico no estilo Google Maps.

## 🚀 Como Rodar

### Pré-requisitos
Certifique-se de ter o **Node.js 20+** instalado para rodar localmente.

### Opção A: Rodar Localmente (Desenvolvimento)
No terminal, dentro da pasta do projeto:

```bash
npm install --legacy-peer-deps
npm run dev
```
Acesse no navegador: `http://localhost:5173`.

### Opção B: Portainer + Traefik (Produção)
Para realizar o build e o deploy na VPS via Portainer:

**1. Build das imagens na VPS:** Para contornar restrições do Portainer com a diretiva build, construa as imagens manualmente na VPS primeiro:

```bash
git clone https://github.com/pportztecnologia/DashboardOrganizacional.git
cd DashboardOrganizacional

# Constrói a imagem do Frontend
docker build -t dashboard-csc-local:latest .

# Garante que a rede do Traefik exista
docker network create --attachable portz 2>/dev/null || true
```

**2. Stack YAML para o Portainer:** Vá no Portainer -> Stacks -> Add stack. Você pode colar diretamente o conteúdo abaixo ou usar o arquivo `docker-compose.yml`:

```yaml
version: '3.8'

services:
  frontend:
    image: dashboard-csc-local:latest
    networks:
      - portz
    deploy:
      restart_policy:
        condition: on-failure
      labels:
        - "traefik.enable=true"
        - "traefik.http.routers.dashboard-csc.rule=Host(`dashboard.csc.pportz.com.br`)"
        - "traefik.http.routers.dashboard-csc.entrypoints=websecure"
        - "traefik.http.routers.dashboard-csc.tls=true"
        - "traefik.http.routers.dashboard-csc.tls.certresolver=letsencryptresolver"
        - "traefik.http.services.dashboard-csc.loadbalancer.server.port=80"

networks:
  portz:
    external: true
```

**3. Atualizar deploy no Portainer:** Sempre que fizer um push de novos códigos, acesse a VPS e refaça o build:

```bash
cd DashboardOrganizacional
git pull origin main
docker build -t dashboard-csc-local:latest .
```
Depois, acesse a stack `dashboard-csc` no Portainer e clique em **Pull and redeploy**.

## 📊 Funcionalidades
- **Mapa Interativo (Leaflet):** Navegação fluída (zoom/arrasto) pelo mapa do Brasil com a camada OpenStreetMap.
- **Visualização de Bases:** Marcadores customizados de bases com informações de projetos ativos ao clicar.
- **Sistema de Status Visual:** Cores padronizadas do Design System (Verde = Normal, Amarelo = Atenção, Vermelho = Crítico).
- **Indicadores (KPIs):** Contagem dinâmica de bases, projetos e alertas no topo da tela.
- **Modo Escuro (Dark Mode):** Alternância instantânea de tema no cabeçalho com filtro inteligente que escurece o mapa sem quebrar a paleta visual.

## 🧠 Arquitetura

**Stack:**
| Camada | Tecnologia |
|---|---|
| Frontend | React, Vite, React Router DOM |
| Mapas | Leaflet, React-Leaflet |
| Ícones | Lucide React |
| Deploy | Docker / Portainer + Traefik (Nginx interno) |

**Comunicação (Proxy Reverso):** 
O Nginx, hospedando a aplicação React construída, intercepta rotas desconhecidas e repassa para `/index.html` garantindo o funcionamento do React Router (SPA).

## 📁 Estrutura
```text
├── public/              # Assets estáticos gerais
├── src/
│   ├── assets/          # Logos e SVGs do Design System
│   ├── components/
│   │   ├── layout/      # Estrutura principal da tela (Sidebar, Header)
│   │   ├── map/         # Integração com o React-Leaflet
│   │   └── ui/          # Componentes reutilizáveis (Card, Button)
│   ├── pages/           # Views principais (Dashboard)
│   ├── App.jsx          # Rotas principais e gerenciador do Dark Mode
│   ├── index.css        # Variáveis do Design System e Classes
│   └── main.jsx         # Entrypoint React
├── Dockerfile           # Dockerfile Frontend multi-stage (Node -> Nginx)
├── docker-compose.yml   # Modelo de Stack para Portainer
├── nginx.conf           # Roteamento do React
├── package.json
└── vite.config.js       # Config Vite
```

## 🔮 Melhorias Futuras
- **Integração com Backend:** Trocar o array de *Mock Data* do `BrazilMap.jsx` para requisições Fetch/Axios lendo de uma API real.
- **Telas Internas:** Desenvolver a tabela na página `/usuarios` e gráficos detalhados na visão de relatórios.
- **Filtros no Mapa:** Adicionar botões para filtrar o mapa apenas por bases em estado de "Alerta".
