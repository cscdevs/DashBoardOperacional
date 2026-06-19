# Portal CSC - Dashboard Organizacional

Bem-vindo ao repositório do **Portal de Transparência de Projetos (Centro de Serviços Compartilhados)**. 

Este projeto é uma plataforma web premium, responsiva e dinâmica construída com foco na visualização de dados operacionais e distribuição geográfica através de mapas interativos.

## 🚀 Tecnologias Utilizadas

- **React 19** + **Vite**
- **Leaflet & React-Leaflet** (Mapas interativos OpenStreetMap)
- **Lucide React** (Ícones SVG)
- **Vanilla CSS** (Com suporte nativo a Design Tokens e Modo Escuro)
- **Docker** e **Nginx** (Pronto para Portainer)

## 🎨 Design System & Modo Escuro

A plataforma foi construída inteiramente sobre um Design System proprietário (documentado no arquivo [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md)). 
Ela suporta nativamente a inversão de cores inteligente para **Modo Escuro (Dark Mode)**, incluindo a conversão automática do brilho dos mapas de satélite para não prejudicar a visão do usuário.

## 🐳 Como rodar no Portainer (Produção)

Este projeto já acompanha um `docker-compose.yml` e um `Dockerfile` otimizado em múltiplos estágios (Node para build e Nginx para servir arquivos estáticos de forma ultra-rápida, com rotas tratadas para SPA).

1. Abra seu Portainer.
2. Acesse **Stacks** > **Add stack**.
3. Nomeie a stack como `dashboard-csc`.
4. Você pode apontar diretamente para este repositório do GitHub na opção "Repository", ou colar o conteúdo do arquivo `docker-compose.yml` e alterar a porta `8080` de acordo com a necessidade do seu Proxy Reverso.
5. Se estiver utilizando Nginx Proxy Manager ou Traefik, basta mapear o domínio `dashboard.csc.pportz.com.br` para o contêiner gerado na porta `80`.

## 💻 Como rodar Localmente (Desenvolvimento)

Certifique-se de ter o **Node.js 20+** instalado em sua máquina.

1. Clone o repositório
   ```bash
   git clone https://github.com/pportztecnologia/DashboardOrganizacional.git
   cd DashboardOrganizacional
   ```

2. Instale as dependências (Devido a algumas bibliotecas estritas de mapas, utilize a flag de compatibilidade se necessário)
   ```bash
   npm install --legacy-peer-deps
   ```

3. Inicie o servidor de desenvolvimento
   ```bash
   npm run dev
   ```

4. Acesse `http://localhost:5173` no seu navegador.
