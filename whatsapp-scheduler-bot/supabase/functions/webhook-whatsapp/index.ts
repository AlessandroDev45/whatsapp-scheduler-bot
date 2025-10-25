// @deno-types="https://deno.land/std@0.177.0/http/server.ts"
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
// @deno-types="https://esm.sh/@supabase/supabase-js@2.42.0"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.0'
import { corsHeaders } from '../_shared/cors.ts'

// Carregar variáveis de ambiente
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL')
const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY')
const BOT_INSTANCE_NAME = Deno.env.get('BOT_INSTANCE_NAME') || 'whatsapp_bot'
const MISTRAL_API_KEY = Deno.env.get('MISTRAL_API_KEY')
const MISTRAL_MODEL = Deno.env.get('MISTRAL_MODEL') || 'devstral-small-2505'

// Validar variáveis de ambiente obrigatórias
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !EVOLUTION_API_URL || !EVOLUTION_API_KEY || !MISTRAL_API_KEY) {
  throw new Error('Variáveis de ambiente obrigatórias não configuradas')
}

// Cliente Supabase com permissões de administrador
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// Função para obter saudação baseada no horário
function getSaudacao(): string {
  const hora = new Date().getHours()
  if (hora >= 6 && hora < 12) return 'Bom dia'
  if (hora >= 12 && hora < 18) return 'Boa tarde'
  return 'Boa noite'
}

// Função para chamar a Mistral AI
async function callMistralAI(userMessage: string, systemPrompt: string): Promise<string> {
  try {
    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MISTRAL_API_KEY}`,
      },
      body: JSON.stringify({
        model: MISTRAL_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    })

    if (!response.ok) {
      console.error('Erro na API Mistral:', response.status, response.statusText)
      return 'Desculpe, ocorreu um erro ao processar sua mensagem.'
    }

    const data = await response.json()
    return data.choices?.[0]?.message?.content || 'Desculpe, não consegui processar sua mensagem.'
  } catch (error) {
    console.error('Erro ao chamar Mistral AI:', error)
    return 'Desculpe, ocorreu um erro ao processar sua mensagem.'
  }
}

// Função para enviar mensagem de texto
async function sendText(recipient: string, message: string) {
  const url = `${EVOLUTION_API_URL}/message/sendText/${BOT_INSTANCE_NAME}`
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY,
      },
      body: JSON.stringify({
        number: recipient,
        options: {
          delay: 1200,
          presence: 'composing',
        },
        textMessage: {
          text: message,
        },
      }),
    })

    if (!response.ok) {
      console.error('Erro ao enviar mensagem:', response.status, response.statusText)
    }
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error)
  }
}

// Alias para compatibilidade
const sendPrivateMessage = sendText

// Função para enviar opções como texto numerado (compatível com todos os dispositivos)
async function sendButtons(recipient: string, message: string, buttons: Array<{id: string, text: string}>) {
  let optionsText = message + '\n\n'
  buttons.forEach((btn, index) => {
    optionsText += `${index + 1}️⃣ ${btn.text}\n`
  })
  optionsText += '\n💬 *Digite o número da opção desejada*'

  await sendText(recipient, optionsText)
}

// Função para enviar lista como texto numerado (compatível com todos os dispositivos)
async function sendList(recipient: string, title: string, description: string, _buttonText: string, sections: Array<{title: string, rows: Array<{id: string, title: string, description?: string}>}>) {
  let listText = `*${title}*\n\n${description}\n\n`

  let optionNumber = 1
  sections.forEach(section => {
    listText += `📋 *${section.title}*\n`
    section.rows.forEach(row => {
      listText += `${optionNumber}️⃣ ${row.title}`
      if (row.description) {
        listText += ` - ${row.description}`
      }
      listText += '\n'
      optionNumber++
    })
    listText += '\n'
  })

  listText += '💬 *Digite o número da opção desejada*'

  await sendText(recipient, listText)
}

// Função para enviar LISTA INTERATIVA REAL (botões clicáveis)
async function sendInteractiveList(recipient: string, title: string, description: string, buttonText: string, sections: Array<{title: string, rows: Array<{id: string, title: string, description?: string}>}>) {
  console.log('🔄 Tentando enviar lista interativa...')
  const url = `${EVOLUTION_API_URL}/message/sendList/${BOT_INSTANCE_NAME}`
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY || ''
      },
      body: JSON.stringify({
        number: recipient,
        options: {
          delay: 1200,
          presence: 'composing'
        },
        listMessage: {
          title: title,
          description: description,
          buttonText: buttonText,
          footerText: '💻 Pensado e desenvolvido por AleTubeGames',
          sections: sections
        }
      })
    })

    if (!response.ok) {
      console.error('❌ Erro ao enviar lista interativa:', await response.text())
      console.log('⚠️ Usando fallback (texto numerado)...')
      // Fallback: usar lista de texto se falhar
      await sendList(recipient, title, description, buttonText, sections)
    } else {
      console.log('✅ Lista interativa enviada com sucesso!')
    }
  } catch (error) {
    console.error('❌ Exceção ao enviar lista interativa:', error)
    console.log('⚠️ Usando fallback (texto numerado)...')
    // Fallback: usar lista de texto se falhar
    await sendList(recipient, title, description, buttonText, sections)
  }
}

// Função para enviar BOTÕES INTERATIVOS REAIS (clicáveis)
async function sendInteractiveButtons(recipient: string, message: string, buttons: Array<{id: string, text: string}>) {
  console.log('🔄 Tentando enviar botões interativos...')
  const url = `${EVOLUTION_API_URL}/message/sendButtons/${BOT_INSTANCE_NAME}`
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY || ''
      },
      body: JSON.stringify({
        number: recipient,
        options: {
          delay: 1200,
          presence: 'composing'
        },
        buttonMessage: {
          text: message,
          footerText: '💻 Pensado e desenvolvido por AleTubeGames',
          buttons: buttons.map(btn => ({
            buttonId: btn.id,
            buttonText: {
              displayText: btn.text
            },
            type: 1
          }))
        }
      })
    })

    if (!response.ok) {
      console.error('❌ Erro ao enviar botões interativos:', await response.text())
      console.log('⚠️ Usando fallback (texto numerado)...')
      // Fallback: usar botões de texto se falhar
      await sendButtons(recipient, message, buttons)
    } else {
      console.log('✅ Botões interativos enviados com sucesso!')
    }
  } catch (error) {
    console.error('❌ Exceção ao enviar botões interativos:', error)
    console.log('⚠️ Usando fallback (texto numerado)...')
    // Fallback: usar botões de texto se falhar
    await sendButtons(recipient, message, buttons)
  }
}

// Lógica principal do webhook
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Log de headers para debug
    console.log('Headers recebidos:', Object.fromEntries(req.headers.entries()))

    const body = await req.json()
    console.log('Webhook recebido:', JSON.stringify(body, null, 2))

    // Validar estrutura básica do webhook
    if (!body || !body.event || !body.data || !body.data.key) {
      return new Response('Webhook inválido', { status: 400 })
    }

    // Ignorar mensagens que não são de texto ou de grupos
    if (body.event !== 'messages.upsert' || !body.data.key.remoteJid) {
      return new Response('Webhook ignorado: não é uma mensagem de texto.', { status: 200 })
    }

    // Extrair informações da mensagem
    const messageText = (
      body.data.message?.conversation ||
      body.data.message?.extendedTextMessage?.text ||
      body.data.message?.buttonResponseMessage?.selectedButtonId ||
      body.data.message?.listResponseMessage?.singleSelectReply?.selectedRowId ||
      ''
    ).trim()
    const isGroup = body.data.key.remoteJid.endsWith('@g.us')
    const isChannel = body.data.key.remoteJid.endsWith('@lid') // Canais/Listas do WhatsApp

    // Determinar o remetente real
    let sender: string
    if (isGroup || isChannel) {
      // Em grupos/canais, pegar o participant
      const participant = body.data.key.participant || ''
      const remoteJid = body.data.key.remoteJid || ''
      sender = (participant ? participant.split('@')[0] : remoteJid.split('@')[0] || '').trim()
    } else {
      // Em conversas privadas, pegar o remoteJid
      const remoteJid = body.data.key.remoteJid || ''
      sender = (remoteJid.split('@')[0] || '').trim()
    }

    // Validar sender
    if (!sender || sender.length === 0) {
      console.error('❌ Remetente inválido ou vazio')
      return new Response('Remetente inválido', { status: 400 })
    }

    const senderJid = `${sender}@s.whatsapp.net`

    // Ignorar mensagens enviadas pela própria API (não pelo usuário)
    // Verificar se é uma mensagem de retorno do bot (fromMe: true)
    if (body.data.key.fromMe === true) {
      console.log('Mensagem do próprio bot ignorada (fromMe: true)')
      return new Response('Mensagem do próprio bot ignorada.', { status: 200 });
    }

    // 1. Buscar usuário (ativo ou inativo)
    console.log('🔍 Buscando usuário:', sender)
    let { data: user, error: userError } = await supabaseAdmin
      .from('usuarios_autorizados')
      .select('id, nome, ativo')
      .eq('telefone', sender)
      .single()

    console.log('👤 Usuário encontrado:', user)
    console.log('❌ Erro ao buscar usuário:', userError)

    // Se o usuário existe mas está INATIVO (aguardando aprovação)
    if (user && !user.ativo) {
      const msgAguardando = `⏳ *Sua solicitação ainda está aguardando aprovação do administrador.*

Você receberá uma notificação assim que for aprovado.

_Obrigado pela paciência!_ 🙏`

      await sendPrivateMessage(senderJid, msgAguardando)
      return new Response('Usuário aguardando aprovação', { status: 200 })
    }

    // Se o usuário não existe, criar automaticamente (aguardando aprovação)
    if (userError || !user) {
      console.log(`Criando novo usuário: ${sender}`)

      const ADMIN_NUMBER = '553184549893' // Número do admin

      const { data: newUser, error: createError } = await supabaseAdmin
        .from('usuarios_autorizados')
        .insert({
          telefone: sender,
          nome: body.data.pushName || 'Usuário',
          ativo: false // Criar como INATIVO, aguardando aprovação
        })
        .select('id, nome')
        .single()

      if (createError || !newUser) {
        console.error('Erro ao criar usuário:', createError)
        return new Response('Erro ao criar usuário', { status: 500 })
      }

      // Notificar o usuário que precisa aguardar aprovação
      const msgUsuario = `╔═══════════════════════╗
║  ⏳ *AGUARDANDO APROVAÇÃO*
╚═══════════════════════╝

Olá, *${body.data.pushName || 'Usuário'}*! 👋

Sua solicitação de acesso foi recebida e está aguardando aprovação do administrador.

Você receberá uma notificação assim que for aprovado.

_Obrigado pela paciência!_ 🙏`

      await sendPrivateMessage(senderJid, msgUsuario)

      // Notificar o ADMIN sobre novo usuário
      const msgAdmin = `╔═══════════════════════╗
║  🔔 *NOVO USUÁRIO*
╚═══════════════════════╝

📱 *Telefone:* ${sender}
👤 *Nome:* ${body.data.pushName || 'Não informado'}

━━━━━━━━━━━━━━━━━━━━

Para aprovar, digite:
✅ */aprovar ${sender}*

Para rejeitar, digite:
❌ */rejeitar ${sender}*`

      await sendPrivateMessage(`${ADMIN_NUMBER}@s.whatsapp.net`, msgAdmin)

      return new Response('Usuário criado, aguardando aprovação', { status: 200 })
    }

    // ========================================
    // COMANDOS ADMINISTRATIVOS (PRIORIDADE MÁXIMA)
    // ========================================

    // Comando /aprovar - APENAS PARA ADMIN
    if (messageText.trim().toLowerCase().startsWith('/aprovar')) {
      const ADMIN_NUMBER = '553184549893'

      if (sender !== ADMIN_NUMBER) {
        await sendPrivateMessage(senderJid, '❌ Apenas o administrador pode aprovar usuários.')
        return new Response('Não autorizado', { status: 403 })
      }

      const parts = messageText.trim().split(' ')
      if (parts.length < 2) {
        await sendPrivateMessage(senderJid, '❌ Uso correto: */aprovar 5531XXXXXXXX*')
        return new Response('Formato inválido', { status: 400 })
      }

      const telefoneAprovar = parts[1]

      // Buscar usuário pendente
      const { data: usuarioPendente, error: erroPendente } = await supabaseAdmin
        .from('usuarios_autorizados')
        .select('*')
        .eq('telefone', telefoneAprovar)
        .eq('ativo', false)
        .single()

      if (erroPendente || !usuarioPendente) {
        await sendPrivateMessage(senderJid, `❌ Usuário *${telefoneAprovar}* não encontrado ou já foi aprovado.`)
        return new Response('Usuário não encontrado', { status: 404 })
      }

      // Aprovar usuário
      const { error: erroAprovar } = await supabaseAdmin
        .from('usuarios_autorizados')
        .update({ ativo: true })
        .eq('telefone', telefoneAprovar)

      if (erroAprovar) {
        console.error('Erro ao aprovar usuário:', erroAprovar)
        await sendPrivateMessage(senderJid, '❌ Erro ao aprovar usuário.')
        return new Response('Erro ao aprovar', { status: 500 })
      }

      // Notificar admin
      await sendPrivateMessage(senderJid, `✅ *Usuário aprovado com sucesso!*

📱 *Telefone:* ${telefoneAprovar}
👤 *Nome:* ${usuarioPendente.nome}`)

      // Notificar o usuário aprovado
      const msgAprovado = `╔═══════════════════════╗
║  ✅ *ACESSO APROVADO!*
╚═══════════════════════╝

Olá, *${usuarioPendente.nome}*! 🎉

Seu acesso foi aprovado pelo administrador!

Agora você pode usar todos os recursos do bot.

━━━━━━━━━━━━━━━━━━━━

Digite */menu* para ver os comandos disponíveis.`

      await sendPrivateMessage(`${telefoneAprovar}@s.whatsapp.net`, msgAprovado)

      return new Response('Usuário aprovado', { status: 200 })
    }

    // Comando /rejeitar - APENAS PARA ADMIN
    if (messageText.trim().toLowerCase().startsWith('/rejeitar')) {
      const ADMIN_NUMBER = '553184549893'

      if (sender !== ADMIN_NUMBER) {
        await sendPrivateMessage(senderJid, '❌ Apenas o administrador pode rejeitar usuários.')
        return new Response('Não autorizado', { status: 403 })
      }

      const parts = messageText.trim().split(' ')
      if (parts.length < 2) {
        await sendPrivateMessage(senderJid, '❌ Uso correto: */rejeitar 5531XXXXXXXX*')
        return new Response('Formato inválido', { status: 400 })
      }

      const telefoneRejeitar = parts[1]

      // Buscar usuário pendente
      const { data: usuarioPendente, error: erroPendente } = await supabaseAdmin
        .from('usuarios_autorizados')
        .select('*')
        .eq('telefone', telefoneRejeitar)
        .eq('ativo', false)
        .single()

      if (erroPendente || !usuarioPendente) {
        await sendPrivateMessage(senderJid, `❌ Usuário *${telefoneRejeitar}* não encontrado ou já foi processado.`)
        return new Response('Usuário não encontrado', { status: 404 })
      }

      // Deletar usuário
      const { error: erroRejeitar } = await supabaseAdmin
        .from('usuarios_autorizados')
        .delete()
        .eq('telefone', telefoneRejeitar)

      if (erroRejeitar) {
        console.error('Erro ao rejeitar usuário:', erroRejeitar)
        await sendPrivateMessage(senderJid, '❌ Erro ao rejeitar usuário.')
        return new Response('Erro ao rejeitar', { status: 500 })
      }

      // Notificar admin
      await sendPrivateMessage(senderJid, `❌ *Usuário rejeitado!*

📱 *Telefone:* ${telefoneRejeitar}
👤 *Nome:* ${usuarioPendente.nome}`)

      // Notificar o usuário rejeitado
      const msgRejeitado = `╔═══════════════════════╗
║  ❌ *ACESSO NEGADO*
╚═══════════════════════╝

Olá, *${usuarioPendente.nome}*.

Infelizmente seu acesso não foi aprovado.

Se você acredita que isso é um erro, entre em contato com o administrador.`

      await sendPrivateMessage(`${telefoneRejeitar}@s.whatsapp.net`, msgRejeitado)

      return new Response('Usuário rejeitado', { status: 200 })
    }

    // ========================================
    // FIM DOS COMANDOS ADMINISTRATIVOS
    // ========================================

    // 2. Processar QUALQUER mensagem no grupo ou canal (oferecer menu)
    if (isGroup || isChannel) {
      // SINCRONIZAR GRUPO AUTOMATICAMENTE (NÃO-BLOQUEANTE)
      const grupoJid = body.data.key.remoteJid
      const grupoNomeSimples = grupoJid.split('@')[0]

      // Executar sincronização em background (sem bloquear o fluxo)
      supabaseAdmin
        .from('grupos_usuario')
        .upsert({
          usuario_id: user.id,
          grupo_jid: grupoJid,
          grupo_nome: grupoNomeSimples,
          tipo: 'grupo',
          ativo: true,
          ultima_sincronizacao: new Date().toISOString()
        }, {
          onConflict: 'usuario_id,grupo_jid'
        })
        .then(() => console.log(`✅ Grupo sincronizado: ${grupoNomeSimples}`))
        .catch((err: unknown) => console.error('❌ Erro ao sincronizar grupo:', err))

      await supabaseAdmin.from('sessoes_comando').delete().eq('telefone', sender)

      const saudacao = getSaudacao()
      const menu = `╔══════════════════╗
║  ${saudacao}, *${user.nome}*! 👋
╚══════════════════╝

🤖 *Sistema de Agendamentos*

┏━━━ 📌 *Menu Principal*
┃
┣━ 🆕 */novo*
┃   ↳ _Criar novo agendamento_
┃
┣━ 📋 */listar*
┃   ↳ _Ver seus agendamentos_
┃
┗━ ❓ */ajuda*
    ↳ _Comandos disponíveis_

━━━━━━━━━━━━━━━━━━━━
💡 _Digite um comando para começar_`

      await sendPrivateMessage(senderJid, menu)
      return new Response('Menu enviado', { status: 200 })
    }

    // 3. Gerenciador de estado da conversa (máquina de estados)
    console.log('🔍 Buscando sessão para:', sender)
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('sessoes_comando')
      .select('*')
      .eq('telefone', sender)
      .single()

    console.log('📋 Sessão encontrada:', session)
    console.log('❌ Erro ao buscar sessão:', sessionError)

    // Comando /novo - CRIAR NOVO AGENDAMENTO
    if (messageText.trim().toLowerCase() === '/novo') {
      // Se JÁ EXISTE uma sessão ativa, avisar o usuário
      if (session && !sessionError) {
        const estadosDescricao: Record<string, string> = {
          'aguardando_mensagem': '📝 *Digitando a mensagem*',
          'perguntando_melhorar': '🤖 *Melhorando a mensagem com IA*',
          'aprovando_mensagem': '✅ *Aprovando a mensagem*',
          'editando_mensagem_manual': '✏️ *Editando a mensagem manualmente*',
          'escolhendo_destinatario': '👥 *Escolhendo destinatário*',
          'selecionando_destinatario': '👥 *Selecionando destinatário da lista*',
          'escolhendo_horario': '⏰ *Escolhendo horário*',
          'escolhendo_dias': '📅 *Escolhendo dias da semana*',
          'escolhendo_termino': '📆 *Escolhendo data de término*',
          'aguardando_data_termino': '📅 *Digitando data de término*',
          'aguardando_confirmacao': '✅ *Confirmando agendamento*'
        }

        const estadoAtual = estadosDescricao[session.estado] || session.estado

        const avisoSessaoAtiva = `╔═══════════════════════╗
║  ⚠️ *SESSÃO EM ANDAMENTO*
╚═══════════════════════╝

Você já tem um agendamento em andamento!

📍 *Etapa atual:*
${estadoAtual}

━━━━━━━━━━━━━━━━━━━━

*O que deseja fazer?*

1️⃣ *Continuar* de onde parou
2️⃣ *Cancelar* e começar do zero

━━━━━━━━━━━━━━━━━━━━

⚡ Digite *1* para continuar
🔄 Digite *2* para recomeçar

━━━━━━━━━━━━━━━━━━━━
💡 _Ou use /cancelar para sair_`

        await sendPrivateMessage(senderJid, avisoSessaoAtiva)

        // Criar um estado temporário para aguardar a escolha
        await supabaseAdmin.from('sessoes_comando').update({
          estado: 'aguardando_escolha_sessao',
          dados_temporarios: {
            ...session.dados_temporarios,
            estado_anterior: session.estado
          }
        }).eq('telefone', sender)

        return new Response('Sessão ativa detectada', { status: 200 })
      }

      // Se NÃO existe sessão, criar uma nova
      console.log('🆕 Criando nova sessão para /novo')
      await supabaseAdmin.from('sessoes_comando').upsert({
        telefone: sender,
        estado: 'aguardando_mensagem',
        dados_temporarios: {
          usuario_id: user.id
        },
      })

      const welcomeMsg = `┏━━━━━━━━━━━━━━━━━━━┓
┃  🆕 *Novo Agendamento*
┗━━━━━━━━━━━━━━━━━━━┛

📝 *Digite a mensagem* que você deseja agendar.

━━━━━━━━━━━━━━━━━━━━
💡 _Depois vou te ajudar a melhorar!_

⚡ _Digite /cancelar para sair_
↩️ _Digite /voltar para etapa anterior_

━━━━━━━━━━━━━━━━━━━━
_💻 Pensado e desenvolvido por AleTubeGames_`

      console.log('📤 Enviando mensagem de boas-vindas')
      await sendPrivateMessage(senderJid, welcomeMsg)
      console.log('✅ Mensagem enviada com sucesso!')
      return new Response('Sessão iniciada', { status: 200 })
    }

    // Comando /cancelar - SEMPRE DISPONÍVEL
    if (messageText.trim().toLowerCase() === '/cancelar') {
        await supabaseAdmin.from('sessoes_comando').delete().eq('telefone', sender);
        const cancelMsg = `╔═══════════════╗
║  ❌ *Cancelado*
╚═══════════════╝

_Operação cancelada com sucesso!_

Digite */novo* para começar novamente.`
        await sendPrivateMessage(senderJid, cancelMsg);
        return new Response('Sessão cancelada', { status: 200 });
    }

    // Comando /voltar - SEMPRE DISPONÍVEL
    if (messageText.trim().toLowerCase() === '/voltar') {
        const { data: session } = await supabaseAdmin
          .from('sessoes_comando')
          .select('*')
          .eq('telefone', sender)
          .single()

        if (!session) {
          await sendPrivateMessage(senderJid, '❌ Nenhuma operação em andamento.\n\nDigite */novo* para começar.')
          return new Response('Sem sessão', { status: 200 })
        }

        // Mapear estados para voltar
        const estadosVoltar: Record<string, string> = {
          'perguntando_melhorar': 'aguardando_mensagem',
          'aprovando_mensagem': 'perguntando_melhorar',
          'editando_mensagem_manual': 'aprovando_mensagem',
          'escolhendo_destinatario': 'aprovando_mensagem',
          'selecionando_destinatario': 'escolhendo_destinatario',
          'escolhendo_horario': 'escolhendo_destinatario',
          'escolhendo_dias': 'escolhendo_horario',
          'escolhendo_termino': 'escolhendo_dias',
          'aguardando_data_termino': 'escolhendo_termino',
          'aguardando_confirmacao': 'escolhendo_termino'
        }

        const estadoAnterior = estadosVoltar[session.estado]

        if (!estadoAnterior) {
          await sendPrivateMessage(senderJid, '❌ Não é possível voltar neste momento.\n\nDigite */cancelar* para recomeçar.')
          return new Response('Não pode voltar', { status: 200 })
        }

        // Atualizar estado
        await supabaseAdmin
          .from('sessoes_comando')
          .update({ estado: estadoAnterior })
          .eq('telefone', sender)

        // Mensagens de retorno
        const mensagensRetorno: Record<string, string> = {
          'aguardando_mensagem': '📝 *Digite a mensagem* que você deseja agendar.\n\n⚡ _Digite /cancelar para sair_',
          'perguntando_melhorar': '💡 Quer que eu melhore sua mensagem com IA?\n\n1️⃣ ✨ Sim, melhore!\n2️⃣ 👍 Não, está boa\n\n💬 Digite o número da opção desejada',
          'aprovando_mensagem': 'Gostou da mensagem melhorada?\n\n1️⃣ ✅ Aprovar\n2️⃣ ↩️ Usar original\n3️⃣ ✏️ Editar manualmente',
          'escolhendo_destinatario': '📋 Digite o nome do grupo ou número do contato\n\n⚡ _Digite /voltar para mudar a mensagem_',
          'escolhendo_horario': '⏰ Escolha o horário de envio\n\n⚡ _Digite /voltar para mudar o destinatário_',
          'escolhendo_dias': '📅 Escolha os dias da semana\n\n⚡ _Digite /voltar para mudar o horário_',
          'escolhendo_termino': '📆 Escolha quando o agendamento deve terminar\n\n⚡ _Digite /voltar para mudar os dias_'
        }

        await sendPrivateMessage(senderJid, `↩️ *Voltando...*\n\n${mensagensRetorno[estadoAnterior] || 'Voltando para etapa anterior...'}`)
        return new Response('Voltou', { status: 200 })
    }

    // Comando /menu - mostrar menu principal
    if (messageText.trim().toLowerCase() === '/menu') {
      await supabaseAdmin.from('sessoes_comando').delete().eq('telefone', sender);

      const saudacao = getSaudacao()
      const menu = `╔══════════════════╗
║  ${saudacao}, *${user.nome}*! 👋
╚══════════════════╝

🤖 *Sistema de Agendamentos*

┏━━━ 📌 *Menu Principal*
┃
┣━ 🆕 */novo*
┃   ↳ _Criar novo agendamento_
┃
┣━ 📋 */listar*
┃   ↳ _Ver seus agendamentos_
┃
┗━ ❓ */ajuda*
    ↳ _Comandos disponíveis_

━━━━━━━━━━━━━━━━━━━━
💡 _Digite um comando para começar_`

      await sendPrivateMessage(senderJid, menu)
      return new Response('Menu enviado', { status: 200 })
    }

    // Comando /ajuda - mostrar ajuda
    if (messageText.trim().toLowerCase() === '/ajuda') {
      await supabaseAdmin.from('sessoes_comando').delete().eq('telefone', sender);

      const isAdmin = user.role === 'admin'

      let ajudaMsg = `╔═══════════════════════╗
║  ❓ *AJUDA - COMANDOS*
╚═══════════════════════╝

${isAdmin ? '👑 *Modo:* Administrador\n\n' : ''}📌 *COMANDOS PRINCIPAIS:*

🆕 */novo*
   Criar um novo agendamento de mensagem

📋 */listar*
   ${isAdmin ? 'Ver TODOS os agendamentos do sistema' : 'Ver seus agendamentos'}
   • */listar ativos* - Apenas ativos
   • */listar inativos* - Apenas inativos
   • */listar p2* - Página 2`

      if (isAdmin) {
        ajudaMsg += `
   • */listar user:5531XXXXX* - Por telefone`
      }

      ajudaMsg += `

❓ */ajuda*
   Mostrar esta mensagem de ajuda

📱 */menu*
   Voltar ao menu principal

━━━━━━━━━━━━━━━━━━━━

📌 *COMANDOS DE GERENCIAMENTO:*

🗑️ */deletar [ID]*
   Deletar um agendamento
   ${isAdmin ? '(Você pode deletar qualquer agendamento)' : '(Apenas seus agendamentos)'}

✅ */ativar [ID]*
   Ativar um agendamento pausado
   ${isAdmin ? '(Você pode ativar qualquer agendamento)' : '(Apenas seus agendamentos)'}

⏸️ */desativar [ID]*
   Pausar um agendamento
   ${isAdmin ? '(Você pode desativar qualquer agendamento)' : '(Apenas seus agendamentos)'}

📜 */historico [ID]*
   Ver histórico de alterações
   ${isAdmin ? '(Você pode ver histórico de qualquer agendamento)' : '(Apenas seus agendamentos)'}

━━━━━━━━━━━━━━━━━━━━

📌 *COMANDOS DURANTE CRIAÇÃO:*

↩️ */voltar*
   Voltar para a etapa anterior

❌ */cancelar*
   Cancelar a operação atual

━━━━━━━━━━━━━━━━━━━━

💡 *DICAS:*

• Você pode digitar texto livre para corrigir mensagens
• Use números (1, 2, 3) para escolher opções
• A IA pode melhorar suas mensagens automaticamente
• Agendamentos são enviados automaticamente
• Todas as alterações são registradas com data e autor

━━━━━━━━━━━━━━━━━━━━

🔒 *PERMISSÕES:*

${isAdmin
  ? '• Como ADMIN, você pode gerenciar TODOS os agendamentos\n• Você pode ver quem criou cada agendamento\n• Você pode filtrar por usuário'
  : '• Você só pode gerenciar seus próprios agendamentos\n• Administradores podem gerenciar todos os agendamentos'}
• Todas as ações são auditadas

━━━━━━━━━━━━━━━━━━━━

🆘 *PRECISA DE AJUDA?*
Entre em contato com o administrador.`

      await sendPrivateMessage(senderJid, ajudaMsg)
      return new Response('Ajuda enviada', { status: 200 })
    }

    // Comando /listar - listar agendamentos
    if (messageText.trim().toLowerCase().startsWith('/listar')) {
      await supabaseAdmin.from('sessoes_comando').delete().eq('telefone', sender);

      const isAdmin = user.role === 'admin'
      const args = messageText.trim().split(' ')

      // Buscar agendamentos
      let query = supabaseAdmin
        .from('agendamentos')
        .select(`
          *,
          criador:usuario_id (nome, telefone, role)
        `)
        .order('criado_em', { ascending: false })

      // Se NÃO for admin, mostrar apenas os próprios agendamentos
      if (!isAdmin) {
        query = query.eq('usuario_id', user.id)
      }

      const { data: agendamentos, error: agendamentosError } = await query

      if (agendamentosError) {
        console.error('Erro ao buscar agendamentos:', agendamentosError)
        await sendPrivateMessage(senderJid, '❌ Erro ao buscar agendamentos.')
        return new Response('Erro ao buscar', { status: 500 })
      }

      if (!agendamentos || agendamentos.length === 0) {
        await sendPrivateMessage(senderJid, `╔═══════════════════════╗
║  📋 *${isAdmin ? 'TODOS OS AGENDAMENTOS' : 'SEUS AGENDAMENTOS'}*
╚═══════════════════════╝

${isAdmin ? 'Nenhum agendamento cadastrado no sistema.' : 'Você ainda não tem agendamentos.'}

━━━━━━━━━━━━━━━━━━━━

🆕 Digite */novo* para criar ${isAdmin ? 'um' : 'seu primeiro'} agendamento!`)
        return new Response('Sem agendamentos', { status: 200 })
      }

      // Filtros
      let agendamentosFiltrados = agendamentos

      // Filtrar por status
      if (args.includes('ativos')) {
        agendamentosFiltrados = agendamentos.filter((a: any) => a.ativo)
      } else if (args.includes('inativos')) {
        agendamentosFiltrados = agendamentos.filter((a: any) => !a.ativo)
      }

      // FILTRO EXCLUSIVO PARA ADMIN: filtrar por usuário
      if (isAdmin && args.length > 1) {
        const filtroUsuario = args.find((arg: string) => arg.startsWith('user:'))
        if (filtroUsuario) {
          const telefoneUsuario = filtroUsuario.substring(5) // Remove "user:"
          agendamentosFiltrados = agendamentosFiltrados.filter((a: any) =>
            a.criador?.telefone?.includes(telefoneUsuario)
          )
        }
      }

      // Limitar a 10 por página
      const pagina = parseInt(args.find((arg: string) => arg.startsWith('p'))?.substring(1) || '1')
      const porPagina = 10
      const inicio = (pagina - 1) * porPagina
      const fim = inicio + porPagina
      const totalPaginas = Math.ceil(agendamentosFiltrados.length / porPagina)
      const agendamentosPagina = agendamentosFiltrados.slice(inicio, fim)

      // Montar mensagem
      let listaMsg = `╔═══════════════════════╗
║  📋 *${isAdmin ? 'TODOS OS AGENDAMENTOS' : 'SEUS AGENDAMENTOS'}*
╚═══════════════════════╝

📊 *Total:* ${agendamentos.length} agendamentos
${agendamentosFiltrados.length !== agendamentos.length ? `🔍 *Filtrados:* ${agendamentosFiltrados.length}\n` : ''}
📄 *Página:* ${pagina}/${totalPaginas}
${isAdmin ? '👑 *Modo:* Administrador\n' : ''}
━━━━━━━━━━━━━━━━━━━━
`

      agendamentosPagina.forEach((ag: any, index: number) => {
        const numero = inicio + index + 1
        const status = ag.ativo ? '✅' : '❌'
        const diasNomes = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
        const diasTexto = ag.dias_semana?.map((d: number) => diasNomes[d-1]).join(', ') || 'N/A'
        const mensagemPreview = ag.mensagem.length > 50
          ? ag.mensagem.substring(0, 50) + '...'
          : ag.mensagem

        // Mostrar criador apenas para admin
        const criadorInfo = isAdmin && ag.criador
          ? `\n   👤 Criador: ${ag.criador.nome} (${ag.criador.telefone})`
          : ''

        // Mostrar nome do destinatário se disponível, senão mostrar JID
        const destinatarioDisplay = ag.destinatario_nome || ag.destinatario_id
        const tipoEmoji = ag.destinatario_tipo === 'grupo' ? '👥' : '📱'

        listaMsg += `
${numero}. ${status} ${mensagemPreview}
   ⏰ ${ag.hora_envio} | 📅 Dias: ${diasTexto}
   ${tipoEmoji} ${destinatarioDisplay}${criadorInfo}
━━━━━━━━━━━━━━━━━━━━`
      })

      listaMsg += `

💡 *FILTROS DISPONÍVEIS:*
• */listar ativos* - Apenas ativos
• */listar inativos* - Apenas inativos
• */listar p2* - Página 2`

      // Filtros exclusivos para admin
      if (isAdmin) {
        listaMsg += `
• */listar user:5531XXXXX* - Por telefone do usuário`
      }

      listaMsg += `

🔧 *AÇÕES:*
• */deletar [número]* - Deletar (ex: /deletar 1)
• */editar [número]* - Editar (ex: /editar 1)
• */ativar [número]* - Ativar (ex: /ativar 1)
• */desativar [número]* - Desativar (ex: /desativar 1)
• */historico [número]* - Ver histórico (ex: /historico 1)`

      await sendPrivateMessage(senderJid, listaMsg)
      return new Response('Lista enviada', { status: 200 })
    }

    // Comando /deletar - deletar agendamento
    if (messageText.trim().toLowerCase().startsWith('/deletar')) {
      await supabaseAdmin.from('sessoes_comando').delete().eq('telefone', sender);

      const parts = messageText.trim().split(' ')
      if (parts.length < 2) {
        await sendPrivateMessage(senderJid, '❌ Uso correto: */deletar [número]*\n\nExemplo: */deletar 1* (deleta o primeiro da lista)')
        return new Response('Formato inválido', { status: 400 })
      }

      const inputId = parts[1]
      let agendamentoId = inputId

      // Se for um número (1, 2, 3...), buscar pela posição na lista
      if (/^\d+$/.test(inputId)) {
        const posicao = parseInt(inputId) - 1 // Converter para índice (1 -> 0)

        const { data: agendamentos } = await supabaseAdmin
          .from('agendamentos')
          .select('id')
          .eq('usuario_id', user.id)
          .order('criado_em', { ascending: false })

        if (!agendamentos || posicao < 0 || posicao >= agendamentos.length) {
          await sendPrivateMessage(senderJid, `❌ Agendamento *${inputId}* não encontrado na sua lista.\n\n📋 Digite */listar* para ver seus agendamentos.`)
          return new Response('Agendamento não encontrado', { status: 404 })
        }

        agendamentoId = agendamentos[posicao].id
      }

      // Buscar agendamento completo
      const { data: agendamento, error: agendamentoError } = await supabaseAdmin
        .from('agendamentos')
        .select('*')
        .eq('id', agendamentoId)
        .single()

      if (agendamentoError || !agendamento) {
        await sendPrivateMessage(senderJid, `❌ Agendamento não encontrado.`)
        return new Response('Agendamento não encontrado', { status: 404 })
      }

      // Verificar permissão: apenas o dono ou admin pode deletar
      const isAdmin = user.role === 'admin'
      const isDono = agendamento.usuario_id === user.id

      if (!isAdmin && !isDono) {
        await sendPrivateMessage(senderJid, `🔒 *Acesso negado!*

Você não tem permissão para deletar este agendamento.

Apenas o criador ou um administrador pode deletar.`)
        return new Response('Sem permissão', { status: 403 })
      }

      // Registrar auditoria ANTES de deletar
      await supabaseAdmin.from('auditoria_agendamentos').insert({
        agendamento_id: agendamentoId,
        usuario_id: user.id,
        acao: 'deletado',
        dados_anteriores: agendamento,
        dados_novos: null
      })

      // Deletar agendamento
      const { error: deleteError } = await supabaseAdmin
        .from('agendamentos')
        .delete()
        .eq('id', agendamentoId)

      if (deleteError) {
        console.error('Erro ao deletar agendamento:', deleteError)
        await sendPrivateMessage(senderJid, '❌ Erro ao deletar agendamento.')
        return new Response('Erro ao deletar', { status: 500 })
      }

      await sendPrivateMessage(senderJid, `✅ *Agendamento deletado com sucesso!*

🗑️ *ID:* ${agendamentoId}
📝 *Mensagem:* ${agendamento.mensagem.substring(0, 50)}...
👤 *Deletado por:* ${user.nome}
📅 *Data:* ${new Date().toLocaleString('pt-BR')}

━━━━━━━━━━━━━━━━━━━━

📋 Digite */listar* para ver seus agendamentos`)

      return new Response('Agendamento deletado', { status: 200 })
    }

    // Comando /editar - editar agendamento
    if (messageText.trim().toLowerCase().startsWith('/editar')) {
      const parts = messageText.trim().split(' ')
      if (parts.length < 2) {
        await sendPrivateMessage(senderJid, '❌ Uso correto: */editar [número]*\n\nExemplo: */editar 1* (edita o primeiro da lista)')
        return new Response('Formato inválido', { status: 400 })
      }

      const inputId = parts[1]
      let agendamentoId = inputId

      // Se for um número (1, 2, 3...), buscar pela posição na lista
      if (/^\d+$/.test(inputId)) {
        const posicao = parseInt(inputId) - 1 // Converter para índice (1 -> 0)

        const { data: agendamentos } = await supabaseAdmin
          .from('agendamentos')
          .select('id')
          .eq('usuario_id', user.id)
          .order('criado_em', { ascending: false })

        if (!agendamentos || posicao < 0 || posicao >= agendamentos.length) {
          await sendPrivateMessage(senderJid, `❌ Agendamento *${inputId}* não encontrado na sua lista.\n\n📋 Digite */listar* para ver seus agendamentos.`)
          return new Response('Agendamento não encontrado', { status: 404 })
        }

        agendamentoId = agendamentos[posicao].id
      }

      // Buscar agendamento completo
      const { data: agendamento, error: agendamentoError } = await supabaseAdmin
        .from('agendamentos')
        .select('*')
        .eq('id', agendamentoId)
        .single()

      if (agendamentoError || !agendamento) {
        await sendPrivateMessage(senderJid, `❌ Agendamento não encontrado.`)
        return new Response('Agendamento não encontrado', { status: 404 })
      }

      // Verificar permissão: apenas o dono ou admin pode editar
      const isAdmin = user.role === 'admin'
      const isDono = agendamento.usuario_id === user.id

      if (!isAdmin && !isDono) {
        await sendPrivateMessage(senderJid, `🔒 *Acesso negado!*

Você não tem permissão para editar este agendamento.

Apenas o criador ou um administrador pode editar.`)
        return new Response('Sem permissão', { status: 403 })
      }

      // Criar sessão de edição
      await supabaseAdmin.from('sessoes_comando').delete().eq('telefone', sender)
      await supabaseAdmin.from('sessoes_comando').insert({
        telefone: sender,
        comando: 'editar',
        estado: 'escolhendo_campo',
        dados: {
          agendamento_id: agendamentoId,
          agendamento_original: agendamento
        }
      })

      const diasNomes = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
      const diasTexto = agendamento.dias_semana.map((d: number) => diasNomes[d-1]).join(', ')

      // Mostrar nome do destinatário se disponível, senão mostrar JID
      const destinatarioDisplay = agendamento.destinatario_nome || agendamento.destinatario_id
      const tipoEmoji = agendamento.destinatario_tipo === 'grupo' ? '👥' : '📱'

      const editarMsg = `✏️ *EDITAR AGENDAMENTO #${agendamentoId}*

📋 *Dados atuais:*

📝 *Mensagem:*
${agendamento.mensagem}

👤 *Destinatário:*
${tipoEmoji} ${destinatarioDisplay}

⏰ *Horário:*
${agendamento.hora_envio}

📅 *Dias:*
${diasTexto}

━━━━━━━━━━━━━━━━━━━━

*O que deseja editar?*`

      await sendInteractiveButtons(senderJid, editarMsg, [
        { id: 'editar_mensagem', text: '📝 Mensagem' },
        { id: 'editar_horario', text: '⏰ Horário' },
        { id: 'editar_dias', text: '📅 Dias' }
      ])

      return new Response('Modo edição iniciado', { status: 200 })
    }

    // Comando /ativar - ativar agendamento
    if (messageText.trim().toLowerCase().startsWith('/ativar')) {
      await supabaseAdmin.from('sessoes_comando').delete().eq('telefone', sender);

      const parts = messageText.trim().split(' ')
      if (parts.length < 2) {
        await sendPrivateMessage(senderJid, '❌ Uso correto: */ativar [número]*\n\nExemplo: */ativar 1*')
        return new Response('Formato inválido', { status: 400 })
      }

      const inputId = parts[1]
      let agendamentoId = inputId

      // Se for um número (1, 2, 3...), buscar pela posição na lista
      if (/^\d+$/.test(inputId)) {
        const posicao = parseInt(inputId) - 1

        const { data: agendamentos } = await supabaseAdmin
          .from('agendamentos')
          .select('id')
          .eq('usuario_id', user.id)
          .order('criado_em', { ascending: false })

        if (!agendamentos || posicao < 0 || posicao >= agendamentos.length) {
          await sendPrivateMessage(senderJid, `❌ Agendamento *${inputId}* não encontrado.\n\n📋 Digite */listar* para ver seus agendamentos.`)
          return new Response('Agendamento não encontrado', { status: 404 })
        }

        agendamentoId = agendamentos[posicao].id
      }

      // Buscar agendamento completo
      const { data: agendamento, error: agendamentoError } = await supabaseAdmin
        .from('agendamentos')
        .select('*')
        .eq('id', agendamentoId)
        .single()

      if (agendamentoError || !agendamento) {
        await sendPrivateMessage(senderJid, `❌ Agendamento não encontrado.`)
        return new Response('Agendamento não encontrado', { status: 404 })
      }

      // Verificar permissão: apenas o dono ou admin pode ativar
      const isAdmin = user.role === 'admin'
      const isDono = agendamento.usuario_id === user.id

      if (!isAdmin && !isDono) {
        await sendPrivateMessage(senderJid, `🔒 *Acesso negado!*

Você não tem permissão para ativar este agendamento.

Apenas o criador ou um administrador pode ativar.`)
        return new Response('Sem permissão', { status: 403 })
      }

      // Registrar auditoria
      await supabaseAdmin.from('auditoria_agendamentos').insert({
        agendamento_id: agendamentoId,
        usuario_id: user.id,
        acao: 'ativado',
        dados_anteriores: { ativo: agendamento.ativo },
        dados_novos: { ativo: true }
      })

      // Ativar agendamento
      const { error: updateError } = await supabaseAdmin
        .from('agendamentos')
        .update({
          ativo: true,
          modificado_por: user.id
        })
        .eq('id', agendamentoId)

      if (updateError) {
        console.error('Erro ao ativar agendamento:', updateError)
        await sendPrivateMessage(senderJid, '❌ Erro ao ativar agendamento.')
        return new Response('Erro ao ativar', { status: 500 })
      }

      await sendPrivateMessage(senderJid, `✅ *Agendamento ativado com sucesso!*

🟢 *ID:* ${agendamentoId}
📝 *Mensagem:* ${agendamento.mensagem.substring(0, 50)}...
👤 *Ativado por:* ${user.nome}
📅 *Data:* ${new Date().toLocaleString('pt-BR')}

━━━━━━━━━━━━━━━━━━━━

📋 Digite */listar* para ver seus agendamentos`)

      return new Response('Agendamento ativado', { status: 200 })
    }

    // Comando /desativar - desativar agendamento
    if (messageText.trim().toLowerCase().startsWith('/desativar')) {
      await supabaseAdmin.from('sessoes_comando').delete().eq('telefone', sender);

      const parts = messageText.trim().split(' ')
      if (parts.length < 2) {
        await sendPrivateMessage(senderJid, '❌ Uso correto: */desativar [número]*\n\nExemplo: */desativar 1*')
        return new Response('Formato inválido', { status: 400 })
      }

      const inputId = parts[1]
      let agendamentoId = inputId

      // Se for um número (1, 2, 3...), buscar pela posição na lista
      if (/^\d+$/.test(inputId)) {
        const posicao = parseInt(inputId) - 1

        const { data: agendamentos } = await supabaseAdmin
          .from('agendamentos')
          .select('id')
          .eq('usuario_id', user.id)
          .order('criado_em', { ascending: false })

        if (!agendamentos || posicao < 0 || posicao >= agendamentos.length) {
          await sendPrivateMessage(senderJid, `❌ Agendamento *${inputId}* não encontrado.\n\n📋 Digite */listar* para ver seus agendamentos.`)
          return new Response('Agendamento não encontrado', { status: 404 })
        }

        agendamentoId = agendamentos[posicao].id
      }

      // Buscar agendamento completo
      const { data: agendamento, error: agendamentoError } = await supabaseAdmin
        .from('agendamentos')
        .select('*')
        .eq('id', agendamentoId)
        .single()

      if (agendamentoError || !agendamento) {
        await sendPrivateMessage(senderJid, `❌ Agendamento não encontrado.`)
        return new Response('Agendamento não encontrado', { status: 404 })
      }

      // Verificar permissão: apenas o dono ou admin pode desativar
      const isAdmin = user.role === 'admin'
      const isDono = agendamento.usuario_id === user.id

      if (!isAdmin && !isDono) {
        await sendPrivateMessage(senderJid, `🔒 *Acesso negado!*

Você não tem permissão para desativar este agendamento.

Apenas o criador ou um administrador pode desativar.`)
        return new Response('Sem permissão', { status: 403 })
      }

      // Registrar auditoria
      await supabaseAdmin.from('auditoria_agendamentos').insert({
        agendamento_id: agendamentoId,
        usuario_id: user.id,
        acao: 'desativado',
        dados_anteriores: { ativo: agendamento.ativo },
        dados_novos: { ativo: false }
      })

      // Desativar agendamento
      const { error: updateError } = await supabaseAdmin
        .from('agendamentos')
        .update({
          ativo: false,
          modificado_por: user.id
        })
        .eq('id', agendamentoId)

      if (updateError) {
        console.error('Erro ao desativar agendamento:', updateError)
        await sendPrivateMessage(senderJid, '❌ Erro ao desativar agendamento.')
        return new Response('Erro ao desativar', { status: 500 })
      }

      await sendPrivateMessage(senderJid, `🔴 *Agendamento desativado com sucesso!*

⏸️ *ID:* ${agendamentoId}
📝 *Mensagem:* ${agendamento.mensagem.substring(0, 50)}...
👤 *Desativado por:* ${user.nome}
📅 *Data:* ${new Date().toLocaleString('pt-BR')}

━━━━━━━━━━━━━━━━━━━━

📋 Digite */listar* para ver seus agendamentos`)

      return new Response('Agendamento desativado', { status: 200 })
    }

    // Comando /historico - ver histórico de alterações de um agendamento
    if (messageText.trim().toLowerCase().startsWith('/historico')) {
      await supabaseAdmin.from('sessoes_comando').delete().eq('telefone', sender);

      const parts = messageText.trim().split(' ')
      if (parts.length < 2) {
        await sendPrivateMessage(senderJid, '❌ Uso correto: */historico [número]*\n\nExemplo: */historico 1*')
        return new Response('Formato inválido', { status: 400 })
      }

      const inputId = parts[1]
      let agendamentoId = inputId

      // Se for um número (1, 2, 3...), buscar pela posição na lista
      if (/^\d+$/.test(inputId)) {
        const posicao = parseInt(inputId) - 1

        const { data: agendamentos } = await supabaseAdmin
          .from('agendamentos')
          .select('id')
          .eq('usuario_id', user.id)
          .order('criado_em', { ascending: false })

        if (!agendamentos || posicao < 0 || posicao >= agendamentos.length) {
          await sendPrivateMessage(senderJid, `❌ Agendamento *${inputId}* não encontrado.\n\n📋 Digite */listar* para ver seus agendamentos.`)
          return new Response('Agendamento não encontrado', { status: 404 })
        }

        agendamentoId = agendamentos[posicao].id
      }

      // Buscar agendamento completo
      const { data: agendamento, error: agendamentoError } = await supabaseAdmin
        .from('agendamentos')
        .select('*')
        .eq('id', agendamentoId)
        .single()

      if (agendamentoError || !agendamento) {
        await sendPrivateMessage(senderJid, `❌ Agendamento não encontrado.`)
        return new Response('Agendamento não encontrado', { status: 404 })
      }

      // Verificar permissão: apenas o dono ou admin pode ver histórico
      const isAdmin = user.role === 'admin'
      const isDono = agendamento.usuario_id === user.id

      if (!isAdmin && !isDono) {
        await sendPrivateMessage(senderJid, `🔒 *Acesso negado!*

Você não tem permissão para ver o histórico deste agendamento.`)
        return new Response('Sem permissão', { status: 403 })
      }

      // Buscar histórico de auditoria
      const { data: historico, error: historicoError } = await supabaseAdmin
        .from('auditoria_agendamentos')
        .select(`
          *,
          usuario:usuario_id (nome, telefone)
        `)
        .eq('agendamento_id', agendamentoId)
        .order('criado_em', { ascending: false })

      if (historicoError) {
        console.error('Erro ao buscar histórico:', historicoError)
        await sendPrivateMessage(senderJid, '❌ Erro ao buscar histórico.')
        return new Response('Erro ao buscar', { status: 500 })
      }

      if (!historico || historico.length === 0) {
        await sendPrivateMessage(senderJid, `📜 *HISTÓRICO DO AGENDAMENTO*

🆔 *ID:* ${agendamentoId}

Nenhuma alteração registrada.`)
        return new Response('Sem histórico', { status: 200 })
      }

      // Montar mensagem de histórico
      const destinatarioDisplay = agendamento.destinatario_nome || agendamento.destinatario_id
      const tipoEmoji = agendamento.destinatario_tipo === 'grupo' ? '👥' : '📱'

      let historicoMsg = `╔═══════════════════════╗
║  📜 *HISTÓRICO*
╚═══════════════════════╝

🆔 *ID:* ${agendamentoId}
📝 *Mensagem:* ${agendamento.mensagem.substring(0, 50)}...
${tipoEmoji} *Destinatário:* ${destinatarioDisplay}

━━━━━━━━━━━━━━━━━━━━

📋 *ALTERAÇÕES:*

`

      historico.forEach((h: any, index: number) => {
        const data = new Date(h.criado_em).toLocaleString('pt-BR')
        const usuario = h.usuario?.nome || 'Desconhecido'
        const acaoEmoji: Record<string, string> = {
          'criado': '🆕',
          'editado': '✏️',
          'ativado': '✅',
          'desativado': '⏸️',
          'deletado': '🗑️'
        }
        const emoji = acaoEmoji[h.acao] || '📝'

        historicoMsg += `${index + 1}. ${emoji} *${h.acao.toUpperCase()}*
   👤 Por: ${usuario}
   📅 Em: ${data}
━━━━━━━━━━━━━━━━━━━━

`
      })

      historicoMsg += `💡 *Total de alterações:* ${historico.length}`

      await sendPrivateMessage(senderJid, historicoMsg)
      return new Response('Histórico enviado', { status: 200 })
    }

    if (!session || sessionError) {
      return new Response('Nenhuma sessão ativa', { status: 200 })
    }

    let updatedSessionData = { ...(session.dados_temporarios || {}) }
    let nextState = session.estado

    // ========================================
    // BUSCA DE DESTINATÁRIOS - OTIMIZADA (APENAS BANCO DE DADOS)
    // ========================================
    async function buscarDestinatariosPorNome(filtro: string, usuarioId: string): Promise<Array<{id: string, nome: string, tipo: string}>> {
      try {
        console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
        console.log(`⚡ [BUSCA_RÁPIDA_DB] Buscando no banco de dados com filtro: "${filtro}"`)
        console.log(`👤 [BUSCA_RÁPIDA_DB] Usuário ID: ${usuarioId}`)

        // 0️⃣ VERIFICAR SE É UM NÚMERO DE TELEFONE DIRETO
        const numeroLimpo = filtro.replace(/\D/g, '')
        const isNumeroTelefone = numeroLimpo.length >= 10 && numeroLimpo.length <= 15

        if (isNumeroTelefone) {
          console.log(`📱 [BUSCA_RÁPIDA_DB] Detectado número de telefone: ${numeroLimpo}`)
          const jid = `${numeroLimpo}@s.whatsapp.net`
          console.log(`✅ [BUSCA_RÁPIDA_DB] Retornando número direto`)
          console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`)

          return [{
            id: jid,
            nome: `📱 ${numeroLimpo}`,
            tipo: 'contato'
          }]
        }

        // 1️⃣ Busca no banco de dados (RÁPIDA - ~100ms)
        const { data, error } = await supabaseAdmin
          .from('grupos_usuario')
          .select('grupo_jid, grupo_nome, tipo')
          .eq('usuario_id', usuarioId)
          .eq('ativo', true)
          .ilike('grupo_nome', `%${filtro}%`)
          .order('grupo_nome', { ascending: true })
          .limit(10)

        if (error) {
          console.error('❌ [BUSCA_RÁPIDA_DB] Erro ao buscar no banco de dados:', error)
          return []
        }

        const resultados = data?.map((g: any) => ({
            id: g.grupo_jid,
            nome: g.tipo === 'grupo' ? `👥 ${g.grupo_nome}` : `📱 ${g.grupo_nome}`,
            tipo: g.tipo || 'desconhecido'
        })) || []

        console.log(`\n📋 [BUSCA_RÁPIDA_DB] RESULTADOS FINAIS:`)
        console.log(`   Encontrados: ${resultados.length}`)
        resultados.forEach((r: any, i: number) => {
          console.log(`   ${i + 1}. ${r.nome} (${r.tipo})`)
        })
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`)

        return resultados
      } catch (error) {
        console.error('❌ [BUSCA_RÁPIDA_DB] Erro geral:', error)
        return []
      }
    }

    switch (session.estado) {
      case 'conversando_ia':
        // IA conversacional para coletar informações
        const historico = updatedSessionData.historico_conversa || []
        historico.push({ role: 'user', content: messageText })

        const aiPrompt = `Você é um assistente de agendamento de mensagens do WhatsApp. Use formatação bonita.

FORMATAÇÃO OBRIGATÓRIA:
- Use *negrito* para palavras-chave
- Use _itálico_ para dicas
- Use emojis relevantes
- Máximo 3 linhas
- Seja direto e amigável

Informações já coletadas:
${updatedSessionData.mensagem ? `✅ Mensagem: ${updatedSessionData.mensagem}` : '❌ Mensagem: não coletada'}
${updatedSessionData.destinatario_id ? `✅ Destinatário: ${updatedSessionData.destinatario_id}` : '❌ Destinatário: não coletado'}
${updatedSessionData.hora_envio ? `✅ Horário: ${updatedSessionData.hora_envio}` : '❌ Horário: não coletado'}
${updatedSessionData.dias_semana ? `✅ Dias: ${updatedSessionData.dias_semana.join(', ')}` : '❌ Dias: não coletados'}

Analise a mensagem do usuário:
1. Se pediu para melhorar a mensagem, sugira uma versão melhorada com formatação bonita
2. Se forneceu informações, extraia e confirme com emoji
3. Pergunte pela próxima informação faltante
4. Se TODAS as 4 informações foram coletadas, responda EXATAMENTE: "PRONTO_PARA_CONFIRMAR"`

        const aiResponse = await callMistralAI(messageText, aiPrompt)

        // Extrair informações da resposta do usuário
        if (!updatedSessionData.mensagem && messageText.length > 10) {
          updatedSessionData.mensagem = messageText
        }

        if (aiResponse.includes('PRONTO_PARA_CONFIRMAR')) {
          nextState = 'aguardando_confirmacao'
          const confirmacaoMsg = `┏━━━━━━━━━━━━━━━━━━━━━┓
┃  ✅ *Confirmar Agendamento*
┗━━━━━━━━━━━━━━━━━━━━━┛

📝 *Mensagem:*
   ${updatedSessionData.mensagem}

👤 *Destinatário:*
   ${updatedSessionData.destinatario_id}

⏰ *Horário:*
   ${updatedSessionData.hora_envio}

📅 *Dias da Semana:*
   ${updatedSessionData.dias_semana?.join(', ')}

━━━━━━━━━━━━━━━━━━━━━
✅ Digite *sim* para confirmar
❌ Digite *não* para cancelar`
          await sendPrivateMessage(senderJid, confirmacaoMsg)
        } else {
          await sendPrivateMessage(senderJid, aiResponse)
        }

        updatedSessionData.historico_conversa = historico
        break

      case 'aguardando_escolha_sessao':
        // Usuário escolheu continuar ou recomeçar
        if (messageText === '1' || messageText.toLowerCase().includes('continuar')) {
          // Restaurar estado anterior
          const estadoAnterior = updatedSessionData.estado_anterior || 'aguardando_mensagem'
          nextState = estadoAnterior

          await sendPrivateMessage(senderJid, `✅ *Continuando de onde parou!*\n\n📍 Voltando para: ${estadoAnterior}\n\n━━━━━━━━━━━━━━━━━━━━`)

          // Reenviar a mensagem do estado anterior
          // (o switch case abaixo vai processar o estado)
        } else if (messageText === '2' || messageText.toLowerCase().includes('recomeçar') || messageText.toLowerCase().includes('recomecar')) {
          // Cancelar sessão antiga e criar nova
          await supabaseAdmin.from('sessoes_comando').delete().eq('telefone', sender)

          await supabaseAdmin.from('sessoes_comando').upsert({
            telefone: sender,
            estado: 'aguardando_mensagem',
            dados_temporarios: {
              usuario_id: user.id
            },
          })

          const welcomeMsg = `┏━━━━━━━━━━━━━━━━━━━┓
┃  🆕 *Novo Agendamento*
┗━━━━━━━━━━━━━━━━━━━┛

📝 *Digite a mensagem* que você deseja agendar.

━━━━━━━━━━━━━━━━━━━━
💡 _Depois vou te ajudar a melhorar!_

⚡ _Digite /cancelar para sair_
↩️ _Digite /voltar para etapa anterior_

━━━━━━━━━━━━━━━━━━━━
_💻 Pensado e desenvolvido por AleTubeGames_`

          await sendPrivateMessage(senderJid, welcomeMsg)
          return new Response('Sessão reiniciada', { status: 200 })
        } else {
          // Opção inválida
          await sendPrivateMessage(senderJid, '❌ Opção inválida!\n\n⚡ Digite *1* para continuar\n🔄 Digite *2* para recomeçar\n\n💡 _Ou use /cancelar para sair_')
          nextState = 'aguardando_escolha_sessao'
        }
        break

      case 'aguardando_mensagem':
        // Perguntar se quer melhorar a mensagem com IA
        updatedSessionData.mensagem_original = messageText
        nextState = 'perguntando_melhorar'

        await sendInteractiveButtons(senderJid,
          `✅ *Mensagem recebida!*\n\n"${messageText}"\n\n━━━━━━━━━━━━━━━━━━━━\n💡 Quer que eu melhore sua mensagem com IA?\n\n⚡ _Digite /voltar para mudar a mensagem_\n⚡ _Digite /cancelar para sair_`,
          [
            { id: 'melhorar_sim', text: '✨ Sim, melhore!' },
            { id: 'melhorar_nao', text: '👍 Não, está boa' }
          ]
        )
        break

      case 'perguntando_melhorar':
        if (messageText === '/cancelar') {
          await sendPrivateMessage(senderJid, '❌ *Agendamento cancelado!*\n\nDigite */novo* para começar novamente.')
          await supabaseAdmin.from('sessoes_comando').delete().eq('telefone', sender)
          nextState = ''
          break
        }

        if (messageText === 'melhorar_sim' || messageText === '1' || messageText.toLowerCase().includes('sim')) {
          // Chamar IA para melhorar a mensagem
          await sendPrivateMessage(senderJid, '🤖 *Processando com IA...*\n\nAguarde alguns segundos...')

          const aiPrompt = `Voce e um especialista em comunicacao. Melhore esta mensagem para WhatsApp.

REGRAS:
- Use formatacao WhatsApp (*negrito*, _italico_)
- Adicione emojis relevantes
- Seja profissional mas amigavel
- Mantenha o sentido original
- Maximo 5 linhas

Retorne APENAS a mensagem melhorada, sem explicacoes.`

          const mensagemMelhorada = await callMistralAI(updatedSessionData.mensagem_original, aiPrompt)
          updatedSessionData.mensagem = mensagemMelhorada

          await sendInteractiveButtons(senderJid,
            `✨ *Mensagem melhorada pela IA:*\n\n${mensagemMelhorada}\n\n━━━━━━━━━━━━━━━━━━━━\n\n⚡ _Digite /voltar para mudar a mensagem_\n⚡ _Digite /cancelar para sair_`,
            [
              { id: 'aprovar_ia', text: '✅ Aprovar' },
              { id: 'usar_original', text: '↩️ Usar original' },
              { id: 'editar_manual', text: '✏️ Editar' }
            ]
          )
          nextState = 'aprovando_mensagem'
        } else if (messageText === 'melhorar_nao' || messageText === '2' || messageText.toLowerCase().includes('não') || messageText.toLowerCase().includes('nao')) {
          // Usar mensagem original
          updatedSessionData.mensagem = updatedSessionData.mensagem_original
          nextState = 'escolhendo_destinatario'

          // Pedir para digitar o nome do grupo/contato
          await sendPrivateMessage(senderJid,
            `👥 *Digite o nome do grupo ou contato:*\n\n` +
            `💡 *Exemplos:*\n` +
            `• Para grupos: Digite parte do nome (ex: "Petrópolis")\n` +
            `• Para contatos: Digite o número com DDD (ex: 5531999999999)\n\n` +
            `⚡ _Digite /voltar para mudar a mensagem_\n` +
            `⚡ _Digite /cancelar para sair_`
          )
        } else {
          // Usuário digitou texto livre - interpretar como correção da mensagem
          updatedSessionData.mensagem_original = messageText
          await sendPrivateMessage(senderJid, `✅ *Mensagem atualizada!*\n\n"${messageText}"\n\n━━━━━━━━━━━━━━━━━━━━\n💡 Quer que eu melhore com IA?\n\n1️⃣ ✨ Sim, melhore!\n2️⃣ 👍 Não, está boa\n\n💬 Digite o número da opção desejada`)
          // Manter no mesmo estado
        }
        break

      case 'aprovando_mensagem':
        if (messageText === '/cancelar') {
          await sendPrivateMessage(senderJid, '❌ *Agendamento cancelado!*\n\nDigite */novo* para começar novamente.')
          await supabaseAdmin.from('sessoes_comando').delete().eq('telefone', sender)
          nextState = ''
          break
        }

        if (messageText === 'aprovar_ia' || messageText === '1' || messageText.toLowerCase().includes('aprovar')) {
          // Mensagem já está salva (melhorada)
          nextState = 'escolhendo_destinatario'
          await sendPrivateMessage(senderJid, `📋 *Digite o nome do grupo ou número do contato*

━━━━━━━━━━━━━━━━━━━━
💡 _Exemplo: Família Silva ou 5511999999999_

⚡ _Digite /voltar para mudar a mensagem_
⚡ _Digite /cancelar para sair_`)
        } else if (messageText === 'usar_original' || messageText === '2') {
          updatedSessionData.mensagem = updatedSessionData.mensagem_original
          nextState = 'escolhendo_destinatario'
          await sendPrivateMessage(senderJid, `📋 *Digite o nome do grupo ou número do contato*

━━━━━━━━━━━━━━━━━━━━
💡 _Exemplo: Família Silva ou 5511999999999_

⚡ _Digite /voltar para mudar a mensagem_
⚡ _Digite /cancelar para sair_`)
        } else if (messageText === 'editar_manual' || messageText === '3') {
          await sendPrivateMessage(senderJid, `✏️ *Digite a nova mensagem:*

⚡ _Digite /voltar para cancelar_
⚡ _Digite /cancelar para sair_`)
          nextState = 'editando_mensagem_manual'
        } else {
          await sendPrivateMessage(senderJid, `❌ *Opção inválida!*\n\nClique em um dos botões acima.\n\n⚡ _Digite /voltar para mudar a mensagem_\n⚡ _Digite /cancelar para sair_`)
          nextState = 'aprovando_mensagem'
        }
        break

      case 'editando_mensagem_manual':
        if (messageText === '/cancelar') {
          await sendPrivateMessage(senderJid, '❌ *Agendamento cancelado!*\n\nDigite */novo* para começar novamente.')
          await supabaseAdmin.from('sessoes_comando').delete().eq('telefone', sender)
          nextState = ''
          break
        }

        updatedSessionData.mensagem_original = messageText
        updatedSessionData.mensagem = messageText
        nextState = 'escolhendo_destinatario'
        await sendPrivateMessage(senderJid, `✅ *Mensagem salva!*\n\n"${messageText}"\n\n━━━━━━━━━━━━━━━━━━━━\n📋 *Digite o nome do grupo ou número do contato*

💡 _Exemplo: Família Silva ou 5511999999999_

⚡ _Digite /voltar para mudar a mensagem_
⚡ _Digite /cancelar para sair_`)
        break

      case 'escolhendo_destinatario':
        if (messageText === '/cancelar') {
          await sendPrivateMessage(senderJid, '❌ *Agendamento cancelado!*\n\nDigite */novo* para começar novamente.')
          await supabaseAdmin.from('sessoes_comando').delete().eq('telefone', sender)
          nextState = ''
          break
        }

        // Buscar destinatários no banco de dados
        await sendPrivateMessage(senderJid, '🔍 Buscando...')

        const resultados = await buscarDestinatariosPorNome(messageText, user.id)

        if (resultados.length === 0) {
          await sendPrivateMessage(senderJid,
            `😕 Nenhum grupo ou contato encontrado para "${messageText}".\n\n` +
            `💡 *Dicas:*\n` +
            `• Para contatos: Digite o número com DDD (ex: 5531999999999)\n` +
            `• Para grupos: Envie uma mensagem no grupo primeiro\n` +
            `• Tente buscar com menos caracteres\n\n` +
            `⚡ _Digite /voltar para mudar a mensagem_\n` +
            `⚡ _Digite /cancelar para sair_`
          )
          nextState = 'escolhendo_destinatario'
        } else if (resultados.length === 1) {
          // Apenas 1 resultado - selecionar automaticamente
          updatedSessionData.destinatario_id = resultados[0].id
          updatedSessionData.destinatario_tipo = resultados[0].tipo
          nextState = 'escolhendo_horario'

          await sendPrivateMessage(senderJid, `✅ *Destinatário selecionado:*\n${resultados[0].nome}`)

          // Enviar BOTÕES de horário
          await sendInteractiveButtons(senderJid,
            '⏰ *Escolha o horário para envio:*\n\nSelecione uma opção rápida ou digite um horário personalizado (ex: 09:30)\n\n⚡ _Digite /voltar para mudar o destinatário_\n⚡ _Digite /cancelar para sair_',
            [
              { id: '08:00', text: '🌅 Manhã (8h)' },
              { id: '14:00', text: '🌞 Tarde (14h)' },
              { id: '20:00', text: '🌙 Noite (20h)' }
            ]
          )
        } else {
          // Múltiplos resultados - mostrar lista
          let mensagemResultados = `📋 *Encontrei ${resultados.length} resultados:*\n\n`
          resultados.forEach((r, i) => {
            mensagemResultados += `${i + 1}. ${r.nome}\n`
          })
          mensagemResultados += `\n💡 *Digite o número* da opção desejada (1-${resultados.length})\n\n⚡ _Digite /voltar para mudar a mensagem_\n⚡ _Digite /cancelar para sair_`

          await sendPrivateMessage(senderJid, mensagemResultados)

          // Salvar resultados para próxima etapa
          updatedSessionData.resultados_busca = resultados
          nextState = 'selecionando_destinatario'
        }
        break

      case 'selecionando_destinatario':
        if (messageText === '/cancelar') {
          await sendPrivateMessage(senderJid, '❌ *Agendamento cancelado!*\n\nDigite */novo* para começar novamente.')
          await supabaseAdmin.from('sessoes_comando').delete().eq('telefone', sender)
          nextState = ''
          break
        }

        // Usuário escolheu um número da lista
        const numeroEscolhido = parseInt(messageText.trim())
        const resultadosSalvos = updatedSessionData.resultados_busca || []

        if (numeroEscolhido >= 1 && numeroEscolhido <= resultadosSalvos.length) {
          const destinatarioEscolhido = resultadosSalvos[numeroEscolhido - 1]

          // Inicializar array de destinatários se não existir
          if (!updatedSessionData.destinatarios) {
            updatedSessionData.destinatarios = []
          }

          // Adicionar destinatário à lista
          updatedSessionData.destinatarios.push({
            id: destinatarioEscolhido.id,
            nome: destinatarioEscolhido.nome,
            tipo: destinatarioEscolhido.tipo
          })

          delete updatedSessionData.resultados_busca

          // Mostrar destinatários selecionados e perguntar se quer adicionar mais
          let mensagemDestinatarios = `✅ *Destinatário adicionado:*\n${destinatarioEscolhido.nome}\n\n`
          mensagemDestinatarios += `📋 *Total selecionado(s): ${updatedSessionData.destinatarios.length}*\n\n`

          updatedSessionData.destinatarios.forEach((d: any, i: number) => {
            mensagemDestinatarios += `${i + 1}. ${d.nome}\n`
          })

          mensagemDestinatarios += `\n━━━━━━━━━━━━━━━━━━━━\n`
          mensagemDestinatarios += `💡 *Deseja adicionar mais destinatários?*\n\n`
          mensagemDestinatarios += `1️⃣ *Sim* - Adicionar mais\n`
          mensagemDestinatarios += `2️⃣ *Não* - Continuar\n\n`
          mensagemDestinatarios += `⚡ _Digite /voltar para mudar_\n`
          mensagemDestinatarios += `⚡ _Digite /cancelar para sair_`

          await sendPrivateMessage(senderJid, mensagemDestinatarios)
          nextState = 'perguntando_mais_destinatarios'
        } else {
          await sendPrivateMessage(senderJid, `❌ Opção inválida. Digite um número entre 1 e ${resultadosSalvos.length}`)
          nextState = 'selecionando_destinatario'
        }
        break

      case 'perguntando_mais_destinatarios':
        if (messageText === '/cancelar') {
          await sendPrivateMessage(senderJid, '❌ *Agendamento cancelado!*\n\nDigite */novo* para começar novamente.')
          await supabaseAdmin.from('sessoes_comando').delete().eq('telefone', sender)
          nextState = ''
          break
        }

        if (messageText === '1' || messageText.toLowerCase().includes('sim')) {
          // Adicionar mais destinatários
          await sendPrivateMessage(senderJid,
            `👥 *Digite o nome do grupo ou contato:*\n\n` +
            `💡 *Exemplos:*\n` +
            `• Para grupos: Digite parte do nome (ex: "Petrópolis")\n` +
            `• Para contatos: Digite o número com DDD (ex: 5531999999999)\n\n` +
            `⚡ _Digite /voltar para mudar_\n` +
            `⚡ _Digite /cancelar para sair_`
          )
          nextState = 'escolhendo_destinatario'
        } else if (messageText === '2' || messageText.toLowerCase().includes('não') || messageText.toLowerCase().includes('nao')) {
          // Continuar para escolher horário
          nextState = 'escolhendo_horario'

          // Enviar BOTÕES de horário
          await sendInteractiveButtons(senderJid,
            '⏰ *Escolha o horário para envio:*\n\nSelecione uma opção rápida ou digite um horário personalizado (ex: 09:30)\n\n⚡ _Digite /voltar para mudar o destinatário_\n⚡ _Digite /cancelar para sair_',
            [
              { id: '08:00', text: '🌅 Manhã (8h)' },
              { id: '14:00', text: '🌞 Tarde (14h)' },
              { id: '20:00', text: '🌙 Noite (20h)' }
            ]
          )
        } else {
          await sendPrivateMessage(senderJid, `❌ Opção inválida. Digite *1* para adicionar mais ou *2* para continuar.`)
          nextState = 'perguntando_mais_destinatarios'
        }
        break

      case 'aguardando_destinatario':
        updatedSessionData.destinatario_id = messageText
        updatedSessionData.destinatario_tipo = messageText.includes('@g.us') ? 'grupo' : 'contato'
        nextState = 'aguardando_horario'
        await sendPrivateMessage(senderJid, '⏰ Qual o *horário* para o envio? (formato HH:MM, ex: 09:30)')
        break

      case 'escolhendo_horario':
        if (messageText === '/cancelar') {
          await sendPrivateMessage(senderJid, '❌ *Agendamento cancelado!*\n\nDigite */novo* para começar novamente.')
          await supabaseAdmin.from('sessoes_comando').delete().eq('telefone', sender)
          nextState = ''
          break
        }

        // Mapear opções de botão (aceitar número ou ID)
        const horariosMap: Record<string, string> = {
          '08:00': '08:00',
          '14:00': '14:00',
          '20:00': '20:00',
          '1': '08:00',
          '2': '14:00',
          '3': '20:00'
        }

        let horarioSelecionado = horariosMap[messageText.trim()] || messageText.trim()

        // Validar formato HH:MM
        if (/^\d{2}:\d{2}$/.test(horarioSelecionado)) {
          const [hora, minuto] = horarioSelecionado.split(':').map(Number)
          if (hora >= 0 && hora <= 23 && minuto >= 0 && minuto <= 59) {
            updatedSessionData.hora_envio = horarioSelecionado
            nextState = 'escolhendo_dias'

            // Enviar BOTÕES de dias (super simples!)
            await sendInteractiveButtons(senderJid,
              '📅 *Escolha os dias da semana:*\n\nSelecione quando a mensagem será enviada.\n\n⚡ _Digite /voltar para mudar o horário_\n⚡ _Digite /cancelar para sair_',
              [
                { id: 'dias_uteis', text: '🏢 Seg-Sex' },
                { id: 'todos_dias', text: '📆 Todos os dias' },
                { id: 'custom_dias', text: '✏️ Personalizar' }
              ]
            )
          } else {
            await sendPrivateMessage(senderJid, '❌ Horário inválido! Use formato *HH:MM* (ex: 09:30)\n\n⚡ _Digite /voltar para mudar o destinatário_\n⚡ _Digite /cancelar para sair_')
            nextState = 'escolhendo_horario'
          }
        } else {
          await sendPrivateMessage(senderJid, `❌ *Horário inválido!*\n\n⚠️ O horário "${messageText}" não é válido!\n\n⏰ *Como informar:*\n🔘 Clique em um dos botões acima\n   OU\n✏️ Digite *1*, *2* ou *3*\n   OU\n✏️ Digite no formato *HH:MM* (Ex: 09:30)\n\n⚡ _Digite /voltar para mudar o destinatário_\n⚡ _Digite /cancelar para sair_`)
          nextState = 'escolhendo_horario'
        }
        break

      case 'aguardando_horario_custom':
        if (!/^\d{2}:\d{2}$/.test(messageText)) {
          await sendPrivateMessage(senderJid, '❌ Formato inválido. Use *HH:MM* (ex: 09:30)')
          nextState = 'aguardando_horario_custom'
        } else {
          updatedSessionData.hora_envio = messageText
          nextState = 'escolhendo_dias'

          await sendInteractiveList(senderJid,
            '📅 Escolha os dias',
            'Selecione os dias da semana para envio',
            '📆 Ver dias',
            [
              {
                title: '📅 Dias da Semana',
                rows: [
                  { id: 'dias_uteis', title: '🏢 Dias úteis', description: 'Seg a Sex (1,2,3,4,5)' },
                  { id: 'fim_semana', title: '🏖️ Fim de semana', description: 'Sáb e Dom (6,7)' },
                  { id: 'todos_dias', title: '📆 Todos os dias', description: 'Seg a Dom (1,2,3,4,5,6,7)' },
                  { id: 'custom_dias', title: '✏️ Personalizado', description: 'Escolher manualmente' }
                ]
              }
            ]
          )
        }
        break

      case 'aguardando_horario':
        if (!/^\d{2}:\d{2}$/.test(messageText)) {
            await sendPrivateMessage(senderJid, '❌ Formato de horário inválido. Por favor, use *HH:MM* (ex: 09:30).');
            nextState = 'aguardando_horario';
        } else {
            updatedSessionData.hora_envio = messageText
            nextState = 'aguardando_dias'
            await sendPrivateMessage(
            senderJid,
            `📅 Em quais *dias da semana*? (números de 1 a 7, separados por vírgula)\n\n1: Seg, 2: Ter, 3: Qua, 4: Qui, 5: Sex, 6: Sáb, 7: Dom\n\n*Exemplo:* "1,3,5" para Seg, Qua e Sex.`
            )
        }
        break

      case 'escolhendo_dias':
        if (messageText === '/cancelar') {
          await sendPrivateMessage(senderJid, '❌ *Agendamento cancelado!*\n\nDigite */novo* para começar novamente.')
          await supabaseAdmin.from('sessoes_comando').delete().eq('telefone', sender)
          nextState = ''
          break
        }

        let diasSelecionados: number[] = []

        // Mapear seleções pré-definidas (SIMPLIFICADO) - aceitar número ou ID
        const diasMap: Record<string, number[]> = {
          'dias_uteis': [1, 2, 3, 4, 5],
          'todos_dias': [1, 2, 3, 4, 5, 6, 7],
          'custom_dias': [],
          '1': [1, 2, 3, 4, 5],  // Seg-Sex
          '2': [1, 2, 3, 4, 5, 6, 7],  // Todos os dias
          '3': []  // Personalizar
        }

        if (messageText === 'custom_dias' || messageText === '3') {
          await sendPrivateMessage(senderJid, '📅 *Digite os dias separados por vírgula:*\n\n*Exemplo:* 1,3,5 para Seg, Qua e Sex\n\n1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sáb, 7=Dom\n\n⚡ _Digite /voltar para mudar o horário_\n⚡ _Digite /cancelar para sair_')
          nextState = 'aguardando_dias'
          break
        } else if (diasMap[messageText]) {
          diasSelecionados = diasMap[messageText]
        } else {
          // Tentar parsear como números
          diasSelecionados = messageText.split(',').map((d: string) => parseInt(d.trim())).filter((d: number) => !isNaN(d) && d >= 1 && d <= 7)
        }

        if (diasSelecionados.length === 0) {
          await sendPrivateMessage(senderJid, '❌ Seleção inválida!\n\n🔘 Clique em um dos botões acima\n   OU\n✏️ Digite *1*, *2* ou *3*\n   OU\n✏️ Digite os números separados por vírgula (ex: 1,3,5)\n\n⚡ _Digite /voltar para mudar o horário_\n⚡ _Digite /cancelar para sair_')
          nextState = 'escolhendo_dias'
        } else {
          updatedSessionData.dias_semana = diasSelecionados
          nextState = 'escolhendo_termino'

          // Perguntar sobre data de término
          await sendInteractiveButtons(senderJid,
            '� *Quando o agendamento deve terminar?*\n\nEscolha uma opção:',
            [
              { id: 'termino_nunca', text: '♾️ Nunca (indeterminado)' },
              { id: 'termino_data', text: '📅 Escolher data' }
            ]
          )
        }
        break

      case 'escolhendo_termino':
        if (messageText === '/cancelar') {
          await sendPrivateMessage(senderJid, '❌ *Agendamento cancelado!*\n\nDigite */novo* para começar novamente.')
          await supabaseAdmin.from('sessoes_comando').delete().eq('telefone', sender)
          nextState = ''
          break
        }

        if (messageText === 'termino_nunca' || messageText === '1') {
          // Sem data de término
          updatedSessionData.data_termino = null
          nextState = 'aguardando_confirmacao'

          const diasNomes = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
          const diasTexto = updatedSessionData.dias_semana.map((d: number) => diasNomes[d-1]).join(', ')

          const confirmacaoMsg = `╔═══════════════════════════╗
║  ✅ *CONFIRMAR AGENDAMENTO*
╚═══════════════════════════╝

📝 *Mensagem:*
${updatedSessionData.mensagem}

👤 *Destinatário:*
${updatedSessionData.destinatario_id}

⏰ *Horário:*
${updatedSessionData.hora_envio}

📅 *Dias da semana:*
${diasTexto}

📆 *Término:*
Nunca (indeterminado)

━━━━━━━━━━━━━━━━━━━━━━━━━

Tudo certo? Confirma o agendamento?`

          await sendInteractiveButtons(senderJid, confirmacaoMsg, [
            { id: 'confirmar_sim', text: '✅ Sim, confirmar!' },
            { id: 'confirmar_nao', text: '❌ Não, cancelar' }
          ])
        } else if (messageText === 'termino_data' || messageText === '2') {
          nextState = 'aguardando_data_termino'
          await sendPrivateMessage(senderJid, '📅 *Digite a data de término:*\n\n*Formato:* DD/MM/AAAA\n*Exemplo:* 31/12/2025\n\n⚡ _Digite /voltar para não definir término_\n⚡ _Digite /cancelar para sair_')
        } else {
          await sendPrivateMessage(senderJid, '❌ *Opção inválida!*\n\n🔘 Clique em um dos botões acima\n   OU\n✏️ Digite *1* (Nunca) ou *2* (Escolher data)\n\n⚡ _Digite /voltar para mudar os dias_\n⚡ _Digite /cancelar para sair_')
          nextState = 'escolhendo_termino'
        }
        break

      case 'aguardando_data_termino':
        if (messageText === '/cancelar') {
          await sendPrivateMessage(senderJid, '❌ *Agendamento cancelado!*\n\nDigite */novo* para começar novamente.')
          await supabaseAdmin.from('sessoes_comando').delete().eq('telefone', sender)
          nextState = ''
          break
        }

        if (messageText === '/voltar') {
          updatedSessionData.data_termino = null
          nextState = 'aguardando_confirmacao'

          const diasNomes = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
          const diasTexto = updatedSessionData.dias_semana.map((d: number) => diasNomes[d-1]).join(', ')

          // Montar lista de destinatários
          const destinatarios = updatedSessionData.destinatarios || []
          let destinatariosTexto = ''
          let totalDestinatarios = 0

          console.log('🔍 DEBUG - Destinatários na confirmação (escolhendo_termino):', JSON.stringify(destinatarios))

          if (destinatarios.length > 0) {
            destinatariosTexto = destinatarios.map((d: any, i: number) => `${i + 1}. ${d.nome}`).join('\n')
            totalDestinatarios = destinatarios.length
          } else if (updatedSessionData.destinatario_nome) {
            // Fallback para compatibilidade - mostrar nome se disponível
            destinatariosTexto = updatedSessionData.destinatario_nome
            totalDestinatarios = 1
          } else if (updatedSessionData.destinatario_id) {
            // Último fallback - mostrar JID
            destinatariosTexto = updatedSessionData.destinatario_id
            totalDestinatarios = 1
          }

          const confirmacaoMsg = `╔═══════════════════════════╗
║  ✅ *CONFIRMAR AGENDAMENTO*
╚═══════════════════════════╝

📝 *Mensagem:*
${updatedSessionData.mensagem}

👤 *Destinatário(s):* ${totalDestinatarios > 1 ? `(${totalDestinatarios})` : ''}
${destinatariosTexto}

⏰ *Horário:*
${updatedSessionData.hora_envio}

📅 *Dias da semana:*
${diasTexto}

📆 *Término:*
Nunca (indeterminado)

━━━━━━━━━━━━━━━━━━━━━━━━━

Tudo certo? Confirma o agendamento?`

          await sendInteractiveButtons(senderJid, confirmacaoMsg, [
            { id: 'confirmar_sim', text: '✅ Sim, confirmar!' },
            { id: 'confirmar_nao', text: '❌ Não, cancelar' }
          ])
        } else {
          // Validar formato DD/MM/AAAA
          const dataRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/
          const match = messageText.match(dataRegex)

          if (!match) {
            await sendPrivateMessage(senderJid, '❌ *Data inválida!*\n\nUse o formato DD/MM/AAAA\n*Exemplo:* 31/12/2025')
            nextState = 'aguardando_data_termino'
          } else {
            const [_, dia, mes, ano] = match
            const dataTermino = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia))
            const hoje = new Date()
            hoje.setHours(0, 0, 0, 0)

            if (dataTermino < hoje) {
              await sendPrivateMessage(senderJid, '❌ *Data inválida!*\n\nA data de término deve ser futura.\n\nDigite novamente:')
              nextState = 'aguardando_data_termino'
            } else {
              updatedSessionData.data_termino = dataTermino.toISOString().split('T')[0]
              nextState = 'aguardando_confirmacao'

              const diasNomes = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
              const diasTexto = updatedSessionData.dias_semana.map((d: number) => diasNomes[d-1]).join(', ')

              // Montar lista de destinatários
              const destinatarios = updatedSessionData.destinatarios || []
              let destinatariosTexto = ''
              let totalDestinatarios = 0

              console.log('🔍 DEBUG - Destinatários na confirmação (aguardando_data_termino):', JSON.stringify(destinatarios))

              if (destinatarios.length > 0) {
                destinatariosTexto = destinatarios.map((d: any, i: number) => `${i + 1}. ${d.nome}`).join('\n')
                totalDestinatarios = destinatarios.length
              } else if (updatedSessionData.destinatario_nome) {
                // Fallback para compatibilidade - mostrar nome se disponível
                destinatariosTexto = updatedSessionData.destinatario_nome
                totalDestinatarios = 1
              } else if (updatedSessionData.destinatario_id) {
                // Último fallback - mostrar JID
                destinatariosTexto = updatedSessionData.destinatario_id
                totalDestinatarios = 1
              }

              const confirmacaoMsg = `╔═══════════════════════════╗
║  ✅ *CONFIRMAR AGENDAMENTO*
╚═══════════════════════════╝

📝 *Mensagem:*
${updatedSessionData.mensagem}

👤 *Destinatário(s):* ${totalDestinatarios > 1 ? `(${totalDestinatarios})` : ''}
${destinatariosTexto}

⏰ *Horário:*
${updatedSessionData.hora_envio}

📅 *Dias da semana:*
${diasTexto}

📆 *Término:*
${dia}/${mes}/${ano}

━━━━━━━━━━━━━━━━━━━━━━━━━

Tudo certo? Confirma o agendamento?`

              await sendInteractiveButtons(senderJid, confirmacaoMsg, [
                { id: 'confirmar_sim', text: '✅ Sim, confirmar!' },
                { id: 'confirmar_nao', text: '❌ Não, cancelar' }
              ])
            }
          }
        }
        break

      case 'aguardando_dias':
        if (messageText === '/cancelar') {
          await sendPrivateMessage(senderJid, '❌ *Agendamento cancelado!*\n\nDigite */novo* para começar novamente.')
          await supabaseAdmin.from('sessoes_comando').delete().eq('telefone', sender)
          nextState = ''
          break
        }

        const dias = messageText.split(',').map((d: string) => parseInt(d.trim())).filter((d: number) => !isNaN(d) && d >= 1 && d <= 7)
        if (dias.length === 0) {
            await sendPrivateMessage(senderJid, '❌ Dias inválidos. Por favor, envie números de 1 a 7, separados por vírgula.\n\n⚡ _Digite /voltar para mudar o horário_\n⚡ _Digite /cancelar para sair_');
            nextState = 'aguardando_dias';
        } else {
            updatedSessionData.dias_semana = dias;
            nextState = 'escolhendo_termino'

            // Perguntar sobre data de término
            await sendInteractiveButtons(senderJid,
              '📆 *Quando o agendamento deve terminar?*\n\nEscolha uma opção:',
              [
                { id: 'termino_nunca', text: '♾️ Nunca (indeterminado)' },
                { id: 'termino_data', text: '📅 Escolher data' }
              ]
            )
        }
        break

      case 'aguardando_confirmacao':
        const confirmar = messageText === 'confirmar_sim' || messageText.trim().toLowerCase() === 'sim' || messageText.trim() === '1'
        const cancelar = messageText === 'confirmar_nao' || messageText.trim().toLowerCase() === 'não' || messageText.trim().toLowerCase() === 'nao' || messageText.trim() === '2'

        if (confirmar) {
            // Validar dados obrigatórios antes de inserir
            const destinatarios = updatedSessionData.destinatarios || []
            const temDestinatarios = destinatarios.length > 0
            const temDestinatarioAntigo = updatedSessionData.destinatario_id

            if (!updatedSessionData.usuario_id || !updatedSessionData.mensagem || (!temDestinatarios && !temDestinatarioAntigo) || !updatedSessionData.hora_envio || !updatedSessionData.dias_semana) {
              await sendPrivateMessage(senderJid, '❌ Erro: Dados incompletos. Digite */novo* para começar novamente.')
              await supabaseAdmin.from('sessoes_comando').delete().eq('telefone', sender)
              nextState = ''
              break
            }

            // Criar agendamentos para cada destinatário
            const agendamentosParaCriar = []

            if (temDestinatarios) {
              // Múltiplos destinatários
              for (const dest of destinatarios) {
                agendamentosParaCriar.push({
                  usuario_id: updatedSessionData.usuario_id,
                  mensagem: updatedSessionData.mensagem,
                  destinatario_id: dest.id,
                  destinatario_tipo: dest.tipo,
                  destinatario_nome: dest.nome.replace(/^(👥|📱)\s*/, ''), // Remover emoji
                  hora_envio: updatedSessionData.hora_envio,
                  dias_semana: updatedSessionData.dias_semana,
                  data_termino: updatedSessionData.data_termino || null,
                  ativo: true,
                  modificado_por: user.id
                })
              }
            } else {
              // Destinatário único (compatibilidade)
              agendamentosParaCriar.push({
                usuario_id: updatedSessionData.usuario_id,
                mensagem: updatedSessionData.mensagem,
                destinatario_id: updatedSessionData.destinatario_id,
                destinatario_tipo: updatedSessionData.destinatario_tipo,
                hora_envio: updatedSessionData.hora_envio,
                dias_semana: updatedSessionData.dias_semana,
                data_termino: updatedSessionData.data_termino || null,
                ativo: true,
                modificado_por: user.id
              })
            }

            // Inserir todos os agendamentos
            const { data: novosAgendamentos, error: insertError } = await supabaseAdmin
              .from('agendamentos')
              .insert(agendamentosParaCriar)
              .select()

            if (!insertError && novosAgendamentos) {
              // Registrar auditoria para cada agendamento
              for (const agendamento of novosAgendamentos) {
                await supabaseAdmin.from('auditoria_agendamentos').insert({
                  agendamento_id: agendamento.id,
                  usuario_id: user.id,
                  acao: 'criado',
                  dados_anteriores: null,
                  dados_novos: agendamento
                })
              }
            }

            await supabaseAdmin.from('sessoes_comando').delete().eq('telefone', sender);

            const totalCriados = novosAgendamentos?.length || 1
            const successMsg = `╔═══════════════════╗
║  ✅ *SUCESSO!*
╚═══════════════════╝

🎉 *${totalCriados} agendamento(s) criado(s)!*

Sua mensagem será enviada automaticamente nos dias e horários configurados.

━━━━━━━━━━━━━━━━━━━━
📋 Digite */listar* para ver todos
🆕 Digite */novo* para criar outro

━━━━━━━━━━━━━━━━━━━━
_💻 Pensado e desenvolvido por AleTubeGames_`

            await sendPrivateMessage(senderJid, successMsg);
        } else if (cancelar) {
            await supabaseAdmin.from('sessoes_comando').delete().eq('telefone', sender);

            const cancelMsg = `╔═══════════════╗
║  ❌ *Cancelado*
╚═══════════════╝

_Agendamento não foi criado._

Digite */novo* para tentar novamente.`

            await sendPrivateMessage(senderJid, cancelMsg);
            nextState = '' // Finaliza a sessão
        } else {
            // Opção inválida - pedir novamente
            await sendPrivateMessage(senderJid, '❌ Opção inválida! Digite *1* para confirmar ou *2* para cancelar.')
            nextState = 'aguardando_confirmacao' // Mantém no mesmo estado
        }
        break;
    }

    // ========================================
    // MÁQUINA DE ESTADOS: EDITAR
    // ========================================
    if (session.comando === 'editar') {
      const agendamentoId = session.dados?.agendamento_id
      const agendamentoOriginal = session.dados?.agendamento_original

      switch (session.estado) {
        case 'escolhendo_campo':
          if (messageText === 'editar_mensagem') {
            await sendPrivateMessage(senderJid, '📝 *Digite a nova mensagem:*')
            nextState = 'editando_mensagem'
          } else if (messageText === 'editar_horario') {
            await sendInteractiveButtons(senderJid,
              '⏰ *Escolha o novo horário:*',
              [
                { id: '08:00', text: '🌅 Manhã (8h)' },
                { id: '14:00', text: '🌞 Tarde (14h)' },
                { id: '20:00', text: '🌙 Noite (20h)' }
              ]
            )
            await sendPrivateMessage(senderJid, '\n💡 _Ou digite um horário personalizado (ex: 09:30)_')
            nextState = 'editando_horario'
          } else if (messageText === 'editar_dias') {
            await sendInteractiveButtons(senderJid,
              '📅 *Escolha os novos dias:*',
              [
                { id: 'dias_uteis', text: '🏢 Seg-Sex' },
                { id: 'todos_dias', text: '📆 Todos os dias' },
                { id: 'custom_dias', text: '✏️ Personalizar' }
              ]
            )
            nextState = 'editando_dias'
          }
          break

        case 'editando_mensagem':
          const novaMensagem = messageText.trim()
          if (novaMensagem.length < 1) {
            await sendPrivateMessage(senderJid, '❌ Mensagem muito curta! Digite novamente.')
            nextState = 'editando_mensagem'
          } else {
            await supabaseAdmin
              .from('agendamentos')
              .update({ mensagem: novaMensagem, modificado_por: user.id })
              .eq('id', agendamentoId)

            await supabaseAdmin.from('auditoria_agendamentos').insert({
              agendamento_id: agendamentoId,
              usuario_id: user.id,
              acao: 'editado',
              dados_anteriores: { mensagem: agendamentoOriginal.mensagem },
              dados_novos: { mensagem: novaMensagem }
            })

            await sendPrivateMessage(senderJid, `✅ *Mensagem atualizada com sucesso!*\n\n📋 Digite */listar* para ver seus agendamentos`)
            await supabaseAdmin.from('sessoes_comando').delete().eq('telefone', sender)
            nextState = ''
          }
          break

        case 'editando_horario':
          const novoHorario = messageText.trim()
          if (!/^\d{2}:\d{2}$/.test(novoHorario)) {
            await sendPrivateMessage(senderJid, '❌ Formato inválido! Use *HH:MM* (ex: 09:30)')
            nextState = 'editando_horario'
          } else {
            const [hora, minuto] = novoHorario.split(':').map(Number)
            if (hora < 0 || hora > 23 || minuto < 0 || minuto > 59) {
              await sendPrivateMessage(senderJid, '❌ Horário inválido! Use valores válidos.')
              nextState = 'editando_horario'
            } else {
              await supabaseAdmin
                .from('agendamentos')
                .update({ hora_envio: novoHorario, modificado_por: user.id })
                .eq('id', agendamentoId)

              await supabaseAdmin.from('auditoria_agendamentos').insert({
                agendamento_id: agendamentoId,
                usuario_id: user.id,
                acao: 'editado',
                dados_anteriores: { hora_envio: agendamentoOriginal.hora_envio },
                dados_novos: { hora_envio: novoHorario }
              })

              await sendPrivateMessage(senderJid, `✅ *Horário atualizado para ${novoHorario}!*\n\n📋 Digite */listar* para ver seus agendamentos`)
              await supabaseAdmin.from('sessoes_comando').delete().eq('telefone', sender)
              nextState = ''
            }
          }
          break

        case 'editando_dias':
          let novosDias: number[] = []
          const diasMap: Record<string, number[]> = {
            'dias_uteis': [1, 2, 3, 4, 5],
            'todos_dias': [1, 2, 3, 4, 5, 6, 7]
          }

          if (messageText === 'custom_dias') {
            await sendPrivateMessage(senderJid, '📅 *Digite os dias separados por vírgula:*\n\n*Exemplo:* 1,3,5 para Seg, Qua e Sex\n\n1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sáb, 7=Dom')
            nextState = 'editando_dias_custom'
          } else if (diasMap[messageText]) {
            novosDias = diasMap[messageText]
          } else {
            novosDias = messageText.split(',').map((d: string) => parseInt(d.trim())).filter((d: number) => !isNaN(d) && d >= 1 && d <= 7)
          }

          if (novosDias.length > 0) {
            await supabaseAdmin
              .from('agendamentos')
              .update({ dias_semana: novosDias, modificado_por: user.id })
              .eq('id', agendamentoId)

            await supabaseAdmin.from('auditoria_agendamentos').insert({
              agendamento_id: agendamentoId,
              usuario_id: user.id,
              acao: 'editado',
              dados_anteriores: { dias_semana: agendamentoOriginal.dias_semana },
              dados_novos: { dias_semana: novosDias }
            })

            const diasNomes = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
            const diasTexto = novosDias.map(d => diasNomes[d-1]).join(', ')
            await sendPrivateMessage(senderJid, `✅ *Dias atualizados para: ${diasTexto}!*\n\n📋 Digite */listar* para ver seus agendamentos`)
            await supabaseAdmin.from('sessoes_comando').delete().eq('telefone', sender)
            nextState = ''
          }
          break

        case 'editando_dias_custom':
          const diasCustom = messageText.split(',').map((d: string) => parseInt(d.trim())).filter((d: number) => !isNaN(d) && d >= 1 && d <= 7)
          if (diasCustom.length === 0) {
            await sendPrivateMessage(senderJid, '❌ Dias inválidos! Digite números de 1 a 7 separados por vírgula.')
            nextState = 'editando_dias_custom'
          } else {
            await supabaseAdmin
              .from('agendamentos')
              .update({ dias_semana: diasCustom, modificado_por: user.id })
              .eq('id', agendamentoId)

            await supabaseAdmin.from('auditoria_agendamentos').insert({
              agendamento_id: agendamentoId,
              usuario_id: user.id,
              acao: 'editado',
              dados_anteriores: { dias_semana: agendamentoOriginal.dias_semana },
              dados_novos: { dias_semana: diasCustom }
            })

            const diasNomes = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
            const diasTexto = diasCustom.map((d: number) => diasNomes[d-1]).join(', ')
            await sendPrivateMessage(senderJid, `✅ *Dias atualizados para: ${diasTexto}!*\n\n📋 Digite */listar* para ver seus agendamentos`)
            await supabaseAdmin.from('sessoes_comando').delete().eq('telefone', sender)
            nextState = ''
          }
          break
      }
    }

    // Atualizar sessão se o estado mudou OU se os dados temporários mudaram
    if (nextState && nextState !== session.estado) {
      await supabaseAdmin
        .from('sessoes_comando')
        .update({ estado: nextState, dados_temporarios: updatedSessionData })
        .eq('telefone', sender)
    } else if (nextState) {
      // Mesmo estado, mas dados podem ter mudado (ex: adicionar destinatário)
      await supabaseAdmin
        .from('sessoes_comando')
        .update({ dados_temporarios: updatedSessionData })
        .eq('telefone', sender)
    }

    return new Response('ok', { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) {
    console.error('Erro geral no webhook:', error)
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
