require('dotenv').config();
const axios = require('axios');

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
const BOT_INSTANCE_NAME = process.env.BOT_INSTANCE_NAME;

async function fetchAllGroups() {
  console.log('🔍 Buscando todos os grupos do WhatsApp\n');

  try {
    // Testar com getParticipants=false
    console.log('Tentando com getParticipants=false...\n');
    const response = await axios.get(
      `${EVOLUTION_API_URL}/group/fetchAllGroups/${BOT_INSTANCE_NAME}?getParticipants=false`,
      {
        headers: {
          'apikey': EVOLUTION_API_KEY
        }
      }
    );

    console.log(`✅ Status: ${response.status}\n`);
    console.log(`📊 Total de grupos: ${response.data.length}\n`);

    if (response.data.length > 0) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('GRUPOS ENCONTRADOS:\n');
      
      response.data.forEach((grupo, index) => {
        console.log(`${index + 1}. ${grupo.subject || 'Sem nome'}`);
        console.log(`   ID: ${grupo.id}`);
        console.log(`   Descrição: ${grupo.desc || 'N/A'}`);
        console.log(`   Criado em: ${grupo.creation ? new Date(grupo.creation * 1000).toLocaleString('pt-BR') : 'N/A'}`);
        console.log(`   Participantes: ${grupo.participants?.length || 0}`);
        console.log('');
      });

      // Mostrar estrutura completa do primeiro grupo
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('ESTRUTURA COMPLETA DO PRIMEIRO GRUPO:\n');
      console.log(JSON.stringify(response.data[0], null, 2));
    } else {
      console.log('⚠️ Nenhum grupo encontrado');
    }

  } catch (error) {
    console.error('❌ Erro ao buscar grupos:', error.response?.data || error.message);
  }
}

fetchAllGroups();

