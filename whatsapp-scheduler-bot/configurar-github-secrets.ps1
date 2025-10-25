# Script para mostrar as configurações necessárias no GitHub Secrets

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  CONFIGURACAO DE GITHUB SECRETS" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Carregar .env
if (!(Test-Path ".env")) {
    Write-Host "Erro: Arquivo .env nao encontrado!" -ForegroundColor Red
    exit 1
}

# Ler variáveis do .env
Get-Content ".env" | ForEach-Object {
    if ($_ -match 'SUPABASE_URL="(.+)"') {
        $SUPABASE_URL = $matches[1]
    }
    if ($_ -match 'SUPABASE_SERVICE_KEY="(.+)"') {
        $SUPABASE_SERVICE_KEY = $matches[1]
    }
    if ($_ -match 'EVOLUTION_API_URL="(.+)"') {
        $EVOLUTION_API_URL = $matches[1]
    }
    if ($_ -match 'EVOLUTION_API_KEY="(.+)"') {
        $EVOLUTION_API_KEY = $matches[1]
    }
    if ($_ -match 'BOT_INSTANCE_NAME="(.+)"') {
        $BOT_INSTANCE_NAME = $matches[1]
    }
}

Write-Host "Variaveis carregadas do .env:" -ForegroundColor Green
Write-Host ""
Write-Host "SUPABASE_URL: $SUPABASE_URL" -ForegroundColor White
Write-Host "SUPABASE_SERVICE_KEY: $($SUPABASE_SERVICE_KEY.Substring(0, 20))..." -ForegroundColor White
Write-Host "EVOLUTION_API_URL: $EVOLUTION_API_URL" -ForegroundColor White
Write-Host "EVOLUTION_API_KEY: $EVOLUTION_API_KEY" -ForegroundColor White
Write-Host "BOT_INSTANCE_NAME: $BOT_INSTANCE_NAME" -ForegroundColor White
Write-Host ""
Write-Host "============================================================" -ForegroundColor Yellow
Write-Host "  PROXIMOS PASSOS" -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Acesse o link abaixo:" -ForegroundColor White
Write-Host "   https://github.com/AlessandroDev45/whatsapp-scheduler-bot/settings/secrets/actions" -ForegroundColor Cyan
Write-Host ""
Write-Host "2. Clique em 'New repository secret' e adicione:" -ForegroundColor White
Write-Host ""
Write-Host "   Nome: SUPABASE_URL" -ForegroundColor Green
Write-Host "   Valor: $SUPABASE_URL" -ForegroundColor Gray
Write-Host ""
Write-Host "   Nome: SUPABASE_SERVICE_KEY" -ForegroundColor Green
Write-Host "   Valor: $SUPABASE_SERVICE_KEY" -ForegroundColor Gray
Write-Host ""
Write-Host "   Nome: EVOLUTION_API_URL" -ForegroundColor Green
Write-Host "   Valor: $EVOLUTION_API_URL" -ForegroundColor Gray
Write-Host ""
Write-Host "   Nome: EVOLUTION_API_KEY" -ForegroundColor Green
Write-Host "   Valor: $EVOLUTION_API_KEY" -ForegroundColor Gray
Write-Host ""
Write-Host "   Nome: BOT_INSTANCE_NAME" -ForegroundColor Green
Write-Host "   Valor: $BOT_INSTANCE_NAME" -ForegroundColor Gray
Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "Apos adicionar os secrets, o GitHub Actions vai rodar automaticamente!" -ForegroundColor Green
Write-Host "  - A cada 5 minutos: Enviar mensagens agendadas" -ForegroundColor White
Write-Host "  - A cada 6 horas: Sincronizar grupos" -ForegroundColor White
Write-Host ""
Write-Host "Voce tambem pode executar manualmente em:" -ForegroundColor Yellow
Write-Host "  https://github.com/AlessandroDev45/whatsapp-scheduler-bot/actions" -ForegroundColor Cyan
Write-Host ""

