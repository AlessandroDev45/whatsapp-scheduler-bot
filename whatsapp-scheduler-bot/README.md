# 🤖 WhatsMatic - Sistema de Agendamento de Mensagens WhatsApp

Sistema completo de agendamento de mensagens para WhatsApp com IA integrada.

## 📋 Funcionalidades

- ✅ Agendamento de mensagens para grupos e contatos
- ✅ **Envio para múltiplos destinatários simultaneamente** (mesma mensagem, mesmo horário)
- ✅ Sincronização automática de grupos
- ✅ Busca rápida de grupos pelo nome (Supabase)
- ✅ Busca de contatos por número
- ✅ Melhoramento de mensagens com IA (Mistral AI)
- ✅ Sistema de aprovação de usuários
- ✅ Auditoria completa de ações
- ✅ Agendamentos recorrentes (diários, semanais)
- ✅ Interface via WhatsApp (comandos)

## 🛠️ Tecnologias

- **Backend**: Supabase Edge Functions (Deno)
- **Banco de Dados**: PostgreSQL (Supabase)
- **WhatsApp API**: Evolution API
- **IA**: Mistral AI
- **Scheduler**: Cron Jobs

## 📦 Estrutura do Projeto

```
whatsapp-scheduler-bot/
├── scripts/                    # Scripts utilitários
│   ├── scheduler.js           # Processador de agendamentos
│   ├── setup-database.js      # Configuração inicial do banco
│   ├── setup-webhook.js       # Configuração do webhook
│   └── cadastrar-admin.js     # Cadastro de administrador
├── supabase/
│   ├── functions/
│   │   └── webhook-whatsapp/  # Edge Function principal
│   └── migrations/            # Migrations do banco de dados
├── package.json
└── README.md
```

## 🚀 Instalação

### 1. Pré-requisitos

- Node.js 18+
- Conta Supabase
- Evolution API configurada
- Conta Mistral AI (opcional)

### 2. Configuração

1. Clone o repositório
2. Instale as dependências:

```bash
npm install
```

3. Configure as variáveis de ambiente no Supabase:

```
SUPABASE_URL=sua_url
SUPABASE_SERVICE_ROLE_KEY=sua_key
EVOLUTION_API_URL=url_da_evolution_api
EVOLUTION_API_KEY=key_da_evolution_api
BOT_INSTANCE_NAME=nome_da_instancia
MISTRAL_API_KEY=key_da_mistral (opcional)
ADMIN_NUMBER=5531999999999
```

### 3. Deploy

```bash
# Deploy da Edge Function
npx supabase functions deploy webhook-whatsapp --no-verify-jwt

# Aplicar migrations
npx supabase db push
```

### 4. Configurar Webhook

```bash
node scripts/setup-webhook.js
```

### 5. Cadastrar Administrador

```bash
node scripts/cadastrar-admin.js
```

## 📱 Comandos do Bot

### Comandos Principais

- `/menu` - Exibir menu principal
- `/novo` - Criar novo agendamento
- `/listar` - Listar agendamentos
- `/sincronizar` - Sincronizar grupos do WhatsApp
- `/ajuda` - Exibir ajuda

### Comandos de Gerenciamento (Admin)

- `/aprovar [telefone]` - Aprovar usuário pendente
- `/rejeitar [telefone]` - Rejeitar usuário pendente
- `/listar user:[telefone]` - Listar agendamentos de um usuário

### Comandos de Agendamento

- `/deletar [id]` - Deletar agendamento
- `/editar [id]` - Editar agendamento
- `/ativar [id]` - Ativar agendamento
- `/desativar [id]` - Desativar agendamento
- `/historico [id]` - Ver histórico de alterações

### Comandos Durante Criação

- `/cancelar` - Cancelar operação atual
- `/voltar` - Voltar para etapa anterior

## 🔄 Scheduler

O scheduler processa os agendamentos automaticamente. Configure um cron job:

```bash
# Executar a cada minuto
* * * * * cd /caminho/do/projeto && node scripts/scheduler.js
```

Ou use um serviço como:
- **Render Cron Jobs**
- **GitHub Actions**
- **Vercel Cron**

## 📊 Banco de Dados

### Tabelas Principais

- `usuarios_autorizados` - Usuários do sistema
- `agendamentos` - Agendamentos de mensagens
- `grupos_usuario` - Cache de grupos sincronizados
- `sessoes_comando` - Sessões de criação de agendamentos
- `auditoria_agendamentos` - Log de alterações

## 🔐 Segurança

- ✅ Row Level Security (RLS) habilitado
- ✅ Service Role Key para operações internas
- ✅ Sistema de aprovação de usuários
- ✅ Auditoria completa de ações
- ✅ Validação de permissões

## 🤝 Contribuindo

Contribuições são bem-vindas! Por favor:

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/MinhaFeature`)
3. Commit suas mudanças (`git commit -m 'Adiciona MinhaFeature'`)
4. Push para a branch (`git push origin feature/MinhaFeature`)
5. Abra um Pull Request

## 📝 Licença

Este projeto está sob a licença MIT.

## 👨‍💻 Autor

**AleTubeGames**

---

💡 **Dica**: Para suporte, entre em contato com o administrador do sistema.

