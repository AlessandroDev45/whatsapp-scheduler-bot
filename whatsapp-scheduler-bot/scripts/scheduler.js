require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

// Carregar variáveis de ambiente
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
const BOT_INSTANCE_NAME = process.env.BOT_INSTANCE_NAME || 'main';

// Validar variáveis de ambiente obrigatórias
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
  console.error('❌ Erro: Variáveis de ambiente obrigatórias não configuradas');
  console.error('Verifique: SUPABASE_URL, SUPABASE_SERVICE_KEY, EVOLUTION_API_URL, EVOLUTION_API_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

function calcularProximoEnvio(horaEnvio, diasSemana) {
    const agora = new Date();
    const [horas, minutos] = horaEnvio.split(':').map(Number);
    let proximoEnvio = new Date();
    proximoEnvio.setHours(horas, minutos, 0, 0);

    if (proximoEnvio <= agora) {
        proximoEnvio.setDate(proximoEnvio.getDate() + 1);
    }
    
    let contador = 0;
    while (contador < 7) {
        const diaDaSemanaJS = proximoEnvio.getDay();
        const diaDaSemanaNosso = diaDaSemanaJS === 0 ? 7 : diaDaSemanaJS;
        if (diasSemana.includes(diaDaSemanaNosso)) {
            return proximoEnvio;
        }
        proximoEnvio.setDate(proximoEnvio.getDate() + 1);
        contador++;
    }
    return null;
}

async function enviarMensagem(destinatario, mensagem) {
    console.log(`Enviando mensagem para ${destinatario}...`);
    const url = `${EVOLUTION_API_URL}/message/sendText/${BOT_INSTANCE_NAME}`;

    try {
        // Criar AbortController para timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 segundos timeout

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': EVOLUTION_API_KEY
            },
            body: JSON.stringify({
                number: destinatario,
                options: {
                    delay: 1200,
                    presence: 'composing',
                },
                textMessage: {
                    text: mensagem
                }
            }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        const data = await response.json();
        console.log(`Resposta da API:`, JSON.stringify(data, null, 2));

        if (!response.ok) {
            throw new Error(`Erro da API: ${JSON.stringify(data)}`);
        }

        console.log(`✅ Mensagem para ${destinatario} enviada com sucesso!`);
        return { status: 'enviado', messageId: data.key?.id };

    } catch (error) {
        if (error.name === 'AbortError') {
            console.error(`❌ Timeout ao enviar para ${destinatario} (10s)`);
            return { status: 'erro', error: 'Timeout após 10 segundos' };
        }
        console.error(`❌ Falha ao enviar para ${destinatario}:`, error.message);
        return { status: 'erro', error: error.message };
    }
}

async function processarAgendamentos() {
    try {
        console.log('Iniciando verificação de agendamentos...');
        const agora = new Date().toISOString();

        const { data: agendamentos, error } = await supabase
            .from('agendamentos')
            .select('*')
            .eq('ativo', true)
            .or('proximo_envio.is.null,proximo_envio.lte.' + agora);

        if (error) {
            console.error('❌ Erro ao buscar agendamentos:', error);
            process.exit(1);
        }
        if (!agendamentos || agendamentos.length === 0) {
            console.log('✅ Nenhum agendamento para enviar agora.');
            return;
        }
        console.log(`✅ Encontrados ${agendamentos.length} agendamentos para processar.`);

        for (const agendamento of agendamentos) {
            const { id, mensagem, destinatario_id, hora_envio, dias_semana } = agendamento;

            // Validar dados obrigatórios
            if (!id || !mensagem || !destinatario_id || !hora_envio || !dias_semana) {
                console.error(`❌ Agendamento ${id} com dados incompletos. Pulando.`);
                continue;
            }

            const resultadoEnvio = await enviarMensagem(destinatario_id, mensagem);

            const { error: histError } = await supabase.from('historico_envios').insert({
                agendamento_id: id,
                status: resultadoEnvio.status,
                mensagem_id: resultadoEnvio.messageId,
                erro: resultadoEnvio.error,
            });

            if (histError) {
                console.error(`❌ Erro ao registrar histórico para ${id}:`, histError);
            }

            const proximoEnvio = calcularProximoEnvio(hora_envio, dias_semana);
            if (proximoEnvio) {
                const { error: updateError } = await supabase
                    .from('agendamentos')
                    .update({ proximo_envio: proximoEnvio.toISOString() })
                    .eq('id', id);
                if (updateError) console.error(`❌ Erro ao atualizar agendamento ${id}:`, updateError);
                else console.log(`✅ Agendamento ${id} atualizado para: ${proximoEnvio.toISOString()}`);
            } else {
                console.log(`⚠️ Nenhum próximo dia válido para o agendamento ${id}. Desativando.`);
                await supabase.from('agendamentos').update({ ativo: false }).eq('id', id);
            }
        }
        console.log('✅ Processamento de agendamentos finalizado.');
    } catch (error) {
        console.error('❌ Erro geral no processamento:', error);
        process.exit(1);
    }
}

processarAgendamentos();
