# 📱 WhatsApp Scheduler Bot

Servidor Node.js que mantém a conexão com o WhatsApp e executa os agendamentos de mensagens configurados no Supabase.

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────┐
│  SUPABASE                                   │
│  - Banco de dados (agendamentos/histórico)  │
│  - Edge Function (processa mensagens)       │
└────────────────┬────────────────────────────┘
                 │ webhook / queries
┌────────────────▼────────────────────────────┐
│  ESTE SERVIDOR (Docker)                     │
│  - Conexão persistente com WhatsApp         │
│  - Scheduler (verifica a cada minuto)       │
│  - API REST na porta 3000                   │
└─────────────────────────────────────────────┘
```

## 🚀 Como rodar

### 1. Configure as variáveis de ambiente

```bash
cp .env.example .env
# Edite o .env com suas credenciais
```

### 2. Suba com Docker Compose

```bash
docker compose up -d
docker compose logs -f   # ver logs e QR Code
```

### 3. Escaneie o QR Code

Abra o **WhatsApp → Dispositivos Conectados → Conectar dispositivo** e escaneie o QR Code que aparecer nos logs. A sessão fica salva permanentemente.

---

## 📋 Variáveis de ambiente

| Variável | Descrição |
|---|---|
| `SUPABASE_URL` | URL do projeto Supabase |
| `SUPABASE_SERVICE_KEY` | Service role key do Supabase |
| `SUPABASE_WEBHOOK_URL` | URL da Edge Function |
| `MISTRAL_API_KEY` | Chave da API Mistral AI |
| `BOT_INSTANCE_NAME` | Nome da instância (padrão: `whatsapp_bot`) |
| `PORT` | Porta do servidor (padrão: `3000`) |
| `AUTH_INFO_PATH` | Caminho da sessão WhatsApp (padrão: `./auth_info`) |

---

## 🔧 Comandos Docker

```bash
docker compose up -d          # Iniciar
docker compose logs -f        # Ver logs
docker compose restart        # Reiniciar
docker compose down           # Parar
docker compose down -v        # Parar + apagar sessão WhatsApp
```

---

Ver [DEPLOY.md](DEPLOY.md) para instruções completas de deploy em servidor.
