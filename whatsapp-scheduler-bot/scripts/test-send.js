require('dotenv').config();
const axios = require('axios');

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
const BOT_INSTANCE_NAME = process.env.BOT_INSTANCE_NAME;

async function testSend() {
  try {
    console.log('🔄 Testando envio de mensagem...');
    
    // Envia mensagem para você mesmo (número conectado)
    const response = await axios.post(
      `${EVOLUTION_API_URL}/message/sendText/${BOT_INSTANCE_NAME}`,
      {
        number: '5519987200383@s.whatsapp.net', // Formato correto com @s.whatsapp.net
        options: {
          delay: 1000
        },
        textMessage: {
          text: '✅ TESTE: Evolution API v1.7.4 funcionando perfeitamente!\n\n🤖 Bot conectado e pronto para agendamentos!'
        }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'apikey': EVOLUTION_API_KEY
        }
      }
    );

    console.log('✅ Mensagem enviada com sucesso!');
    console.log('📊 Resposta:', response.data);
    
  } catch (error) {
    console.error('❌ Erro ao enviar mensagem:', error.response?.data || error.message);
  }
}

testSend();

