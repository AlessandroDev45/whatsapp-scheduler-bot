# 📱 COMO CONECTAR O WHATSAPP AO BOT

## 🎯 PASSO A PASSO

### 1️⃣ Abrir a página do QR Code

Abra no navegador:
```
https://whatsapp-bot-ale-2025.fly.dev/qrcode
```

**OU** use o comando:
```bash
start https://whatsapp-bot-ale-2025.fly.dev/qrcode
```

---

### 2️⃣ Escanear o QR Code com o WhatsApp

1. **Abra o WhatsApp** no seu celular
2. Vá em **Configurações** (ou **Ajustes**)
3. Toque em **Aparelhos conectados** (ou **WhatsApp Web**)
4. Toque em **Conectar aparelho** (ou **+**)
5. **Escaneie o QR Code** que aparece na página

---

### 3️⃣ Aguardar confirmação

Após escanear, você verá:
- ✅ No celular: "Conectado com sucesso"
- ✅ Na página: "WhatsApp já está conectado"
- ✅ Nos logs: "✅ WhatsApp conectado com sucesso!"

---

## 🔄 SE O QR CODE EXPIRAR

O QR Code expira a cada **60 segundos**. Se isso acontecer:

1. **Atualize a página** (F5 ou botão "🔄 Atualizar")
2. Um novo QR Code será gerado automaticamente
3. Escaneie o novo QR Code

---

## ✅ VERIFICAR SE ESTÁ CONECTADO

### Opção 1: Via navegador
```
https://whatsapp-bot-ale-2025.fly.dev/health
```

Deve retornar:
```json
{
  "status": "ok",
  "whatsapp": "connected"
}
```

### Opção 2: Via comando
```bash
curl https://whatsapp-bot-ale-2025.fly.dev/health
```

### Opção 3: Ver logs
```bash
flyctl logs
```

Procure por:
```
✅ WhatsApp conectado com sucesso!
```

---

## 🚨 PROBLEMAS COMUNS

### ❌ Problema: "QR Code não aparece"

**Solução:**
1. Aguarde alguns segundos
2. Atualize a página (F5)
3. Se não aparecer, reinicie o bot:
   ```bash
   flyctl apps restart
   ```

---

### ❌ Problema: "Conexão perdida após escanear"

**Solução:**
1. Verifique se o celular está conectado à internet
2. Verifique se o WhatsApp está atualizado
3. Tente escanear novamente

---

### ❌ Problema: "WhatsApp desconecta sozinho"

**Solução:**
1. Verifique se não há outro dispositivo conectado com o mesmo número
2. Certifique-se de que o celular não está em modo de economia de bateria
3. Mantenha o WhatsApp aberto no celular por alguns minutos após conectar

---

## 📊 ENDPOINTS ÚTEIS

### Ver QR Code (HTML)
```
https://whatsapp-bot-ale-2025.fly.dev/qrcode
```

### Ver status (JSON)
```
https://whatsapp-bot-ale-2025.fly.dev/api/status
```

### Ver QR Code (JSON)
```
https://whatsapp-bot-ale-2025.fly.dev/api/qrcode
```

### Health check
```
https://whatsapp-bot-ale-2025.fly.dev/health
```

---

## 🔧 COMANDOS ÚTEIS

### Ver logs em tempo real
```bash
flyctl logs
```

### Verificar status
```bash
flyctl status
```

### Reiniciar bot
```bash
flyctl apps restart
```

### Resetar conexão WhatsApp
```bash
curl -X POST https://whatsapp-bot-ale-2025.fly.dev/api/reset
```

---

## ⚠️ IMPORTANTE

1. **Mantenha o celular conectado à internet** durante o processo
2. **Não feche o WhatsApp** imediatamente após escanear
3. **Aguarde a confirmação** de conexão bem-sucedida
4. **A sessão é salva automaticamente** - você só precisa escanear 1 vez
5. **Se o bot reiniciar**, ele reconecta automaticamente (não precisa escanear de novo)

---

## 🎉 APÓS CONECTAR

1. ✅ Teste enviando uma mensagem para o bot
2. ✅ Verifique se o bot responde
3. ✅ Monitore os logs por alguns minutos
4. ✅ Verifique se os agendamentos estão funcionando

---

## 📞 SUPORTE

Se nada funcionar:
1. Verifique os logs: `flyctl logs`
2. Verifique o status: `flyctl status`
3. Tente resetar a conexão: `curl -X POST https://whatsapp-bot-ale-2025.fly.dev/api/reset`
4. Como último recurso, delete o volume e recrie:
   ```bash
   flyctl volumes destroy whatsapp_auth
   flyctl volumes create whatsapp_auth --region gru --size 1
   flyctl deploy
   ```

---

**Última atualização:** 29/10/2025
**Autor:** AleTubeGames

