# 🔧 CORRIGIR ADMIN_NUMBER NO SUPABASE

## 🔴 PROBLEMA ENCONTRADO:

O `ADMIN_NUMBER` está configurado com o valor **ERRADO** no Supabase:

- ❌ **Valor atual:** `5531984549893` (com **19** extra)
- ✅ **Valor correto:** `553184549893`

---

## 📋 PASSO A PASSO PARA CORRIGIR:

### 1️⃣ Acessar o Supabase Dashboard

Abra: https://supabase.com/dashboard/project/aiwwocigvktmtiawslrx/settings/functions

### 2️⃣ Ir para Edge Functions Secrets

1. No menu lateral, clique em **"Edge Functions"**
2. Clique em **"Manage secrets"** ou **"Environment variables"**

### 3️⃣ Editar ADMIN_NUMBER

1. Procure pela variável `ADMIN_NUMBER`
2. Clique em **"Edit"** ou no ícone de lápis
3. Altere o valor de `5531984549893` para `553184549893`
4. Clique em **"Save"** ou **"Update"**

### 4️⃣ Fazer Redeploy (Opcional)

O Supabase pode aplicar automaticamente, mas para garantir:

```bash
npx supabase functions deploy webhook-whatsapp
```

---

## ✅ VERIFICAR SE FUNCIONOU:

Após a correção, tente no WhatsApp:

```
/aprovar 553196797442
```

Deve funcionar agora! 🎉

---

## 📊 COMPARAÇÃO:

| Item | Antes | Depois |
|------|-------|--------|
| ADMIN_NUMBER | `5531984549893` | `553184549893` |
| Dígitos | 13 | 12 |
| Problema | Tinha "19" extra | Correto |

---

## 🔍 COMO DESCOBRIMOS:

Nos logs do Supabase apareceu:

```
🔍 [APROVAR] ADMIN_NUMBER: 5531984549893
🔍 [APROVAR] Verificando permissão de admin para: 553184549893
🔍 [APROVAR] Resultado: false
```

A comparação falhava porque:
- `5531984549893` !== `553184549893`

