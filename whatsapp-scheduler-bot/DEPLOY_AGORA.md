# 🚀 DEPLOY RÁPIDO - DIAGNOSTICAR PROBLEMA

## 1️⃣ DEPLOY DO BAILEYS SERVER (Fly.io)

```bash
cd whatsapp-scheduler-bot/baileys-server

# Deploy
flyctl deploy

# Ver logs em tempo real
flyctl logs
```

## 2️⃣ DEPLOY DA EDGE FUNCTION (Supabase)

```bash
cd whatsapp-scheduler-bot

# Deploy
npx supabase functions deploy webhook-whatsapp

# Ver logs em tempo real
npx supabase functions logs webhook-whatsapp --tail
```

## 3️⃣ TESTAR O BOT

Envie uma mensagem para o WhatsApp conectado e observe os logs.

## 📊 O QUE OBSERVAR NOS LOGS

### Logs do Baileys Server (Fly.io)
```
✅ Deve aparecer:
📥 [MESSAGE_HANDLER] Nova mensagem recebida
📋 [MESSAGE_HANDLER] Tipo de mensagem: conversation
📝 [MESSAGE_HANDLER] Texto extraído: "sua mensagem"
👤 [MESSAGE_HANDLER] Remetente: Nome (5531999999999)
📦 [MESSAGE_HANDLER] Payload montado: {...}
🔗 [MESSAGE_HANDLER] WEBHOOK_URL: https://...
📤 [MESSAGE_HANDLER] Enviando para Edge Function...
✅ [MESSAGE_HANDLER] Mensagem processada pela Edge Function

❌ Se aparecer:
⚠️ [MESSAGE_HANDLER] WEBHOOK_URL não configurada
   → Configure: flyctl secrets set SUPABASE_WEBHOOK_URL="..."
```

### Logs da Edge Function (Supabase)
```
✅ Deve aparecer:
🌐 [WEBHOOK] Nova requisição recebida
📦 [WEBHOOK] Body recebido: {...}
✅ [WEBHOOK] Validações iniciais passaram!
👤 [WEBHOOK] Sender identificado: 5531999999999
🔍 [WEBHOOK] Buscando usuário no banco: 5531999999999
👤 [WEBHOOK] Usuário encontrado: {...}

❌ Se aparecer:
❌ [WEBHOOK] Estrutura inválida!
   → Problema no payload enviado pelo Baileys
   
⏭️ [WEBHOOK] Mensagem do próprio bot ignorada (fromMe: true)
   → Mensagem enviada pelo bot, não pelo usuário
   
❌ [WEBHOOK] Remetente inválido ou vazio
   → Problema ao extrair número do remetente
```

## 🔧 VERIFICAR VARIÁVEIS DE AMBIENTE

### Baileys Server (Fly.io)
```bash
flyctl secrets list
```

Deve ter:
- SUPABASE_URL
- SUPABASE_SERVICE_KEY
- SUPABASE_WEBHOOK_URL ← **IMPORTANTE!**
- BOT_INSTANCE_NAME

### Edge Function (Supabase)
```bash
npx supabase secrets list
```

Deve ter:
- BAILEYS_API_URL
- MISTRAL_API_KEY
- ADMIN_NUMBER

## 🐛 PROBLEMAS COMUNS

### 1. Bot não responde nada
**Causa:** WEBHOOK_URL não configurada no Baileys Server
**Solução:**
```bash
cd whatsapp-scheduler-bot/baileys-server
flyctl secrets set SUPABASE_WEBHOOK_URL="https://aiwwocigvktmtiawslrx.supabase.co/functions/v1/webhook-whatsapp"
flyctl deploy
```

### 2. Edge Function retorna erro 400
**Causa:** Payload com estrutura incorreta
**Solução:** Ver logs detalhados para identificar campo faltando

### 3. Usuário não autorizado
**Causa:** Usuário não está ativo no banco
**Solução:** Aprovar usuário no Supabase ou criar como admin

### 4. Edge Function não recebe requisição
**Causa:** WEBHOOK_URL incorreta ou Edge Function não deployada
**Solução:** 
```bash
# Verificar URL
flyctl secrets list

# Re-deploy Edge Function
npx supabase functions deploy webhook-whatsapp
```

## 📝 PRÓXIMOS PASSOS APÓS DEPLOY

1. Enviar mensagem de teste
2. Observar logs do Baileys Server
3. Observar logs da Edge Function
4. Identificar onde o fluxo está parando
5. Corrigir o problema específico

