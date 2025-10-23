# 🚀 Projeto Completo - Sistema de Agendamento WhatsApp

Este repositório contém todos os arquivos e códigos necessários para implantar um bot de agendamento de mensagens no WhatsApp, utilizando a arquitetura descrita.

## 🛠️ Tecnologias Utilizadas
- **WhatsApp Gateway:** [Evolution API](https://github.com/EvolutionAPI/evolution-api)
- **Hospedagem da API:** [Render.com](http://render.com/)
- **Banco de Dados & Funções Serverless:** [Supabase](https://supabase.com/)
- **Executor de Tarefas Agendadas (Cron):** [GitHub Actions](https://github.com/features/actions)

## 📁 Estrutura do Projeto
- **`.github/workflows/`**: Contém os arquivos YAML que definem os cron jobs para enviar mensagens e sincronizar membros.
- **`supabase/migrations/`**: Script SQL para criar toda a estrutura do banco de dados no Supabase.
- **`supabase/functions/`**: Código da Edge Function (TypeScript) que atua como webhook, processando as interações dos usuários.
- **`scripts/`**: Scripts Node.js executados pelos GitHub Actions para as tarefas agendadas.
- **`package.json`**: Define as dependências dos scripts Node.js.
- **`.env.example`**: Um template para as variáveis de ambiente necessárias.

## 🚀 Passo a Passo de Implementação

Siga exatamente o guia "PASSO A PASSO DE IMPLEMENTAÇÃO" fornecido na especificação inicial.

### FASE 1: Preparação
1. Crie contas gratuitas no [Render.com](http://render.com/), [Supabase](https://supabase.com/) e [GitHub](https://github.com/).
2. Prepare um número de telefone exclusivo para o bot.
3. Crie um grupo no WhatsApp chamado "Envios" (ou o nome que preferir).

### FASE 2: Configurar Supabase
1. Crie um novo projeto no Supabase.
2. Navegue até o **SQL Editor**.
3. Copie o conteúdo de `supabase/migrations/0000_initial_schema.sql` e execute-o.
4. Anote suas credenciais de API (URL e `service_role_key`).
5. Siga as instruções para implantar a Edge Function `webhook-whatsapp`.

### FASE 3: Configurar Evolution API no Render
1. Faça o deploy da Evolution API no Render usando Docker.
2. Configure as variáveis de ambiente no Render (`AUTHENTICATION_API_KEY`, etc.).
3. Conecte seu número de WhatsApp escaneando o QR Code no painel da Evolution API.
4. Configure o webhook global da instância para apontar para a URL da sua Edge Function do Supabase.

### FASE 4: Configurar GitHub Actions
1. Faça um fork deste repositório para sua conta do GitHub.
2. No seu repositório, vá em **Settings > Secrets and variables > Actions**.
3. Adicione os seguintes *Repository secrets*:
    - `SUPABASE_URL`
    - `SUPABASE_SERVICE_KEY`
    - `EVOLUTION_API_URL`
    - `EVOLUTION_API_KEY`
    - `GROUP_ID` (pegue o ID do seu grupo "Envios" no painel da Evolution API)
    - `BOT_INSTANCE_NAME` (geralmente é `main`)
4. Vá na aba **Actions** e habilite os workflows.

### FASE 5: Finalização e Testes
1. Adicione o número do bot ao seu grupo "Envios".
2. Aguarde 5 minutos (ou execute o workflow `Sync Group Members` manualmente) para que os membros sejam autorizados.
3. Envie `/menu` no grupo "Envios". O bot deve responder no seu privado.
4. Siga as instruções do bot para criar um agendamento e teste o envio automático.

Parabéns! Seu sistema de agendamento está completo e funcional.