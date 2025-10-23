require('dotenv').config();
const axios = require('axios');

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
const BOT_INSTANCE_NAME = process.env.BOT_INSTANCE_NAME;
const SUPABASE_URL = process.env.SUPABASE_URL;

async function setupWebhook() {
  try {
    // URL da Edge Function
    const webhookUrl = `${SUPABASE_URL}/functions/v1/webhook-whatsapp`;
    
    console.log('🔄 Configurando webhook na Evolution API...');
    console.log('📍 Webhook URL:', webhookUrl);
    
    const response = await axios.post(
      `${EVOLUTION_API_URL}/webhook/set/${BOT_INSTANCE_NAME}`,
      {
        url: webhookUrl,
        webhook_by_events: false,
        webhook_base64: false,
        events: [
          'QRCODE_UPDATED',
          'MESSAGES_UPSERT',
          'MESSAGES_UPDATE',
          'MESSAGES_DELETE',
          'SEND_MESSAGE',
          'CONNECTION_UPDATE'
        ]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'apikey': EVOLUTION_API_KEY
        }
      }
    );

    console.log('✅ Webhook configurado com sucesso!');
    console.log('📊 Resposta:', response.data);
    
    console.log('\n📋 PRÓXIMOS PASSOS:');
    console.log('1. Faça deploy da Edge Function no Supabase:');
    console.log('   npx supabase functions deploy webhook-whatsapp --no-verify-jwt');
    console.log('\n2. Configure os secrets no Supabase:');
    console.log('   npx supabase secrets set --env-file .env');
    console.log('\n3. Teste enviando /menu no grupo!');
    
  } catch (error) {
    console.error('❌ Erro ao configurar webhook:', error.response?.data || error.message);
  }
}

setupWebhook();

