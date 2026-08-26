@echo off
title Projeto ENSO
cd /d "%~dp0"
echo.
echo ========================================
echo   PROJETO ENSO - Iniciando o sistema
echo ========================================
echo.
echo Verificando Python...
where python >nul 2>nul
if %errorlevel%==0 (
  echo Python encontrado: Iniciando servidor...
  start "Servidor ENSO" /min python servidor.py
) else (
  echo Python nao encontrado no PATH, tentando py launcher...
  start "Servidor ENSO" /min py servidor.py
)
echo.
echo Aguardando servidor iniciar...
timeout /t 3 /nobreak >nul
echo.
echo Abrindo navegador em http://127.0.0.1:8001
start "" "http://127.0.0.1:8001/index.html"
echo.
echo Sistema iniciado com sucesso!
echo Pressione qualquer tecla para fechar esta janela...
pause >nul
exit
