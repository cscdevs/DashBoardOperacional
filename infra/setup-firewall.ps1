# =====================================================================
#  Restringe a porta 3001 (Dashboards API): libera SÓ a rede Tailscale
#  (100.64.0.0/10) e bloqueia explicitamente a LAN. O banco e a API de
#  dados nunca ficam acessíveis fora da tailnet privada.
#
#  COMO RODAR (PowerShell COMO ADMINISTRADOR):
#    powershell -ExecutionPolicy Bypass -File infra\setup-firewall.ps1
# =====================================================================
$ErrorActionPreference = 'Stop'
$log = 'C:\Users\Desenvolvedor-works\Desktop\DashBoards\server\logs\setup-firewall.log'
New-Item -ItemType Directory -Force -Path (Split-Path $log) | Out-Null
"=== firewall $(Get-Date -Format o) ===" | Out-File $log -Encoding utf8
try {
  foreach ($n in 'Dashboards API - allow Tailscale','Dashboards API - block LAN') {
    Get-NetFirewallRule -DisplayName $n -ErrorAction SilentlyContinue | Remove-NetFirewallRule -ErrorAction SilentlyContinue
  }
  New-NetFirewallRule -DisplayName 'Dashboards API - allow Tailscale' -Direction Inbound -Action Allow `
    -Protocol TCP -LocalPort 3001 -RemoteAddress 100.64.0.0/10 -Profile Any | Out-Null
  "allow Tailscale criado" | Out-File $log -Append -Encoding utf8
  New-NetFirewallRule -DisplayName 'Dashboards API - block LAN' -Direction Inbound -Action Block `
    -Protocol TCP -LocalPort 3001 -RemoteAddress 192.168.0.0/16,10.0.0.0/8,172.16.0.0/12 -Profile Any | Out-Null
  "block LAN criado" | Out-File $log -Append -Encoding utf8
  "OK" | Out-File $log -Append -Encoding utf8
  Write-Output "Regras de firewall aplicadas (3001 -> so Tailscale)."
} catch {
  "ERRO: $($_.Exception.Message)" | Out-File $log -Append -Encoding utf8
  Write-Error $_.Exception.Message
}
