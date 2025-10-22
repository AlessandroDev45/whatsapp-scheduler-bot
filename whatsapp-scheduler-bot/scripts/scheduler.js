const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

// Carregar variáveis de ambiente
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
const BOT_INSTANCE_NAME = process.env.BOT_INSTANCE_NAME || 'main';

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
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': EVOLUTION_API_KEY },
            body: JSON.stringify({ number: destinatario, textMessage: { text: mensagem } }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(`Erro da API: ${data.message || response.statusText}`);
        console.log(`Mensagem para ${destinatario} enviada com sucesso.`);
        return { status: 'enviado', messageId: data.key.id };
    } catch (error) {
        console.error(`Falha ao enviar para ${destinatario}:`, error);
        return { status: 'erro', error: error.message };
    }
}

async function processarAgendamentos() {
    console.log('Iniciando verificação de agendamentos...');
    const agora = new Date().toISOString();

    const { data: agendamentos, error } = await supabase
        .from('agendamentos')
        .select('*')
        .eq('ativo', true)
        .or('proximo_envio.is.null,proximo_envio.lte.' + agora);

    if (error) {
        console.error('Erro ao buscar agendamentos:', error);
        return;
    }
    if (!agendamentos || agendamentos.length === 0) {
        console.log('Nenhum agendamento para enviar agora.');
        return;
    }
    console.log(`Encontrados ${agendamentos.length} agendamentos para processar.`);

    for (const agendamento of agendamentos) {
        const { id, mensagem, destinatario_id, hora_envio, dias_semana } = agendamento;
        const resultadoEnvio = await enviarMensagem(destinatario_id, mensagem);

        await supabase.from('historico_envios').insert({
            agendamento_id: id,
            status: resultadoEnvio.status,
            mensagem_id: resultadoEnvio.messageId,
            erro: resultadoEnvio.error,
        });
        
        const proximoEnvio = calcularProximoEnvio(hora_envio, dias_semana);
        if (proximoEnvio) {
            const { error: updateError } = await supabase
                .from('agendamentos')
                .update({ proximo_envio: proximoEnvio.toISOString() })
                .eq('id', id);
            if (updateError) console.error(`Erro ao atualizar agendamento ${id}:`, updateError);
            else console.log(`Agendamento ${id} atualizado para: ${proximoEnvio.toISOString()}`);
        } else {
            console.log(`Nenhum próximo dia válido para o agendamento ${id}. Desativando.`);
            await supabase.from('agendamentos').update({ ativo: false }).eq('id', id);
        }
    }
    console.log('Processamento de agendamentos finalizado.');
}

processarAgendamentos();
