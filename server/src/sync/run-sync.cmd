@echo off
REM Wrapper do MOTOR de sincronizacao (SQL Server -> Supabase).
REM Agende ESTE arquivo no Agendador de Tarefas. Ele localiza a pasta do
REM projeto sozinho e grava a saida em server\logs\sync-AAAA-MM-DD.log.

REM Vai para a pasta "server" (dois niveis acima de src\sync\)
cd /d "%~dp0..\.."

if not exist "logs" mkdir "logs"

REM Data no formato AAAA-MM-DD (independente de locale, via WMIC)
for /f %%i in ('wmic os get LocalDateTime ^| findstr ^[0-9]') do set DT=%%i
set HOJE=%DT:~0,4%-%DT:~4,2%-%DT:~6,2%

echo. >> "logs\sync-%HOJE%.log"
echo ===== %date% %time% ===== >> "logs\sync-%HOJE%.log"
node src\sync\gerar-e-enviar.js >> "logs\sync-%HOJE%.log" 2>&1
echo (exit code %errorlevel%) >> "logs\sync-%HOJE%.log"
