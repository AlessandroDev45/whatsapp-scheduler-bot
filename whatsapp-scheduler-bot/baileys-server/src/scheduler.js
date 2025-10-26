import cron from 'node-cron';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { sendMessage } from './whatsapp.js';

config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

function calcularProximoEnvio(horaEnvio, diasSemana) {
  // USAR TIMEZONE SÃO PAULO EXPLICITAMENTE
  const agoraSP = new Date(new Date().toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
  const [horas, minutos] = horaEnvio.split(':').map(Number);
  
  let proximoEnvio = new Date(agoraSP);
  proximoEnvio.setHours(horas, minutos, 0, 0);
  proximoEnvio.setSeconds(0, 0);

  // Se já passou do horário em SP, agendar para amanhã
  if (proximoEnvio <= agoraSP) {
    proximoEnvio.setDate(proximoEnvio.getDate() + 1);
  }
  
  // Se dias_semana for null ou vazio, retorna o próximo envio calculado
  if (!diasSemana || diasSemana.length === 0) {
    return proximoEnvio;
  }

  // Verificar dias da semana
  let contador = 0;
  while (contador < 7) {
    const diaDaSemanaJS = proximoEnvio.getDay();
    const diaDaSemanaNosso = diaDaSemanaJS === 0 ? 7 : diaDaSemanaJS;
    
    if (diasSemana.includes(diaDaSemanaNosso.toString())) {
      return proximoEnvio;
    }
    proximoEnvio.setDate(proximoEnvio.getDate() + 1);
    contador++;
  }
  
  return null;
}

async function processarAgendamentos() {
  try {
    // USAR TIMEZONE SÃO PAULO PARA COMPARAÇÃO
    const agoraSP = new Date(new Date().toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
    const agoraString = agoraSP.toLocaleString('sv-SE', { timeZone: 'America/Sao_Paulo' });

    console.log(`🕐 Hora atual (SP): ${agoraSP.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`);
    console.log(`🕐 Hora atual (banco): ${agoraString}`);

    // Buscar agendamentos que precisam ser enviados (comparando com hora SP)
    const { data: agendamentos, error } = await supabase
      .from('agendamentos')
      .select('*')
      .eq('ativo', true)
      .lte('proximo_envio', agoraString)
      .or(`data_termino.is.null,data_termino.gte.${agoraString}`);

    if (error) {
      console.error('❌ Erro ao buscar agendamentos:', error);
      console.error('Erro detalhado:', JSON.stringify(error, null, 2));
      return;
    }

    // DEBUG: Buscar TODOS os agendamentos ativos para comparar
    const { data: todosAgendamentos } = await supabase
      .from('agendamentos')
      .select('id,proximo_envio,hora_envio,ativo')
      .eq('ativo', true);

    if (todosAgendamentos && todosAgendamentos.length > 0) {
      console.log(`📊 Total de agendamentos ativos: ${todosAgendamentos.length}`);
      todosAgendamentos.forEach(a => {
        const proximoEnvioUTC = new Date(a.proximo_envio);
        const diff = proximoEnvioUTC - agoraSP;
        const minutos = Math.floor(diff / 60000);
        console.log(`   - ID: ${a.id.substring(0, 8)}... | Próximo: ${a.proximo_envio} | Diff: ${minutos} min`);
      });
    }

    if (!agendamentos || agendamentos.length === 0) {
      console.log('✅ Nenhum agendamento pendente.');
      return;
    }
    
    console.log(`✅ Encontrados ${agendamentos.length} agendamentos para processar.`);
    
    for (const agendamento of agendamentos) {
      try {
        console.log(`\n📤 Processando agendamento ${agendamento.id}...`);
        console.log(`   Destinatário: ${agendamento.destinatario_nome}`);
        console.log(`   Mensagem: ${agendamento.mensagem.substring(0, 50)}...`);
        
        // Enviar mensagem via Baileys
        const result = await sendMessage(agendamento.destinatario_id, agendamento.mensagem);
        
        // Registrar no histórico
        await supabase.from('historico_envios').insert({
          agendamento_id: agendamento.id,
          status: 'enviado',
          mensagem_id: result.key?.id || 'unknown',
          erro: null
        });
        
        console.log(`✅ Mensagem enviada com sucesso!`);
        
        // Calcular próximo envio usando timezone SP
        const proximoEnvio = calcularProximoEnvio(
          agendamento.hora_envio,
          agendamento.dias_semana
        );
        
        if (proximoEnvio) {
          // Armazenar no banco mantendo a hora SP (sem conversão UTC)
          const proximoEnvioString = proximoEnvio.toLocaleString('sv-SE', { timeZone: 'America/Sao_Paulo' });
          
          await supabase
            .from('agendamentos')
            .update({ proximo_envio: proximoEnvioString })
            .eq('id', agendamento.id);
          
          console.log(`✅ Próximo envio agendado para: ${proximoEnvio.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`);
          console.log(`💾 Armazenado no banco como: ${proximoEnvioString}`);
        } else {
          console.log(`⚠️ Não foi possível calcular próximo envio`);
        }
        
      } catch (error) {
        console.error(`❌ Erro ao processar agendamento ${agendamento.id}:`, error);
        
        // Registrar erro no histórico
        await supabase.from('historico_envios').insert({
          agendamento_id: agendamento.id,
          status: 'erro',
          mensagem_id: null,
          erro: error.message
        });
      }
    }
    
    console.log('\n✅ Processamento de agendamentos finalizado.');
    
  } catch (error) {
    console.error('❌ Erro fatal no scheduler:', error);
  }
}

export function startScheduler() {
  console.log('⏰ Scheduler iniciado! Verificando agendamentos a cada minuto...');
  
  // Executar a cada minuto
  cron.schedule('* * * * *', async () => {
    console.log(`\n🔄 [${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}] Verificando agendamentos...`);
    await processarAgendamentos();
  });
  
  // Executar imediatamente na inicialização
  processarAgendamentos();
}
