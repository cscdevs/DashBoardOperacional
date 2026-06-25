# Deploy na VPS (Docker + Portainer) com acesso ao banco via Tailscale

A plataforma roda **em containers na VPS** (atrás do Traefik) e lê o SQL Server
interno **ao vivo** por uma rede privada Tailscale. O banco nunca é exposto.

```
Navegador ─HTTPS─▶ Traefik ─▶ frontend (nginx) ─/api─▶ backend (Node) ─▶ [Tailscale] ─▶ SQL Server
   domínio          basic-auth   container             container         subnet router    192.168.0.58
```

Stack: [docker-compose-prd.yml](docker-compose-prd.yml). Imagens: [Dockerfile](Dockerfile)
(frontend) e [server/Dockerfile](server/Dockerfile) (backend). Proxy `/api`: [nginx.conf](nginx.conf).

> Assume Portainer em **Swarm**. Se for standalone, veja a nota no topo do
> `docker-compose-prd.yml` (troca `deploy:`→`labels:` e `overlay`→`bridge`).

---

## 0. Aprovar a rota do banco (admin Tailscale)

https://login.tailscale.com/admin/machines → máquina `folha-keren` → ⋯ →
**Edit route settings** → aprovar **`192.168.0.58/32`** → Save.
(O lado interno já anuncia a rota; ver [infra/README.md](infra/README.md).)

## 1. Tailscale no host da VPS

```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up --accept-routes      # mesma tailnet: pportztecnologia
tailscale status | grep folha-keren
nc -vz 192.168.0.58 1433               # deve conectar ("succeeded")
```

> IP forwarding (padrão em hosts Docker): `sysctl net.ipv4.ip_forward` = `1`.

## 2. Buildar as imagens (Swarm não builda no deploy)

```bash
git clone <URL_DO_REPO> dashboard && cd dashboard
docker build -t dashboard-frontend:latest -f Dockerfile .
docker build -t dashboard-backend:latest  -f server/Dockerfile ./server
```

## 3. Gerar a senha do login (basic-auth)

```bash
docker run --rm httpd:alpine htpasswd -nbB admin 'SUA_SENHA_FORTE'
```

No `docker-compose-prd.yml`, substitua o valor de `...basicauth.users=` pelo hash
gerado, **dobrando cada `$` → `$$`**.

## 4. Subir a stack no Portainer

Stacks → Add stack → cole o `docker-compose-prd.yml`. Em **Environment variables**
(é onde entram os segredos — nunca no YAML):

| Variável | Valor |
|---|---|
| `DB_USER` | `sar2g` |
| `DB_PASSWORD` | (senha do SQL Server) |
| `STC_KEY` | (integration key da STC) |
| `STC_USER` | `webservice` |
| `STC_PASS` | (senha da STC) |

Deploy.

## 5. Testar

Abrir `https://dashboard.csc.pportz.com.br` → login → relatórios com dados ao
vivo. O ícone **↻** no header limpa o cache e recarrega na hora.

---

## Troubleshooting

| Sintoma | Causa provável | Ação |
|---|---|---|
| backend não conecta no banco | rota Tailscale não aprovada / VPS sem `--accept-routes` | aprovar rota; `tailscale up --accept-routes`; `nc -vz 192.168.0.58 1433` |
| 502 no `/api` | container backend caiu ou máquina interna desligada | `docker service logs <stack>_dashboard_backend --tail 50` |
| dados "velhos" | cache de 30s | clicar no ↻ |
| `image not found` no deploy | imagens não buildadas no nó | refazer o passo 2 |
| qualquer device da tailnet acessa o banco | falta ACL | restringir `192.168.0.58:1433` à VPS (ver infra/README.md) |

**Posições ao vivo (STC)**: a API da STC é pública (HTTPS); o backend a consome
direto, sem depender da rota Tailscale.
