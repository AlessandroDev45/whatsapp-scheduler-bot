// @deno-types="https://deno.land/std@0.177.0/http/server.ts"
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
// @deno-types="https://esm.sh/@supabase/supabase-js@2.42.0"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.0'
import { corsHeaders } from '../_shared/cors.ts'

// Deploy version: 2026-04-01T23:30 - LID fix
// Carregar variáveis de ambiente
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const BOT_API_URL = Deno.env.get('BOT_API_URL') || 'https://whatsapp-bot-ale-2025.fly.dev'
const BOT_INSTANCE_NAME = Deno.env.get('BOT_INSTANCE_NAME') || 'whatsapp_bot'
const MISTRAL_API_KEY = Deno.env.get('MISTRAL_API_KEY')
const MISTRAL_MODEL = Deno.env.get('MISTRAL_MODEL') || 'devstral-small-2505'
// MELHORIA: Mover número do admin para variáveis de ambiente
const ADMIN_NUMBER = Deno.env.get('ADMIN_NUMBER')

// Validar variáveis de ambiente obrigatórias
// CORREÇÃO: Usar console.error em vez de throw para não derrubar a função inteira.
// Um throw a nível de módulo causa HTTP 500 em TODOS os requests sem nenhum log útil.
if (!SUPABASE_URL) console.error('❌ [CONFIG] SUPABASE_URL não configurada')
if (!SUPABASE_SERVICE_ROLE_KEY) console.error('❌ [CONFIG] SUPABASE_SERVICE_ROLE_KEY não configurada')
if (!BOT_API_URL) console.error('❌ [CONFIG] BOT_API_URL não configurada')
if (!MISTRAL_API_KEY) console.error('❌ [CONFIG] MISTRAL_API_KEY não configurada')
if (!ADMIN_NUMBER) console.error('❌ [CONFIG] ADMIN_NUMBER não configurada')

// Cliente Supabase com permissões de administrador
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// ========================================
// CONSTANTES DE INTERFACE
// ========================================

const BOTOES_HORARIO = [
  { id: '08:00', text: '🌅 Manhã (8h)' },
  { id: '14:00', text: '🌞 Tarde (14h)' },
  { id: '20:00', text: '🌙 Noite (20h)' }
]

const BOTOES_DIAS = [
  { id: 'dias_uteis', text: '🏢 Seg-Sex' },
  { id: 'todos_dias', text: '📆 Todos os dias' },
  { id: 'custom_dias', text: '✏️ Personalizar' }
]

const BOTOES_TERMINO = [
  { id: 'termino_nunca', text: '♾️ Nunca (indeterminado)' },
  { id: 'termino_30dias', text: '📅 Daqui a 30 dias' },
  { id: 'termino_custom', text: '✏️ Escolher data' }
]

const MENSAGEM_ESCOLHA_TERMINO = '📆 *Quando o agendamento deve terminar?*\n\nEscolha uma opção:'

// ========================================
// FUNÇÕES HELPER
// ========================================

// Função para obter saudação baseada no horário
function getSaudacao(): string {
  const hora = new Date().getHours()
  if (hora >= 6 && hora < 12) return 'Bom dia'
  if (hora >= 12 && hora < 18) return 'Boa tarde'
  return 'Boa noite'
}

// Validar parâmetros de comando
function validarParametrosComando(messageText: string, minParams: number = 2): string[] | null {
  const parts = messageText.trim().split(' ')
  if (parts.length < minParams) {
    return null
  }
  return parts
}

// Validar horário no formato HH:MM
function validarHorario(horario: string): boolean {
  if (!/^\d{2}:\d{2}$/.test(horario)) {
    return false
  }
  const [hora, minuto] = horario.split(':').map(Number)
  return hora >= 0 && hora <= 23 && minuto >= 0 && minuto <= 59
}

// Verificar se usuário é admin
function verificarPermissaoAdmin(telefone: string): boolean {
  // Extrair apenas o número do JID (remover @s.whatsapp.net ou @g.us)
  const numeroLimpo = telefone.split('@')[0]
  console.log(`🔍 [verificarPermissaoAdmin] Input: "${telefone}"`)
  console.log(`🔍 [verificarPermissaoAdmin] Limpo: "${numeroLimpo}"`)
  console.log(`🔍 [verificarPermissaoAdmin] ADMIN_NUMBER: "${ADMIN_NUMBER}"`)
  console.log(`🔍 [verificarPermissaoAdmin] Match: ${numeroLimpo === ADMIN_NUMBER}`)
  return numeroLimpo === ADMIN_NUMBER
}

// Limpar sessão do usuário
async function limparSessao(telefone: string) {
  try {
    const { error } = await supabaseAdmin.from('sessoes_comando').delete().eq('telefone', telefone)
    if (error) {
      console.error('❌ [limparSessao] Erro ao limpar sessão:', error)
    }
  } catch (err) {
    console.error('❌ [limparSessao] Exceção ao limpar sessão:', err)
  }
}

// ========================================
// FUNÇÕES DE SEGURANÇA (CORREÇÃO CRÍTICA)
// ========================================

// Sanitizar input do usuário (previne injeção e limita tamanho)
function sanitizeInput(text: string): string {
  if (!text) return ''
  return text.trim().substring(0, 5000) // limite de 5000 caracteres
}

// Validar número de telefone
function validarNumeroTelefone(numero: string): boolean {
  const numeroLimpo = numero.replace(/\D/g, '')
  return /^\d{10,15}$/.test(numeroLimpo)
}

// Validar JID de grupo
function validarJidGrupo(jid: string): boolean {
  return /^\d+@g\.us$/.test(jid.trim())
}

// Rate limiting: verificar se usuário excedeu limite de mensagens
async function verificarRateLimit(sender: string): Promise<boolean> {
  const umMinutoAtras = new Date(Date.now() - 60000).toISOString()

  const { count, error } = await supabaseAdmin
    .from('mensagens_processadas')
    .select('id', { count: 'exact', head: true })
    .eq('sender', sender)
    .gte('processado_em', umMinutoAtras)

  if (error) {
    console.error('❌ [RATE_LIMIT] Erro ao verificar:', error)
    return false // fail-safe: permitir em caso de erro
  }

  const limite = 20 // 20 mensagens por minuto
  if (count && count > limite) {
    console.log(`⚠️ [RATE_LIMIT] Usuário ${sender} excedeu limite: ${count}/${limite}`)
    return true // excedeu limite
  }

  return false // dentro do limite
}

// Middleware para comandos globais (/cancelar, /voltar)
async function handleGlobalCommands(
  messageText: string,
  sender: string,
  senderJid: string
): Promise<boolean> {
  const textoLimpo = messageText.trim().toLowerCase()

  if (textoLimpo === '/cancelar') {
    await limparSessao(sender)
    await sendPrivateMessage(senderJid, '❌ *Operação cancelada!*\n\nDigite */novo* para começar novamente.')
    return true // comando processado
  }

  return false // não é comando global
}

// Verificar e inserir mensagem processada (previne race condition)
async function registrarMensagemProcessada(
  messageId: string,
  sender: string
): Promise<{ isDuplicate: boolean; error?: unknown }> {
  try {
    // Tentar inserir com constraint UNIQUE (previne race condition no banco)
    const { error } = await supabaseAdmin
      .from('mensagens_processadas')
      .insert({
        message_id: messageId,
        sender: sender,
        expira_em: new Date(Date.now() + 5 * 60 * 1000).toISOString()
      })

    if (error) {
      // Se erro for de constraint UNIQUE, é duplicata
      if (error.code === '23505') {
        return { isDuplicate: true }
      }
      // Outro erro
      return { isDuplicate: false, error }
    }

    return { isDuplicate: false }
  } catch (err) {
    return { isDuplicate: false, error: err }
  }
}

// Calcular próximo envio baseado em hora e dias da semana (horário de Brasília UTC-3)
function calcularProximoEnvio(horaEnvio: string, diasSemana: number[]): string {
  // Obter hora atual em UTC
  const agoraUTC = new Date()

  // Converter UTC para horário de Brasília (UTC-3)
  // Brasília = UTC - 3 horas
  const offsetBrasilia = -3 * 60 // -3 horas em minutos
  const agoraBrasilia = new Date(agoraUTC.getTime() + offsetBrasilia * 60 * 1000)

  const [hora, minuto] = horaEnvio.split(':').map(Number)

  // Se dias_semana está vazio ou null, enviar todos os dias
  const diasValidos = diasSemana && diasSemana.length > 0 ? diasSemana : [1, 2, 3, 4, 5, 6, 7]

  // Criar data no horário de Brasília
  const hoje = new Date(agoraBrasilia)
  hoje.setHours(hora, minuto, 0, 0)

  // Dia da semana atual (1=Seg, 7=Dom)
  const diaSemanaAtual = agoraBrasilia.getDay() === 0 ? 7 : agoraBrasilia.getDay()

  // Se hoje está nos dias válidos E ainda não passou a hora
  if (diasValidos.includes(diaSemanaAtual) && agoraBrasilia < hoje) {
    // Converter de volta para UTC antes de salvar
    const hojeUTC = new Date(hoje.getTime() - offsetBrasilia * 60 * 1000)
    return hojeUTC.toISOString()
  }

  // Procurar próximo dia válido (máximo 7 dias)
  for (let i = 1; i <= 7; i++) {
    const proximaData = new Date(agoraBrasilia)
    proximaData.setDate(proximaData.getDate() + i)
    proximaData.setHours(hora, minuto, 0, 0)

    const diaSemana = proximaData.getDay() === 0 ? 7 : proximaData.getDay()

    if (diasValidos.includes(diaSemana)) {
      // Converter de volta para UTC antes de salvar
      const proximaDataUTC = new Date(proximaData.getTime() - offsetBrasilia * 60 * 1000)
      return proximaDataUTC.toISOString()
    }
  }

  // Fallback: amanhã no mesmo horário
  const amanha = new Date(agoraBrasilia)
  amanha.setDate(amanha.getDate() + 1)
  amanha.setHours(hora, minuto, 0, 0)
  // Converter de volta para UTC antes de salvar
  const amanhaUTC = new Date(amanha.getTime() - offsetBrasilia * 60 * 1000)
  return amanhaUTC.toISOString()
}

// Verificar se usuário tem permissão para modificar agendamento
async function verificarPermissaoAgendamento(
  agendamentoId: string,
  userId: string,
  isAdmin: boolean,
  senderJid: string
): Promise<boolean> {
  const { data: agendamento } = await supabaseAdmin
    .from('agendamentos')
    .select('usuario_id')
    .eq('id', agendamentoId)
    .single()

  if (!agendamento) {
    await sendPrivateMessage(senderJid, '❌ Agendamento não encontrado.')
    return false
  }

  const isDono = agendamento.usuario_id === userId

  if (!isAdmin && !isDono) {
    await sendPrivateMessage(senderJid, `🔒 *Acesso negado!*

Você não tem permissão para modificar este agendamento.

Apenas o criador ou um administrador pode fazer alterações.`)
    return false
  }

  return true
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

// Função para enviar mensagem de texto (COM LÓGICA DE "AQUECIMENTO" PARA GRUPOS)
async function sendText(recipient: string, message: string) {
  const url = `${BOT_API_URL}/api/send-message`;
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📤 [SEND_TEXT] Enviando mensagem via WhatsApp Bot`);
  console.log(`👤 [SEND_TEXT] Destinatário: ${recipient}`);
  console.log(`📝 [SEND_TEXT] Mensagem (${message.length} chars): ${message.substring(0, 150)}${message.length > 150 ? '...' : ''}`);
  console.log(`🔗 [SEND_TEXT] URL: ${url}`);

  try {
    const payload = {
      jid: recipient,
      text: message,
    };
    console.log(`📦 [SEND_TEXT] Payload:`, JSON.stringify(payload, null, 2));

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    console.log(`📡 [SEND_TEXT] Status da resposta: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ [SEND_TEXT] Erro ao enviar mensagem (${response.status}):`, errorText);
    } else {
      const responseData = await response.json();
      console.log(`✅ [SEND_TEXT] Mensagem enviada com sucesso!`);
      console.log(`📊 [SEND_TEXT] Resposta:`, JSON.stringify(responseData, null, 2));
    }
  } catch (error) {
    console.error(`❌ [SEND_TEXT] Exceção ao enviar mensagem:`, error);
  }
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
}

// Alias para compatibilidade
const sendPrivateMessage = sendText

// Função helper para buscar agendamento por número ou ID
async function buscarAgendamentoPorNumeroOuId(inputId: string, userId: string, isAdmin: boolean = false): Promise<string | null> {
  let agendamentoId = inputId

  // Se for um número (1, 2, 3...), buscar pela posição na lista
  if (/^\d+$/.test(inputId)) {
    const posicao = parseInt(inputId) - 1 // Converter para índice (1 -> 0)

    let query = supabaseAdmin
      .from('agendamentos')
      .select('id')
      .order('criado_em', { ascending: false })

    // Se NÃO for admin, filtrar apenas os próprios agendamentos
    if (!isAdmin) {
      query = query.eq('usuario_id', userId)
    }

    const { data: agendamentos } = await query

    if (!agendamentos || posicao < 0 || posicao >= agendamentos.length) {
      return null
    }

    agendamentoId = agendamentos[posicao].id
  }

  return agendamentoId
}

// Função para buscar nome de grupo/contato pelo JID
async function buscarNomeDestinatario(jid: string): Promise<string> {
  try {
    // Se for grupo, buscar na tabela grupos_cadastrados
    if (jid.endsWith('@g.us')) {
      const { data: grupo } = await supabaseAdmin
        .from('grupos_cadastrados')
        .select('nome')
        .eq('group_id', jid)
        .single()

      if (grupo?.nome) {
        return grupo.nome
      }

      // Se não encontrou no banco, tentar buscar do Bot
      try {
        const response = await fetch(`${BOT_API_URL}/api/group-metadata?jid=${encodeURIComponent(jid)}`)
        if (response.ok) {
          const data = await response.json()
          return data.subject || jid
        }
      } catch (e) {
        console.log('Erro ao buscar metadata do grupo:', e)
      }
    }

    // Se for contato individual, retornar apenas o número formatado
    const numero = jid.split('@')[0]
    return `📱 ${numero}`
  } catch (error) {
    console.error('Erro ao buscar nome do destinatário:', error)
    return jid
  }
}

// Função para enviar opções como texto numerado (compatível com todos os dispositivos)
async function sendButtons(recipient: string, message: string, buttons: Array<{id: string, text: string}>) {
  let optionsText = message + '\n\n'
  buttons.forEach((btn, index) => {
    optionsText += `${index + 1}️⃣ ${btn.text}\n`
  })
  optionsText += '\n💬 *Digite o número da opção desejada*'

  await sendText(recipient, optionsText)
}

// Função para enviar BOTÕES INTERATIVOS (sempre usa texto numerado com Baileys)
async function sendInteractiveButtons(recipient: string, message: string, buttons: Array<{id: string, text: string}>) {
  console.log('🔘 Enviando botões como texto numerado (Bot)...')
  await sendButtons(recipient, message, buttons)
}

// Lógica principal do webhook
serve(async (req: Request) => {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🌐 [WEBHOOK] Nova requisição recebida')
  console.log(`🔧 [WEBHOOK] Método: ${req.method}`)

  if (req.method === 'OPTIONS') {
    console.log('✅ [WEBHOOK] Requisição OPTIONS - retornando CORS')
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Log de headers para debug
    console.log('📋 [WEBHOOK] Headers recebidos:', Object.fromEntries(req.headers.entries()))

    const body = await req.json()
    console.log('📦 [WEBHOOK] Body recebido:', JSON.stringify(body, null, 2))

    // Validar estrutura básica do webhook
    console.log('🔍 [WEBHOOK] Validando estrutura do webhook...')
    console.log(`   - body existe: ${!!body}`)
    console.log(`   - body.event: ${body?.event}`)
    console.log(`   - body.data existe: ${!!body?.data}`)
    console.log(`   - body.data.key existe: ${!!body?.data?.key}`)

    if (!body || !body.event || !body.data || !body.data.key) {
      console.error('❌ [WEBHOOK] Estrutura inválida!')
      return new Response('Webhook inválido', { status: 400 })
    }

    console.log(`🔍 [WEBHOOK] Validando tipo de evento...`)
    console.log(`   - body.event: ${body.event}`)
    console.log(`   - body.data.key.remoteJid: ${body.data.key.remoteJid}`)

    // Ignorar mensagens que não são de texto ou de grupos
    if (body.event !== 'messages.upsert' || !body.data.key.remoteJid) {
      console.log('⏭️ [WEBHOOK] Evento ignorado (não é messages.upsert ou sem remoteJid)')
      return new Response('Webhook ignorado: não é uma mensagem de texto.', { status: 200 })
    }

    console.log('✅ [WEBHOOK] Validações iniciais passaram!')

    // Extrair informações da mensagem
    console.log('📝 [WEBHOOK] Extraindo texto da mensagem...')
    let messageText = (
      body.data.message?.conversation ||
      body.data.message?.extendedTextMessage?.text ||
      body.data.message?.buttonResponseMessage?.selectedButtonId ||
      body.data.message?.listResponseMessage?.singleSelectReply?.selectedRowId ||
      ''
    ).trim()

    // CORREÇÃO CRÍTICA: Sanitizar input do usuário
    messageText = sanitizeInput(messageText)
    console.log(`📝 [WEBHOOK] Texto extraído e sanitizado: "${messageText}"`)

    const isGroup = body.data.key.remoteJid.endsWith('@g.us')
    const isChannel = body.data.key.remoteJid.endsWith('@newsletter')
    // NOTA: @lid é o formato LID (Long ID) do WhatsApp para conversas privadas, NÃO é canal
    console.log(`👥 [WEBHOOK] É grupo: ${isGroup}, É canal: ${isChannel}`)

    // Determinar o remetente real
    console.log('👤 [WEBHOOK] Determinando remetente...')
    let sender: string
    let senderJid: string
    if (isGroup || isChannel) {
      // Em grupos/canais, pegar o participant
      const participant = body.data.key.participant || ''
      const remoteJid = body.data.key.remoteJid || ''
      sender = (participant ? participant.split('@')[0] : remoteJid.split('@')[0] || '').trim()
      senderJid = remoteJid // Responder no grupo
      console.log(`   - Participant: ${participant}`)
      console.log(`   - RemoteJid: ${remoteJid}`)
    } else {
      // Em conversas privadas
      const remoteJid = body.data.key.remoteJid || ''
      // WhatsApp agora usa LID (Long ID) em vez do número real.
      // O bot envia o número real em data.senderNumber quando disponível.
      const senderNumber = body.data.senderNumber || ''
      sender = senderNumber || (remoteJid.split('@')[0] || '').trim()
      // Usar remoteJid original (LID) para responder — é o JID que o WhatsApp reconhece
      senderJid = remoteJid
      console.log(`   - RemoteJid: ${remoteJid}`)
      console.log(`   - SenderNumber: ${senderNumber}`)
    }
    console.log(`👤 [WEBHOOK] Sender identificado: ${sender}`)
    console.log(`📱 [WEBHOOK] SenderJid (para resposta): ${senderJid}`)

    // Validar sender
    if (!sender || sender.length === 0) {
      console.error('❌ [WEBHOOK] Remetente inválido ou vazio')
      return new Response('Remetente inválido', { status: 400 })
    }

    // Ignorar mensagens enviadas pela própria API (não pelo usuário)
    // Verificar se é uma mensagem de retorno do bot (fromMe: true)
    console.log(`🔍 [WEBHOOK] Verificando fromMe: ${body.data.key.fromMe}`)
    if (body.data.key.fromMe === true) {
      console.log('⏭️ [WEBHOOK] Mensagem do próprio bot ignorada (fromMe: true)')
      return new Response('Mensagem do próprio bot ignorada.', { status: 200 });
    }

    // ========================================
    // PROTEÇÃO CONTRA LOOPS E DUPLICATAS (CORREÇÃO CRÍTICA)
    // ========================================

    const messageId = body.data.key.id
    console.log(`🔍 [WEBHOOK] Verificando duplicata para messageId: ${messageId}`)

    // CORREÇÃO CRÍTICA: Usar função segura contra race condition
    const { isDuplicate, error: erroDuplicata } = await registrarMensagemProcessada(messageId, sender)

    if (isDuplicate) {
      console.log(`⏭️ [WEBHOOK] Mensagem duplicada ignorada (ID: ${messageId})`)
      return new Response('Mensagem duplicada ignorada.', { status: 200 })
    }

    if (erroDuplicata) {
      console.error('❌ [WEBHOOK] Erro ao registrar mensagem:', erroDuplicata)
      // Continuar mesmo com erro (fail-safe)
    }

    console.log(`✅ [WEBHOOK] Mensagem aceita para processamento (ID: ${messageId})`)

    // ========================================
    // RATE LIMITING (CORREÇÃO CRÍTICA)
    // ========================================

    const excedeuLimite = await verificarRateLimit(sender)
    if (excedeuLimite) {
      console.log(`⚠️ [RATE_LIMIT] Usuário ${sender} bloqueado temporariamente`)
      await sendPrivateMessage(senderJid, '⚠️ *Muitas mensagens em pouco tempo!*\n\nAguarde 1 minuto e tente novamente.')
      return new Response('Rate limit exceeded', { status: 429 })
    }

    // 1. Buscar usuário (ativo ou inativo)
    console.log('🔍 [WEBHOOK] Buscando usuário no banco:', sender)
    let { data: user, error: userError } = await supabaseAdmin
      .from('usuarios_autorizados')
      .select('id, nome, ativo, role')
      .eq('telefone', sender)
      .single()

    console.log('👤 [WEBHOOK] Usuário encontrado:', user)
    console.log('❌ [WEBHOOK] Erro ao buscar usuário:', userError)

    // ========================================
    // COMANDOS ADMINISTRATIVOS (PRIORIDADE MÁXIMA)
    // Processar ANTES de verificar se usuário está ativo
    // ========================================

    // Comando /aprovar - APENAS PARA ADMIN
    if (messageText.trim().toLowerCase().startsWith('/aprovar')) {
      console.log(`🔍 [APROVAR] Verificando permissão de admin para: ${sender}`)
      console.log(`🔍 [APROVAR] ADMIN_NUMBER: ${ADMIN_NUMBER}`)
      const isAdmin = verificarPermissaoAdmin(sender)
      console.log(`🔍 [APROVAR] Resultado: ${isAdmin}`)

      if (!isAdmin) {
        await sendPrivateMessage(senderJid, '❌ Apenas o administrador pode aprovar usuários.')
        return new Response('Não autorizado', { status: 403 })
      }

      const parts = validarParametrosComando(messageText, 2)
      if (!parts) {
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
      if (!verificarPermissaoAdmin(sender)) {
        await sendPrivateMessage(senderJid, '❌ Apenas o administrador pode rejeitar usuários.')
        return new Response('Não autorizado', { status: 403 })
      }

      const parts = validarParametrosComando(messageText, 2)
      if (!parts) {
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

    // 2. Verificar se usuário está ativo ou criar novo usuário
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

    // 3. Processar QUALQUER mensagem no grupo ou canal (oferecer menu)
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

      await limparSessao(sender)

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
┣━ 👥 */cadastrar_grupo*
┃   ↳ _Cadastrar grupo manualmente_
┃
┗━ ❓ */ajuda*
    ↳ _Comandos disponíveis_

━━━━━━━━━━━━━━━━━━━━
💡 _Digite um comando para começar_`

      await sendPrivateMessage(senderJid, menu)
      return new Response('Menu enviado', { status: 200 })
    }

    // ========================================
    // MIDDLEWARE DE COMANDOS GLOBAIS (CORREÇÃO CRÍTICA)
    // ========================================

    // Processar comandos globais (/cancelar) ANTES de qualquer outra lógica
    const comandoGlobalProcessado = await handleGlobalCommands(messageText, sender, senderJid)
    if (comandoGlobalProcessado) {
      console.log('✅ [GLOBAL_CMD] Comando global processado')
      return new Response('Comando global processado', { status: 200 })
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
        comando: 'novo',
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
        await limparSessao(sender);
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
      await limparSessao(sender);

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
┣━ 👥 */cadastrar_grupo*
┃   ↳ _Cadastrar grupo manualmente_
┃
┗━ ❓ */ajuda*
    ↳ _Comandos disponíveis_

━━━━━━━━━━━━━━━━━━━━
💡 _Digite um comando para começar_`

      await sendPrivateMessage(senderJid, menu)
      return new Response('Menu enviado', { status: 200 })
    }

    // Comando /sincronizar_grupos - buscar grupos do WhatsApp e sincronizar
    if (messageText.trim().toLowerCase() === '/sincronizar_grupos') {
      await limparSessao(sender);

      await sendPrivateMessage(senderJid, `🔄 *SINCRONIZANDO GRUPOS...*

⏳ Buscando todos os grupos do WhatsApp...

Aguarde alguns segundos...`)

      try {
        // Buscar grupos do Bot
        const response = await fetch(`${BOT_API_URL}/api/groups`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        })

        if (!response.ok) {
          throw new Error(`Erro ao buscar grupos: ${response.status}`)
        }

        const data = await response.json()
        const groups = data.groups || []

        if (groups.length === 0) {
          await sendPrivateMessage(senderJid, `📭 *Nenhum grupo encontrado!*

Você não está em nenhum grupo no WhatsApp.

Digite */menu* para voltar.`)
          return new Response('Nenhum grupo', { status: 200 })
        }

        // Sincronizar grupos no banco de dados
        let sincronizados = 0
        let erros = 0

        for (const group of groups) {
          try {
            await supabaseAdmin
              .from('grupos_usuario')
              .upsert({
                usuario_id: user.id,
                grupo_jid: group.id,
                grupo_nome: group.subject,
                tipo: 'grupo',
                ativo: true,
                ultima_sincronizacao: new Date().toISOString()
              }, {
                onConflict: 'usuario_id,grupo_jid'
              })
            sincronizados++
          } catch (error) {
            console.error(`❌ Erro ao sincronizar grupo ${group.subject}:`, error)
            erros++
          }
        }

        await sendPrivateMessage(senderJid, `✅ *SINCRONIZAÇÃO CONCLUÍDA!*

📊 *Resultados:*
• Total de grupos: ${groups.length}
• Sincronizados: ${sincronizados}
${erros > 0 ? `• Erros: ${erros}\n` : ''}
━━━━━━━━━━━━━━━━━━━━

🎯 *Grupos sincronizados:*

${groups.slice(0, 10).map((g: any, i: number) => `${i + 1}. 👥 ${g.subject} (${g.size} membros)`).join('\n')}
${groups.length > 10 ? `\n... e mais ${groups.length - 10} grupos` : ''}

━━━━━━━━━━━━━━━━━━━━

💡 Agora você pode usar estes grupos em seus agendamentos!

Digite */novo* para criar um agendamento
Digite */menu* para voltar`)

      } catch (error) {
        console.error('❌ Erro ao sincronizar grupos:', error)
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
        await sendPrivateMessage(senderJid, `❌ *Erro ao sincronizar grupos!*

${errorMessage}

Tente novamente mais tarde ou use */cadastrar_grupo* para cadastrar manually.`)
      }

      return new Response('Sincronização concluída', { status: 200 })
    }

    // Comando /cadastrar_grupo - cadastrar grupo manualmente
    if (messageText.trim().toLowerCase() === '/cadastrar_grupo') {
      await limparSessao(sender);

      const avisoMsg = `⚠️ *CADASTRAR GRUPO MANUALMENTE*

⚠️ *ATENÇÃO - LEIA COM CUIDADO!*

Este comando permite cadastrar um grupo manualmente no sistema. Você precisará fornecer:

1️⃣ *JID do grupo* (ex: 120363318862188145@g.us)
2️⃣ *Nome do grupo* (ex: Grupo da família)

━━━━━━━━━━━━━━━━━━━━

⚠️ *CUIDADOS IMPORTANTES:*

❌ *NÃO digite o JID errado!*
   • Se errar, o sistema tentará enviar para um grupo inexistente
   • Isso causará erros no scheduler

❌ *NÃO invente JIDs!*
   • Use apenas JIDs reais de grupos existentes
   • Copie e cole para evitar erros

✅ *Como obter o JID correto:*
   • Encaminhe uma mensagem do grupo para você mesmo
   • O JID aparece no formato: 120363XXXXXXXXXX@g.us
   • Ou peça ao administrador do sistema

━━━━━━━━━━━━━━━━━━━━

Digite *1* para continuar
Digite */cancelar* para voltar`

      await sendPrivateMessage(senderJid, avisoMsg)

      await supabaseAdmin.from('sessoes_comando').insert({
        telefone: sender,
        comando: 'cadastrar_grupo',
        estado: 'aguardando_confirmacao_cadastro_grupo',
        dados: {}
      })

      return new Response('Aviso enviado', { status: 200 })
    }

    // Comando /ajuda - mostrar ajuda
    if (messageText.trim().toLowerCase() === '/ajuda') {
      await limparSessao(sender);

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

🔄 */sincronizar_grupos*
   Buscar TODOS os grupos do WhatsApp automaticamente
   (Recomendado - sincroniza grupos reais)

👥 */cadastrar_grupo*
   Cadastrar um grupo manualmente
   (Use apenas se a sincronização automática falhar)

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
      await limparSessao(sender);

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

      // Buscar nomes dos destinatários em paralelo
      const nomesPromises = agendamentosPagina.map((ag: any) =>
        ag.destinatario_nome ? Promise.resolve(ag.destinatario_nome) : buscarNomeDestinatario(ag.destinatario_id)
      )
      const nomesDestinatarios = await Promise.all(nomesPromises)

      agendamentosPagina.forEach((ag: any, index: number) => {
        const numero = inicio + index + 1
        const status = ag.ativo ? '✅' : '❌'
        const diasNomes = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
        const diasTexto = ag.dias_semana?.map((d: number) => diasNomes[d-1]).join(', ') || 'N/A'

        // Mostrar primeiras 2 linhas ou 100 caracteres da mensagem
        const mensagemLinhas = ag.mensagem.split('\n')
        let mensagemPreview = ''

        if (mensagemLinhas.length > 2) {
          mensagemPreview = mensagemLinhas.slice(0, 2).join('\n') + '\n...'
        } else if (ag.mensagem.length > 100) {
          mensagemPreview = ag.mensagem.substring(0, 100) + '...'
        } else {
          mensagemPreview = ag.mensagem
        }

        // Mostrar criador apenas para admin
        const criadorInfo = isAdmin && ag.criador
          ? `\n   👤 Criador: ${ag.criador.nome} (${ag.criador.telefone})`
          : ''

        // Usar o nome buscado
        const destinatarioDisplay = nomesDestinatarios[index]
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
      await limparSessao(sender);

      const parts = validarParametrosComando(messageText, 2)
      if (!parts) {
        await sendPrivateMessage(senderJid, '❌ Uso correto: */deletar [número]*\n\nExemplo: */deletar 1* (deleta o primeiro da lista)')
        return new Response('Formato inválido', { status: 400 })
      }

      const isAdmin = user.role === 'admin'
      const inputId = parts[1]
      const agendamentoId = await buscarAgendamentoPorNumeroOuId(inputId, user.id, isAdmin)

      if (!agendamentoId) {
        await sendPrivateMessage(senderJid, `❌ *Agendamento #${inputId} não encontrado!*

⚠️ *Atenção:* A numeração muda após deletar um agendamento!

📋 Digite */listar* para ver a lista atualizada.`)
        return new Response('Agendamento não encontrado', { status: 404 })
      }

      // Verificar permissão
      if (!await verificarPermissaoAgendamento(agendamentoId, user.id, isAdmin, senderJid)) {
        return new Response('Sem permissão', { status: 403 })
      }

      // Buscar agendamento completo para auditoria
      const { data: agendamento } = await supabaseAdmin
        .from('agendamentos')
        .select('*')
        .eq('id', agendamentoId)
        .single()

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

⚠️ *IMPORTANTE:* A numeração dos agendamentos foi atualizada!

📋 Digite */listar* para ver a lista atualizada antes de deletar outro.`)

      return new Response('Agendamento deletado', { status: 200 })
    }

    // Comando /editar - editar agendamento
    if (messageText.trim().toLowerCase().startsWith('/editar')) {
      const parts = validarParametrosComando(messageText, 2)
      if (!parts) {
        await sendPrivateMessage(senderJid, '❌ Uso correto: */editar [número]*\n\nExemplo: */editar 1* (edita o primeiro da lista)')
        return new Response('Formato inválido', { status: 400 })
      }

      const isAdmin = user.role === 'admin'
      const inputId = parts[1]
      const agendamentoId = await buscarAgendamentoPorNumeroOuId(inputId, user.id, isAdmin)

      if (!agendamentoId) {
        await sendPrivateMessage(senderJid, `❌ *Agendamento #${inputId} não encontrado!*

📋 Digite */listar* para ver a lista atualizada.`)
        return new Response('Agendamento não encontrado', { status: 404 })
      }

      // Verificar permissão
      if (!await verificarPermissaoAgendamento(agendamentoId, user.id, isAdmin, senderJid)) {
        return new Response('Sem permissão', { status: 403 })
      }

      // Buscar agendamento completo
      const { data: agendamento } = await supabaseAdmin
        .from('agendamentos')
        .select('*')
        .eq('id', agendamentoId)
        .single()

      // Criar sessão de edição
      await limparSessao(sender)
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

      // Formatar data de término
      const dataTerminoTexto = agendamento.data_termino
        ? new Date(agendamento.data_termino).toLocaleDateString('pt-BR')
        : '♾️ Indeterminado'

      // Status ativo/inativo
      const statusTexto = agendamento.ativo ? '✅ Ativo' : '❌ Inativo'

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

📆 *Término:*
${dataTerminoTexto}

🔔 *Status:*
${statusTexto}

━━━━━━━━━━━━━━━━━━━━

*O que deseja editar?*`

      await sendInteractiveButtons(senderJid, editarMsg, [
        { id: 'editar_mensagem', text: '📝 Mensagem' },
        { id: 'editar_horario', text: '⏰ Horário' },
        { id: 'editar_dias', text: '📅 Dias' },
        { id: 'editar_termino', text: '📆 Data término' },
        { id: 'editar_status', text: agendamento.ativo ? '❌ Desativar' : '✅ Ativar' }
      ])

      return new Response('Modo edição iniciado', { status: 200 })
    }

    // Comando /ativar - ativar agendamento
    if (messageText.trim().toLowerCase().startsWith('/ativar')) {
      await limparSessao(sender);

      const parts = validarParametrosComando(messageText, 2)
      if (!parts) {
        await sendPrivateMessage(senderJid, '❌ Uso correto: */ativar [número]*\n\nExemplo: */ativar 1*')
        return new Response('Formato inválido', { status: 400 })
      }

      const isAdmin = user.role === 'admin'
      const inputId = parts[1]
      const agendamentoId = await buscarAgendamentoPorNumeroOuId(inputId, user.id, isAdmin)

      if (!agendamentoId) {
        await sendPrivateMessage(senderJid, `❌ *Agendamento #${inputId} não encontrado!*

📋 Digite */listar* para ver a lista atualizada.`)
        return new Response('Agendamento não encontrado', { status: 404 })
      }

      // Verificar permissão
      if (!await verificarPermissaoAgendamento(agendamentoId, user.id, isAdmin, senderJid)) {
        return new Response('Sem permissão', { status: 403 })
      }

      // Buscar agendamento completo para auditoria
      const { data: agendamento } = await supabaseAdmin
        .from('agendamentos')
        .select('*')
        .eq('id', agendamentoId)
        .single()

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
      await limparSessao(sender);

      const parts = validarParametrosComando(messageText, 2)
      if (!parts) {
        await sendPrivateMessage(senderJid, '❌ Uso correto: */desativar [número]*\n\nExemplo: */desativar 1*')
        return new Response('Formato inválido', { status: 400 })
      }

      const isAdmin = user.role === 'admin'
      const inputId = parts[1]
      const agendamentoId = await buscarAgendamentoPorNumeroOuId(inputId, user.id, isAdmin)

      if (!agendamentoId) {
        await sendPrivateMessage(senderJid, `❌ *Agendamento #${inputId} não encontrado!*

📋 Digite */listar* para ver a lista atualizada.`)
        return new Response('Agendamento não encontrado', { status: 404 })
      }

      // Verificar permissão
      if (!await verificarPermissaoAgendamento(agendamentoId, user.id, isAdmin, senderJid)) {
        return new Response('Sem permissão', { status: 403 })
      }

      // Buscar agendamento completo para auditoria
      const { data: agendamento } = await supabaseAdmin
        .from('agendamentos')
        .select('*')
        .eq('id', agendamentoId)
        .single()

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
      await limparSessao(sender);

      const parts = validarParametrosComando(messageText, 2)
      if (!parts) {
        await sendPrivateMessage(senderJid, '❌ Uso correto: */historico [número]*\n\nExemplo: */historico 1*')
        return new Response('Formato inválido', { status: 400 })
      }

      const isAdmin = user.role === 'admin'
      const inputId = parts[1]
      const agendamentoId = await buscarAgendamentoPorNumeroOuId(inputId, user.id, isAdmin)

      if (!agendamentoId) {
        await sendPrivateMessage(senderJid, `❌ Agendamento *${inputId}* não encontrado.\n\n📋 Digite */listar* para ver seus agendamentos.`)
        return new Response('Agendamento não encontrado', { status: 404 })
      }

      // Verificar permissão
      if (!await verificarPermissaoAgendamento(agendamentoId, user.id, isAdmin, senderJid)) {
        return new Response('Sem permissão', { status: 403 })
      }

      // Buscar agendamento para exibir informações
      const { data: agendamento } = await supabaseAdmin
        .from('agendamentos')
        .select('*')
        .eq('id', agendamentoId)
        .single()

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
    // BUSCA DE DESTINATÁRIOS - ESTRATÉGIA HÍBRIDA (DB + API FALLBACK)
    // ========================================

    // FUNÇÃO 1: Busca rápida apenas no banco de dados local.
    async function buscarDestinatariosNoBanco(filtro: string, usuarioId: string): Promise<Array<{id: string, nome: string, tipo: string}>> {
      try {
        console.log(`⚡ [BUSCA_DB] Buscando no banco de dados com filtro: "${filtro}"`);

        // 0️⃣ VERIFICAR SE É UM NÚMERO DE TELEFONE DIRETO
        const numeroLimpo = filtro.replace(/\D/g, '')
        const isNumeroTelefone = numeroLimpo.length >= 10 && numeroLimpo.length <= 15

        if (isNumeroTelefone) {
          console.log(`📱 [BUSCA_DB] Detectado número de telefone: ${numeroLimpo}`)
          const jid = `${numeroLimpo}@s.whatsapp.net`
          return [{
            id: jid,
            nome: `📱 ${numeroLimpo}`,
            tipo: 'contato'
          }]
        }

        const { data, error } = await supabaseAdmin
          .from('grupos_usuario')
          .select('grupo_jid, grupo_nome, tipo')
          .eq('usuario_id', usuarioId)
          .eq('ativo', true)
          .ilike('grupo_nome', `%${filtro}%`)
          .order('grupo_nome', { ascending: true })
          .limit(10);

        if (error) {
          console.error('❌ [BUSCA_DB] Erro:', error);
          return [];
        }

        const resultados = data?.map((g: any) => ({
            id: g.grupo_jid,
            nome: g.tipo === 'grupo' ? `👥 ${g.grupo_nome}` : `📱 ${g.grupo_nome}`,
            tipo: g.tipo || 'desconhecido'
        })) || [];

        console.log(`✅ [BUSCA_DB] Encontrados ${resultados.length} resultados.`);
        return resultados;
      } catch (error) {
        console.error('❌ [BUSCA_DB] Erro geral:', error);
        return [];
      }
    }

    // FUNÇÃO 2: Busca principal (apenas no banco de dados - Bot não tem API de busca)
    async function buscarDestinatariosPorNome(filtro: string, usuarioId: string): Promise<Array<{id: string, nome: string, tipo: string}>> {
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`🔍 [BUSCA] Buscando por "${filtro}" no banco de dados`);

      const resultados = await buscarDestinatariosNoBanco(filtro, usuarioId);

      console.log(`\n📋 [BUSCA] RESULTADOS FINAIS PARA "${filtro}":`);
      console.log(`   Total retornado: ${resultados.length}`);
      resultados.forEach((r, i) => console.log(`   ${i + 1}. ${r.nome}`));
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

      return resultados;
    }

    // ========================================
    // PROCESSAR /cancelar GLOBALMENTE (REMOVE 20+ DUPLICATAS)
    // ========================================
    if (messageText.trim().toLowerCase() === '/cancelar') {
      await sendPrivateMessage(senderJid, '❌ *Agendamento cancelado!*\n\nDigite */novo* para começar novamente.')
      await limparSessao(sender)
      return new Response('Agendamento cancelado', { status: 200 })
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
          await limparSessao(sender)

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

      // ========== CADASTRAR GRUPO ==========
      case 'aguardando_confirmacao_cadastro_grupo':
        if (messageText === '1') {
          nextState = 'aguardando_jid_grupo'
          await sendPrivateMessage(senderJid, `📝 *Digite o JID do grupo*

⚠️ *ATENÇÃO:* Cole o JID completo!

📋 *Formato correto:*
120363318862188145@g.us

❌ *NÃO digite:*
• Apenas números
• Sem o @g.us
• JIDs inventados

💡 *Como obter o JID:*
1. Encaminhe uma mensagem do grupo para você
2. Copie o JID que aparece
3. Cole aqui

⚡ _Digite /cancelar para sair_`)
        } else {
          await limparSessao(sender)
          await sendPrivateMessage(senderJid, '❌ Operação cancelada.')
          nextState = ''
        }
        break

      case 'aguardando_jid_grupo':
        if (messageText === '/cancelar') {
          await limparSessao(sender)
          await sendPrivateMessage(senderJid, '❌ Operação cancelada.')
          nextState = ''
          break
        }

        // CORREÇÃO CRÍTICA: Usar função de validação
        if (!validarJidGrupo(messageText)) {
          await sendPrivateMessage(senderJid, `❌ *JID inválido!*

O formato correto é: *120363318862188145@g.us*

Você digitou: ${messageText}

⚠️ *Verifique:*
• Tem números antes do @?
• Termina com @g.us?
• Não tem espaços?

💡 Tente novamente ou digite */cancelar*`)
          nextState = 'aguardando_jid_grupo'
          break
        }

        updatedSessionData.grupo_jid = messageText.trim()
        nextState = 'aguardando_nome_grupo'
        await sendPrivateMessage(senderJid, `✅ *JID salvo!*

${messageText}

━━━━━━━━━━━━━━━━━━━━

📝 *Agora digite o NOME do grupo*

💡 *Exemplos:*
• Grupo da família
• Trabalho - Equipe
• Amigos da escola

⚠️ *Digite exatamente como quer que apareça no sistema!*

⚡ _Digite /voltar para mudar o JID_
⚡ _Digite /cancelar para sair_`)
        break

      case 'aguardando_nome_grupo':
        if (messageText === '/cancelar') {
          await limparSessao(sender)
          await sendPrivateMessage(senderJid, '❌ Operação cancelada.')
          nextState = ''
          break
        }

        if (messageText === '/voltar') {
          nextState = 'aguardando_jid_grupo'
          await sendPrivateMessage(senderJid, `📝 *Digite o JID do grupo novamente*

⚡ _Digite /cancelar para sair_`)
          break
        }

        updatedSessionData.grupo_nome = messageText.trim()
        nextState = 'confirmando_cadastro_grupo'

        await sendPrivateMessage(senderJid, `📋 *CONFIRME OS DADOS:*

👥 *Nome:* ${updatedSessionData.grupo_nome}
🆔 *JID:* ${updatedSessionData.grupo_jid}

━━━━━━━━━━━━━━━━━━━━

✅ Digite *1* para CONFIRMAR
❌ Digite *2* para CANCELAR

⚡ _Digite /voltar para mudar o nome_`)
        break

      case 'confirmando_cadastro_grupo':
        if (messageText === '/cancelar' || messageText === '2') {
          await limparSessao(sender)
          await sendPrivateMessage(senderJid, '❌ Operação cancelada.')
          nextState = ''
          break
        }

        if (messageText === '/voltar') {
          nextState = 'aguardando_nome_grupo'
          await sendPrivateMessage(senderJid, `📝 *Digite o NOME do grupo novamente*

⚡ _Digite /cancelar para sair_`)
          break
        }

        if (messageText === '1') {
          // Salvar no banco
          const { error: insertError } = await supabaseAdmin
            .from('grupos_usuario')
            .insert({
              usuario_id: user.id,
              grupo_jid: updatedSessionData.grupo_jid,
              grupo_nome: updatedSessionData.grupo_nome,
              tipo: 'grupo',
              ativo: true
            })

          if (insertError) {
            await sendPrivateMessage(senderJid, `❌ *Erro ao cadastrar grupo!*

${insertError.message}

Digite */cadastrar_grupo* para tentar novamente.`)
          } else {
            await sendPrivateMessage(senderJid, `✅ *GRUPO CADASTRADO COM SUCESSO!*

👥 *${updatedSessionData.grupo_nome}*
🆔 ${updatedSessionData.grupo_jid}

━━━━━━━━━━━━━━━━━━━━

Agora você pode usar este grupo em seus agendamentos!

📋 Digite */novo* para criar um agendamento
📱 Digite */menu* para voltar ao menu`)
          }

          await limparSessao(sender)
          nextState = ''
        } else {
          await sendPrivateMessage(senderJid, `❌ Opção inválida!

Digite *1* para confirmar ou *2* para cancelar`)
          nextState = 'confirmando_cadastro_grupo'
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

          // Perguntar sobre randomização
          nextState = 'perguntando_randomizar'
          await sendInteractiveButtons(senderJid,
            `✅ *Mensagem salva!*\n\n` +
            `"${updatedSessionData.mensagem}"\n\n` +
            `━━━━━━━━━━━━━━━━━━━━\n\n` +
            `🎲 *Quer RANDOMIZAR esta mensagem?*\n\n` +
            `A IA criará variações diferentes mantendo o mesmo sentido.\n` +
            `Isso torna suas mensagens mais naturais e evita parecer robô!\n\n` +
            `⚠️ *AVISO:* As variações são geradas por IA. Não garantimos 100% de precisão, ` +
            `mas a ideia é manter o mesmo sentido da mensagem original.\n\n` +
            `⚡ _Digite /voltar para mudar a mensagem_\n` +
            `⚡ _Digite /cancelar para sair_`,
            [
              { id: '1', text: '✨ Sim, randomizar!' },
              { id: '2', text: '➡️ Não, manter sempre igual' }
            ]
          )
        } else {
          // Usuário digitou texto livre - interpretar como correção da mensagem
          updatedSessionData.mensagem_original = messageText
          await sendPrivateMessage(senderJid, `✅ *Mensagem atualizada!*\n\n"${messageText}"\n\n━━━━━━━━━━━━━━━━━━━━\n💡 Quer que eu melhore com IA?\n\n1️⃣ ✨ Sim, melhore!\n2️⃣ 👍 Não, está boa\n\n💬 Digite o número da opção desejada`)
          // Manter no mesmo estado
        }
        break

      case 'aprovando_mensagem':
        if (messageText === 'aprovar_ia' || messageText === '1' || messageText.toLowerCase().includes('aprovar')) {
          // Mensagem já está salva (melhorada) - perguntar sobre randomização
          nextState = 'perguntando_randomizar'
          await sendInteractiveButtons(senderJid,
            `✅ *Mensagem aprovada!*\n\n` +
            `"${updatedSessionData.mensagem}"\n\n` +
            `━━━━━━━━━━━━━━━━━━━━\n\n` +
            `🎲 *Quer RANDOMIZAR esta mensagem?*\n\n` +
            `A cada envio, a IA criará uma variação diferente mantendo o mesmo sentido.\n` +
            `Isso torna suas mensagens mais naturais e evita parecer robô!\n\n` +
            `⚠️ *AVISO:* As variações são geradas por IA no momento do envio. ` +
            `Não garantimos 100% de precisão, mas a ideia é manter o mesmo sentido da mensagem original.\n\n` +
            `⚡ _Digite /voltar para mudar a mensagem_\n` +
            `⚡ _Digite /cancelar para sair_`,
            [
              { id: '1', text: '✨ Sim, randomizar!' },
              { id: '2', text: '➡️ Não, sempre igual' }
            ]
          )
        } else if (messageText === 'usar_original' || messageText === '2') {
          updatedSessionData.mensagem = updatedSessionData.mensagem_original
          // Perguntar sobre randomização
          nextState = 'perguntando_randomizar'
          await sendInteractiveButtons(senderJid,
            `✅ *Mensagem salva!*\n\n` +
            `"${updatedSessionData.mensagem}"\n\n` +
            `━━━━━━━━━━━━━━━━━━━━\n\n` +
            `🎲 *Quer RANDOMIZAR esta mensagem?*\n\n` +
            `A cada envio, a IA criará uma variação diferente mantendo o mesmo sentido.\n` +
            `Isso torna suas mensagens mais naturais e evita parecer robô!\n\n` +
            `⚠️ *AVISO:* As variações são geradas por IA no momento do envio. ` +
            `Não garantimos 100% de precisão, mas a ideia é manter o mesmo sentido da mensagem original.\n\n` +
            `⚡ _Digite /voltar para mudar a mensagem_\n` +
            `⚡ _Digite /cancelar para sair_`,
            [
              { id: '1', text: '✨ Sim, randomizar!' },
              { id: '2', text: '➡️ Não, sempre igual' }
            ]
          )
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
        updatedSessionData.mensagem_original = messageText
        updatedSessionData.mensagem = messageText

        // Perguntar sobre randomização
        nextState = 'perguntando_randomizar'
        await sendInteractiveButtons(senderJid,
          `✅ *Mensagem salva!*\n\n` +
          `"${messageText}"\n\n` +
          `━━━━━━━━━━━━━━━━━━━━\n\n` +
          `🎲 *Quer RANDOMIZAR esta mensagem?*\n\n` +
          `A cada envio, a IA criará uma variação diferente mantendo o mesmo sentido.\n` +
          `Isso torna suas mensagens mais naturais e evita parecer robô!\n\n` +
          `⚠️ *AVISO:* As variações são geradas por IA no momento do envio. ` +
          `Não garantimos 100% de precisão, mas a ideia é manter o mesmo sentido da mensagem original.\n\n` +
          `⚡ _Digite /voltar para mudar a mensagem_\n` +
          `⚡ _Digite /cancelar para sair_`,
          [
            { id: '1', text: '✨ Sim, randomizar!' },
            { id: '2', text: '➡️ Não, manter sempre igual' }
          ]
        )
        break

      case 'perguntando_randomizar':
        // Salvar escolha de randomização
        if (messageText === '1' || messageText.toLowerCase().includes('sim')) {
          updatedSessionData.randomizar = true
          await sendPrivateMessage(senderJid,
            `✨ *Randomização ativada!*\n\n` +
            `A cada envio, a IA criará uma variação única da sua mensagem.\n\n` +
            `━━━━━━━━━━━━━━━━━━━━\n\n` +
            `📋 *Digite o nome do grupo ou número do contato*\n\n` +
            `💡 _Exemplo: Família Silva ou 5511999999999_\n\n` +
            `⚡ _Digite /voltar para mudar a mensagem_\n` +
            `⚡ _Digite /cancelar para sair_`
          )
        } else {
          updatedSessionData.randomizar = false
          await sendPrivateMessage(senderJid,
            `📋 *Digite o nome do grupo ou número do contato*\n\n` +
            `💡 _Exemplo: Família Silva ou 5511999999999_\n\n` +
            `⚡ _Digite /voltar para mudar a mensagem_\n` +
            `⚡ _Digite /cancelar para sair_`
          )
        }

        nextState = 'escolhendo_destinatario'
        break

      case 'escolhendo_destinatario':
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
            `━━━━━━━━━━━━━━━━━━━━\n\n` +
            `👥 *Quer cadastrar um novo grupo?*\n\n` +
            `Digite *1* para cadastrar um grupo manualmente\n` +
            `Digite *2* para buscar novamente\n\n` +
            `⚡ _Digite /voltar para mudar a mensagem_\n` +
            `⚡ _Digite /cancelar para sair_`
          )
          updatedSessionData.busca_anterior = messageText
          nextState = 'perguntando_cadastrar_grupo'
        } else if (resultados.length === 1) {
          // Apenas 1 resultado - adicionar à lista e perguntar se quer mais
          if (!updatedSessionData.destinatarios) updatedSessionData.destinatarios = []

          const destinatario = resultados[0]

          // Verificar se já não está na lista
          if (!updatedSessionData.destinatarios.some((d: any) => d.id === destinatario.id)) {
            updatedSessionData.destinatarios.push({ ...destinatario })

            await sendPrivateMessage(senderJid, `✅ *Destinatário adicionado:*\n👥 ${destinatario.nome}\n\n📋 *Total na lista: ${updatedSessionData.destinatarios.length}*`)
          } else {
            await sendPrivateMessage(senderJid, `⚠️ *Destinatário já está na lista!*\n\n📋 *Total na lista: ${updatedSessionData.destinatarios.length}*`)
          }

          // Perguntar se quer adicionar mais
          nextState = 'perguntando_mais_destinatarios'
          await sendInteractiveButtons(senderJid,
            '👥 *Deseja adicionar mais destinatários?*\n\nVocê pode enviar a mesma mensagem para vários grupos/contatos!\n\n⚡ _Digite /voltar para mudar a mensagem_\n⚡ _Digite /cancelar para sair_',
            [
              { id: '1', text: '✅ Sim, adicionar mais' },
              { id: '2', text: '➡️ Não, continuar' }
            ]
          )
        } else {
          // Múltiplos resultados - mostrar lista com opção de múltipla seleção
          let mensagemResultados = `📋 *Encontrei ${resultados.length} resultados:*\n\n`
          resultados.forEach((r, i) => {
            mensagemResultados += `${i + 1}. ${r.nome}\n`
          })
          mensagemResultados += `\n💡 *Selecione os destinatários:*\n\n`
          mensagemResultados += `🔢 *Digite o número* para adicionar um destinatário\n`
          mensagemResultados += `📝 *Digite vários números separados por vírgula* para adicionar vários\n`
          mensagemResultados += `   *Exemplo: 1,3,5* (adiciona destinatários 1, 3 e 5)\n\n`
          mensagemResultados += `⚡ _Digite /voltar para mudar a mensagem_\n`
          mensagemResultados += `⚡ _Digite /cancelar para sair_\n\n`
          mensagemResultados += `💬 *Quando terminar, digite "pronto" para continuar*`

          await sendPrivateMessage(senderJid, mensagemResultados)

          // Salvar resultados para próxima etapa
          updatedSessionData.resultados_busca = resultados
          nextState = 'selecionando_destinatario'
        }
        break

      case 'perguntando_cadastrar_grupo':
        if (messageText === '1') {
          // Cadastrar novo grupo
          nextState = 'cadastrando_jid_grupo_inline'
          await sendPrivateMessage(senderJid, `👥 *CADASTRAR NOVO GRUPO*

⚠️ *ATENÇÃO - LEIA COM CUIDADO!*

Você precisará fornecer:
1️⃣ JID do grupo (ex: 120363318862188145@g.us)
2️⃣ Nome do grupo (ex: Grupo da família)

━━━━━━━━━━━━━━━━━━━━

⚠️ *CUIDADOS:*
❌ NÃO digite o JID errado!
❌ NÃO invente JIDs!
✅ Copie e cole o JID real

━━━━━━━━━━━━━━━━━━━━

📝 *Digite o JID do grupo agora:*

💡 Formato: 120363XXXXXXXXXX@g.us

⚡ _Digite /voltar para buscar novamente_
⚡ _Digite /cancelar para sair_`)
        } else if (messageText === '2') {
          // Buscar novamente
          nextState = 'escolhendo_destinatario'
          await sendPrivateMessage(senderJid, `📋 *Digite o nome do grupo ou número do contato*

💡 _Exemplo: Família Silva ou 5511999999999_

⚡ _Digite /voltar para mudar a mensagem_
⚡ _Digite /cancelar para sair_`)
        } else {
          await sendPrivateMessage(senderJid, `❌ Opção inválida!

Digite *1* para cadastrar grupo
Digite *2* para buscar novamente`)
          nextState = 'perguntando_cadastrar_grupo'
        }
        break

      case 'cadastrando_jid_grupo_inline':
        if (messageText === '/voltar') {
          nextState = 'escolhendo_destinatario'
          await sendPrivateMessage(senderJid, `📋 *Digite o nome do grupo ou número do contato*

⚡ _Digite /cancelar para sair_`)
          break
        }

        // CORREÇÃO CRÍTICA: Usar função de validação
        if (!validarJidGrupo(messageText)) {
          await sendPrivateMessage(senderJid, `❌ *JID inválido!*

Formato correto: *120363318862188145@g.us*

Você digitou: ${messageText}

⚠️ Verifique:
• Tem números antes do @?
• Termina com @g.us?
• Não tem espaços?

💡 Tente novamente ou digite */voltar*`)
          nextState = 'cadastrando_jid_grupo_inline'
          break
        }

        updatedSessionData.novo_grupo_jid = messageText.trim()
        nextState = 'cadastrando_nome_grupo_inline'
        await sendPrivateMessage(senderJid, `✅ *JID salvo!*

${messageText}

━━━━━━━━━━━━━━━━━━━━

📝 *Agora digite o NOME do grupo:*

💡 Exemplos:
• Grupo da família
• Trabalho - Equipe
• Amigos da escola

⚡ _Digite /voltar para mudar o JID_
⚡ _Digite /cancelar para sair_`)
        break

      case 'cadastrando_nome_grupo_inline':
        if (messageText === '/voltar') {
          nextState = 'cadastrando_jid_grupo_inline'
          await sendPrivateMessage(senderJid, `📝 *Digite o JID do grupo novamente:*

⚡ _Digite /cancelar para sair_`)
          break
        }

        updatedSessionData.novo_grupo_nome = messageText.trim()

        // Salvar grupo no banco
        const { error: insertGrupoError } = await supabaseAdmin
          .from('grupos_usuario')
          .insert({
            usuario_id: user.id,
            grupo_jid: updatedSessionData.novo_grupo_jid,
            grupo_nome: updatedSessionData.novo_grupo_nome,
            tipo: 'grupo',
            ativo: true
          })

        if (insertGrupoError) {
          await sendPrivateMessage(senderJid, `❌ *Erro ao cadastrar grupo!*

${insertGrupoError.message}

Digite */novo* para tentar novamente.`)
          await limparSessao(sender)
          nextState = ''
        } else {
          // Grupo cadastrado com sucesso! Agora usar como destinatário
          updatedSessionData.destinatario_id = updatedSessionData.novo_grupo_jid
          updatedSessionData.destinatario_tipo = 'grupo'
          nextState = 'escolhendo_horario'

          await sendPrivateMessage(senderJid, `✅ *GRUPO CADASTRADO E SELECIONADO!*

👥 *${updatedSessionData.novo_grupo_nome}*
🆔 ${updatedSessionData.novo_grupo_jid}

━━━━━━━━━━━━━━━━━━━━`)

          // Enviar opções de horário
          await sendInteractiveButtons(senderJid,
            '⏰ *Escolha o horário para envio:*\n\nSelecione uma opção rápida ou digite um horário personalizado (ex: 09:30)\n\n⚡ _Digite /voltar para mudar o destinatário_\n⚡ _Digite /cancelar para sair_',
            BOTOES_HORARIO
          )
        }
        break

      case 'selecionando_destinatario':
        // CORREÇÃO LÓGICA: Reestruturado para if/else if/else para tratar todas as entradas.
        const textoLimpo = messageText.toLowerCase().trim()
        const resultadosSalvos = updatedSessionData.resultados_busca || []

        if (textoLimpo === 'pronto') {
          const destinatarios = updatedSessionData.destinatarios || []

          if (destinatarios.length === 0) {
            // Entrada inválida: envie o erro e mantenha o estado explicitamente
            await sendPrivateMessage(senderJid, '❌ Nenhum destinatário selecionado. Digite pelo menos um número da lista ou "pronto" para continuar.')
            // Explicitamente mantenha o estado atual
            nextState = 'selecionando_destinatario'
            break
          }

          // Continuar para escolher horário
          nextState = 'escolhendo_horario'
          await sendPrivateMessage(senderJid, `✅ *Destinatários selecionados: ${destinatarios.length}*\n\n`)
          await sendInteractiveButtons(senderJid,
            '⏰ *Escolha o horário para envio:*\n\nSelecione uma opção rápida ou digite um horário personalizado (ex: 09:30)\n\n⚡ _Digite /voltar para mudar o destinatário_\n⚡ _Digite /cancelar para sair_',
            BOTOES_HORARIO
          )

        } else if (textoLimpo.includes(',')) {
          // Processar múltiplos números
          const numerosSelecionados = textoLimpo.split(',').map((n: string) => n.trim()).filter((n: string) => n !== '')
          let destinatariosSelecionados: any[] = []

          if (!updatedSessionData.destinatarios) updatedSessionData.destinatarios = []

          for (const numStr of numerosSelecionados) {
            const num = parseInt(numStr)
            if (!isNaN(num) && num >= 1 && num <= resultadosSalvos.length) {
              const destinatario = resultadosSalvos[num - 1]
              if (!updatedSessionData.destinatarios.some((d: any) => d.id === destinatario.id)) {
                updatedSessionData.destinatarios.push({ ...destinatario })
                destinatariosSelecionados.push(destinatario)
              }
            }
          }

          if (destinatariosSelecionados.length > 0) {
            let mensagemMultipla = `✅ *Destinatários adicionados:*\n` + destinatariosSelecionados.map(d => d.nome).join('\n')
            mensagemMultipla += `\n\n📋 *Total na lista: ${updatedSessionData.destinatarios.length}*\n`
            mensagemMultipla += `\n💡 Adicione mais números ou digite "pronto" para continuar.`
            await sendPrivateMessage(senderJid, mensagemMultipla)
            // Explicitamente mantenha o estado atual
            nextState = 'selecionando_destinatario'
          } else {
            // Entrada inválida: envie o erro e mantenha o estado explicitamente
            await sendPrivateMessage(senderJid, `❌ Nenhum número válido encontrado. Digite números entre 1 e ${resultadosSalvos.length}, separados por vírgula.`)
            // Explicitamente mantenha o estado atual
            nextState = 'selecionando_destinatario'
          }

        } else {
          // Processar como número único ou entrada inválida
          const numeroEscolhido = parseInt(textoLimpo)
          if (!isNaN(numeroEscolhido) && numeroEscolhido >= 1 && numeroEscolhido <= resultadosSalvos.length) {
            if (!updatedSessionData.destinatarios) updatedSessionData.destinatarios = []

            const destEscolhido = resultadosSalvos[numeroEscolhido - 1]
            if (!updatedSessionData.destinatarios.some((d: any) => d.id === destEscolhido.id)) {
              updatedSessionData.destinatarios.push({ ...destEscolhido })
              await sendPrivateMessage(senderJid, `✅ *Destinatário adicionado:*\n${destEscolhido.nome}\n\n📋 *Total na lista: ${updatedSessionData.destinatarios.length}*\n\n💡 Adicione mais números ou digite "pronto" para continuar.`)
            } else {
              await sendPrivateMessage(senderJid, `⚠️ *Destinatário já está na lista!*\n\n📋 *Total na lista: ${updatedSessionData.destinatarios.length}*\n\n💡 Adicione outros números ou digite "pronto" para continuar.`)
            }
            // Explicitamente mantenha o estado atual
            nextState = 'selecionando_destinatario'
          } else {
            // Entrada inválida: envie o erro e mantenha o estado explicitamente
            await sendPrivateMessage(senderJid, `❌ Opção inválida. Digite um número da lista, vários números separados por vírgula (ex: 1,3) ou "pronto" para continuar.`)
            // Explicitamente mantenha o estado atual
            nextState = 'selecionando_destinatario'
          }
        }
        break

      case 'perguntando_mais_destinatarios':
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
            BOTOES_HORARIO
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
        // Mapear opções de botão (aceitar número ou ID)
        const horariosMap: Record<string, string> = {
          '08:00': '08:00',
          '14:00': '14:00',
          '20:00': '20:00',
          '1': '08:00',
          '2': '14:00',
          '3': '20:00'
        }

        const horarioSelecionado = horariosMap[messageText.trim()] || messageText.trim()

        // Validar formato HH:MM
        if (validarHorario(horarioSelecionado)) {
          updatedSessionData.hora_envio = horarioSelecionado
          nextState = 'escolhendo_dias'

          // Enviar BOTÕES de dias (super simples!)
          await sendInteractiveButtons(senderJid,
            '📅 *Escolha os dias da semana:*\n\nSelecione quando a mensagem será enviada.\n\n⚡ _Digite /voltar para mudar o horário_\n⚡ _Digite /cancelar para sair_',
            BOTOES_DIAS
          )
        } else {
          // Entrada inválida: envie o erro e mantenha o estado explicitamente
          await sendPrivateMessage(senderJid, '❌ Horário inválido! Use formato *HH:MM* (ex: 09:30)\n\n⚡ _Digite /voltar para mudar o destinatário_\n⚡ _Digite /cancelar para sair_')
          // Explicitamente mantenha o estado atual
          nextState = 'escolhendo_horario'
        }
        break



      case 'aguardando_horario':
        if (!validarHorario(messageText)) {
            // Entrada inválida: envie o erro e mantenha o estado explicitamente
            await sendPrivateMessage(senderJid, '❌ Formato de horário inválido. Por favor, use *HH:MM* (ex: 09:30).');
            // Explicitamente mantenha o estado atual
            nextState = 'aguardando_horario'
        } else {
            updatedSessionData.hora_envio = messageText
            nextState = 'escolhendo_dias'

            // Enviar botões de dias (unificado com fluxo moderno)
            await sendInteractiveButtons(senderJid,
              '📅 *Escolha os dias da semana:*\n\nSelecione quando a mensagem será enviada.\n\n⚡ _Digite /voltar para mudar o horário_\n⚡ _Digite /cancelar para sair_',
              BOTOES_DIAS
            )
        }
        break

      case 'escolhendo_dias':
        // Se o usuário quer personalizar, mude para um novo estado
        if (messageText === 'custom_dias' || messageText === '3') {
          await sendPrivateMessage(senderJid, '📅 *Digite os dias separados por vírgula:*\n\n*Exemplo:* 1,3,5 para Seg, Qua e Sex\n\n1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sáb, 7=Dom\n\n⚡ _Digite /voltar para mudar o horário_\n⚡ _Digite /cancelar para sair_')
          nextState = 'aguardando_dias_custom'
          break
        }

        // Mapear seleções pré-definidas
        const diasMap: Record<string, number[]> = {
          'dias_uteis': [1, 2, 3, 4, 5],
          'todos_dias': [1, 2, 3, 4, 5, 6, 7],
          '1': [1, 2, 3, 4, 5],  // Seg-Sex
          '2': [1, 2, 3, 4, 5, 6, 7]  // Todos os dias
        }

        const diasSelecionados = diasMap[messageText] || []

        if (diasSelecionados.length > 0) {
          updatedSessionData.dias_semana = diasSelecionados
          nextState = 'escolhendo_termino'

          // Perguntar sobre data de término
          await sendInteractiveButtons(senderJid,
            MENSAGEM_ESCOLHA_TERMINO,
            BOTOES_TERMINO
          )
        } else {
          // Entrada inválida: envie o erro e mantenha o estado explicitamente
          await sendPrivateMessage(senderJid, '❌ Seleção inválida!\n\n🔘 Clique em um dos botões acima\n   OU\n✏️ Digite *1*, *2* ou *3*\n\n⚡ _Digite /voltar para mudar o horário_\n⚡ _Digite /cancelar para sair_')
          // Explicitamente mantenha o estado atual
          nextState = 'escolhendo_dias'
        }
        break

      case 'aguardando_dias_custom':
        if (messageText === '/voltar') {
          nextState = 'escolhendo_horario'
          await sendInteractiveButtons(senderJid,
            `⏰ *Escolha o horário de envio:*\n\n⚡ _Digite /cancelar para sair_`,
            BOTOES_HORARIO
          )
          break
        }

        const diasCustom = messageText.split(',').map((d: string) => parseInt(d.trim())).filter((d: number) => !isNaN(d) && d >= 1 && d <= 7)

        if (diasCustom.length === 0) {
          await sendPrivateMessage(senderJid, '❌ Dias inválidos!\n\nDigite os números de 1 a 7 separados por vírgula.\n\n*Exemplo:* 1,3,5\n\n⚡ _Digite /voltar para mudar o horário_\n⚡ _Digite /cancelar para sair_')
          // Explicitamente mantenha o estado atual
          nextState = 'aguardando_dias_custom'
        } else {
          updatedSessionData.dias_semana = diasCustom
          nextState = 'escolhendo_termino'

          await sendInteractiveButtons(senderJid,
            MENSAGEM_ESCOLHA_TERMINO,
            BOTOES_TERMINO
          )
        }
        break

      case 'escolhendo_termino':
        if (messageText === 'termino_nunca' || messageText === '1') {
          // Sem data de término
          updatedSessionData.data_termino = null
          nextState = 'aguardando_confirmacao'
        } else if (messageText === 'termino_30dias' || messageText === '2') {
          // Término em 30 dias
          const data30Dias = new Date()
          data30Dias.setDate(data30Dias.getDate() + 30)
          updatedSessionData.data_termino = data30Dias.toISOString().split('T')[0]
          nextState = 'aguardando_confirmacao'
        } else if (messageText === 'termino_custom' || messageText === 'termino_data' || messageText === '3') {
          nextState = 'aguardando_data_termino'
          await sendPrivateMessage(senderJid, '📅 *Digite a data de término:*\n\n*Formato:* DD/MM/AAAA\n*Exemplo:* 31/12/2025\n\n⚡ _Digite /voltar para não definir término_\n⚡ _Digite /cancelar para sair_')
        } else {
          await sendPrivateMessage(senderJid, '❌ *Opção inválida!*\n\n🔘 Clique em um dos botões acima\n   OU\n✏️ Digite *1*, *2* ou *3*\n\n⚡ _Digite /voltar para mudar os dias_\n⚡ _Digite /cancelar para sair_')
          nextState = 'escolhendo_termino'
        }
        break

      case 'aguardando_data_termino':
        if (messageText === '/voltar') {
          updatedSessionData.data_termino = null
          nextState = 'aguardando_confirmacao'
        } else {
          // Validar formato DD/MM/AAAA
          const dataRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/
          const match = messageText.match(dataRegex)

          if (!match) {
            await sendPrivateMessage(senderJid, '❌ *Data inválida!*\n\nUse o formato DD/MM/AAAA\n*Exemplo:* 31/12/2025')
            nextState = 'aguardando_data_termino'
            break
          } 
            
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
          }
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
              await limparSessao(sender)
              nextState = ''
              break
            }

            // Criar agendamentos para cada destinatário
            const agendamentosParaCriar: any[] = []

            // Calcular próximo envio
            const proximoEnvio = calcularProximoEnvio(
              updatedSessionData.hora_envio,
              updatedSessionData.dias_semana
            )

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
                  proximo_envio: proximoEnvio,
                  ativo: true,
                  randomizar: updatedSessionData.randomizar || false,
                  modificado_por: user.id
                })
              }
            } else {
              // Destinatário único (compatibilidade)
              let destinatarioNome = null
              if (updatedSessionData.destinatario_tipo === 'contato') {
                const numero = updatedSessionData.destinatario_id.split('@')[0]
                destinatarioNome = numero
              }

              agendamentosParaCriar.push({
                usuario_id: updatedSessionData.usuario_id,
                mensagem: updatedSessionData.mensagem,
                destinatario_id: updatedSessionData.destinatario_id,
                destinatario_tipo: updatedSessionData.destinatario_tipo,
                destinatario_nome: destinatarioNome,
                hora_envio: updatedSessionData.hora_envio,
                dias_semana: updatedSessionData.dias_semana,
                data_termino: updatedSessionData.data_termino || null,
                proximo_envio: proximoEnvio,
                ativo: true,
                randomizar: updatedSessionData.randomizar || false,
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

            await limparSessao(sender);

            const totalCriados = novosAgendamentos?.length || 0

            // Buscar nomes dos destinatários para exibir
            const destinatariosNomes = await Promise.all(
              agendamentosParaCriar.map(async (ag: any) =>
                ag.destinatario_nome || await buscarNomeDestinatario(ag.destinatario_id)
              )
            )

            // Formatar dias da semana
            const diasNomes = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
            const diasTexto = updatedSessionData.dias_semana.map((d: number) => diasNomes[d-1]).join(', ')

            // Formatar data de término
            const dataTerminoTexto = updatedSessionData.data_termino
              ? new Date(updatedSessionData.data_termino + 'T12:00:00Z').toLocaleDateString('pt-BR')
              : '♾️ Indeterminado'

            // Preview da mensagem (primeiras 3 linhas ou 150 caracteres)
            const mensagemLinhas = updatedSessionData.mensagem.split('\n')
            const mensagemPreview = mensagemLinhas.length > 3
              ? mensagemLinhas.slice(0, 3).join('\n') + '\n...'
              : updatedSessionData.mensagem.length > 150
                ? updatedSessionData.mensagem.substring(0, 150) + '...'
                : updatedSessionData.mensagem

            let successMsg = `╔═══════════════════════╗
║  ✅ *AGENDAMENTO CRIADO!*
╚═══════════════════════╝

🎉 *${totalCriados} agendamento(s) criado(s) com sucesso!*

━━━━━━━━━━━━━━━━━━━━

📝 *MENSAGEM:*
${mensagemPreview}

━━━━━━━━━━━━━━━━━━━━

⏰ *HORÁRIO:* ${updatedSessionData.hora_envio}
📅 *DIAS:* ${diasTexto}
📆 *TÉRMINO:* ${dataTerminoTexto}

━━━━━━━━━━━━━━━━━━━━

👥 *DESTINATÁRIO(S):*`

            // Listar destinatários
            destinatariosNomes.forEach((nome: string, index: number) => {
              const tipoEmoji = agendamentosParaCriar[index].destinatario_tipo === 'grupo' ? '👥' : '📱'
              successMsg += `\n${tipoEmoji} ${nome}`
            })

            successMsg += `

━━━━━━━━━━━━━━━━━━━━

✅ *Sua mensagem será enviada automaticamente!*

📋 Digite */listar* para ver todos os agendamentos
🆕 Digite */novo* para criar outro

━━━━━━━━━━━━━━━━━━━━
_💻 Pensado e desenvolvido por AleTubeGames_`

            await sendPrivateMessage(senderJid, successMsg);
            nextState = '' // Finaliza a sessão
        } else if (cancelar) {
            await limparSessao(sender);
            const cancelMsg = `╔═══════════════╗
║  ❌ *Cancelado*
╚═══════════════╝

_Agendamento não foi criado._

Digite */novo* para tentar novamente.`
            await sendPrivateMessage(senderJid, cancelMsg);
            nextState = '' // Finaliza a sessão
        } else {
            await sendPrivateMessage(senderJid, '❌ Opção inválida! Digite *1* para confirmar ou *2* para cancelar.')
            nextState = 'aguardando_confirmacao'
        }
        break;
    }

    // Se o estado mudou para 'aguardando_confirmacao', montar e enviar a mensagem de resumo
    if (nextState === 'aguardando_confirmacao' && session.estado !== 'aguardando_confirmacao') {
      const diasNomes = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
      const diasTexto = updatedSessionData.dias_semana.map((d: number) => diasNomes[d-1]).join(', ')
      const dataTerminoTexto = updatedSessionData.data_termino
        ? new Date(updatedSessionData.data_termino + 'T12:00:00Z').toLocaleDateString('pt-BR')
        : 'Nunca (indeterminado)'

      const destinatarios = updatedSessionData.destinatarios || []
      let destinatariosTexto = ''
      let totalDestinatarios = 0

      if (destinatarios.length > 0) {
        destinatariosTexto = destinatarios.map((d: any, i: number) => `${i + 1}. ${d.nome}`).join('\n')
        totalDestinatarios = destinatarios.length
      } else if (updatedSessionData.destinatario_nome) {
        destinatariosTexto = updatedSessionData.destinatario_nome
        totalDestinatarios = 1
      } else if (updatedSessionData.destinatario_id) {
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
${dataTerminoTexto}

━━━━━━━━━━━━━━━━━━━━━━━━━

Tudo certo? Confirma o agendamento?`

      await sendInteractiveButtons(senderJid, confirmacaoMsg, [
        { id: 'confirmar_sim', text: '✅ Sim, confirmar!' },
        { id: 'confirmar_nao', text: '❌ Não, cancelar' }
      ])
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
              BOTOES_HORARIO
            )
            await sendPrivateMessage(senderJid, '\n💡 _Ou digite um horário personalizado (ex: 09:30)_')
            nextState = 'editando_horario'
          } else if (messageText === 'editar_dias') {
            await sendInteractiveButtons(senderJid,
              '📅 *Escolha os novos dias:*',
              BOTOES_DIAS
            )
            nextState = 'editando_dias'
          } else if (messageText === 'editar_termino') {
            await sendInteractiveButtons(senderJid,
              MENSAGEM_ESCOLHA_TERMINO,
              BOTOES_TERMINO
            )
            nextState = 'editando_termino'
          } else if (messageText === 'editar_status') {
            // Alternar status (ativar/desativar)
            const novoStatus = !agendamentoOriginal.ativo

            await supabaseAdmin
              .from('agendamentos')
              .update({ ativo: novoStatus, modificado_por: user.id })
              .eq('id', agendamentoId)

            await supabaseAdmin.from('auditoria_agendamentos').insert({
              agendamento_id: agendamentoId,
              usuario_id: user.id,
              acao: 'editado',
              dados_anteriores: { ativo: agendamentoOriginal.ativo },
              dados_novos: { ativo: novoStatus }
            })

            const statusEmoji = novoStatus ? '✅' : '❌'
            const statusTexto = novoStatus ? 'ativado' : 'desativado'

            await sendPrivateMessage(senderJid, `${statusEmoji} *Agendamento ${statusTexto} com sucesso!*\n\n📋 Digite */listar* para ver seus agendamentos`)
            await limparSessao(sender)
            nextState = ''
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
            await limparSessao(sender)
            nextState = ''
          }
          break

        case 'editando_horario':
          const novoHorario = messageText.trim()
          if (!validarHorario(novoHorario)) {
            await sendPrivateMessage(senderJid, '❌ Formato inválido! Use *HH:MM* (ex: 09:30)')
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
            await limparSessao(sender)
            nextState = ''
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
            await limparSessao(sender)
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
            await limparSessao(sender)
            nextState = ''
          }
          break

        case 'editando_termino':
          let novaDataTermino: string | null = null

          if (messageText === 'termino_nunca') {
            novaDataTermino = null
          } else if (messageText === 'termino_30dias') {
            const data30Dias = new Date()
            data30Dias.setDate(data30Dias.getDate() + 30)
            novaDataTermino = data30Dias.toISOString().split('T')[0]
          } else if (messageText === 'termino_custom') {
            await sendPrivateMessage(senderJid, '📆 *Digite a data de término:*\n\n*Formato:* DD/MM/AAAA\n*Exemplo:* 31/12/2025')
            nextState = 'editando_termino_custom'
            break
          }

          if (nextState !== 'editando_termino_custom') {
              await supabaseAdmin
                .from('agendamentos')
                .update({ data_termino: novaDataTermino, modificado_por: user.id })
                .eq('id', agendamentoId)

              await supabaseAdmin.from('auditoria_agendamentos').insert({
                agendamento_id: agendamentoId,
                usuario_id: user.id,
                acao: 'editado',
                dados_anteriores: { data_termino: agendamentoOriginal.data_termino },
                dados_novos: { data_termino: novaDataTermino }
              })

              const terminoTexto = novaDataTermino
                ? new Date(novaDataTermino + 'T12:00:00Z').toLocaleDateString('pt-BR')
                : '♾️ Indeterminado'

              await sendPrivateMessage(senderJid, `✅ *Data de término atualizada para: ${terminoTexto}!*\n\n📋 Digite */listar* para ver seus agendamentos`)
              await limparSessao(sender)
              nextState = ''
          }
          break

        case 'editando_termino_custom':
          // Validar formato DD/MM/AAAA
          const dataMatch = messageText.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
          if (!dataMatch) {
            await sendPrivateMessage(senderJid, '❌ Formato inválido! Use DD/MM/AAAA (ex: 31/12/2025)')
            nextState = 'editando_termino_custom'
          } else {
            const [, dia, mes, ano] = dataMatch
            const dataTerminoCustom = `${ano}-${mes}-${dia}`

            // Validar se a data é válida e futura
            const dataObj = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia))
            const hoje = new Date()
            hoje.setHours(0, 0, 0, 0)

            if (isNaN(dataObj.getTime())) {
              await sendPrivateMessage(senderJid, '❌ Data inválida! Verifique o dia, mês e ano.')
              nextState = 'editando_termino_custom'
            } else if (dataObj < hoje) {
              await sendPrivateMessage(senderJid, '❌ A data de término deve ser futura!')
              nextState = 'editando_termino_custom'
            } else {
              await supabaseAdmin
                .from('agendamentos')
                .update({ data_termino: dataTerminoCustom, modificado_por: user.id })
                .eq('id', agendamentoId)

              await supabaseAdmin.from('auditoria_agendamentos').insert({
                agendamento_id: agendamentoId,
                usuario_id: user.id,
                acao: 'editado',
                dados_anteriores: { data_termino: agendamentoOriginal.data_termino },
                dados_novos: { data_termino: dataTerminoCustom }
              })

              await sendPrivateMessage(senderJid, `✅ *Data de término atualizada para: ${dataObj.toLocaleDateString('pt-BR')}!*\n\n📋 Digite */listar* para ver seus agendamentos`)
              await limparSessao(sender)
              nextState = ''
            }
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
