# 🔧 RESOLVER O PROBLEMA DO BOT - PASSO A PASSO

## ❌ PROBLEMA ATUAL

1. **Edge Function sem variáveis de ambiente**
2. **Usuário "leone alves" está inativo**

## ✅ SOLUÇÃO RÁPIDA

### 1️⃣ Configurar ADMIN_NUMBER no .env

Abra o arquivo `.env` e substitua:
```
ADMIN_NUMBER="SEU_NUMERO_AQUI"
```

Por seu número de WhatsApp (sem + e sem espaços):
```
ADMIN_NUMBER="5531999999999"
```

### 2️⃣ Executar script de configuração

```powershell
cd whatsapp-scheduler-bot
.\configurar-secrets.ps1
```

O script vai:
- ✅ Ler as variáveis do `.env`
- ✅ Configurar os secrets no Supabase
- ✅ Mostrar o status de cada configuração

### 3️⃣ Re-deploy da Edge Function

```bash
npx supabase functions deploy webhook-whatsapp
```

### 4️⃣ Ativar o usuário no banco

**Opção A: Pelo Dashboard (Recomendado)**

1. Acesse: https://supabase.com/dashboard/project/aiwwocigvktmtiawslrx/editor
2. Abra a tabela `usuarios_autorizados`
3. Encontre o usuário com telefone `260339795013664`
4. Clique para editar
5. Mude `ativo` de `false` para `true`
6. Mude `role` para `admin` (opcional, mas recomendado)
7. Salve

**Opção B: Por SQL**

1. Acesse: https://supabase.com/dashboard/project/aiwwocigvktmtiawslrx/sql/new
2. Execute:

```sql
UPDATE usuarios_autorizados 
SET ativo = true, role = 'admin' 
WHERE telefone = '260339795013664';
```

### 5️⃣ Testar o bot

Envie uma mensagem de teste no WhatsApp e veja os logs:

```bash
cd baileys-server
flyctl logs
```

Deve aparecer:
```
✅ [MESSAGE_HANDLER] Mensagem processada pela Edge Function
```

## 📊 VERIFICAR SE FUNCIONOU

### Ver secrets configurados

```bash
npx supabase secrets list
```

Deve mostrar:
- ✅ BAILEYS_API_URL
- ✅ MISTRAL_API_KEY
- ✅ ADMIN_NUMBER

### Ver logs da Edge Function

Acesse: https://supabase.com/dashboard/project/aiwwocigvktmtiawslrx/functions/webhook-whatsapp/logs

Deve aparecer:
```
✅ [WEBHOOK] Validações iniciais passaram!
👤 [WEBHOOK] Usuário encontrado: {...}
```

## 🎯 RESUMO

```bash
# 1. Editar .env (adicionar seu número no ADMIN_NUMBER)

# 2. Configurar secrets
cd whatsapp-scheduler-bot
.\configurar-secrets.ps1

# 3. Re-deploy
npx supabase functions deploy webhook-whatsapp

# 4. Ativar usuário no Dashboard do Supabase

# 5. Testar
cd baileys-server
flyctl logs
# (enviar mensagem no WhatsApp)
```

## ❓ PROBLEMAS?

Se ainda não funcionar, verifique:

1. **Secrets configurados?**
   ```bash
   npx supabase secrets list
   ```

2. **Edge Function deployada?**
   ```bash
   npx supabase functions list
   ```

3. **Usuário ativo?**
   Verificar no Dashboard: https://supabase.com/dashboard/project/aiwwocigvktmtiawslrx/editor

4. **Logs do Baileys Server**
   ```bash
   cd baileys-server
   flyctl logs
   ```

