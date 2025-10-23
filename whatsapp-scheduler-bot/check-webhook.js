require('dotenv').config();

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
const BOT_INSTANCE_NAME = process.env.BOT_INSTANCE_NAME;

// Validar variáveis de ambiente
if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY || !BOT_INSTANCE_NAME) {
  console.error('❌ Erro: Variáveis de ambiente obrigatórias não configuradas');
  console.error('Verifique: EVOLUTION_API_URL, EVOLUTION_API_KEY, BOT_INSTANCE_NAME');
  process.exit(1);
}

async function checkWebhook() {
  console.log('🔍 Verificando configuração do webhook...\n');

  try {
    const response = await fetch(`${EVOLUTION_API_URL}/webhook/find/${BOT_INSTANCE_NAME}`, {
      method: 'GET',
      headers: {
        'apikey': EVOLUTION_API_KEY,
      },
    });

    if (!response.ok) {
      console.error('❌ Erro ao buscar webhook:', response.status, response.statusText);
      process.exit(1);
    }

    const data = await response.json();
    console.log('✅ Configuração do webhook:');
    console.log(JSON.stringify(data, null, 2));

    if (data.webhook && data.webhook.url) {
      console.log('\n✅ WEBHOOK CONFIGURADO!');
      console.log('📍 URL:', data.webhook.url);
      console.log('✅ Status: Ativo');
    } else {
      console.log('\n❌ WEBHOOK NÃO CONFIGURADO!');
      console.log('🔧 Execute: node scripts/setup-webhook.js');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

checkWebhook();

