require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function setupDatabase() {
  console.log('🔄 Verificando tabelas no Supabase...\n');

  try {
    // Testar conexão e verificar tabelas
    const { data: usuarios, error: usuariosError } = await supabase
      .from('usuarios_autorizados')
      .select('count')
      .limit(1);

    const { data: agendamentos, error: agendamentosError } = await supabase
      .from('agendamentos')
      .select('count')
      .limit(1);

    if (usuariosError || agendamentosError) {
      console.log('❌ Tabelas não encontradas!');
      console.log('\n📋 EXECUTE O SQL NO SUPABASE:');
      console.log('1. Acesse: https://supabase.com/dashboard/project/aiwwocigvktmtiawslrx/editor');
      console.log('2. Clique em "SQL Editor"');
      console.log('3. Cole o conteúdo do arquivo: supabase/migrations/0000_initial_schema.sql');
      console.log('4. Execute o SQL');
      console.log('\n');
      return;
    }

    console.log('✅ Tabelas encontradas!\n');

    // Adicionar você como usuário autorizado
    const { data: usuarioExistente } = await supabase
      .from('usuarios_autorizados')
      .select('*')
      .eq('telefone', '5519987200383')
      .single();

    if (!usuarioExistente) {
      console.log('➕ Adicionando você como usuário autorizado...');
      const { error: insertError } = await supabase
        .from('usuarios_autorizados')
        .insert({
          telefone: '5519987200383',
          nome: 'Alessandro_ICM',
          role: 'admin',
          ativo: true
        });

      if (insertError) {
        console.error('❌ Erro ao adicionar usuário:', insertError);
      } else {
        console.log('✅ Usuário adicionado com sucesso!');
      }
    } else {
      console.log('✅ Você já está cadastrado como usuário autorizado!');
    }

    // Criar agendamento de teste
    console.log('\n➕ Criando agendamento de TESTE...');
    
    const agora = new Date();
    const daquiA2Minutos = new Date(agora.getTime() + 2 * 60000);
    const horaEnvio = `${String(daquiA2Minutos.getHours()).padStart(2, '0')}:${String(daquiA2Minutos.getMinutes()).padStart(2, '0')}`;

    const { data: usuario } = await supabase
      .from('usuarios_autorizados')
      .select('id')
      .eq('telefone', '5519987200383')
      .single();

    const { data: agendamentoTeste, error: agendamentoError } = await supabase
      .from('agendamentos')
      .insert({
        usuario_id: usuario.id,
        mensagem: '🤖 TESTE DE AGENDAMENTO!\n\nSe você recebeu esta mensagem, o sistema de agendamentos está funcionando perfeitamente! ✅',
        destinatario_tipo: 'contato',
        destinatario_id: '5519987200383@s.whatsapp.net',
        destinatario_nome: 'Alessandro_ICM',
        hora_envio: horaEnvio,
        dias_semana: [1, 2, 3, 4, 5, 6, 7], // Todos os dias
        ativo: true,
        proximo_envio: daquiA2Minutos.toISOString()
      })
      .select();

    if (agendamentoError) {
      console.error('❌ Erro ao criar agendamento:', agendamentoError);
    } else {
      console.log('✅ Agendamento de teste criado!');
      console.log(`📅 Será enviado em: ${daquiA2Minutos.toLocaleString('pt-BR')}`);
      console.log(`⏰ Hora: ${horaEnvio}`);
      console.log('\n🚀 RODE O SCHEDULER AGORA:');
      console.log('   node scripts/scheduler.js');
      console.log('\n💡 Ou rode em loop (a cada 1 minuto):');
      console.log('   while ($true) { node scripts/scheduler.js; Start-Sleep 60 }');
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

setupDatabase();

