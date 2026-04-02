# 🚀 CORRIGIR AGENDAMENTOS NÃO DISPARAM NO GIT

## Problema
O código rodando no Git não dispara os agendamentos (mensagens automatizadas do WhatsApp).

## Causa Raiz
O scheduler só funciona se **o WhatsApp estiver conectado**. Se não estiver, ele pula a verificação.

## ✅ Solução em 5 Passos

### Passo 1: Deletar credenciais antigas (sessão expirada)
```bash
cd bot
rm -rf auth_info/*
```

### Passo 2: Testar a conexão do Scheduler
```bash
# No diretório raiz
node scripts/test-scheduler-connection.js
```

**O que você deve ver:**
```
✅ Todas as variáveis de ambiente configuradas
✅ Encontrados X agendamento(s)
(OU)
✅ Nenhum agendamento pendente no momento
```

### Passo 3: Iniciar o bot
```bash
cd bot
npm start
```

### Passo 4: Procurar pelos logs corretos

Você deve ver NESSA ORDEM:
```
1. ✅ WhatsApp conectado com sucesso!
2. ✅ Scheduler ativo - próximas verificações a cada 1 minuto
3. 🔄 [HH:MM] Verificando agendamentos...
4. ✅ Encontrados X agendamento(s) para processar:
   (OU)
   ✅ Nenhum agendamento pendente.
```

### Passo 5: Qual é seu status?

---

## 🔍 Se VER: "⚠️ WhatsApp não está conectado"

### Causa possível 1: QR Code não foi escaneado
**Solução:**
1. Procure no início dos logs por: `📱 QR CODE GERADO! ESCANEIE COM SEU WHATSAPP:`
2. O QR Code será exibido no terminal
3. Abra seu WhatsApp pessoal → Celular → Vincular um dispositivo
4. Escaneie o QR Code
5. Espere aparecer: `✅ WhatsApp conectado com sucesso!`

### Causa possível 2: Sessão expirou
**Solução:**
```bash
cd bot
rm -rf auth_info/*
npm start
# Escaneie o novo QR Code
```

### Causa possível 3: Erro de conexão/rede
**Debug mais detalhado:**
1. Procure nos logs por: `❌ Erro ao iniciar:`
2. Leia a mensagem de erro
3. Se for problema de rede, reinicie o bot

---

## 🔧 Melhorias Implementadas

✅ **Logs mais detalhados** do scheduler
✅ **Script de teste** (`test-scheduler-connection.js`)
✅ **Debug melhorado** da conexão WhatsApp

## 📋 Próximas Verificações de Agendamentos

Depois que o WhatsApp conectar:
- ✅ A cada 1 minuto: `🔄 Verificando agendamentos...`
- ✅ Se houver para enviar: `📤 Processando agendamento ...`
- ✅ Se tudo certo: Mensagem enviada! 🎉

---

## ❌ Se Ainda Não Funcionar

Rode o teste de conexão e compartilhe a saída:
```bash
node scripts/test-scheduler-connection.js
```

E depois rode o bot com logs completos:
```bash
cd bot
npm start 2>&1 | tee bot-logs.txt
```

Aguarde 5 minutos e compartilhe o arquivo `bot-logs.txt`.
