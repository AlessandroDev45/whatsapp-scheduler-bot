import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function listarAgendamentos() {
  try {
    console.log('📋 Listando todos os agendamentos...\n');
    
    const { data: agendamentos, error } = await supabase
      .from('agendamentos')
      .select('id, destinatario_nome, mensagem, hora_envio, dias_semana, ativo')
      .order('criado_em', { ascending: false });
    
    if (error) throw error;
    
    if (!agendamentos || agendamentos.length === 0) {
      console.log('❌ Nenhum agendamento encontrado!');
      return;
    }
    
    console.log(`✅ Total: ${agendamentos.length} agendamentos\n`);
    
    agendamentos.forEach((ag, index) => {
      console.log(`${index + 1}. ID: ${ag.id}`);
      console.log(`   Grupo: ${ag.destinatario_nome}`);
      console.log(`   Mensagem: ${ag.mensagem.substring(0, 50)}...`);
      console.log(`   Hora: ${ag.hora_envio}`);
      console.log(`   Dias: ${JSON.stringify(ag.dias_semana)}`);
      console.log(`   Ativo: ${ag.ativo ? 'Sim' : 'Não'}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

listarAgendamentos();
