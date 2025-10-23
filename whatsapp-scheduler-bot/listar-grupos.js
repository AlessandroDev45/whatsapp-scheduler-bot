require('dotenv').config();

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
const BOT_INSTANCE_NAME = process.env.BOT_INSTANCE_NAME;

async function listarGrupos() {
  console.log('📋 Listando todos os grupos do WhatsApp...\n');
  
  const url = `${EVOLUTION_API_URL}/group/fetchAllGroups/${BOT_INSTANCE_NAME}?getParticipants=true`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'apikey': EVOLUTION_API_KEY,
      },
    });

    const data = await response.json();

    console.log('📄 Resposta da API:', JSON.stringify(data, null, 2));

    // A resposta pode ser um array ou um objeto com propriedade groups
    let grupos = Array.isArray(data) ? data : (data.groups || data.data || []);

    if (!grupos || grupos.length === 0) {
      console.log('❌ Nenhum grupo encontrado.');
      return;
    }

    console.log(`\n✅ Encontrados ${grupos.length} grupos:\n`);
    console.log('═'.repeat(80));

    grupos.forEach((grupo, index) => {
      console.log(`\n${index + 1}. 📱 *${grupo.subject || 'Sem nome'}*`);
      console.log(`   ID: ${grupo.id}`);
      console.log(`   Participantes: ${grupo.participants?.length || 0}`);
      console.log(`   Descrição: ${grupo.desc || 'Sem descrição'}`);
      console.log(`   Criado em: ${grupo.creation ? new Date(grupo.creation * 1000).toLocaleString('pt-BR') : 'Desconhecido'}`);
    });
    
    console.log('\n' + '═'.repeat(80));
    console.log('\n💡 Para criar o agendamento:');
    console.log('   1. Copie o ID do grupo da família');
    console.log('   2. Edite o arquivo criar-agendamento-familia.js');
    console.log('   3. Substitua GRUPO_FAMILIA_ID pelo ID correto');
    console.log('   4. Execute: node criar-agendamento-familia.js');
    
  } catch (error) {
    console.error('❌ Erro ao listar grupos:', error.message);
  }
}

listarGrupos();

