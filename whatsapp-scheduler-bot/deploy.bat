@echo off
echo.
echo ========================================
echo   DEPLOY COMPLETO - WHATSAPP SCHEDULER
echo ========================================
echo.

REM Perguntar o que fazer deploy
echo O que deseja fazer deploy?
echo.
echo 1. Baileys Server (Fly.io)
echo 2. Edge Function (Supabase)
echo 3. AMBOS (Completo)
echo.
set /p opcao="Digite o numero da opcao (1/2/3): "

if "%opcao%"=="1" goto deploy_baileys
if "%opcao%"=="2" goto deploy_edge
if "%opcao%"=="3" goto deploy_completo
echo Opcao invalida!
pause
exit /b 1

:deploy_baileys
echo.
echo ========================================
echo   DEPLOY DO BAILEYS SERVER (FLY.IO)
echo ========================================
echo.
cd baileys-server
echo Fazendo deploy no Fly.io...
flyctl deploy
if %errorlevel% neq 0 (
    echo.
    echo ❌ ERRO no deploy do Baileys Server!
    cd ..
    pause
    exit /b 1
)
echo.
echo ✅ Baileys Server deployado com sucesso!
cd ..
goto fim

:deploy_edge
echo.
echo ========================================
echo   DEPLOY DA EDGE FUNCTION (SUPABASE)
echo ========================================
echo.
echo Fazendo deploy da Edge Function...
npx supabase functions deploy webhook-whatsapp
if %errorlevel% neq 0 (
    echo.
    echo ❌ ERRO no deploy da Edge Function!
    pause
    exit /b 1
)
echo.
echo ✅ Edge Function deployada com sucesso!
goto fim

:deploy_completo
echo.
echo ========================================
echo   DEPLOY COMPLETO (BAILEYS + EDGE)
echo ========================================
echo.

REM Deploy do Baileys Server
echo [1/2] Fazendo deploy do Baileys Server...
cd baileys-server
flyctl deploy
if %errorlevel% neq 0 (
    echo.
    echo ❌ ERRO no deploy do Baileys Server!
    cd ..
    pause
    exit /b 1
)
echo.
echo ✅ Baileys Server deployado com sucesso!
cd ..

echo.
echo [2/2] Fazendo deploy da Edge Function...
npx supabase functions deploy webhook-whatsapp
if %errorlevel% neq 0 (
    echo.
    echo ❌ ERRO no deploy da Edge Function!
    pause
    exit /b 1
)
echo.
echo ✅ Edge Function deployada com sucesso!

:fim
echo.
echo ========================================
echo   ✅ DEPLOY CONCLUIDO COM SUCESSO!
echo ========================================
echo.
echo 📊 Monitorar logs:
echo   - Baileys: cd baileys-server ^&^& flyctl logs
echo   - Edge Function: https://supabase.com/dashboard/project/aiwwocigvktmtiawslrx/functions
echo.
pause

