# 🚀 WhatsApp Baileys Server

Servidor Node.js com Baileys para conexão direta com WhatsApp.

## 📋 Características

- ✅ Conexão direta com WhatsApp via Baileys
- ✅ Sessão persistente (não precisa escanear QR toda hora)
- ✅ Scheduler integrado para agendamentos
- ✅ API REST para envio de mensagens
- ✅ Integração com Supabase
- ✅ Deploy no Fly.io (grátis, 24/7, não hiberna)

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────┐
│  FLY.IO (Este servidor)                │
│  ├─ Baileys (WhatsApp)                 │
│  ├─ Scheduler (agendamentos)           │
│  └─ API REST (envios)                  │
└─────────────────────────────────────────┘
              ↕️
┌─────────────────────────────────────────┐
│  SUPABASE                               │
│  ├─ PostgreSQL (dados)                 │
│  ├─ Edge Functions (lógica)            │
│  └─ Storage (backup)                   │
└─────────────────────────────────────────┘
```

## 🚀 Deploy no Fly.io

### 1. Instalar Fly CLI

```powershell
# Windows PowerShell
powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"
```

### 2. Login no Fly.io

```bash
flyctl auth login
```

### 3. Criar app e volume

```bash
# Navegar para a pasta do servidor
cd baileys-server

# Criar app
flyctl launch --no-deploy

# Criar volume para sessão WhatsApp
flyctl volumes create whatsapp_auth --size 1
```

### 4. Configurar variáveis de ambiente

```bash
flyctl secrets set SUPABASE_URL="https://seu-projeto.supabase.co"
flyctl secrets set SUPABASE_SERVICE_KEY="seu_service_role_key"
flyctl secrets set SUPABASE_WEBHOOK_URL="https://seu-projeto.supabase.co/functions/v1/webhook-whatsapp"
flyctl secrets set BOT_INSTANCE_NAME="whatsapp_bot"
```

### 5. Deploy

```bash
flyctl deploy
```

### 6. Conectar WhatsApp (escanear QR code)

```bash
# Ver logs em tempo real
flyctl logs

# Quando aparecer o QR code, escanear com WhatsApp
# Após conectar, a sessão fica salva no volume (não precisa escanear novamente)
```

## 📡 Endpoints da API

### Health Check
```bash
GET /health
```

### Enviar Mensagem
```bash
POST /api/send-message
Content-Type: application/json

{
  "jid": "5531999999999@s.whatsapp.net",
  "text": "Olá, mundo!"
}
```

### Enviar Mensagem com Botões
```bash
POST /api/send-buttons
Content-Type: application/json

{
  "jid": "5531999999999@s.whatsapp.net",
  "text": "Escolha uma opção:",
  "buttons": [
    { "id": "1", "text": "Opção 1" },
    { "id": "2", "text": "Opção 2" }
  ]
}
```

### Ver Status
```bash
GET /api/status
```

### Ver QR Code
```bash
GET /api/qrcode
```

## 🔧 Comandos Úteis

```bash
# Ver logs
flyctl logs

# Ver status
flyctl status

# Acessar console da VM
flyctl ssh console

# Reiniciar app
flyctl apps restart

# Ver métricas
flyctl metrics

# Escalar (aumentar recursos)
flyctl scale memory 512  # Aumentar para 512MB (ainda grátis)
```

## 🐛 Troubleshooting

### QR Code não aparece
```bash
# Ver logs em tempo real
flyctl logs

# Se necessário, reiniciar
flyctl apps restart
```

### Sessão perdida
```bash
# Verificar se o volume está montado
flyctl volumes list

# Se necessário, criar novo volume
flyctl volumes create whatsapp_auth --size 1
```

### App não responde
```bash
# Ver status
flyctl status

# Ver logs
flyctl logs

# Reiniciar
flyctl apps restart
```

## 📝 Desenvolvimento Local

```bash
# Instalar dependências
npm install

# Copiar .env.example para .env
cp .env.example .env

# Editar .env com suas credenciais
nano .env

# Rodar em modo desenvolvimento
npm run dev
```

## 🎯 Próximos Passos

Após deploy bem-sucedido:

1. ✅ Escanear QR code (apenas 1x)
2. ✅ Verificar conexão: `flyctl logs`
3. ✅ Testar envio de mensagem
4. ✅ Configurar GitHub Actions para CI/CD automático

## 📚 Documentação

- [Baileys](https://github.com/WhiskeySockets/Baileys)
- [Fly.io](https://fly.io/docs/)
- [Supabase](https://supabase.com/docs)

