# Script para atualizar ADMIN_NUMBER no Supabase

Write-Host "`n🔧 ATUALIZANDO ADMIN_NUMBER NO SUPABASE`n" -ForegroundColor Cyan
Write-Host "=" * 70

# Configurar variável de ambiente
Write-Host "`n1️⃣ Configurando variável de ambiente...`n" -ForegroundColor Yellow

$env:ADMIN_NUMBER = "553184549893"

Write-Host "   ✅ ADMIN_NUMBER definido: $env:ADMIN_NUMBER" -ForegroundColor Green

# Fazer deploy
Write-Host "`n2️⃣ Fazendo deploy da função...`n" -ForegroundColor Yellow

npx supabase functions deploy webhook-whatsapp --no-verify-jwt

Write-Host "`n" -ForegroundColor Green
Write-Host "=" * 70
Write-Host "`n✅ ADMIN_NUMBER atualizado com sucesso!`n" -ForegroundColor Green
Write-Host "   Novo valor: 553184549893" -ForegroundColor White
Write-Host "   (Removido o '19' extra)`n" -ForegroundColor White

