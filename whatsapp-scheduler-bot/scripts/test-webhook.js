require('dotenv').config();
const axios = require('axios');

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
const BOT_INSTANCE_NAME = process.env.BOT_INSTANCE_NAME;

async function testWebhook() {
  try {
    console.log('🔄 Verificando configuração do webhook...\n');
    
    // Buscar configuração do webhook
    const response = await axios.get(
      `${EVOLUTION_API_URL}/webhook/find/${BOT_INSTANCE_NAME}`,
      {
        headers: {
          'apikey': EVOLUTION_API_KEY
        }
      }
    );

    console.log('📊 Configuração atual do webhook:');
    console.log(JSON.stringify(response.data, null, 2));
    
    if (response.data.webhook && response.data.webhook.enabled) {
      console.log('\n✅ Webhook está ATIVO!');
      console.log('📍 URL:', response.data.webhook.url);
      console.log('📋 Eventos:', response.data.webhook.events);
    } else {
      console.log('\n❌ Webhook NÃO está ativo!');
      console.log('\n💡 Execute: node scripts/setup-webhook.js');
    }
    
  } catch (error) {
    console.error('❌ Erro ao verificar webhook:', error.response?.data || error.message);
  }
}

testWebhook();

