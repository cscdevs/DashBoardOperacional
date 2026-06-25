# Infraestrutura — acesso externo aos dados

A plataforma roda **em containers na VPS** (Docker + Portainer + Traefik) e lê o
SQL Server interno **ao vivo** por uma **rede privada Tailscale**. O banco nunca
é exposto à internet. Guia de deploy do VPS em [../TUNEL-VPS.md](../TUNEL-VPS.md).

## Arquitetura (método container)

```
Navegador ─HTTPS─▶ Traefik ─▶ frontend (nginx) ─/api─▶ backend (Node) ─▶ [Tailscale subnet router] ─▶ SQL Server
   domínio          basic-auth   container VPS          container VPS        máquina interna folha-keren     192.168.0.58
```

- **Frontend e backend são containers na VPS** (`docker-compose-prd.yml`).
- O **backend** conecta em `192.168.0.58:1433` graças ao **subnet router** do
  Tailscale: a máquina interna `folha-keren` anuncia a rota `192.168.0.58/32`
  pra tailnet, e a VPS aceita a rota (`tailscale up --accept-routes`).
- **Segredos** (senha do banco, chaves STC) ficam no **Portainer** (env da
  stack), nunca no YAML versionado.
- Dados **ao vivo**: `CACHE_TTL_SECONDS=30` + botão ↻ "Atualizar" no header.

## Papel da máquina interna (`folha-keren`)

Nesta arquitetura ela é **só o subnet router** — não roda mais o backend.

| Item | Valor |
|---|---|
| Nome Tailscale | `folha-keren` (IP `100.85.93.84`) |
| Tailnet | `pportztecnologia` |
| Rota anunciada | `192.168.0.58/32` (o SQL Server) |
| SQL Server | `192.168.0.58:1433`, banco `SAR2G_WORKS_PRD`, user `sar2g` |

Comando que habilita o subnet router (já aplicado):

```powershell
tailscale set --advertise-routes=192.168.0.58/32
```

> ⚠️ **Aprovar a rota** no admin do Tailscale: Machines → `folha-keren` →
> Edit route settings → habilitar `192.168.0.58/32`. Sem isso a VPS não enxerga.

> ⚠️ A máquina precisa **ficar ligada** com o Tailscale conectado.

## Resiliência a quedas de conexão

Como a leitura é ao vivo, o backend tem um **cache resiliente** ([server/src/cache.js](../server/src/cache.js))
para a plataforma não cair quando a internet desta máquina oscila:

- **stale-while-revalidate**: responde na hora com o último dado e atualiza em background.
- **stale-if-error**: se o banco ficar inacessível, mantém e serve o último dado bom (não dá erro).
- **persistência em disco**: grava cada snapshot (volume `dashboard_cache` em `/app/.cache`);
  no boot, sobe já com os dados pré-carregados — mesmo reiniciando durante uma queda.
- **aquecimento no boot**: pré-carrega os relatórios assim que o backend sobe.

Endpoints úteis: `GET /api/status` (idade dos dados em cache) e `POST /api/cache/limpar`
(força atualização — o botão ↻ do header). Para os dados sobreviverem a um
**redeploy** do container, mantenha o volume `dashboard_cache` no compose.

## Segurança — restringir a rota por ACL (recomendado)

Sem ACL, qualquer dispositivo da tailnet alcança o `192.168.0.58:1433`. Limite
para que **só a VPS** acesse o banco. Exemplo no admin do Tailscale (Access Controls):

```jsonc
{
  "acls": [
    { "action": "accept", "src": ["tag:vps"], "dst": ["192.168.0.58:1433"] }
  ]
}
```

(Aplique a tag `tag:vps` ao host da VPS no admin.)

## Scripts (modo alternativo: backend na máquina interna)

Os scripts abaixo configuram o backend para rodar **nesta máquina** como serviço
Windows (em vez de container na VPS). **Não são usados no método container atual**
— ficam aqui caso você queira voltar a esse modelo. O serviço `DashboardsAPI`
está **parado e desabilitado**.

- `setup-service.ps1` — cria/recria o serviço Windows `DashboardsAPI` (NSSM).
- `setup-firewall.ps1` — restringe a porta 3001 à faixa Tailscale.

Para reativar esse modo: rodar os dois scripts (admin) e reverter o `nginx.conf`
para apontar `/api` ao IP Tailscale `100.85.93.84:3001`.
