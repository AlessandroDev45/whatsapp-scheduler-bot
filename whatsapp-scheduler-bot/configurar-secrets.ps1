# Script para configurar secrets do Supabase Edge Functions
# Execute este script no PowerShell

Write-Host "🔐 CONFIGURANDO SECRETS DO SUPABASE" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

# Ler variáveis do .env
$envFile = Get-Content ".env"
$envVars = @{}

foreach ($line in $envFile) {
    if ($line -match '^([^#][^=]+)=(.+)$') {
        $key = $matches[1].Trim()
        $value = $matches[2].Trim('"')
        $envVars[$key] = $value
    }
}

Write-Host "📋 Variáveis encontradas no .env:" -ForegroundColor Green
Write-Host "  ✓ SUPABASE_URL: $($envVars['SUPABASE_URL'])" -ForegroundColor Gray
Write-Host "  ✓ MISTRAL_API_KEY: $($envVars['MISTRAL_API_KEY'].Substring(0,10))..." -ForegroundColor Gray
Write-Host "  ✓ BAILEYS_API_URL: $($envVars['BAILEYS_API_URL'])" -ForegroundColor Gray
Write-Host ""

# Verificar ADMIN_NUMBER
if ($envVars['ADMIN_NUMBER'] -eq 'SEU_NUMERO_AQUI' -or [string]::IsNullOrEmpty($envVars['ADMIN_NUMBER'])) {
    Write-Host "❌ ADMIN_NUMBER não configurado!" -ForegroundColor Red
    Write-Host ""
    $adminNumber = Read-Host "Digite seu número de WhatsApp (sem + e sem espaços, ex: 5531999999999)"
    
    # Atualizar .env
    $envContent = Get-Content ".env" -Raw
    $envContent = $envContent -replace 'ADMIN_NUMBER="SEU_NUMERO_AQUI"', "ADMIN_NUMBER=`"$adminNumber`""
    Set-Content ".env" -Value $envContent
    
    $envVars['ADMIN_NUMBER'] = $adminNumber
    Write-Host "✅ ADMIN_NUMBER atualizado no .env" -ForegroundColor Green
    Write-Host ""
}

Write-Host "🚀 Configurando secrets no Supabase..." -ForegroundColor Cyan
Write-Host ""

# Configurar cada secret
$secrets = @{
    'BAILEYS_API_URL' = $envVars['BAILEYS_API_URL']
    'MISTRAL_API_KEY' = $envVars['MISTRAL_API_KEY']
    'ADMIN_NUMBER' = $envVars['ADMIN_NUMBER']
}

foreach ($secret in $secrets.GetEnumerator()) {
    Write-Host "📝 Configurando $($secret.Key)..." -ForegroundColor Yellow
    
    $command = "npx supabase secrets set $($secret.Key)=`"$($secret.Value)`""
    Invoke-Expression $command
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ $($secret.Key) configurado com sucesso!" -ForegroundColor Green
    } else {
        Write-Host "  ❌ Erro ao configurar $($secret.Key)" -ForegroundColor Red
    }
    Write-Host ""
}

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "✅ CONFIGURAÇÃO CONCLUÍDA!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Próximos passos:" -ForegroundColor Cyan
Write-Host "  1. Re-deploy da Edge Function:" -ForegroundColor White
Write-Host "     npx supabase functions deploy webhook-whatsapp" -ForegroundColor Gray
Write-Host ""
Write-Host "  2. Ativar usuário no banco de dados:" -ForegroundColor White
Write-Host "     Acesse: https://supabase.com/dashboard/project/aiwwocigvktmtiawslrx/editor" -ForegroundColor Gray
Write-Host "     Tabela: usuarios_autorizados" -ForegroundColor Gray
Write-Host "     Mudar 'ativo' para true" -ForegroundColor Gray
Write-Host ""
Write-Host "  3. Testar o bot enviando uma mensagem" -ForegroundColor White
Write-Host ""

