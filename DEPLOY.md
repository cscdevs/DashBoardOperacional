# Deploy — Plataforma de Relatórios (arquitetura nuvem)

Arquitetura escolhida: o **MOTOR** roda dentro da empresa (lê o SQL Server),
resolve as coordenadas e **grava** um snapshot no **Supabase** (Postgres
gerenciado). O **backend no VPS** apenas **lê** do Supabase e serve o relatório.
O SQL Server interno nunca é exposto à internet.

```
EMPRESA                         SUPABASE (Postgres + TLS)        VPS (IP fixo)
SQL Server ─▶ MOTOR (Node) ──────▶ rotas_supervisao ◀────────── Backend (lê) ─▶ Frontend ─▶ usuários
 (interno)    agendado, saída                                    DATA_SOURCE=supabase
```

## 1. Supabase (já configurado)

- Projeto: `nysqsvfvhfwvohpqgold` (região sa-east-1).
- Tabelas: `rotas_supervisao` (snapshot) e `sincronizacoes` (log). Ver
  [server/src/sync/schema.sql](server/src/sync/schema.sql).
- **RLS habilitado** nas duas tabelas: só a `service_role`/conexão Postgres
  (server-side) acessa. As keys `anon`/públicas não leem nada.
- Conexão usada pela aplicação: **pooler** `aws-1-sa-east-1.pooler.supabase.com`,
  porta `6543`, usuário `postgres.nysqsvfvhfwvohpqgold`.

## 2. MOTOR (dentro da empresa)

Roda numa máquina com acesso ao SQL Server (`192.168.0.58`) e Node.js 20+.
Só faz conexões de **saída** (SQL Server interno + HTTPS/TLS pro Supabase),
então funciona com IP dinâmico e sem abrir porta no firewall.

### Configuração (`server/.env`)

```
# SQL Server (origem)
DB_SERVER=192.168.0.58
DB_PORT=1433
DB_DATABASE=SAR2G_WORKS_PRD
DB_USER=sar2g
DB_PASSWORD="..."

# Supabase (destino)
SUPABASE_DB_HOST=aws-1-sa-east-1.pooler.supabase.com
SUPABASE_DB_PORT=6543
SUPABASE_DB_USER=postgres.nysqsvfvhfwvohpqgold
SUPABASE_DB_PASSWORD=...
SUPABASE_DB_NAME=postgres
```

### Rodar manualmente

```bash
cd server
npm install
node src/sync/gerar-e-enviar.js
```

Faz `TRUNCATE + INSERT` em transação (se falhar, faz ROLLBACK e o snapshot
anterior fica intacto) e registra a execução em `sincronizacoes`.

### Agendar (Windows — Agendador de Tarefas)

Frequência definida: **1x/dia, 03:00**. Agende o wrapper
[run-sync.cmd](server/src/sync/run-sync.cmd) (ele acha a pasta do projeto
sozinho e grava log em `server/logs/sync-AAAA-MM-DD.log`).

Via PowerShell (ajuste só o caminho do projeto). "Run whether logged on or not"
exige informar a conta/senha do serviço:

```powershell
$cmd = "C:\caminho\para\DashboardOrganizacional\server\src\sync\run-sync.cmd"
$acao    = New-ScheduledTaskAction -Execute $cmd
$gatilho = New-ScheduledTaskTrigger -Daily -At 03:00
$princ   = New-ScheduledTaskPrincipal -UserId "DOMINIO\conta_servico" -LogonType Password -RunLevel Limited
Register-ScheduledTask -TaskName "Sync Rotas Supervisao" -Action $acao -Trigger $gatilho `
  -Principal $princ -Description "Motor: SQL Server -> Supabase (1x/dia)"
# O Windows pedirá a senha da conta ao registrar (-Password também pode ser passado).
```

Versão simples (roda só quando o usuário está logado — bom pra testar):

```powershell
$cmd = "C:\caminho\para\DashboardOrganizacional\server\src\sync\run-sync.cmd"
$acao    = New-ScheduledTaskAction -Execute $cmd
$gatilho = New-ScheduledTaskTrigger -Daily -At 03:00
Register-ScheduledTask -TaskName "Sync Rotas Supervisao" -Action $acao -Trigger $gatilho
```

Testar a tarefa na hora (sem esperar as 03:00):

```powershell
Start-ScheduledTask -TaskName "Sync Rotas Supervisao"
# acompanhe: server\logs\sync-<data>.log  e a tabela `sincronizacoes` no Supabase
```

> Atualizar a geocodificação (novos endereços) antes de sincronizar é opcional:
> `node src/scripts/geocode-rotas.js` (e `GEOCODE_RETRY_NULOS=1` p/ reprocessar falhas).

## 3. Backend + Frontend (VPS)

O backend no VPS **não** precisa do driver do SQL Server nem acessar a empresa —
ele só lê do Supabase.

### Backend (`server/.env` no VPS)

```
DATA_SOURCE=supabase
PORT=3001
CACHE_TTL_SECONDS=300

SUPABASE_DB_HOST=aws-1-sa-east-1.pooler.supabase.com
SUPABASE_DB_PORT=6543
SUPABASE_DB_USER=postgres.nysqsvfvhfwvohpqgold
SUPABASE_DB_PASSWORD=...
SUPABASE_DB_NAME=postgres
```

```bash
cd server
npm install
node src/server.js        # ou rode sob PM2 / serviço systemd
```

### Frontend

```bash
npm install
npm run build             # gera dist/
```

Sirva o `dist/` no Nginx e faça proxy de `/api` para o backend (porta 3001).
Veja [nginx.conf](nginx.conf) e [Dockerfile](Dockerfile)/[docker-compose.yml](docker-compose.yml)
como base.

## 4. Pendências de segurança (antes de ir pra internet)

- [ ] **Autenticação real no backend** — hoje o login é mock no frontend e a API
      é aberta. Qualquer um com a URL baixa os dados. Implementar antes de expor.
- [ ] **HTTPS** no VPS (Let's Encrypt / Nginx).
- [ ] Rotacionar segredos que trafegaram fora do `.env` (ex.: tokens colados em
      chat) e manter `.env` fora do Git (já está no `.gitignore`).
```
