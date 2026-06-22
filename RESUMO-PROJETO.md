# Plataforma de Relatórios — Resumo do Projeto

**Relatório inicial:** Rotas de Supervisão (locais de serviço ativos por empresa, base operacional e supervisor).
**Data deste resumo:** 22/06/2026

---

## 1. Visão geral

Plataforma web para visualização de relatórios operacionais. O primeiro relatório
mostra os **locais de serviço ativos** num mapa, coloridos por supervisor, com
filtros e exportação.

**Tecnologias**
- **Frontend:** React + Vite, mapa com Leaflet (OpenStreetMap) + agrupamento de marcadores.
- **Backend:** Node.js + Express, conexão com **SQL Server** (origem dos dados).
- **Nuvem:** **Supabase** (PostgreSQL gerenciado) como base de leitura em produção.

---

## 2. Arquitetura de dados (produção)

```
EMPRESA (rede interna)            SUPABASE (PostgreSQL + TLS)        VPS (internet)
SQL Server ──▶ MOTOR (Node) ──────────▶  rotas_supervisao  ◀──────── Backend (lê) ──▶ Frontend ──▶ usuários
 (interno)     lê + processa,            snapshot do relatório         DATA_SOURCE=supabase
               grava (saída)
```

- O **MOTOR** roda **dentro da empresa** (onde o SQL Server é acessível), processa o
  relatório e **grava** o resultado no Supabase. Só faz conexão de **saída** — não
  expõe o SQL Server à internet e funciona mesmo com IP dinâmico.
- O **backend no VPS** apenas **lê** do Supabase (`DATA_SOURCE=supabase`) e serve o
  relatório. Não precisa do driver de SQL Server nem de acesso à rede interna.
- Em desenvolvimento, o backend lê direto do SQL Server (`DATA_SOURCE=sqlserver`).

---

## 3. Etapas concluídas

### 3.1. Análise e base do relatório
- Mapeamento da query de origem (SQL Server) e da estrutura do projeto.
- Normalização dos dados e montagem do relatório (endereço, telefone, contato etc.).

### 3.2. Localização no mapa — evolução
1. Início: geocodificação de endereços via Nominatim/OpenStreetMap (com cache),
   caindo no centro da cidade quando não encontrava o endereço exato.
2. **Solução final:** a query passou a trazer **LATITUDE/LONGITUDE direto do banco**.
   Resultado: **100% dos locais com coordenada precisa** (a geocodificação externa
   deixou de ser necessária).

### 3.3. Validação das coordenadas
- Cada coordenada do banco é **validada contra a cidade** do endereço (distância até
  o centro da cidade). Se passar de **60 km**, é marcada como **suspeita** e exibe um
  aviso no popup ("verificar cadastro"). Hoje restam pouquíssimos casos — provável
  erro de cadastro na origem.

### 3.4. Identificação do supervisor
- A coluna de "área de supervisão" é um rótulo livre da rota (ex.:
  `(F) SME - ZONA SUL - CLEITON`). Criamos um **de-para curado** que extrai o **nome
  do supervisor** de cada rótulo (86 supervisores; rotas sem pessoa viram
  "Sem supervisor").

### 3.5. Limpeza de dados — contratos encerrados
- A query trazia **contratos encerrados** (ex.: Caixa Econômica). Identificamos que
  `CONTRATO.SITUACAOCONTRATO = 6` = encerrado e adicionamos o filtro
  `AND CONTRATO.SITUACAOCONTRATO <> 6`.
- **Impacto:** relatório de **4.753 → 3.623 linhas** (removidos os encerrados).
  Clientes com contrato ativo **e** um antigo encerrado continuam presentes.

### 3.6. Integração com a nuvem (Supabase)
- Criação do schema (`rotas_supervisao` + `sincronizacoes` para log).
- **RLS habilitado** nas tabelas (acesso só server-side).
- **Motor de sincronização** (`server/src/sync/gerar-e-enviar.js`): lê o SQL Server e
  grava o snapshot no Supabase em transação (TRUNCATE + INSERT; faz ROLLBACK em erro).
- Backend adaptado para ler do Supabase via flag `DATA_SOURCE`.

### 3.7. Experiência de uso (UI/UX)
- **Filtros:** busca livre, empresa, base operacional e **cliente** (nome resumido).
- **Legenda de supervisores** clicável: popover flutuante (abre por botão), cada
  supervisor com cor própria; **clicar filtra o mapa** por aquele supervisor.
- **Cores vivas** e distintas por supervisor; **borda preta** nos marcadores.
- **Title Case** nos textos (o banco vem em MAIÚSCULAS) para leitura mais agradável.
- **Popup do marcador:** supervisor, local, **cliente**, endereço, telefone, base e
  aviso de coordenada suspeita.
- **Modo escuro como padrão** (com alternância para o claro, preferência salva).
- **KPIs:** locais de serviço (contagem correta por local distinto), clientes,
  supervisores e cidades.
- **Exportação CSV** (compatível com Excel).

---

## 4. Estado atual

| Indicador | Valor |
|---|---|
| Linhas no relatório | 3.623 |
| Locais com coordenada precisa | 100% (do banco) |
| Supervisores identificados | 86 |
| Coordenadas suspeitas (a verificar) | pouquíssimas |
| Fonte em produção | Supabase (snapshot sincronizado) |

---

## 5. Como atualizar os dados

- **Produção (nuvem):** rodar o motor `node src/sync/gerar-e-enviar.js` dentro da
  empresa — previsto para rodar **automaticamente 1x/dia** via Agendador de Tarefas
  do Windows (ver `DEPLOY.md`). Para atualizar na hora, basta executar o motor.
- **Desenvolvimento:** limpar o cache da API (`POST /api/cache/limpar`) e recarregar.
- Editar a query (`.sql`) passa a valer apenas limpando o cache (não precisa
  reiniciar o servidor).

---

## 6. Pendências antes de publicar na internet

- [ ] **Autenticação real no backend** — hoje o login é simulado no frontend e a API
      é aberta. **Obrigatório** antes de expor publicamente.
- [ ] **Deploy no VPS** (backend + frontend) com `DATA_SOURCE=supabase`.
- [ ] **HTTPS** no VPS.
- [ ] **Agendar o motor** no servidor interno (1x/dia).
- [ ] **Rotacionar segredos** que trafegaram durante a configuração (token do
      Supabase e senha do banco) e manter o `.env` fora do versionamento.

---

## 7. Documentos relacionados no repositório

- `README.md` — visão geral e como rodar em desenvolvimento.
- `DEPLOY.md` — passo a passo de deploy no VPS e agendamento do motor.
- `server/src/sync/schema.sql` — esquema do banco na nuvem.
