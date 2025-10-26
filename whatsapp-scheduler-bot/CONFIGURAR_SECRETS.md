# 🔐 CONFIGURAR SECRETS DO SUPABASE

## ❌ PROBLEMA ATUAL

A Edge Function não tem as variáveis de ambiente configuradas!

```
Error: Variáveis de ambiente obrigatórias não configuradas: 
SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, BAILEYS_API_URL, MISTRAL_API_KEY, ADMIN_NUMBER
```

## ✅ SOLUÇÃO - CONFIGURAR SECRETS

### 1️⃣ Ir para o Dashboard do Supabase

Acesse: https://supabase.com/dashboard/project/aiwwocigvktmtiawslrx/settings/functions

### 2️⃣ Adicionar os Secrets

Clique em **"Add new secret"** e adicione cada uma dessas variáveis:

#### **BAILEYS_API_URL**
```
https://whatsapp-bot-ale-2025.fly.dev
```

#### **MISTRAL_API_KEY**
```
[Sua chave da API Mistral]
```
Pegar em: https://console.mistral.ai/api-keys/

#### **ADMIN_NUMBER**
```
[Seu número de WhatsApp sem +, sem espaços]
```
Exemplo: `5531999999999`

#### **SUPABASE_URL** (já deve estar configurada automaticamente)
```
https://aiwwocigvktmtiawslrx.supabase.co
```

#### **SUPABASE_SERVICE_ROLE_KEY** (já deve estar configurada automaticamente)
```
[Pegar em: Settings > API > service_role key (secret)]
```

### 3️⃣ Salvar e Re-deploy

Depois de adicionar todos os secrets:

```bash
cd whatsapp-scheduler-bot/baileys-server
npx supabase functions deploy webhook-whatsapp
```

## 🔧 VERIFICAR SE FUNCIONOU

Envie uma mensagem de teste e veja os logs:

```bash
flyctl logs
```

Deve aparecer:
```
✅ [MESSAGE_HANDLER] Mensagem processada pela Edge Function
```

E no Dashboard do Supabase (Functions > webhook-whatsapp > Logs):
```
✅ [WEBHOOK] Validações iniciais passaram!
```

## 📝 SEGUNDO PROBLEMA: USUÁRIO INATIVO

O usuário "leone alves" está com `ativo: false`.

### Opção 1: Ativar o usuário manualmente

1. Ir para: https://supabase.com/dashboard/project/aiwwocigvktmtiawslrx/editor
2. Abrir tabela `usuarios_autorizados`
3. Encontrar o usuário "leone alves"
4. Mudar `ativo` de `false` para `true`
5. Salvar

### Opção 2: Criar como admin direto

Execute no SQL Editor:

```sql
UPDATE usuarios_autorizados 
SET ativo = true, role = 'admin' 
WHERE telefone = '260339795013664';
```

Substitua `260339795013664` pelo número correto.

