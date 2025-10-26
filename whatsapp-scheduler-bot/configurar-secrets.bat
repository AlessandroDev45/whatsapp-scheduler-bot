@echo off
echo.
echo ================================
echo CONFIGURANDO SECRETS DO SUPABASE
echo ================================
echo.

echo Configurando BAILEYS_API_URL...
npx supabase secrets set BAILEYS_API_URL="https://whatsapp-bot-ale-2025.fly.dev"
echo.

echo Configurando MISTRAL_API_KEY...
npx supabase secrets set MISTRAL_API_KEY="a5ejxknqUm2z8s3Ticnys0N5Fg3DKQ2W"
echo.

echo Configurando ADMIN_NUMBER...
npx supabase secrets set ADMIN_NUMBER="5531984549893"
echo.

echo ================================
echo SECRETS CONFIGURADOS COM SUCESSO!
echo ================================
echo.
echo Proximos passos:
echo 1. Re-deploy da Edge Function:
echo    npx supabase functions deploy webhook-whatsapp
echo.
echo 2. Ativar usuario no banco de dados
echo.
pause

