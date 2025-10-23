require('dotenv').config();
const axios = require('axios');

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
const BOT_INSTANCE_NAME = process.env.BOT_INSTANCE_NAME;

async function changeProfileName() {
  try {
    console.log('🔄 Mudando nome do perfil para "AleBot"...');
    
    const response = await axios.post(
      `${EVOLUTION_API_URL}/chat/updateProfileName/${BOT_INSTANCE_NAME}`,
      {
        name: 'AleBot'
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'apikey': EVOLUTION_API_KEY
        }
      }
    );

    console.log('✅ Nome do perfil alterado com sucesso!');
    console.log('📊 Resposta:', response.data);
    
  } catch (error) {
    console.error('❌ Erro ao alterar nome:', error.response?.data || error.message);
  }
}

changeProfileName();

