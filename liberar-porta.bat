@echo off
:: Solicita elevacao de privilegio se nao estiver rodando como administrador
net session >nul 2>&1
if %errorLevel% == 0 (
    echo Permissao de administrador confirmada!
) else (
    echo Solicitando permissao de administrador...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

:: Comando para abrir a porta no Firewall
powershell -Command "New-NetFirewallRule -DisplayName 'Vite Dev Server (Port 5173)' -Direction Inbound -LocalPort 5173 -Protocol TCP -Action Allow"

echo.
echo Porta 5173 liberada no Firewall do Windows!
echo.
pause
