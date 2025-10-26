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

const logger = pino({ level: 'silent' }); // Silenciar logs do Baileys

export async function initWhatsApp() {
  console.log('🔧 [WhatsApp] Iniciando conexão...');
  console.log('🔧 [WhatsApp] Carregando auth state de /app/auth_info');

  const { state, saveCreds } = await useMultiFileAuthState('/app/auth_info');

  console.log('🔧 [WhatsApp] Auth state carregado. Buscando versão do Baileys...');
  const { version } = await fetchLatestBaileysVersion();
  console.log(`🔧 [WhatsApp] Versão do Baileys: ${version.join('.')}`);

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
      const shouldReconnect = (lastDisconnect?.error instanceof Boom)
        ? lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut
        : true;

      const statusCode = lastDisconnect?.error instanceof Boom
        ? lastDisconnect.error.output.statusCode
        : 'unknown';

      console.log(`❌ Conexão fechada. Status: ${statusCode}, Reconectando: ${shouldReconnect}`);

      if (shouldReconnect) {
        console.log('🔄 Reconectando em 3 segundos...');
        setTimeout(() => initWhatsApp(), 3000);
      }
    } else if (connection === 'open') {
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
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    
    for (const message of messages) {
      if (message.key.fromMe) continue; // Ignorar mensagens enviadas pelo bot
      
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
    const authPath = '/app/auth_info';

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

export async function sendMessage(jid, text) {
  if (!sock) {
    throw new Error('WhatsApp não está conectado');
  }
  
  try {
    const result = await sock.sendMessage(jid, { text });
    return result;
  } catch (error) {
    console.error('❌ Erro ao enviar mensagem:', error);
    throw error;
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

