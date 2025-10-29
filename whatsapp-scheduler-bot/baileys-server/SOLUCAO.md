# 🔧 SOLUÇÃO: Como fazer o bot funcionar novamente

## 📋 DIAGNÓSTICO

O bot está **PARADO** porque:
1. ❌ Sessão do WhatsApp expirou
2. ❌ Precisa escanear QR Code novamente
3. ❌ Máquinas em 2 regiões diferentes (dfw + gru)

---

## ✅ SOLUÇÃO RÁPIDA (Recomendada)

### Passo 1: Limpar máquinas antigas

```bash
# Listar todas as máquinas
flyctl machine list

# Parar e remover máquinas antigas (se houver mais de 1)
flyctl machine stop 3287e395f79985
flyctl machine stop 56837933b0658e

# Remover máquinas antigas
flyctl machine destroy 3287e395f79985
flyctl machine destroy 56837933b0658e
```

### Passo 2: Criar nova máquina na região correta (São Paulo)

```bash
# Deploy novamente (vai criar máquina nova em gru)
flyctl deploy --region gru
```

### Passo 3: Ver logs e escanear QR Code

```bash
# Ver logs em tempo real
flyctl logs

# Quando aparecer o QR Code, escaneie com seu WhatsApp:
# WhatsApp > Configurações > Aparelhos conectados > Conectar aparelho
```

### Passo 4: Verificar se conectou

```bash
# Aguardar mensagem nos logs:
# ✅ WhatsApp conectado com sucesso!

# Verificar status
flyctl status
```

---

## 🔄 SOLUÇÃO ALTERNATIVA (Se a rápida não funcionar)

### Opção A: Resetar sessão do WhatsApp

```bash
# Deletar volume (apaga sessão antiga)
flyctl volumes list
flyctl volumes destroy whatsapp_auth

# Criar volume novo
flyctl volumes create whatsapp_auth --region gru --size 1

# Deploy novamente
flyctl deploy --region gru
```

### Opção B: Recriar app do zero

```bash
# Deletar app atual
flyctl apps destroy whatsapp-bot-ale-2025

# Criar novo app
flyctl launch --no-deploy

# Criar volume
flyctl volumes create whatsapp_auth --region gru --size 1

# Configurar secrets
flyctl secrets set SUPABASE_URL="https://seu-projeto.supabase.co"
flyctl secrets set SUPABASE_SERVICE_KEY="seu_service_role_key"
flyctl secrets set SUPABASE_WEBHOOK_URL="https://seu-projeto.supabase.co/functions/v1/webhook-whatsapp"
flyctl secrets set BOT_INSTANCE_NAME="whatsapp_bot"

# Deploy
flyctl deploy
```

---

## 🎯 COMANDOS ÚTEIS

### Verificar status
```bash
flyctl status
flyctl machine list
flyctl volumes list
```

### Ver logs
```bash
flyctl logs
flyctl logs --app whatsapp-bot-ale-2025
```

### Reiniciar
```bash
flyctl apps restart
flyctl machine restart <machine_id>
```

### Verificar health
```bash
curl https://whatsapp-bot-ale-2025.fly.dev/health
```

---

## 📊 COMO SABER SE ESTÁ FUNCIONANDO

### ✅ Sinais de sucesso:

1. **Logs mostram:**
   ```
   ✅ WhatsApp conectado com sucesso!
   ✅ Sistema totalmente operacional!
   ```

2. **Status mostra:**
   ```
   STATE: started
   CHECKS: 1 total, 1 passing
   ```

3. **Health check retorna:**
   ```json
   {
     "status": "ok",
     "whatsapp": "connected"
   }
   ```

4. **Bot responde no WhatsApp:**
   - Envie uma mensagem para o bot
   - Deve receber resposta automática

---

## ⚠️ PROBLEMAS COMUNS

### Problema: QR Code expira antes de escanear
**Solução:** QR Code renova a cada 60 segundos, aguarde o próximo

### Problema: "Connection closed"
**Solução:** Reinicie a máquina: `flyctl apps restart`

### Problema: Múltiplas máquinas rodando
**Solução:** Mantenha apenas 1 máquina na região `gru`

### Problema: Volume não monta
**Solução:** Verifique se volume existe: `flyctl volumes list`

---

## 🚀 PRÓXIMOS PASSOS APÓS CONECTAR

1. ✅ Testar envio de mensagem
2. ✅ Verificar scheduler funcionando
3. ✅ Monitorar logs por 24h
4. ✅ Configurar alertas (opcional)

---

## 📞 SUPORTE

Se nada funcionar:
1. Verifique variáveis de ambiente: `flyctl secrets list`
2. Verifique se Supabase está online
3. Verifique se webhook está configurado
4. Entre em contato com suporte do Fly.io

---

**Última atualização:** 29/10/2025
**Autor:** AleTubeGames

