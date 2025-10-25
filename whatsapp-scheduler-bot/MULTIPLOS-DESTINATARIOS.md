# 📤 Envio para Múltiplos Destinatários

## 🎯 Funcionalidade

Permite enviar a **mesma mensagem** para **vários grupos ou contatos** simultaneamente, com:

✅ **Mesma mensagem**
✅ **Mesmo horário**
✅ **Mesmos dias da semana**
✅ **Mesma data de término**

## 🚀 Como Usar

### 1. Criar Novo Agendamento

```
/novo
```

### 2. Seguir o Fluxo Normal

1. **Digite a mensagem**
2. **Melhore com IA** (opcional)
3. **Aprove a mensagem**

### 3. Adicionar Destinatários

Quando chegar na etapa de escolher destinatário:

```
👥 Digite o nome do grupo ou contato:
```

**Para grupos:**
- Digite parte do nome (ex: "Petrópolis")
- O sistema busca no Supabase

**Para contatos:**
- Digite o número com DDD (ex: 5531999999999)

### 4. Adicionar Mais Destinatários

Após selecionar o primeiro destinatário:

```
✅ Destinatário adicionado:
👥 G. Louvor Petrópolis

📋 Total selecionado(s): 1

1. 👥 G. Louvor Petrópolis

━━━━━━━━━━━━━━━━━━━━
💡 Deseja adicionar mais destinatários?

1️⃣ Sim - Adicionar mais
2️⃣ Não - Continuar
```

**Opções:**
- Digite `1` ou `sim` para adicionar mais
- Digite `2` ou `não` para continuar

### 5. Repetir Quantas Vezes Quiser

Você pode adicionar quantos destinatários quiser!

### 6. Confirmar

Na confirmação final, você verá todos os destinatários:

```
╔═══════════════════════════╗
║  ✅ CONFIRMAR AGENDAMENTO
╚═══════════════════════════╝

📝 Mensagem:
Boa tarde! Lembrete importante...

👤 Destinatário(s): (3)
1. 👥 G. Louvor Petrópolis
2. 👥 Jovens Petrópolis
3. 👥 ICM Jardim Petrópolis

⏰ Horário:
14:00

📅 Dias da semana:
Seg, Qua, Sex

📆 Término:
Nunca (indeterminado)
```

## 🔧 Como Funciona Internamente

### 1. Armazenamento Temporário

Durante o fluxo, os destinatários são armazenados em:

```typescript
updatedSessionData.destinatarios = [
  { id: "120363318862188100@g.us", nome: "👥 G. Louvor Petrópolis", tipo: "grupo" },
  { id: "120363318862188101@g.us", nome: "👥 Jovens Petrópolis", tipo: "grupo" },
  { id: "5531999999999@s.whatsapp.net", nome: "📱 5531999999999", tipo: "contato" }
]
```

### 2. Criação dos Agendamentos

Na confirmação final, o sistema cria **um agendamento para cada destinatário**:

```typescript
// Para cada destinatário
for (const dest of destinatarios) {
  agendamentosParaCriar.push({
    usuario_id: user.id,
    mensagem: "Boa tarde! Lembrete...",
    destinatario_id: dest.id,
    destinatario_tipo: dest.tipo,
    destinatario_nome: dest.nome,
    hora_envio: "14:00",
    dias_semana: [1, 3, 5],
    data_termino: null,
    ativo: true
  })
}

// Inserir todos de uma vez
await supabase.from('agendamentos').insert(agendamentosParaCriar)
```

### 3. Resultado

Você terá **3 agendamentos separados** no banco:

| ID | Mensagem | Destinatário | Horário | Dias |
|----|----------|--------------|---------|------|
| 1 | Boa tarde... | G. Louvor Petrópolis | 14:00 | Seg, Qua, Sex |
| 2 | Boa tarde... | Jovens Petrópolis | 14:00 | Seg, Qua, Sex |
| 3 | Boa tarde... | ICM Jardim Petrópolis | 14:00 | Seg, Qua, Sex |

## 📊 Vantagens

✅ **Facilidade**: Não precisa criar agendamento por agendamento
✅ **Consistência**: Mesma mensagem, horário e dias para todos
✅ **Gerenciamento**: Cada agendamento pode ser editado/deletado individualmente depois
✅ **Auditoria**: Cada agendamento tem seu próprio histórico

## 🎯 Casos de Uso

### Exemplo 1: Avisos para Múltiplos Grupos

```
Mensagem: "Reunião hoje às 19h! Não faltem!"
Destinatários:
- G. Louvor Petrópolis
- Jovens Petrópolis
- Obreiros Jardim Petrópolis
Horário: 17:00
Dias: Todos os dias
```

### Exemplo 2: Lembretes para Contatos

```
Mensagem: "Lembrete: Pagamento vence amanhã!"
Destinatários:
- 5531999999999
- 5531888888888
- 5531777777777
Horário: 09:00
Dias: Seg-Sex
```

### Exemplo 3: Comunicados Semanais

```
Mensagem: "Programação da semana disponível!"
Destinatários:
- Todos os grupos da igreja (10 grupos)
Horário: 08:00
Dias: Segunda
```

## 🔍 Busca de Destinatários

### Grupos (Supabase)

O sistema busca grupos **pelo nome** na tabela `grupos_usuario`:

```sql
SELECT grupo_jid, grupo_nome, tipo
FROM grupos_usuario
WHERE usuario_id = 'seu_id'
  AND ativo = true
  AND grupo_nome ILIKE '%termo_busca%'
ORDER BY grupo_nome
LIMIT 10
```

**Vantagens:**
- ⚡ Busca rápida (~100ms)
- 🎯 Busca apenas seus grupos
- 📝 Busca por nome parcial

### Contatos (Número Direto)

Para contatos, basta digitar o número:

```
5531999999999
```

O sistema detecta automaticamente e cria o JID:

```
5531999999999@s.whatsapp.net
```

## 🛠️ Estados da Máquina

Novos estados adicionados:

1. **`perguntando_mais_destinatarios`**
   - Pergunta se quer adicionar mais destinatários
   - Opções: Sim (1) ou Não (2)

2. **Retorno para `escolhendo_destinatario`**
   - Se escolher "Sim", volta para buscar mais destinatários
   - Mantém os destinatários já selecionados

## 📝 Notas Técnicas

- ✅ Compatível com agendamentos antigos (fallback para `destinatario_id`)
- ✅ Validação de dados antes de criar agendamentos
- ✅ Auditoria individual para cada agendamento criado
- ✅ Mensagem de sucesso mostra quantidade total criada

## 🎉 Resultado Final

Ao confirmar, você verá:

```
╔═══════════════════╗
║  ✅ SUCESSO!
╚═══════════════════╝

🎉 3 agendamento(s) criado(s)!

Sua mensagem será enviada automaticamente nos dias e horários configurados.

━━━━━━━━━━━━━━━━━━━━
📋 Digite /listar para ver todos
🆕 Digite /novo para criar outro
```

---

_💻 Pensado e desenvolvido por AleTubeGames_

