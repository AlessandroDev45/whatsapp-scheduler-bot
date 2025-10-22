# 🤖 WhatsApp Scheduler Bot

Sistema completo de agendamento de mensagens no WhatsApp com interface conversacional.

**Número do Bot:** +55 19 98720 0383

## ⚡ Início Rápido

### 📚 Documentação Completa

- **[GUIA_IMPLANTACAO.md](GUIA_IMPLANTACAO.md)** - Guia passo a passo detalhado
- **[CHECKLIST.md](CHECKLIST.md)** - Checklist interativo para acompanhar o progresso
- **[deploy-helper.ps1](deploy-helper.ps1)** - Script PowerShell auxiliar

### 🚀 Comandos Rápidos

```powershell
# 1. Executar o script auxiliar (recomendado)
.\deploy-helper.ps1

# 2. Ou executar manualmente:

# Criar arquivo .env
Copy-Item .env.example .env
# Edite o .env com suas credenciais

# Link com Supabase
npx supabase link --project-ref SEU_PROJECT_REF

# Configurar segredos
npx supabase secrets set --env-file .env

# Implantar Edge Function
npx supabase functions deploy webhook-whatsapp --no-verify-jwt
```

## 🛠️ Tecnologias Utilizadas

- **WhatsApp Gateway:** [Evolution API](https://github.com/EvolutionAPI/evolution-api)
- **Hospedagem da API:** [Render.com](http://render.com/)
- **Banco de Dados & Funções Serverless:** [Supabase](https://supabase.com/)
- **Executor de Tarefas Agendadas (Cron):** [GitHub Actions](https://github.com/features/actions)

## 📁 Estrutura do Projeto

```
whatsapp-scheduler-bot/
├── .github/workflows/       # GitHub Actions (cron jobs)
│   ├── scheduler.yml        # Envio de mensagens agendadas
│   └── sync-members.yml     # Sincronização de membros do grupo
├── supabase/
│   ├── functions/           # Edge Functions (TypeScript)
│   │   ├── webhook-whatsapp/
│   │   │   └── index.ts     # Webhook principal
│   │   └── _shared/
│   │       └── cors.ts      # Configuração CORS
│   ├── migrations/          # Scripts SQL
│   │   └── 0000_initial_schema.sql
│   └── config.toml          # Configuração do Supabase
├── scripts/                 # Scripts Node.js
│   ├── scheduler.js         # Lógica de envio de mensagens
│   └── sync-members.js      # Sincronização de membros
├── .env.example             # Template de variáveis de ambiente
├── package.json             # Dependências Node.js
├── GUIA_IMPLANTACAO.md      # 📚 Guia completo de implantação
├── CHECKLIST.md             # ✅ Checklist de progresso
└── deploy-helper.ps1        # 🔧 Script auxiliar PowerShell
```

## 📋 Pré-requisitos

- Conta no [Supabase](https://supabase.com/) (gratuita)
- Conta no [Render.com](https://render.com/) (gratuita)
- Conta no [GitHub](https://github.com/) (gratuita)
- Número de telefone exclusivo para o bot (+55 19 98720 0383)
- Node.js instalado (v18 ou superior)

## 🎯 Funcionalidades

- ✅ Agendamento de mensagens por dia da semana e horário
- ✅ Interface conversacional via WhatsApp
- ✅ Controle de acesso por grupo
- ✅ Histórico de envios
- ✅ Gerenciamento de agendamentos
- ✅ Sincronização automática de membros autorizados

## 📖 Como Usar

### Para Usuários Autorizados

1. Entre no grupo "Envios"
2. Envie `/menu` no grupo
3. Receba o menu no privado
4. Siga as instruções do bot

### Comandos Disponíveis

- `/menu` - Exibir menu principal
- `/novo` - Criar novo agendamento
- `/listar` - Ver seus agendamentos
- `/ajuda` - Ver comandos disponíveis
- `/cancelar` - Cancelar operação atual

## 🔒 Segurança

- ⚠️ Mantenha o repositório **PRIVADO**
- ⚠️ Nunca compartilhe suas chaves de API
- ⚠️ Use um número exclusivo para o bot (não use seu número pessoal)
- ⚠️ Revise os logs regularmente

## 📞 Suporte

Se encontrar problemas:

1. Verifique os logs no Supabase (Edge Functions)
2. Verifique os logs no GitHub Actions
3. Confirme que todos os segredos estão configurados corretamente
4. Certifique-se de que o bot está no grupo "Envios"

## 📄 Licença

Este projeto é de código aberto e está disponível sob a licença MIT.
