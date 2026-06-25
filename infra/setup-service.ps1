# =====================================================================
#  Recria o serviço Windows "DashboardsAPI" (backend provedor de dados).
#  Roda o backend Express (node src/server.js, porta 3001) como serviço
#  com auto-start no boot e auto-restart em caso de falha, via NSSM.
#
#  COMO RODAR (PowerShell COMO ADMINISTRADOR):
#    powershell -ExecutionPolicy Bypass -File infra\setup-service.ps1
#
#  Pré-requisitos:
#    - Node.js instalado (ajuste $node se o caminho mudar).
#    - NSSM instalado:  winget install --id NSSM.NSSM
#    - server\.env preenchido (credenciais do SQL Server e da API STC).
# =====================================================================
$ErrorActionPreference = 'Stop'

# ---- Ajuste estes caminhos se a máquina/instalação mudar ----
$repo = 'C:\Users\Desenvolvedor-works\Desktop\DashBoards'
$dir  = "$repo\server"
$node = 'C:\Program Files\nodejs\node.exe'
$svc  = 'DashboardsAPI'
# NSSM instalado via winget fica neste padrão de caminho; ajuste a versão se preciso:
$nssm = (Get-ChildItem 'C:\Users\*\AppData\Local\Microsoft\WinGet\Packages\NSSM.NSSM_*\*\win64\nssm.exe' -ErrorAction SilentlyContinue | Select-Object -First 1).FullName
if (-not $nssm) { throw 'nssm.exe nao encontrado. Instale com: winget install --id NSSM.NSSM' }

$log = "$dir\logs\setup-service.log"
New-Item -ItemType Directory -Force -Path "$dir\logs" | Out-Null
"=== setup $(Get-Date -Format o) ===" | Out-File $log -Encoding utf8

try {
  # Libera a porta 3001: encerra qualquer node avulso escutando nela
  $conns = Get-NetTCPConnection -LocalPort 3001 -State Listen -ErrorAction SilentlyContinue
  foreach ($c in $conns) {
    try { Stop-Process -Id $c.OwningProcess -Force -ErrorAction Stop; "porta 3001: matei PID $($c.OwningProcess)" | Out-File $log -Append -Encoding utf8 } catch {}
  }

  # Remove serviço anterior (idempotente)
  if (Get-Service -Name $svc -ErrorAction SilentlyContinue) {
    & $nssm stop $svc | Out-Null
    & $nssm remove $svc confirm | Out-Null
    "servico anterior removido" | Out-File $log -Append -Encoding utf8
  }

  # Instala e configura
  & $nssm install $svc $node 'src\server.js'
  & $nssm set $svc AppDirectory $dir
  & $nssm set $svc DisplayName 'Dashboards API (provedor de dados SQL)'
  & $nssm set $svc Description 'Backend Express: le o SQL Server interno e serve a plataforma via Tailscale (porta 3001).'
  & $nssm set $svc Start SERVICE_AUTO_START
  & $nssm set $svc AppStdout "$dir\logs\service-out.log"
  & $nssm set $svc AppStderr "$dir\logs\service-err.log"
  & $nssm set $svc AppRotateFiles 1
  & $nssm set $svc AppRotateBytes 5242880
  & $nssm set $svc AppExit Default Restart
  & $nssm set $svc AppRestartDelay 3000

  Start-Service -Name $svc
  Start-Sleep -Seconds 4
  $s = Get-Service -Name $svc
  "servico '$svc' status: $($s.Status), StartType: $($s.StartType)" | Out-File $log -Append -Encoding utf8
  "OK" | Out-File $log -Append -Encoding utf8
  Write-Output "Servico '$svc' -> $($s.Status)"
} catch {
  "ERRO: $($_.Exception.Message)" | Out-File $log -Append -Encoding utf8
  Write-Error $_.Exception.Message
}
