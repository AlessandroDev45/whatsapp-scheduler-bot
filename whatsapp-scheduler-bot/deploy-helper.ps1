# ========================================
# SCRIPT AUXILIAR DE IMPLANTAÇÃO
# WhatsApp Scheduler Bot
# ========================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  WhatsApp Scheduler Bot - Deploy Helper" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

function Show-Menu {
    Write-Host "Escolha uma opção:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "FASE 1 - SUPABASE:" -ForegroundColor Green
    Write-Host "  1. Criar arquivo .env (copiar de .env.example)"
    Write-Host "  2. Link com projeto Supabase"
    Write-Host "  3. Configurar segredos da Edge Function"
    Write-Host "  4. Implantar Edge Function"
    Write-Host ""
    Write-Host "FASE 2 - GITHUB:" -ForegroundColor Green
    Write-Host "  5. Inicializar repositório Git"
    Write-Host "  6. Fazer primeiro commit"
    Write-Host "  7. Conectar ao GitHub (você precisará fornecer a URL)"
    Write-Host "  8. Enviar código para GitHub"
    Write-Host ""
    Write-Host "FASE 4 - ATUALIZAÇÃO:" -ForegroundColor Green
    Write-Host "  9. Atualizar segredos no Supabase"
    Write-Host "  10. Reimplantar Edge Function"
    Write-Host ""
    Write-Host "UTILITÁRIOS:" -ForegroundColor Green
    Write-Host "  11. Verificar status do Supabase"
    Write-Host "  12. Ver logs da Edge Function"
    Write-Host "  13. Abrir guia de implantação"
    Write-Host "  14. Abrir checklist"
    Write-Host ""
    Write-Host "  0. Sair"
    Write-Host ""
}

function Create-EnvFile {
    Write-Host "Criando arquivo .env..." -ForegroundColor Yellow
    if (Test-Path ".env") {
        Write-Host "Arquivo .env já existe!" -ForegroundColor Red
        $overwrite = Read-Host "Deseja sobrescrever? (s/n)"
        if ($overwrite -ne "s") {
            Write-Host "Operação cancelada." -ForegroundColor Yellow
            return
        }
    }
    Copy-Item .env.example .env
    Write-Host "✅ Arquivo .env criado com sucesso!" -ForegroundColor Green
    Write-Host "Agora edite o arquivo .env com suas credenciais." -ForegroundColor Cyan
    Start-Process notepad .env
}

function Link-SupabaseProject {
    Write-Host "Link com projeto Supabase..." -ForegroundColor Yellow
    $projectRef = Read-Host "Digite o Project Ref ID do Supabase"
    if ([string]::IsNullOrWhiteSpace($projectRef)) {
        Write-Host "❌ Project Ref ID não pode estar vazio!" -ForegroundColor Red
        return
    }
    npx supabase link --project-ref $projectRef
}

function Set-SupabaseSecrets {
    Write-Host "Configurando segredos da Edge Function..." -ForegroundColor Yellow
    if (-not (Test-Path ".env")) {
        Write-Host "❌ Arquivo .env não encontrado!" -ForegroundColor Red
        Write-Host "Execute a opção 1 primeiro." -ForegroundColor Yellow
        return
    }
    npx supabase secrets set --env-file .env
}

function Deploy-EdgeFunction {
    Write-Host "Implantando Edge Function..." -ForegroundColor Yellow
    npx supabase functions deploy webhook-whatsapp --no-verify-jwt
    Write-Host ""
    Write-Host "✅ Edge Function implantada!" -ForegroundColor Green
    Write-Host "Acesse o Dashboard do Supabase para obter a URL da função." -ForegroundColor Cyan
}

function Init-GitRepo {
    Write-Host "Inicializando repositório Git..." -ForegroundColor Yellow
    git init -b main
    Write-Host "✅ Repositório Git inicializado!" -ForegroundColor Green
}

function Make-FirstCommit {
    Write-Host "Fazendo primeiro commit..." -ForegroundColor Yellow
    git add .
    git commit -m "Commit inicial do projeto de agendamento"
    Write-Host "✅ Primeiro commit realizado!" -ForegroundColor Green
}

function Connect-GitHub {
    Write-Host "Conectar ao GitHub..." -ForegroundColor Yellow
    Write-Host "Exemplo: https://github.com/SEU_USUARIO/whatsapp-scheduler-bot.git" -ForegroundColor Cyan
    $repoUrl = Read-Host "Digite a URL do seu repositório GitHub"
    if ([string]::IsNullOrWhiteSpace($repoUrl)) {
        Write-Host "❌ URL não pode estar vazia!" -ForegroundColor Red
        return
    }
    git remote add origin $repoUrl
    Write-Host "✅ Repositório remoto adicionado!" -ForegroundColor Green
}

function Push-ToGitHub {
    Write-Host "Enviando código para GitHub..." -ForegroundColor Yellow
    git push -u origin main
    Write-Host "✅ Código enviado para GitHub!" -ForegroundColor Green
}

function Update-SupabaseSecrets {
    Write-Host "Atualizando segredos no Supabase..." -ForegroundColor Yellow
    if (-not (Test-Path ".env")) {
        Write-Host "❌ Arquivo .env não encontrado!" -ForegroundColor Red
        return
    }
    npx supabase secrets set --env-file .env
    Write-Host "✅ Segredos atualizados!" -ForegroundColor Green
}

function Redeploy-EdgeFunction {
    Write-Host "Reimplantando Edge Function..." -ForegroundColor Yellow
    npx supabase functions deploy webhook-whatsapp --no-verify-jwt
    Write-Host "✅ Edge Function reimplantada!" -ForegroundColor Green
}

function Check-SupabaseStatus {
    Write-Host "Verificando status do Supabase..." -ForegroundColor Yellow
    npx supabase status
}

function Show-EdgeFunctionLogs {
    Write-Host "Mostrando logs da Edge Function..." -ForegroundColor Yellow
    Write-Host "Pressione Ctrl+C para sair" -ForegroundColor Cyan
    npx supabase functions logs webhook-whatsapp
}

function Open-Guide {
    Write-Host "Abrindo guia de implantação..." -ForegroundColor Yellow
    code GUIA_IMPLANTACAO.md
}

function Open-Checklist {
    Write-Host "Abrindo checklist..." -ForegroundColor Yellow
    code CHECKLIST.md
}

# Loop principal
do {
    Show-Menu
    $choice = Read-Host "Digite o número da opção"
    Write-Host ""
    
    switch ($choice) {
        "1" { Create-EnvFile }
        "2" { Link-SupabaseProject }
        "3" { Set-SupabaseSecrets }
        "4" { Deploy-EdgeFunction }
        "5" { Init-GitRepo }
        "6" { Make-FirstCommit }
        "7" { Connect-GitHub }
        "8" { Push-ToGitHub }
        "9" { Update-SupabaseSecrets }
        "10" { Redeploy-EdgeFunction }
        "11" { Check-SupabaseStatus }
        "12" { Show-EdgeFunctionLogs }
        "13" { Open-Guide }
        "14" { Open-Checklist }
        "0" { 
            Write-Host "Saindo..." -ForegroundColor Yellow
            break
        }
        default { 
            Write-Host "❌ Opção inválida!" -ForegroundColor Red
        }
    }
    
    if ($choice -ne "0") {
        Write-Host ""
        Write-Host "Pressione qualquer tecla para continuar..." -ForegroundColor Gray
        $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
        Clear-Host
    }
} while ($choice -ne "0")

Write-Host ""
Write-Host "Até logo! 👋" -ForegroundColor Cyan

