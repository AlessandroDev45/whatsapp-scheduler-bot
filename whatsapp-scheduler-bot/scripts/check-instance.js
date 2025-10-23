require('dotenv').config();
const axios = require('axios');

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
const BOT_INSTANCE_NAME = process.env.BOT_INSTANCE_NAME;

async function checkInstance() {
  try {
    console.log('🔍 Verificando instância...\n');
    
    const response = await axios.get(`${EVOLUTION_API_URL}/instance/fetchInstances`, {
      headers: {
        'apikey': EVOLUTION_API_KEY
      }
    });
    
    console.log('✅ Instâncias encontradas:');
    console.log(JSON.stringify(response.data, null, 2));
    
    // Verificar se nossa instância existe
    const instances = response.data;
    const ourInstance = instances.find(i => i.instance.instanceName === BOT_INSTANCE_NAME);
    
    if (ourInstance) {
      console.log(`\n✅ Instância "${BOT_INSTANCE_NAME}" encontrada!`);
      console.log(`Status: ${ourInstance.instance.status}`);
    } else {
      console.log(`\n❌ Instância "${BOT_INSTANCE_NAME}" NÃO encontrada!`);
    }
    
  } catch (error) {
    console.error('❌ Erro ao verificar instância:', error.message);
    if (error.response) {
      console.error('Resposta:', error.response.data);
    }
  }
}

checkInstance();

