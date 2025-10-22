import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.0'
import { corsHeaders } from '../_shared/cors.ts'

// Carregar variáveis de ambiente
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL')!
const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY')!
const BOT_INSTANCE_NAME = Deno.env.get('BOT_INSTANCE_NAME')! || 'main'

// Cliente Supabase com permissões de administrador
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// Função para enviar mensagem privada
async function sendPrivateMessage(recipient: string, message: string) {
  const url = `${EVOLUTION_API_URL}/message/sendText/${BOT_INSTANCE_NAME}`
  try {
    await fetch(url, {
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
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error)
  }
}

// Lógica principal do webhook
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    console.log('Webhook recebido:', JSON.stringify(body, null, 2))

    // Ignorar mensagens que não são de texto ou de grupos
    if (body.event !== 'messages.upsert' || !body.data.key.remoteJid) {
      return new Response('Webhook ignorado: não é uma mensagem de texto.', { status: 200 })
    }

    const sender = body.data.key.fromMe ? body.data.key.remoteJid.split('@')[0] : body.data.key.participant?.split('@')[0] || body.data.key.remoteJid.split('@')[0]
    const senderJid = `${sender}@s.whatsapp.net`
    const messageText = body.data.message?.conversation || body.data.message?.extendedTextMessage?.text || ''
    const isGroup = body.data.key.remoteJid.endsWith('@g.us')

    // Ignorar mensagens do próprio bot
    if (body.data.key.fromMe) {
      return new Response('Mensagem do próprio bot ignorada.', { status: 200 });
    }

    // 1. Verificar autorização do usuário
    const { data: user, error: userError } = await supabaseAdmin
      .from('usuarios_autorizados')
      .select('id, nome')
      .eq('telefone', sender)
      .eq('ativo', true)
      .single()

    if (userError || !user) {
      console.log(`Usuário não autorizado: ${sender}`)
      return new Response('Usuário não autorizado', { status: 403 })
    }

    // 2. Processar comando /menu no grupo (e apagar sessão anterior)
    if (isGroup && messageText.trim().toLowerCase() === '/menu') {
      await supabaseAdmin.from('sessoes_comando').delete().eq('telefone', sender)

      const menu = `📋 *Sistema de Agendamentos*

Olá, ${user.nome}! Escolha uma opção:

1️⃣ /novo - Criar agendamento
2️⃣ /listar - Ver meus agendamentos
3️⃣ /ajuda - Ver comandos disponíveis

Para começar, responda esta mensagem com o comando desejado.`

      await sendPrivateMessage(senderJid, menu)
      return new Response('Menu enviado', { status: 200 })
    }

    if (isGroup) {
      return new Response('Mensagem em grupo ignorada.', { status: 200 })
    }
    
    // 3. Gerenciador de estado da conversa (máquina de estados)
    const { data: session } = await supabaseAdmin
      .from('sessoes_comando')
      .select('*')
      .eq('telefone', sender)
      .single()

    if (messageText.trim().toLowerCase() === '/novo' && !session) {
      await supabaseAdmin.from('sessoes_comando').upsert({
        telefone: sender,
        estado: 'aguardando_mensagem',
        dados_temporarios: { usuario_id: user.id },
      })
      await sendPrivateMessage(senderJid, '✅ Ótimo! Qual é a *mensagem* que você deseja agendar?')
      return new Response('Sessão iniciada', { status: 200 })
    }

    if (messageText.trim().toLowerCase() === '/cancelar') {
        await supabaseAdmin.from('sessoes_comando').delete().eq('telefone', sender);
        await sendPrivateMessage(senderJid, '❌ Operação cancelada com sucesso!');
        return new Response('Sessão cancelada', { status: 200 });
    }

    if (!session) {
      return new Response('Nenhuma sessão ativa', { status: 200 })
    }

    let updatedSessionData = { ...session.dados_temporarios }
    let nextState = session.estado

    switch (session.estado) {
      case 'aguardando_mensagem':
        updatedSessionData.mensagem = messageText
        nextState = 'aguardando_destinatario'
        await sendPrivateMessage(
          senderJid,
          '✅ Entendido. Agora, envie o *ID do destinatário*.\n\nPode ser o ID de um grupo (ex: 1234567890@g.us) ou de um contato (ex: 5531999999999@s.whatsapp.net).'
        )
        break

      case 'aguardando_destinatario':
        updatedSessionData.destinatario_id = messageText
        updatedSessionData.destinatario_tipo = messageText.includes('@g.us') ? 'grupo' : 'contato'
        nextState = 'aguardando_horario'
        await sendPrivateMessage(senderJid, '⏰ Qual o *horário* para o envio? (formato HH:MM, ex: 09:30)')
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

      case 'aguardando_dias':
        const dias = messageText.split(',').map((d: string) => parseInt(d.trim())).filter((d: number) => !isNaN(d) && d >= 1 && d <= 7)
        if (dias.length === 0) {
            await sendPrivateMessage(senderJid, '❌ Dias inválidos. Por favor, envie números de 1 a 7, separados por vírgula.');
            nextState = 'aguardando_dias';
        } else {
            updatedSessionData.dias_semana = dias;
            const confirmacaoMsg = `✅ *Confirmar agendamento?*\n\n📝 *Mensagem:* ${updatedSessionData.mensagem}\n👤 *Para:* ${updatedSessionData.destinatario_id}\n⏰ *Horário:* ${updatedSessionData.hora_envio}\n📅 *Dias:* ${dias.join(', ')}\n\nResponda com *sim* para confirmar ou *não* para cancelar.`
            nextState = 'aguardando_confirmacao'
            await sendPrivateMessage(senderJid, confirmacaoMsg)
        }
        break

      case 'aguardando_confirmacao':
        if (messageText.trim().toLowerCase() === 'sim') {
            await supabaseAdmin.from('agendamentos').insert({
                usuario_id: updatedSessionData.usuario_id,
                mensagem: updatedSessionData.mensagem,
                destinatario_id: updatedSessionData.destinatario_id,
                destinatario_tipo: updatedSessionData.destinatario_tipo,
                hora_envio: updatedSessionData.hora_envio,
                dias_semana: updatedSessionData.dias_semana,
                ativo: true,
            });
            await supabaseAdmin.from('sessoes_comando').delete().eq('telefone', sender);
            await sendPrivateMessage(senderJid, '✅ *Agendamento criado com sucesso!*');
        } else {
            await supabaseAdmin.from('sessoes_comando').delete().eq('telefone', sender);
            await sendPrivateMessage(senderJid, '❌ Agendamento cancelado.');
        }
        nextState = '' // Finaliza a sessão
        break;
    }

    if (nextState && nextState !== session.estado) {
      await supabaseAdmin
        .from('sessoes_comando')
        .update({ estado: nextState, dados_temporarios: updatedSessionData })
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
