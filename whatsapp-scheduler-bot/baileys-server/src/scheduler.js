import cron from 'node-cron';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { sendMessage } from './whatsapp.js';

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

    // Converter para string no formato do banco (YYYY-MM-DD HH:MM:SS) em timezone SP
    const agoraString = agoraUTC.toLocaleString('sv-SE', { timeZone: 'America/Sao_Paulo' });

    // Criar Date object a partir da string SP (para comparações)
    const agoraSP = new Date(agoraString.replace(' ', 'T'));

    const [horas, minutos, segundos = 0] = horaEnvio.split(':').map(Number);

    console.log(`   Parsed: ${horas}:${minutos}:${segundos}`);

    // Criar próximo envio em SP
    let proximoEnvio = new Date(agoraSP);
    proximoEnvio.setHours(horas, minutos, segundos, 0);

    console.log(`   Próximo envio inicial: ${proximoEnvio.toISOString()}`);
    console.log(`   Agora SP: ${agoraSP.toISOString()}`);

    // Se já passou do horário em SP, agendar para amanhã
    if (proximoEnvio <= agoraSP) {
      console.log(`   ⏭️ Horário já passou, agendando para amanhã`);
      proximoEnvio.setDate(proximoEnvio.getDate() + 1);
    }

    // Se dias_semana for null ou vazio, retorna o próximo envio calculado
    if (!diasSemana || diasSemana.length === 0) {
      console.log(`   ✅ Sem restrição de dias da semana`);
      // Converter para UTC para armazenar no banco
      const resultado = proximoEnvio.toISOString();
      console.log(`   📅 Resultado: ${resultado}`);
      return new Date(resultado);
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
        // Converter para UTC para armazenar no banco
        const resultado = proximoEnvio.toISOString();
        console.log(`   📅 Resultado: ${resultado}`);
        return new Date(resultado);
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
    // Obter hora atual em UTC
    const agoraUTC = new Date();
    const agoraUTCString = agoraUTC.toISOString();

    // Converter para string no formato do banco (YYYY-MM-DD HH:MM:SS) em timezone SP
    const agoraString = agoraUTC.toLocaleString('sv-SE', { timeZone: 'America/Sao_Paulo' });

    // Criar Date object a partir da string SP (para comparações)
    const agoraSP = new Date(agoraString.replace(' ', 'T'));

    console.log(`🕐 Hora atual (UTC): ${agoraUTCString}`);
    console.log(`🕐 Hora atual (SP): ${agoraUTC.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`);
    console.log(`🕐 Hora atual (banco): ${agoraString}`);

    // Buscar agendamentos que precisam ser enviados (comparando UTC com UTC)
    const { data: agendamentos, error } = await supabase
      .from('agendamentos')
      .select('*')
      .eq('ativo', true)
      .lte('proximo_envio', agoraUTCString)
      .or(`data_termino.is.null,data_termino.gte.${agoraUTCString}`);

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
        console.log(`   Mensagem original: ${agendamento.mensagem.substring(0, 50)}...`);
        console.log(`   Randomizar: ${agendamento.randomizar ? 'SIM' : 'NÃO'}`);

        // Determinar mensagem final
        let mensagemFinal = agendamento.mensagem;

        // Se randomizar estiver ativo, gerar variação com IA
        if (agendamento.randomizar) {
          console.log(`🎲 Gerando variação com IA...`);
          mensagemFinal = await gerarVariacaoIA(agendamento.mensagem);
          console.log(`✨ Variação gerada: ${mensagemFinal.substring(0, 50)}...`);
        }

        // Enviar mensagem via Baileys
        const result = await sendMessage(agendamento.destinatario_id, mensagemFinal);

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
