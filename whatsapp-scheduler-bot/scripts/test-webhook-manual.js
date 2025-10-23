const axios = require('axios');

const SUPABASE_URL = 'https://aiwwocigvktmtiawslrx.supabase.co';

async function testWebhook() {
  try {
    console.log('🔄 Testando webhook manualmente...\n');
    
    // Simular webhook da Evolution API
    const webhookPayload = {
      event: 'messages.upsert',
      data: {
        key: {
          remoteJid: '5519987200383@s.whatsapp.net', // Conversa privada
          fromMe: false,
          id: 'TEST_MESSAGE_ID_' + Date.now()
        },
        pushName: 'Alessandro Alves Souza',
        message: {
          conversation: '/novo'
        },
        messageTimestamp: Math.floor(Date.now() / 1000)
      }
    };
    
    console.log('📤 Enviando payload de teste:');
    console.log(JSON.stringify(webhookPayload, null, 2));
    console.log('');
    
    const response = await axios.post(
      `${SUPABASE_URL}/functions/v1/webhook-whatsapp`,
      webhookPayload,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Edge Function respondeu!');
    console.log('📊 Status:', response.status);
    console.log('📊 Resposta:', response.data);
    
  } catch (error) {
    console.error('❌ Erro ao testar webhook:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Dados:', error.response.data);
    } else {
      console.error(error.message);
    }
  }
}

testWebhook();

