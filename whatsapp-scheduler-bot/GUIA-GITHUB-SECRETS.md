# 🔐 Guia de Configuração - GitHub Secrets

## 📋 O que são GitHub Secrets?

GitHub Secrets são variáveis de ambiente **secretas** que o GitHub Actions usa para executar os workflows (cron jobs) sem expor suas credenciais no código.

---

## 🎯 Secrets Necessários

Você precisa adicionar **5 secrets** no seu repositório:

| Nome do Secret | Descrição | Valor |
|----------------|-----------|-------|
| `SUPABASE_URL` | URL do seu projeto Supabase | `https://aiwwocigvktmtiawslrx.supabase.co` |
| `SUPABASE_SERVICE_KEY` | Service Role Key do Supabase | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `EVOLUTION_API_URL` | URL da Evolution API | `https://evolution-api-whatsapp-fru0.onrender.com` |
| `EVOLUTION_API_KEY` | API Key da Evolution | `754210As` |
| `BOT_INSTANCE_NAME` | Nome da instância do bot | `whatsapp_bot` |

---

## 📝 Passo a Passo

### 1️⃣ Acesse a página de Secrets

Abra o link (já foi aberto no navegador):
```
https://github.com/AlessandroDev45/whatsapp-scheduler-bot/settings/secrets/actions
```

### 2️⃣ Adicione cada Secret

Para cada secret abaixo, clique em **"New repository secret"** e preencha:

---

#### Secret 1: SUPABASE_URL

- **Name:** `SUPABASE_URL`
- **Secret:** `https://aiwwocigvktmtiawslrx.supabase.co`

Clique em **"Add secret"**

---

#### Secret 2: SUPABASE_SERVICE_KEY

- **Name:** `SUPABASE_SERVICE_KEY`
- **Secret:** 
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpd3dvY2lndmt0bXRpYXdzbHJ4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTE2MzAxNCwiZXhwIjoyMDc2NzM5MDE0fQ.08l6K4GMKS4fHaFdljOc3Mh_qglmoXTh1BZjOu1WbmQ
```

Clique em **"Add secret"**

---

#### Secret 3: EVOLUTION_API_URL

- **Name:** `EVOLUTION_API_URL`
- **Secret:** `https://evolution-api-whatsapp-fru0.onrender.com`

Clique em **"Add secret"**

---

#### Secret 4: EVOLUTION_API_KEY

- **Name:** `EVOLUTION_API_KEY`
- **Secret:** `754210As`

Clique em **"Add secret"**

---

#### Secret 5: BOT_INSTANCE_NAME

- **Name:** `BOT_INSTANCE_NAME`
- **Secret:** `whatsapp_bot`

Clique em **"Add secret"**

---

## ✅ Verificar se funcionou

### 1. Acesse a página de Actions:
```
https://github.com/AlessandroDev45/whatsapp-scheduler-bot/actions
```

### 2. Você verá 2 workflows:

- **Send Scheduled Messages** - Roda a cada 5 minutos
- **Sync Group Members** - Roda a cada 6 horas

### 3. Executar manualmente (para testar):

1. Clique em **"Send Scheduled Messages"**
2. Clique em **"Run workflow"** (botão à direita)
3. Clique em **"Run workflow"** (botão verde)
4. Aguarde alguns segundos e veja o resultado

---

## 🚀 Como funciona?

### Workflow: Send Scheduled Messages

**Arquivo:** `.github/workflows/send-scheduled-messages.yml`

**Frequência:** A cada 5 minutos (`*/5 * * * *`)

**O que faz:**
1. Busca agendamentos ativos no Supabase
2. Verifica se chegou a hora de enviar (`proximo_envio <= NOW()`)
3. Envia a mensagem via Evolution API
4. Registra no histórico de envios
5. Calcula o próximo envio

**Script executado:** `scripts/scheduler.js`

---

### Workflow: Sync Group Members

**Arquivo:** `.github/workflows/sync-group-members.yml`

**Frequência:** A cada 6 horas (`0 */6 * * *`)

**O que faz:**
1. Busca todos os grupos da Evolution API
2. Atualiza a tabela `grupos_usuario` no Supabase
3. Mantém o cache de grupos atualizado

**Script executado:** `scripts/sync-members.js`

---

## 🔍 Logs e Debugging

### Ver logs de execução:

1. Acesse: https://github.com/AlessandroDev45/whatsapp-scheduler-bot/actions
2. Clique no workflow que quer ver
3. Clique na execução (run)
4. Clique em "send-messages" ou "sync-members"
5. Veja os logs detalhados

---

## ⚠️ Problemas Comuns

### 1. Workflow não está rodando

**Causa:** Secrets não configurados corretamente

**Solução:** Verifique se todos os 5 secrets foram adicionados com os nomes EXATOS (case-sensitive)

---

### 2. Erro: "SUPABASE_SERVICE_KEY is not defined"

**Causa:** Secret com nome errado

**Solução:** O nome deve ser exatamente `SUPABASE_SERVICE_KEY` (não `SUPABASE_SERVICE_ROLE_KEY`)

---

### 3. Mensagens não estão sendo enviadas

**Causa:** Campo `proximo_envio` está NULL nos agendamentos

**Solução:** Execute o script para calcular o próximo envio:
```bash
node scripts/scheduler.js
```

Isso vai calcular e atualizar o `proximo_envio` de todos os agendamentos.

---

## 📊 Monitoramento

### Verificar agendamentos pendentes:

Execute no SQL Editor do Supabase:

```sql
SELECT 
  id,
  destinatario_nome,
  hora_envio,
  proximo_envio,
  ativo
FROM agendamentos
WHERE ativo = true
ORDER BY proximo_envio;
```

### Verificar histórico de envios:

```sql
SELECT 
  h.*,
  a.destinatario_nome,
  a.mensagem
FROM historico_envios h
JOIN agendamentos a ON h.agendamento_id = a.id
ORDER BY h.enviado_em DESC
LIMIT 20;
```

---

## 🎉 Pronto!

Após configurar os secrets, o sistema vai:

✅ Enviar mensagens automaticamente nos horários programados
✅ Sincronizar grupos a cada 6 horas
✅ Registrar tudo no histórico
✅ Funcionar 24/7 sem precisar de servidor próprio

**Tudo rodando no GitHub Actions gratuitamente!** 🚀

