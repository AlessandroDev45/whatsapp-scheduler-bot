import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const WEBHOOK_URL = process.env.SUPABASE_WEBHOOK_URL;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/**
 * Processa mensagens recebidas do WhatsApp
 * Envia para a Edge Function do Supabase processar (mantém toda a lógica existente)
 */
export async function processIncomingMessage(sock, message) {
  try {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📥 [MESSAGE_HANDLER] Nova mensagem recebida');
    console.log('📦 [MESSAGE_HANDLER] Mensagem completa:', JSON.stringify(message, null, 2));

    // Extrair informações da mensagem
    const messageType = Object.keys(message.message || {})[0];
    const messageContent = message.message[messageType];

    console.log(`📋 [MESSAGE_HANDLER] Tipo de mensagem: ${messageType}`);

    // Ignorar mensagens de status, reações, etc
    if (messageType === 'protocolMessage' || messageType === 'senderKeyDistributionMessage') {
      console.log('⏭️ [MESSAGE_HANDLER] Mensagem ignorada (protocolo/distribuição de chave)');
      return;
    }

    // Extrair texto da mensagem
    let messageText = '';
    if (messageType === 'conversation') {
      messageText = messageContent;
    } else if (messageType === 'extendedTextMessage') {
      messageText = messageContent.text;
    } else if (messageType === 'buttonsResponseMessage') {
      messageText = messageContent.selectedButtonId;
    } else if (messageType === 'listResponseMessage') {
      messageText = messageContent.singleSelectReply.selectedRowId;
    } else if (messageType === 'imageMessage' || messageType === 'videoMessage' || messageType === 'documentMessage' || messageType === 'audioMessage') {
      // Extrair legenda/caption de mídia — permite que comandos enviados com foto sejam processados
      messageText = messageContent.caption || '';
    } else if (messageType === 'templateButtonReplyMessage') {
      messageText = messageContent.selectedId || messageContent.selectedDisplayText || '';
    }

    console.log(`📝 [MESSAGE_HANDLER] Texto extraído: "${messageText}"`);

    // Se não conseguiu extrair texto, ignorar
    if (!messageText) {
      console.log(`⚠️ [MESSAGE_HANDLER] Tipo de mensagem não suportado: ${messageType}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      return;
    }

    // Extrair informações do remetente
    const remoteJid = message.key.remoteJid;
    const isGroup = remoteJid.endsWith('@g.us');
    const sender = isGroup ? message.key.participant : remoteJid;
    const senderNumber = sender.split('@')[0];

    // Extrair nome do remetente
    const pushName = message.pushName || 'Usuário';

    console.log(`👤 [MESSAGE_HANDLER] Remetente: ${pushName} (${senderNumber})`);
    console.log(`📍 [MESSAGE_HANDLER] RemoteJid: ${remoteJid}`);
    console.log(`👥 [MESSAGE_HANDLER] É grupo: ${isGroup}`);
    
    // Montar payload no formato que a Edge Function espera
    const payload = {
      event: 'messages.upsert',
      instance: process.env.BOT_INSTANCE_NAME || 'whatsapp_bot',
      data: {
        key: {
          remoteJid,
          fromMe: message.key.fromMe || false, // ← USAR O VALOR REAL DA MENSAGEM!
          id: message.key.id,
          participant: isGroup ? sender : undefined
        },
        messageType,
        message: message.message,
        messageTimestamp: message.messageTimestamp,
        pushName,
        body: messageText
      }
    };

    console.log('📦 [MESSAGE_HANDLER] Payload montado:', JSON.stringify(payload, null, 2));

    // Enviar para Edge Function processar
    if (WEBHOOK_URL) {
      console.log(`🔗 [MESSAGE_HANDLER] WEBHOOK_URL: ${WEBHOOK_URL}`);
      try {
        console.log('📤 [MESSAGE_HANDLER] Enviando para Edge Function...');
        const response = await fetch(WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        console.log(`📡 [MESSAGE_HANDLER] Status da resposta: ${response.status} ${response.statusText}`);

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ [MESSAGE_HANDLER] Edge Function retornou erro (${response.status}):`, errorText);
        } else {
          const responseData = await response.text();
          console.log(`✅ [MESSAGE_HANDLER] Mensagem processada pela Edge Function`);
          console.log(`📊 [MESSAGE_HANDLER] Resposta:`, responseData);
        }
      } catch (error) {
        console.error('❌ [MESSAGE_HANDLER] Erro ao chamar Edge Function:', error.message);
        console.error('❌ [MESSAGE_HANDLER] Stack:', error.stack);
      }
    } else {
      console.error('⚠️ [MESSAGE_HANDLER] WEBHOOK_URL não configurada, mensagem não processada');
      console.error('⚠️ [MESSAGE_HANDLER] Configure a variável SUPABASE_WEBHOOK_URL');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
  } catch (error) {
    console.error('❌ Erro ao processar mensagem:', error);
  }
}

