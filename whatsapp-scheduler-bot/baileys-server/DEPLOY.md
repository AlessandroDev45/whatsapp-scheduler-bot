# 🚀 GUIA DE DEPLOY - PASSO A PASSO

## ✅ PRÉ-REQUISITOS

- [x] Conta no Fly.io criada
- [x] Fly CLI instalado
- [x] Login feito (`flyctl auth login`)

---

## 📝 PASSO 1: NAVEGAR PARA A PASTA

```bash
cd whatsapp-scheduler-bot/baileys-server
```

---

## 📝 PASSO 2: CRIAR APP NO FLY.IO

```bash
flyctl launch --no-deploy
```

**O que vai acontecer:**
- Fly.io vai detectar o Dockerfile
- Vai perguntar o nome do app (pode aceitar o sugerido ou escolher outro)
- Vai perguntar a região (escolha `gru` - São Paulo)
- Vai perguntar se quer criar banco de dados (responda **NÃO**, já temos Supabase)

**Exemplo de respostas:**
```
? Choose an app name (leave blank to generate one): whatsapp-baileys-bot
? Choose a region for deployment: São Paulo, Brazil (gru)
? Would you like to set up a Postgresql database now? No
? Would you like to set up an Upstash Redis database now? No
? Would you like to deploy now? No
```

---

## 📝 PASSO 3: CRIAR VOLUME PARA SESSÃO WHATSAPP

```bash
flyctl volumes create whatsapp_auth --region gru --size 1
```

**O que é isso:**
- Volume persistente de 1GB
- Armazena a sessão do WhatsApp
- Mesmo se o app reiniciar, a sessão permanece
- **Não precisa escanear QR code toda hora!**

---

## 📝 PASSO 4: CONFIGURAR VARIÁVEIS DE AMBIENTE

```bash
# Supabase URL
flyctl secrets set SUPABASE_URL="https://aiwwocigvktmtiawslrx.supabase.co"

# Supabase Service Key (pegar do Supabase Dashboard > Settings > API)
flyctl secrets set SUPABASE_SERVICE_KEY="sua_service_role_key_aqui"

# URL do webhook (Edge Function)
flyctl secrets set SUPABASE_WEBHOOK_URL="https://aiwwocigvktmtiawslrx.supabase.co/functions/v1/webhook-whatsapp"

# Nome da instância
flyctl secrets set BOT_INSTANCE_NAME="whatsapp_bot"
```

**IMPORTANTE:** Substitua `sua_service_role_key_aqui` pela sua chave real do Supabase!

---

## 📝 PASSO 5: FAZER DEPLOY

```bash
flyctl deploy
```

**O que vai acontecer:**
- Fly.io vai buildar a imagem Docker
- Vai fazer upload
- Vai iniciar o app
- Pode demorar 2-3 minutos

---

## 📝 PASSO 6: VER LOGS E ESCANEAR QR CODE

```bash
flyctl logs
```

**O que procurar:**
- Mensagem: "📱 QR CODE GERADO!"
- Um QR code vai aparecer no terminal
- **Escaneie com seu WhatsApp** (Dispositivos Conectados)

**Após escanear:**
- Vai aparecer: "✅ WhatsApp conectado com sucesso!"
- A sessão fica salva no volume
- **Nunca mais precisa escanear!** (a menos que você deslogue manualmente)

---

## 📝 PASSO 7: VERIFICAR SE ESTÁ FUNCIONANDO

```bash
# Ver status
flyctl status

# Ver URL do app
flyctl info

# Testar health check
curl https://seu-app.fly.dev/health
```

**Resposta esperada:**
```json
{
  "status": "ok",
  "whatsapp": "connected",
  "uptime": 123.45,
  "timestamp": "2025-10-25T..."
}
```

---

## 🎯 PRONTO! SISTEMA FUNCIONANDO 24/7

Agora seu bot está:
- ✅ Rodando 24/7 no Fly.io
- ✅ Conectado no WhatsApp
- ✅ Processando mensagens
- ✅ Executando agendamentos
- ✅ **Sem hibernar!**
- ✅ **Sem perder sessão!**

---

## 🔧 COMANDOS ÚTEIS

### Ver logs em tempo real
```bash
flyctl logs
```

### Ver status
```bash
flyctl status
```

### Reiniciar app
```bash
flyctl apps restart
```

### Acessar console da VM
```bash
flyctl ssh console
```

### Ver métricas
```bash
flyctl metrics
```

### Ver volumes
```bash
flyctl volumes list
```

---

## 🐛 TROUBLESHOOTING

### QR Code não aparece
```bash
# Reiniciar app
flyctl apps restart

# Ver logs
flyctl logs
```

### App não inicia
```bash
# Ver logs de erro
flyctl logs

# Verificar secrets
flyctl secrets list
```

### Sessão perdida
```bash
# Verificar se volume está montado
flyctl volumes list

# Se necessário, deletar e recriar
flyctl volumes destroy whatsapp_auth
flyctl volumes create whatsapp_auth --region gru --size 1
flyctl deploy
```

---

## 📊 MONITORAMENTO

### Dashboard do Fly.io
```
https://fly.io/dashboard
```

### Logs em tempo real
```bash
flyctl logs
```

### Métricas
```bash
flyctl metrics
```

---

## 🎉 PRÓXIMOS PASSOS

Após deploy bem-sucedido:

1. ✅ Testar envio de mensagem
2. ✅ Verificar scheduler funcionando
3. ✅ Configurar GitHub Actions (CI/CD automático)
4. ✅ Remover Evolution API do Render (não precisa mais!)

---

## ❓ DÚVIDAS?

- Documentação Fly.io: https://fly.io/docs/
- Documentação Baileys: https://github.com/WhiskeySockets/Baileys
- Suporte: Abrir issue no GitHub

