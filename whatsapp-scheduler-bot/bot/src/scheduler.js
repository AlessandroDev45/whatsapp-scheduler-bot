import cron from 'node-cron';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { sendMessage, getWhatsAppClient, isWhatsAppConnected } from './whatsapp.js';

config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;
const MISTRAL_MODEL = process.env.MISTRAL_MODEL || 'devstral-small-2505';

// Função para gerar variação da mensagem usando IA
async function gerarVariacaoIA(mensagemOriginal) {
  try {
    const prompt = `Crie UMA variação da mensagem abaixo mantendo EXATAMENTE o mesmo sentido e intenção.

Mensagem original:
"${mensagemOriginal}"

REGRAS IMPORTANTES:
- Manter o mesmo sentido, tom e intenção
- Usar palavras diferentes mas equivalentes
- Manter emojis (pode trocar por similares)
- Manter formatação WhatsApp (*negrito*, _itálico_)
- Ser natural e humano
- Máximo 5 linhas
- NÃO adicionar saudações extras se não tiver na original
- NÃO mudar o contexto ou adicionar informações novas

Retorne APENAS a variação, sem explicações, aspas ou prefixos.`;

    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MISTRAL_API_KEY}`
      },
      body: JSON.stringify({
        model: MISTRAL_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.9, // Mais criativo para variações diferentes
        max_tokens: 500
      })
    });

    if (!response.ok) {
      throw new Error(`Mistral API error: ${response.status}`);
    }

    const data = await response.json();
    const variacao = data.choices[0].message.content.trim();

    // Remover aspas se a IA adicionar
    return variacao.replace(/^["']|["']$/g, '');

  } catch (error) {
    console.error('❌ Erro ao gerar variação com IA:', error);
    // Retornar mensagem original em caso de erro
    return mensagemOriginal;
  }
}

function calcularProximoEnvio(horaEnvio, diasSemana) {
  try {
    console.log(`🔧 DEBUG calcularProximoEnvio:`);
    console.log(`   horaEnvio: ${horaEnvio}`);
    console.log(`   diasSemana: ${JSON.stringify(diasSemana)}`);

    // Obter hora atual em UTC
    const agoraUTC = new Date();

    // CORREÇÃO: Usar offset explícito para converter UTC → Brasília (UTC-3)
    // Isso evita que new Date(string) seja interpretado como UTC em vez de BRT
    const OFFSET_BRT_MS = -3 * 60 * 60 * 1000; // -3 horas em ms
    const agoraBRT = new Date(agoraUTC.getTime() + OFFSET_BRT_MS);

    const [horas, minutos, segundos = 0] = horaEnvio.split(':').map(Number);

    console.log(`   Parsed: ${horas}:${minutos}:${segundos}`);

    // Criar próximo envio no horário de Brasília
    let proximoEnvio = new Date(agoraBRT);
    proximoEnvio.setHours(horas, minutos, segundos, 0);

    console.log(`   Próximo envio inicial (BRT): ${proximoEnvio.toISOString()}`);
    console.log(`   Agora BRT: ${agoraBRT.toISOString()}`);

    // Se já passou do horário em BRT, agendar para amanhã
    if (proximoEnvio <= agoraBRT) {
      console.log(`   ⏭️ Horário já passou, agendando para amanhã`);
      proximoEnvio.setDate(proximoEnvio.getDate() + 1);
    }

    // Se dias_semana for null ou vazio, retorna o próximo envio calculado
    if (!diasSemana || diasSemana.length === 0) {
      console.log(`   ✅ Sem restrição de dias da semana`);
      // CORREÇÃO: Converter BRT → UTC antes de armazenar no banco
      const resultadoUTC = new Date(proximoEnvio.getTime() - OFFSET_BRT_MS);
      console.log(`   📅 Resultado (UTC): ${resultadoUTC.toISOString()}`);
      return resultadoUTC;
    }

    // Verificar dias da semana
    let contador = 0;
    while (contador < 7) {
      const diaDaSemanaJS = proximoEnvio.getDay();
      // Converter: domingo=0 vira 7, segunda=1 fica 1, etc
      const diaDaSemanaNosso = diaDaSemanaJS === 0 ? 7 : diaDaSemanaJS;

      console.log(`   🔍 Tentativa ${contador}: dia ${diaDaSemanaNosso} (JS: ${diaDaSemanaJS})`);
      console.log(`      diasSemana includes ${diaDaSemanaNosso}? ${diasSemana.includes(diaDaSemanaNosso)}`);
      console.log(`      diasSemana includes "${diaDaSemanaNosso}"? ${diasSemana.includes(diaDaSemanaNosso.toString())}`);

      // Comparar como número (diasSemana pode ser array de números ou strings)
      if (diasSemana.includes(diaDaSemanaNosso) || diasSemana.includes(diaDaSemanaNosso.toString())) {
        console.log(`   ✅ Dia encontrado!`);
        // CORREÇÃO: Converter BRT → UTC antes de armazenar no banco
        const resultadoUTC = new Date(proximoEnvio.getTime() - OFFSET_BRT_MS);
        console.log(`   📅 Resultado (UTC): ${resultadoUTC.toISOString()}`);
        return resultadoUTC;
      }
      proximoEnvio.setDate(proximoEnvio.getDate() + 1);
      contador++;
    }

    console.log(`   ❌ Nenhum dia da semana válido encontrado!`);
    return null;
  } catch (error) {
    console.error('❌ Erro ao calcular próximo envio:', error);
    return null;
  }
}

async function processarAgendamentos() {
  try {
    // ========================================
    // VERIFICAÇÃO 1: WhatsApp está conectado?
    // ========================================
    const whatsappStatus = isWhatsAppConnected();
    console.log(`🔗 Status WhatsApp: ${whatsappStatus ? '✅ CONECTADO' : '❌ DESCONECTADO'}`);
    
    if (!whatsappStatus) {
      const sock = getWhatsAppClient();
      console.log(`⚠️ Detalhes:
        - Socket exists: ${sock !== null}
        - WhatsApp conectado (variável): ${whatsappStatus}`);
      console.log('⚠️ WhatsApp não está conectado. Pulando verificação de agendamentos.');
      return;
    }

    // Obter hora atual em UTC
    const agoraUTC = new Date();
    const agoraUTCString = agoraUTC.toISOString();

    // Converter para string no formato do banco (YYYY-MM-DD HH:MM:SS) em timezone SP
    const agoraString = agoraUTC.toLocaleString('sv-SE', { timeZone: 'America/Sao_Paulo' });

    console.log(`🕐 Hora atual (UTC): ${agoraUTCString}`);
    console.log(`🕐 Hora atual (SP): ${agoraUTC.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`);

    // Buscar agendamentos que precisam ser enviados (comparando UTC com UTC)
    const { data: agendamentos, error } = await supabase
      .from('agendamentos')
      .select('*')
      .eq('ativo', true)
      .lte('proximo_envio', agoraUTCString)
      .or(`data_termino.is.null,data_termino.gte.${agoraUTCString}`);

    if (error) {
      console.error('❌ Erro ao buscar agendamentos:', error);
      return;
    }

    if (!agendamentos || agendamentos.length === 0) {
      console.log('✅ Nenhum agendamento pendente.');
      return;
    }
    
    console.log(`\n✅ Encontrados ${agendamentos.length} agendamento(s) para processar:`);
    agendamentos.forEach(a => {
      console.log(`   📋 ${a.id.substring(0, 8)}... → ${a.destinatario_nome || a.destinatario_id} às ${a.hora_envio}`);
    });

    // ========================================
    // PROTEÇÃO: Avançar agendamentos com proximo_envio muito antigo
    // Se proximo_envio está mais de 30 minutos no passado, avançar
    // para o próximo horário válido sem tentar enviar.
    // Isso previne loop infinito de retentativas quando WhatsApp
    // ficou desconectado por horas/dias.
    // ========================================
    const LIMITE_ATRASO_MS = 30 * 60 * 1000; // 30 minutos
    
    for (const agendamento of agendamentos) {
      try {
        const proximoEnvioDate = new Date(agendamento.proximo_envio);
        const atrasoMs = agoraUTC - proximoEnvioDate;

        // Se o agendamento está mais de 30 min atrasado, avançar sem enviar
        if (atrasoMs > LIMITE_ATRASO_MS) {
          console.log(`\n⏭️ Agendamento ${agendamento.id.substring(0, 8)}... está ${Math.floor(atrasoMs / 60000)} min atrasado. Avançando para próximo horário.`);
          
          const proximoEnvio = calcularProximoEnvio(
            agendamento.hora_envio,
            agendamento.dias_semana
          );

          if (proximoEnvio) {
            const proximoEnvioISO = proximoEnvio.toISOString();
            await supabase
              .from('agendamentos')
              .update({ proximo_envio: proximoEnvioISO })
              .eq('id', agendamento.id);
            console.log(`   ⏰ Próximo envio atualizado para: ${proximoEnvio.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`);
          }
          continue; // Não tenta enviar, pula para o próximo
        }

        console.log(`\n📤 Processando agendamento ${agendamento.id}...`);
        console.log(`   Destinatário: ${agendamento.destinatario_nome || agendamento.destinatario_id}`);
        console.log(`   Mensagem original: ${agendamento.mensagem.substring(0, 50)}...`);
        console.log(`   Randomizar: ${agendamento.randomizar ? 'SIM' : 'NÃO'}`);

        // ========================================
        // PROTEÇÃO: Verificar se já foi enviado HOJE
        // ========================================
        // CORREÇÃO: Usar data de hoje em BRT (UTC-3), não UTC, para evitar
        // que a guarda falhe entre 21h-00h BRT quando a data UTC já virou.
        const OFFSET_BRT_MS_CHECK = -3 * 60 * 60 * 1000;
        const hojeBRT = new Date(new Date().getTime() + OFFSET_BRT_MS_CHECK).toISOString().split('T')[0]; // YYYY-MM-DD em BRT
        // Converter início/fim do dia BRT para UTC para comparar com campo UTC no banco
        const inicioDiaBRTEmUTC = new Date(`${hojeBRT}T00:00:00${'-03:00'}`).toISOString();
        const fimDiaBRTEmUTC    = new Date(`${hojeBRT}T23:59:59${'-03:00'}`).toISOString();

        const { data: enviosHoje, error: erroHistorico } = await supabase
          .from('historico_envios')
          .select('id, enviado_em')
          .eq('agendamento_id', agendamento.id)
          .eq('status', 'enviado')
          .gte('enviado_em', inicioDiaBRTEmUTC)
          .lte('enviado_em', fimDiaBRTEmUTC);

        if (erroHistorico) {
          console.error('❌ Erro ao verificar histórico:', erroHistorico);
        } else if (enviosHoje && enviosHoje.length > 0) {
          console.log(`⏭️  IGNORADO: Mensagem já enviada hoje (${enviosHoje.length}x)`);
          console.log(`   Último envio: ${enviosHoje[0].enviado_em}`);

          // Calcular próximo envio para amanhã
          const proximoEnvio = calcularProximoEnvio(
            agendamento.hora_envio,
            agendamento.dias_semana
          );

          if (proximoEnvio) {
            const proximoEnvioISO = proximoEnvio.toISOString();
            await supabase
              .from('agendamentos')
              .update({ proximo_envio: proximoEnvioISO })
              .eq('id', agendamento.id);

            console.log(`   ⏰ Próximo envio atualizado para: ${proximoEnvioISO}`);
          }

          continue; // Pular para o próximo agendamento
        }

        console.log(`✅ Verificação OK: Nenhum envio hoje para este agendamento`);

        // ========================================
        // Re-verificar conexão antes de enviar
        // ========================================
        if (!isWhatsAppConnected()) {
          console.log('⚠️ WhatsApp desconectou durante o processamento. Abortando.');
          return;
        }

        // Determinar mensagem final
        let mensagemFinal = agendamento.mensagem;

        // Se randomizar estiver ativo, gerar variação com IA
        if (agendamento.randomizar) {
          console.log(`🎲 Gerando variação com IA...`);
          mensagemFinal = await gerarVariacaoIA(agendamento.mensagem);
          console.log(`✨ Variação gerada: ${mensagemFinal.substring(0, 50)}...`);
        }

        // Enviar mensagem via WhatsApp
        const result = await sendMessage(agendamento.destinatario_id, mensagemFinal);

        // Registrar no histórico
        await supabase.from('historico_envios').insert({
          agendamento_id: agendamento.id,
          status: 'enviado',
          mensagem_id: result?.key?.id || 'unknown',
          erro: null
        });

        console.log(`✅ Mensagem enviada com sucesso!`);
        
        // Calcular próximo envio usando timezone SP
        const proximoEnvio = calcularProximoEnvio(
          agendamento.hora_envio,
          agendamento.dias_semana
        );
        
        if (proximoEnvio) {
          // Armazenar no banco em formato UTC ISO
          const proximoEnvioISO = proximoEnvio.toISOString();

          await supabase
            .from('agendamentos')
            .update({ proximo_envio: proximoEnvioISO })
            .eq('id', agendamento.id);

          console.log(`✅ Próximo envio agendado para: ${proximoEnvio.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`);
          console.log(`💾 Armazenado no banco como: ${proximoEnvioISO}`);
        } else {
          console.log(`⚠️ Não foi possível calcular próximo envio`);
        }
        
      } catch (error) {
        console.error(`❌ Erro ao processar agendamento ${agendamento.id}:`, error.message);
        
        // ========================================
        // CORREÇÃO: Avançar proximo_envio mesmo em caso de erro
        // para evitar loop infinito de retentativas a cada minuto
        // ========================================
        const proximoEnvio = calcularProximoEnvio(
          agendamento.hora_envio,
          agendamento.dias_semana
        );

        if (proximoEnvio) {
          const proximoEnvioISO = proximoEnvio.toISOString();
          await supabase
            .from('agendamentos')
            .update({ proximo_envio: proximoEnvioISO })
            .eq('id', agendamento.id);
          console.log(`   ⏰ Avançando próximo envio para evitar loop: ${proximoEnvioISO}`);
        }

        // Registrar erro no histórico (sem inundar - apenas 1 registro por falha)
        await supabase.from('historico_envios').insert({
          agendamento_id: agendamento.id,
          status: 'erro',
          mensagem_id: null,
          erro: error.message
        });

        // Se erro é de conexão, abortar todos os demais agendamentos
        if (error.message === 'Connection Closed' || error.message === 'WhatsApp não está conectado') {
          console.log('🔌 Conexão perdida. Abortando processamento dos demais agendamentos.');
          return;
        }
      }
    }
    
    console.log('\n✅ Processamento de agendamentos finalizado.');
    
  } catch (error) {
    console.error('❌ Erro fatal no scheduler:', error);
  }
}

export function startScheduler() {
  console.log('⏰ Scheduler iniciado! Verificando agendamentos a cada minuto...');
  console.log('⏰ Primeira verificação será executada IMEDIATAMENTE...\n');
  
  // Executar imediatamente na inicialização
  console.log(`🚀 Executando verificação imediata às ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`);
  processarAgendamentos();
  
  // Executar a cada minuto
  const jobId = cron.schedule('* * * * *', async () => {
    console.log(`\n🔄 [${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}] Verificando agendamentos...`);
    await processarAgendamentos();
  });
  
  console.log('✅ Scheduler ativo - próximas verificações a cada 1 minuto\n');
}
