# 🔍 Debug do Scheduler de Agendamentos

## Problema
Agendamentos não disparam quando o código está no Git (produção)

## Causas Possíveis

### 1️⃣ WhatsApp não está conectado
**Verificação:** No log inicial, procure por:
```
✅ WhatsApp conectado com sucesso!
```

Se não aparecer, o WhatsApp não conectou.

### 2️⃣ QR Code não foi escaneado
**Solução:**
- Deploy deve exibir o QR Code
- Você precisa escanear com seu WhatsApp pessoal
- Credenciais são salvas em `auth_info/`

### 3️⃣ Sessão expirou ou credenciais inválidas
**Verificações no `whatsapp.js` linha 105:**
```javascript
if (connection === 'open') {
  connected = true; ← Isso determina se agendamentos rodam
}
```

### 4️⃣ Scheduler não está iniciando
**Verificação no `index.js`:**
```javascript
// Iniciar scheduler
console.log('\n⏰ Iniciando scheduler de agendamentos...');
startScheduler();
console.log('✅ Scheduler iniciado com sucesso');
```

## Checklist de Debug

```bash
# 1. Verificar se o bot inicia
npm start

# 2. Procurar nos logs:
✅ WhatsApp conectado com sucesso!
✅ Scheduler iniciado com sucesso
🔄 [HH:MM] Verificando agendamentos...

# 3. Se Ver:
⚠️ WhatsApp não está conectado. Pulando verificação de agendamentos.
→ PROBLEMA: WhatsApp não conectado
→ SOLUÇÃO: Fazer login/escanear QR Code
```

## Solução Imediata

1. **Deletar sessão expirada:**
   ```bash
   rm -rf bot/auth_info/*
   ```

2. **Reiniciar o bot**
3. **Escanear o novo QR Code com seu WhatsApp**
4. **Aguardar conexão**: `✅ WhatsApp conectado com sucesso!`
5. **Agendamentos devem funcionar**

## Logs Para Investigar

### ✅ Esperado:
```
✅ WhatsApp conectado com sucesso!
⏰ Scheduler iniciado! Verificando agendamentos a cada minuto...
🔄 Verificando agendamentos...
✅ Nenhum agendamento pendente.
(OU)
✅ Encontrados X agendamentos para processar.
```

### ❌ Erro:
```
⚠️ WhatsApp não está conectado. Pulando verificação de agendamentos.
❌ Erro ao buscar agendamentos: ...
❌ Conexão fechada. Status: ...
```
