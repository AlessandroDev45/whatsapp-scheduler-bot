require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function buscarMeuId() {
  try {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔍 BUSCAR MEU ID DE USUÁRIO');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const { data: usuarios, error } = await supabase
      .from('usuarios_autorizados')
      .select('id, telefone, nome, ativo');

    if (error) {
      console.error('❌ Erro ao buscar usuários:', error);
      return;
    }

    if (!usuarios || usuarios.length === 0) {
      console.log('⚠️ Nenhum usuário encontrado!');
      return;
    }

    console.log(`📊 Total de usuários: ${usuarios.length}\n`);
    console.log('👥 USUÁRIOS CADASTRADOS:\n');

    usuarios.forEach((u, i) => {
      const status = u.ativo ? '✅ ATIVO' : '❌ INATIVO';
      console.log(`${i + 1}. ${status}`);
      console.log(`   Nome: ${u.nome}`);
      console.log(`   Telefone: ${u.telefone}`);
      console.log(`   ID: ${u.id}`);
      console.log('');
    });

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📝 PRÓXIMO PASSO:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('1. Copie o ID do seu usuário (o que está ATIVO)');
    console.log('2. Abra o arquivo: grupos_para_importar.csv');
    console.log('3. Substitua TODAS as ocorrências de "USUARIO_ID_AQUI" pelo seu ID');
    console.log('4. Salve o arquivo');
    console.log('5. Importe no Supabase\n');

  } catch (error) {
    console.error('\n❌ ERRO GERAL:', error);
  }
}

buscarMeuId().catch(console.error);

