import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function criarAgendamentosTeste() {
  try {
    console.log('🗑️ Deletando agendamentos de teste antigos...');

    // Deletar TODOS os agendamentos de teste (que contém "TESTE" na mensagem)
    await supabase
      .from('agendamentos')
      .delete()
      .like('mensagem', '%TESTE%');

    console.log('✅ Agendamentos de teste deletados!');
    
    console.log('\n🔍 Buscando Grupo da família...');
    
    // Buscar grupo
    const { data: grupos, error: grupoError } = await supabase
      .from('grupos_usuario')
      .select('grupo_jid, grupo_nome')
      .ilike('grupo_nome', '%família%')
      .eq('tipo', 'grupo')
      .limit(1);
    
    if (grupoError) throw grupoError;
    
    if (!grupos || grupos.length === 0) {
      console.log('❌ Grupo da família não encontrado!');
      return;
    }
    
    const grupo = grupos[0];
    console.log(`✅ Grupo encontrado: ${grupo.grupo_nome}`);
    
    // Buscar usuário admin
    const { data: usuarios } = await supabase
      .from('usuarios_autorizados')
      .select('id')
      .eq('role', 'admin')
      .limit(1);
    
    if (!usuarios || usuarios.length === 0) {
      console.log('❌ Nenhum usuário admin encontrado!');
      return;
    }
    
    const usuarioId = usuarios[0].id;
    
    // Pegar hora atual UTC
    const agoraUTC = new Date();
    const horario1UTC = new Date(agoraUTC.getTime() + 2 * 60 * 1000); // +2 min
    const horario2UTC = new Date(agoraUTC.getTime() + 3 * 60 * 1000); // +3 min

    // proximo_envio = horário em UTC (ISO format)
    const proximoEnvio1 = horario1UTC.toISOString();
    const proximoEnvio2 = horario2UTC.toISOString();

    // hora_envio = horário em SP (HH:MM:SS)
    // Converter UTC para SP para exibir
    const hora1 = horario1UTC.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour12: false });
    const hora2 = horario2UTC.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour12: false });

    console.log(`\n⏰ Hora atual (UTC): ${agoraUTC.toISOString()}`);
    console.log(`⏰ Hora atual (SP): ${agoraUTC.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`);
    console.log(`\n📅 Agendamento 1:`);
    console.log(`   hora_envio (SP): ${hora1}`);
    console.log(`   proximo_envio (UTC): ${proximoEnvio1}`);
    console.log(`\n📅 Agendamento 2:`);
    console.log(`   hora_envio (SP): ${hora2}`);
    console.log(`   proximo_envio (UTC): ${proximoEnvio2}`);

    // Criar agendamento 1
    console.log('\n📝 Criando agendamentos de teste...');
    const { data: ag1, error: err1 } = await supabase
      .from('agendamentos')
      .insert({
        usuario_id: usuarioId,
        destinatario_tipo: 'grupo',
        destinatario_id: grupo.grupo_jid,
        destinatario_nome: grupo.grupo_nome,
        mensagem: '🧪 TESTE 1 - Bom dia família! ❤️ Espero que todos estejam bem! 🌞',
        hora_envio: hora1,
        dias_semana: [0, 1, 2, 3, 4, 5, 6],
        proximo_envio: proximoEnvio1,
        ativo: true,
        randomizar: true
      })
      .select();

    if (err1) throw err1;
    console.log(`✅ Agendamento 1 criado! ID: ${ag1[0].id}`);

    // Criar agendamento 2
    const { data: ag2, error: err2 } = await supabase
      .from('agendamentos')
      .insert({
        usuario_id: usuarioId,
        destinatario_tipo: 'grupo',
        destinatario_id: grupo.grupo_jid,
        destinatario_nome: grupo.grupo_nome,
        mensagem: '🧪 TESTE 2 - Oi pessoal! 👋 Tudo certo por aí? Saudades de vocês! 💙',
        hora_envio: hora2,
        dias_semana: [0, 1, 2, 3, 4, 5, 6],
        proximo_envio: proximoEnvio2,
        ativo: true,
        randomizar: true
      })
      .select();

    if (err2) throw err2;
    console.log(`✅ Agendamento 2 criado! ID: ${ag2[0].id}`);

    console.log('\n🎉 AGENDAMENTOS CRIADOS COM SUCESSO!');
    console.log('\n📊 Resumo:');
    console.log(`   Destinatário: ${grupo.grupo_nome}`);
    console.log(`   Agendamento 1: ${hora1} (SP) = ${proximoEnvio1}`);
    console.log(`   Agendamento 2: ${hora2} (SP) = ${proximoEnvio2}`);
    console.log(`   Randomização: ✨ ATIVADA em ambos`);
    console.log('\n⏳ Aguarde ~2-3 minutos...');
    console.log('👀 Monitore os logs do Fly.io!');
    
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

criarAgendamentosTeste();

