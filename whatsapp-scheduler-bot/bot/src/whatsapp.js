import makeWASocket, { 
  DisconnectReason, 
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import qrcode from 'qrcode-terminal';
import { processIncomingMessage } from './messageHandler.js';

let sock = null;
let qrCodeData = null;
let connected = false;
let reconnecting = false;
let keepAliveInterval = null;
let reconnectAttempts = 0;
let consecutiveCloseCount = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const MAX_CONSECUTIVE_CLOSES = 5; // Se fechar 5x seguidas em <30s, sessão está corrompida

const logger = pino({ level: 'silent' }); // Silenciar logs internos

// Keep-alive: enviar ping periódico para manter conexão ativa
function startKeepAlive() {
  stopKeepAlive();
  keepAliveInterval = setInterval(async () => {
    if (sock && connected) {
      try {
        // Baileys usa websocket, enviar query simples para manter conexão
        await sock.query({
          tag: 'iq',
          attrs: { to: '@s.whatsapp.net', type: 'get', xmlns: 'w:p' },
          content: [{ tag: 'ping', attrs: {} }]
        });
        console.log('💓 Keep-alive ping enviado');
      } catch (err) {
        console.log('⚠️ Keep-alive falhou:', err.message);
      }
    }
  }, 25 * 60 * 1000); // A cada 25 minutos
}

function stopKeepAlive() {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
    keepAliveInterval = null;
  }
}

export async function initWhatsApp() {
  // AUTH_INFO_PATH pode ser definido em .env para flexibilidade local ou em containers
  const authInfoPath = process.env.AUTH_INFO_PATH || './auth_info';
  console.log('🔧 [WhatsApp] Iniciando conexão...');
  console.log(`🔧 [WhatsApp] Carregando auth state de ${authInfoPath}`);

  const { state, saveCreds } = await useMultiFileAuthState(authInfoPath);

  console.log('🔧 [WhatsApp] Auth state carregado. Buscando versão...');
  const { version } = await fetchLatestBaileysVersion();
  console.log(`🔧 [WhatsApp] Versão: ${version.join('.')}`);

  console.log('🔧 [WhatsApp] Criando socket WhatsApp...');
  sock = makeWASocket({
    version,
    logger,
    printQRInTerminal: false, // Vamos controlar o QR manualmente
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger)
    },
    generateHighQualityLinkPreview: true,
    syncFullHistory: false,
    markOnlineOnConnect: true,
    keepAliveIntervalMs: 30000, // Ping a cada 30s para manter conexão
    retryRequestDelayMs: 2000,
    getMessage: async () => undefined
  });

  

  console.log('🔧 [WhatsApp] Socket criado. Registrando event handlers...');

  // Evento: Atualização de conexão
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    console.log('🔧 [WhatsApp] Connection update:', { connection, hasQR: !!qr, hasError: !!lastDisconnect });

    if (qr) {
      console.log('\n');
      console.log('═══════════════════════════════════════════════════════');
      console.log('📱 QR CODE GERADO! ESCANEIE COM SEU WHATSAPP:');
      console.log('═══════════════════════════════════════════════════════');
      console.log('\n');
      qrcode.generate(qr, { small: true });
      qrCodeData = qr;
      console.log('\n');
      console.log('⏳ Aguardando escaneamento do QR Code...');
      console.log('═══════════════════════════════════════════════════════');
      console.log('\n');
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error instanceof Boom
        ? lastDisconnect.error.output.statusCode
        : 'unknown';

      const isLoggedOut = (lastDisconnect?.error instanceof Boom)
        && lastDisconnect.error.output.statusCode === DisconnectReason.loggedOut;

      connected = false;
      stopKeepAlive();
      reconnectAttempts++;
      consecutiveCloseCount++;
      console.log(`❌ Conexão fechada. Status: ${statusCode}, LoggedOut: ${isLoggedOut}, Tentativa: ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}, Closes consecutivos: ${consecutiveCloseCount}`);

      // Detectar sessão corrompida: status 440 ou loop de reconexão rápida
      const isCorruptedSession = statusCode === 440 && consecutiveCloseCount >= MAX_CONSECUTIVE_CLOSES;

      if (isLoggedOut || isCorruptedSession) {
        if (isCorruptedSession) {
          console.log(`🔴 SESSÃO CORROMPIDA DETECTADA! ${consecutiveCloseCount} desconexões consecutivas com status 440.`);
          console.log('🔴 Isso geralmente acontece quando 2 bots rodaram ao mesmo tempo.');
        }
        // Sessão expirada/corrompida — limpar auth_info e reconectar para gerar novo QR
        console.log('🔑 Limpando auth_info para gerar novo QR Code...');
        try {
          const fs = await import('fs');
          const path = await import('path');
          const authPath = process.env.AUTH_INFO_PATH || './auth_info';
          if (fs.existsSync(authPath)) {
            const files = fs.readdirSync(authPath);
            for (const file of files) {
              fs.unlinkSync(path.join(authPath, file));
            }
            console.log('🗑️ Auth info limpo com sucesso');
          }
        } catch (err) {
          console.error('⚠️ Erro ao limpar auth_info:', err.message);
        }
        reconnectAttempts = 0;
        consecutiveCloseCount = 0;
        console.log('🔄 Reconectando em 5 segundos para gerar novo QR Code...');
        setTimeout(() => initWhatsApp(), 5000);
      } else if (reconnectAttempts <= MAX_RECONNECT_ATTEMPTS) {
        // Backoff exponencial: 3s, 6s, 12s, 24s... até máximo de 60s
        const delay = Math.min(3000 * Math.pow(2, reconnectAttempts - 1), 60000);
        console.log(`🔄 Reconectando em ${Math.round(delay/1000)}s (tentativa ${reconnectAttempts})...`);
        setTimeout(() => initWhatsApp(), delay);
      } else {
        console.log(`🔴 EXCEDEU ${MAX_RECONNECT_ATTEMPTS} tentativas de reconexão.`);
        console.log('🔴 Limpando sessão corrompida e tentando do zero...');
        try {
          const fs = await import('fs');
          const path = await import('path');
          const authPath = process.env.AUTH_INFO_PATH || './auth_info';
          if (fs.existsSync(authPath)) {
            const files = fs.readdirSync(authPath);
            for (const file of files) {
              fs.unlinkSync(path.join(authPath, file));
            }
          }
        } catch (err) {
          console.error('⚠️ Erro ao limpar auth_info:', err.message);
        }
        reconnectAttempts = 0;
        consecutiveCloseCount = 0;
        console.log('🔄 Reconectando em 10 segundos para gerar novo QR Code...');
        setTimeout(() => initWhatsApp(), 10000);
      }
    } else if (connection === 'open') {
      connected = true;
      reconnecting = false;
      reconnectAttempts = 0;
      consecutiveCloseCount = 0;
      startKeepAlive();
      console.log('\n');
      console.log('═══════════════════════════════════════════════════════');
      console.log('✅ WhatsApp conectado com sucesso!');
      console.log('═══════════════════════════════════════════════════════');
      qrCodeData = null;

      // Buscar informações do bot
      const botNumber = sock.user.id.split(':')[0];
      console.log(`📱 Número do bot: ${botNumber}`);
      console.log('═══════════════════════════════════════════════════════');
      console.log('\n');
    } else if (connection === 'connecting') {
      console.log('🔄 Conectando ao WhatsApp...');
    }
  });
  
  // Evento: Atualização de credenciais
  sock.ev.on('creds.update', saveCreds);
  
  // Evento: Mensagens recebidas
  sock.ev.on('messages.upsert', async (upsert) => {
    console.log(`\n🔔 [UPSERT] Evento messages.upsert recebido!`);
    console.log(`🔔 [UPSERT] Type: ${upsert.type}, Messages: ${upsert.messages?.length || 0}`);
    
    const { messages: msgs, type: upsertType } = upsert;
    
    if (upsertType !== 'notify') {
      console.log(`⏭️ [UPSERT] Ignorando type="${upsertType}" (não é notify)`);
      return;
    }
    
    for (const message of msgs) {
      console.log(`🔔 [UPSERT] Mensagem de: ${message.key?.remoteJid}, fromMe: ${message.key?.fromMe}, id: ${message.key?.id}`);
      console.log(`🔔 [UPSERT] pushName: ${message.pushName}, hasMessage: ${!!message.message}`);
      console.log(`🔔 [UPSERT] messageKeys: ${message.message ? Object.keys(message.message).join(', ') : 'NENHUM'}`);
      
      if (message.key.fromMe) {
        // Permitir comandos (/) mesmo quando fromMe, para o admin poder usar
        const msgContent = message.message;
        const msgText = msgContent?.conversation 
          || msgContent?.extendedTextMessage?.text 
          || '';
        if (!msgText.startsWith('/')) {
          console.log(`⏭️ [UPSERT] Ignorando mensagem própria (fromMe=true, não é comando)`);
          continue;
        }
        console.log(`✅ [UPSERT] Mensagem própria MAS é comando: "${msgText}" — processando!`);
      }
      
      if (!message.message) {
        console.log(`⏭️ [UPSERT] Ignorando mensagem sem conteúdo (message.message é null/undefined)`);
        continue;
      }
      
      try {
        await processIncomingMessage(sock, message);
      } catch (error) {
        console.error('❌ Erro ao processar mensagem:', error);
      }
    }
  });
  
  return sock;
}

export function getWhatsAppClient() {
  return sock;
}

export function isWhatsAppConnected() {
  return connected && sock !== null;
}

export function getQRCode() {
  return qrCodeData;
}

/**
 * Busca todos os grupos do WhatsApp
 */
export async function fetchAllGroups() {
  if (!sock) {
    throw new Error('WhatsApp não está conectado');
  }

  try {
    console.log('🔍 Buscando grupos do WhatsApp...');

    // Baileys tem a função groupFetchAllParticipating() para buscar grupos
    const groups = await sock.groupFetchAllParticipating();

    // Converter objeto para array
    const groupsArray = Object.values(groups).map(group => ({
      id: group.id,
      subject: group.subject,
      owner: group.owner,
      creation: group.creation,
      size: group.participants.length,
      participants: group.participants
    }));

    console.log(`✅ Encontrados ${groupsArray.length} grupos`);
    return groupsArray;
  } catch (error) {
    console.error('❌ Erro ao buscar grupos:', error);
    throw error;
  }
}

/**
 * Reseta a conexão WhatsApp (força logout e nova conexão)
 */
export async function resetConnection() {
  console.log('🔄 Resetando conexão WhatsApp...');

  if (sock) {
    try {
      await sock.logout();
      console.log('✅ Logout realizado');
    } catch (error) {
      console.log('⚠️ Erro ao fazer logout:', error.message);
    }
    sock = null;
  }

  qrCodeData = null;

  // Deletar arquivos de autenticação
  console.log('🗑️ Deletando arquivos de autenticação...');
  try {
    const fs = await import('fs');
    const path = await import('path');
    const authPath = process.env.AUTH_INFO_PATH || './auth_info';

    if (fs.existsSync(authPath)) {
      const files = fs.readdirSync(authPath);
      for (const file of files) {
        const filePath = path.join(authPath, file);
        fs.unlinkSync(filePath);
        console.log(`  ✅ Deletado: ${file}`);
      }
    }
  } catch (error) {
    console.log('⚠️ Erro ao deletar arquivos:', error.message);
  }

  // Reinicializar conexão
  console.log('🔄 Reinicializando conexão...');
  await initWhatsApp();

  return { success: true, message: 'Conexão resetada. Novo QR Code será gerado.' };
}

export async function sendMessage(jid, text, retries = 3) {
  if (!sock || !connected) {
    throw new Error('WhatsApp não está conectado');
  }
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const result = await sock.sendMessage(jid, { text });
      return result;
    } catch (error) {
      console.error(`❌ Erro ao enviar mensagem (tentativa ${attempt}/${retries}):`, error.message);
      
      // Se é erro de conexão e ainda temos tentativas, esperar e tentar de novo
      if (attempt < retries && (error.message === 'Connection Closed' || error.message?.includes('connection'))) {
        const delay = attempt * 3000; // 3s, 6s, 9s
        console.log(`⏳ Aguardando ${delay/1000}s antes de tentar novamente...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Verificar se reconectou
        if (!sock || !connected) {
          throw new Error('WhatsApp desconectou durante retry');
        }
        continue;
      }
      throw error;
    }
  }
}

export async function sendButtonMessage(jid, text, buttons) {
  if (!sock) {
    throw new Error('WhatsApp não está conectado');
  }
  
  try {
    const buttonMessage = {
      text,
      footer: '💻 WhatsApp Scheduler Bot',
      buttons: buttons.map((btn, index) => ({
        buttonId: btn.id,
        buttonText: { displayText: btn.text },
        type: 1
      })),
      headerType: 1
    };
    
    const result = await sock.sendMessage(jid, buttonMessage);
    return result;
  } catch (error) {
    console.error('❌ Erro ao enviar mensagem com botões:', error);
    // Fallback: enviar como texto simples
    const fallbackText = text + '\n\n' + buttons.map((btn, i) => `${i + 1}. ${btn.text}`).join('\n');
    return await sock.sendMessage(jid, { text: fallbackText });
  }
}

