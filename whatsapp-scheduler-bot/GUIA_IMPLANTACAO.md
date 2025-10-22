# 📋 GUIA COMPLETO DE IMPLANTAÇÃO - WhatsApp Scheduler Bot

## ⚠️ INFORMAÇÕES IMPORTANTES

**Número do Bot:** +55 19 98720 0383

**AVISOS DE SEGURANÇA:**
- Este número será desconectado do WhatsApp normal e controlado pela API
- NUNCA use seu número principal do WhatsApp
- Mantenha todas as chaves e senhas em local seguro
- O repositório GitHub DEVE ser privado

---

## 📍 FASE 1: CONFIGURAÇÃO DO SUPABASE

### Passo 1.1: Criar o Projeto no Supabase

1. Acesse: https://supabase.com/dashboard
2. Clique em **"New Project"**
3. Preencha:
   - **Name:** `whatsapp-scheduler-bot`
   - **Database Password:** Crie uma senha FORTE e ANOTE (você precisará dela!)
   - **Region:** `South America (São Paulo)`
4. Clique em **"Create new project"**
5. ⏳ Aguarde 2-3 minutos enquanto o projeto é criado

---

### Passo 1.2: Executar o Script SQL

1. No menu esquerdo, clique em **SQL Editor** (ícone de código)
2. Clique em **"+ New query"**
3. Abra o arquivo `whatsapp-scheduler-bot/supabase/migrations/0000_initial_schema.sql` no seu computador
4. Copie TODO o conteúdo e cole no SQL Editor
5. Clique no botão verde **"RUN"**
6. ✅ **Verificação:** Vá em **Table Editor** → você deve ver 4 tabelas:
   - `usuarios_autorizados`
   - `agendamentos`
   - `sessoes_comando`
   - `historico_envios`

---

### Passo 1.3: Obter Credenciais da API

1. No menu esquerdo, vá em **Settings** (⚙️) → **API**
2. **COPIE E SALVE** estas informações:

   📝 **Project URL:**
   ```
   (Copie da seção "Configuration")
   Exemplo: https://abcdefghijk.supabase.co
   ```

   📝 **service_role Key:**
   ```
   (Role até "Project API Keys" e copie a chave "service_role")
   Exemplo: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

   📝 **Project Ref ID:**
   ```
   (Vá em Settings → General e copie o "Reference ID")
   Exemplo: abcdefghijk
   ```

⚠️ **IMPORTANTE:** Guarde estas informações em um local seguro (Bloco de Notas, gerenciador de senhas, etc.)

---

### Passo 1.4: Criar Arquivo .env Local

1. Abra o PowerShell na pasta `whatsapp-scheduler-bot`
2. Execute:
   ```powershell
   Copy-Item .env.example .env
   ```
3. Abra o arquivo `.env` em um editor de texto
4. Preencha com os valores que você copiou:
   ```env
   SUPABASE_URL="https://SEU_PROJECT_REF.supabase.co"
   SUPABASE_SERVICE_KEY="sua_service_role_key_aqui"
   
   # Deixe estes valores temporários por enquanto
   EVOLUTION_API_URL="https://temporario.com"
   EVOLUTION_API_KEY="temporario"
   BOT_INSTANCE_NAME="main"
   GROUP_ID="temporario@g.us"
   ```
5. Salve o arquivo

---

### Passo 1.5: Fazer Link com o Projeto Supabase

1. No PowerShell, dentro da pasta `whatsapp-scheduler-bot`, execute:
   ```powershell
   npx supabase link --project-ref SEU_PROJECT_REF
   ```
   *(Substitua `SEU_PROJECT_REF` pelo Reference ID que você copiou)*

2. Quando solicitado, digite a **senha do banco de dados** que você criou no Passo 1.1

3. ✅ Você deve ver uma mensagem de sucesso

---

### Passo 1.6: Configurar Segredos da Edge Function

1. Execute no PowerShell:
   ```powershell
   npx supabase secrets set --env-file .env
   ```

2. ✅ Aguarde a confirmação

---

### Passo 1.7: Implantar a Edge Function

1. Execute:
   ```powershell
   npx supabase functions deploy webhook-whatsapp --no-verify-jwt
   ```

2. ⏳ Aguarde o deploy (pode levar 1-2 minutos)

3. ✅ **Verificação:**
   - Vá no Dashboard do Supabase → **Edge Functions** (ícone de raio ⚡)
   - Você deve ver `webhook-whatsapp` na lista
   - Clique nela e **COPIE A URL**
   
   📝 **URL da Edge Function:**
   ```
   Exemplo: https://abcdefghijk.supabase.co/functions/v1/webhook-whatsapp
   ```

---

## 📍 FASE 2: CONFIGURAÇÃO DO GITHUB

### Passo 2.1: Criar Repositório no GitHub

1. Acesse: https://github.com/new
2. Preencha:
   - **Repository name:** `whatsapp-scheduler-bot`
   - **Description:** "Bot para agendamento de mensagens no WhatsApp"
   - **Visibilidade:** ⚠️ **PRIVATE** (MUITO IMPORTANTE!)
   - **NÃO** marque nenhuma opção de inicialização
3. Clique em **"Create repository"**

---

### Passo 2.2: Enviar Código para o GitHub

1. No PowerShell, na pasta `whatsapp-scheduler-bot`, execute:

   ```powershell
   # Inicializar repositório Git
   git init -b main
   
   # Adicionar todos os arquivos
   git add .
   
   # Criar primeiro commit
   git commit -m "Commit inicial do projeto de agendamento"
   
   # Conectar ao repositório remoto (SUBSTITUA SEU_USUARIO)
   git remote add origin https://github.com/SEU_USUARIO/whatsapp-scheduler-bot.git
   
   # Enviar código
   git push -u origin main
   ```

2. ✅ **Verificação:** Atualize a página do repositório no GitHub - seus arquivos devem aparecer

---

### Passo 2.3: Configurar Segredos do GitHub Actions

1. No repositório GitHub, vá em **Settings** → **Secrets and variables** → **Actions**
2. Clique em **"New repository secret"** para cada um dos seguintes:

   | Nome | Valor |
   |------|-------|
   | `SUPABASE_URL` | Cole a Project URL do Supabase |
   | `SUPABASE_SERVICE_KEY` | Cole a service_role key do Supabase |
   | `EVOLUTION_API_URL` | `https://temporario.com` (atualizar depois) |
   | `EVOLUTION_API_KEY` | `temporario` (atualizar depois) |
   | `GROUP_ID` | `temporario@g.us` (atualizar depois) |
   | `BOT_INSTANCE_NAME` | `main` |

---

## 📍 FASE 3: CONFIGURAÇÃO DA EVOLUTION API

### Passo 3.1: Deploy no Render.com

1. Acesse: https://dashboard.render.com
2. Clique em **"New +"** → **"Web Service"**
3. Selecione **"Build and deploy from a Git repository"** → **Next**
4. Cole esta URL no campo "Public Git repository":
   ```
   https://github.com/EvolutionAPI/evolution-api
   ```
5. Clique em **"Next"**
6. Preencha:
   - **Name:** `evolution-api-whatsapp`
   - **Environment:** `Docker`
   - **Region:** `Oregon (US West)`
7. Role até **"Environment Variables"** e adicione:
   - **Key:** `AUTHENTICATION_API_KEY`
   - **Value:** Crie uma senha forte (ex: `MinhaChaveSecreta2025!`)
   
   📝 **ANOTE ESTA SENHA** - ela será sua `EVOLUTION_API_KEY`

8. Clique em **"Create Web Service"**
9. ⏳ Aguarde 5-10 minutos (acompanhe nos Logs)

---

### Passo 3.2: Obter URL da Evolution API

1. No topo da página do serviço no Render, copie a URL:
   
   📝 **EVOLUTION_API_URL:**
   ```
   Exemplo: https://evolution-api-whatsapp-xxxx.onrender.com
   ```

---

### Passo 3.3: Conectar o WhatsApp (+55 19 98720 0383)

1. Abra uma nova aba: `https://SUA_URL_DO_RENDER.onrender.com/manager`
2. No campo **API Key**, cole a senha que você criou (`AUTHENTICATION_API_KEY`)
3. Clique em **"Create Instance"**
4. Preencha:
   - **Instance Name:** `main`
   - **Global Webhook URL:** Cole a URL da Edge Function do Supabase
5. Clique em **"Create"**
6. Um **QR Code** aparecerá na tela

**⚠️ AÇÃO NO CELULAR (+55 19 98720 0383):**
1. Abra o WhatsApp no celular
2. Vá em **Configurações** → **Aparelhos conectados**
3. Toque em **"Conectar um aparelho"**
4. Escaneie o QR Code da tela do computador
5. ✅ Aguarde - o status deve mudar para **"Connected"**

---

### Passo 3.4: Criar e Configurar o Grupo

1. No seu WhatsApp pessoal, crie um grupo chamado **"Envios"**
2. Adicione o número **+55 19 98720 0383** ao grupo

---

### Passo 3.5: Obter ID do Grupo

1. No Manager da Evolution API, procure por **"Fetch Groups"** ou similar
2. Clique para buscar os grupos
3. Encontre o grupo **"Envios"** e copie o ID
   
   📝 **GROUP_ID:**
   ```
   Exemplo: 120363123456789012@g.us
   ```

---

## 📍 FASE 4: ATUALIZAÇÃO FINAL DOS SEGREDOS

### Passo 4.1: Atualizar Segredos no GitHub

1. Vá em **Settings** → **Secrets and variables** → **Actions**
2. Clique em cada segredo e atualize:
   - `EVOLUTION_API_URL` → Cole a URL do Render
   - `EVOLUTION_API_KEY` → Cole a senha que você criou
   - `GROUP_ID` → Cole o ID do grupo "Envios"

---

### Passo 4.2: Atualizar Arquivo .env Local

1. Abra o arquivo `.env` e atualize com os valores reais:
   ```env
   SUPABASE_URL="https://SEU_PROJECT_REF.supabase.co"
   SUPABASE_SERVICE_KEY="sua_service_role_key"
   EVOLUTION_API_URL="https://evolution-api-whatsapp-xxxx.onrender.com"
   EVOLUTION_API_KEY="MinhaChaveSecreta2025!"
   BOT_INSTANCE_NAME="main"
   GROUP_ID="120363123456789012@g.us"
   ```
2. Salve o arquivo

---

### Passo 4.3: Atualizar Segredos no Supabase

1. No PowerShell, execute:
   ```powershell
   npx supabase secrets set --env-file .env
   ```

2. Reimplante a função:
   ```powershell
   npx supabase functions deploy webhook-whatsapp --no-verify-jwt
   ```

---

## 📍 FASE 5: ATIVAÇÃO E TESTE FINAL

### Passo 5.1: Sincronizar Membros do Grupo

1. Vá no repositório GitHub → **Actions**
2. No menu esquerdo, clique em **"Sync Group Members"**
3. Clique em **"Run workflow"** → **"Run workflow"**
4. ⏳ Aguarde 1 minuto

---

### Passo 5.2: TESTE FINAL 🎉

1. No seu celular pessoal, abra o grupo **"Envios"**
2. Envie a mensagem: `/menu`
3. ✅ **Resultado esperado:**
   - O grupo permanece em silêncio
   - Você recebe uma mensagem **PRIVADA** do bot (+55 19 98720 0383) com o menu

---

## 🎊 PARABÉNS!

Se você recebeu o menu privado, seu bot está funcionando perfeitamente!

### Próximos Passos:
- Teste criar um agendamento com `/novo`
- Verifique os agendamentos com `/listar`
- Monitore os logs no Supabase e GitHub Actions

---

## 📞 Suporte

Se algo não funcionou:
1. Verifique os logs no Supabase (Edge Functions)
2. Verifique os logs no GitHub Actions
3. Verifique se todos os segredos estão corretos
4. Certifique-se de que o bot está no grupo "Envios"

