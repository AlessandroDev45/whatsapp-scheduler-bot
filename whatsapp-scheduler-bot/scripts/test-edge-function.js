require('dotenv').config();
const axios = require('axios');

const SUPABASE_URL = process.env.SUPABASE_URL;

async function testEdgeFunction() {
  try {
    console.log('🔄 Testando Edge Function...\n');
    
    // Simular webhook da Evolution API
    const webhookPayload = {
      event: 'messages.upsert',
      data: {
        key: {
          remoteJid: '120363123456789012@g.us', // Grupo
          fromMe: false,
          participant: '5519987200383@s.whatsapp.net'
        },
        message: {
          conversation: '/menu'
        }
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
    console.error('❌ Erro ao testar Edge Function:');
    console.error('Status:', error.response?.status);
    console.error('Dados:', error.response?.data);
    console.error('Mensagem:', error.message);
  }
}

testEdgeFunction();

