require('dotenv').config();

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
const BOT_INSTANCE_NAME = process.env.BOT_INSTANCE_NAME;

async function checkInstanceStatus() {
  console.log('🔍 Verificando status da instância...\n');
  
  try {
    // 1. Verificar se a instância existe
    const fetchResponse = await fetch(
      `${EVOLUTION_API_URL}/instance/fetchInstances?instanceName=${BOT_INSTANCE_NAME}`,
      {
        method: 'GET',
        headers: { 'apikey': EVOLUTION_API_KEY }
      }
    );
    
    const instances = await fetchResponse.json();
    console.log('📋 Instâncias encontradas:', JSON.stringify(instances, null, 2));
    
    // 2. Verificar conexão da instância
    const connectionResponse = await fetch(
      `${EVOLUTION_API_URL}/instance/connectionState/${BOT_INSTANCE_NAME}`,
      {
        method: 'GET',
        headers: { 'apikey': EVOLUTION_API_KEY }
      }
    );
    
    const connectionState = await connectionResponse.json();
    console.log('\n📡 Estado da conexão:', JSON.stringify(connectionState, null, 2));
    
    // 3. Verificar configurações da instância
    const settingsResponse = await fetch(
      `${EVOLUTION_API_URL}/instance/settings/${BOT_INSTANCE_NAME}`,
      {
        method: 'GET',
        headers: { 'apikey': EVOLUTION_API_KEY }
      }
    );
    
    if (settingsResponse.ok) {
      const settings = await settingsResponse.json();
      console.log('\n⚙️ Configurações:', JSON.stringify(settings, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Erro ao verificar status:', error);
  }
}

checkInstanceStatus();

