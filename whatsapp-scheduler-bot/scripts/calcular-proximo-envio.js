require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Erro: Variáveis de ambiente não configuradas');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

function calcularProximoEnvio(horaEnvio, diasSemana, dataTermino = null) {
    const agora = new Date();
    const [horas, minutos] = horaEnvio.split(':').map(Number);
    let proximoEnvio = new Date();
    proximoEnvio.setHours(horas, minutos, 0, 0);

    // Se o horário de hoje já passou, começar de amanhã
    if (proximoEnvio <= agora) {
        proximoEnvio.setDate(proximoEnvio.getDate() + 1);
    }
    
    // Procurar o próximo dia válido (máximo 7 dias)
    let contador = 0;
    while (contador < 7) {
        const diaDaSemanaJS = proximoEnvio.getDay(); // 0=Dom, 1=Seg, ..., 6=Sáb
        const diaDaSemanaNosso = diaDaSemanaJS === 0 ? 7 : diaDaSemanaJS; // 1=Seg, ..., 7=Dom
        
        // Verificar se está dentro dos dias permitidos
        if (diasSemana.includes(diaDaSemanaNosso)) {
            // Verificar se não passou da data de término
            if (dataTermino) {
                const termino = new Date(dataTermino);
                termino.setHours(23, 59, 59, 999); // Final do dia
                if (proximoEnvio > termino) {
                    return null; // Passou da data de término
                }
            }
            return proximoEnvio;
        }
        
        proximoEnvio.setDate(proximoEnvio.getDate() + 1);
        contador++;
    }
    
    return null;
}

async function atualizarProximosEnvios() {
    try {
        console.log('🔄 Buscando agendamentos ativos...\n');
        
        const { data: agendamentos, error } = await supabase
            .from('agendamentos')
            .select('*')
            .eq('ativo', true);

        if (error) {
            console.error('❌ Erro ao buscar agendamentos:', error);
            process.exit(1);
        }

        if (!agendamentos || agendamentos.length === 0) {
            console.log('✅ Nenhum agendamento ativo encontrado.');
            return;
        }

        console.log(`✅ Encontrados ${agendamentos.length} agendamentos ativos.\n`);

        let atualizados = 0;
        let desativados = 0;
        let erros = 0;

        for (const agendamento of agendamentos) {
            const { id, hora_envio, dias_semana, data_termino, destinatario_nome } = agendamento;

            console.log(`📋 Processando: ${destinatario_nome || id}`);
            console.log(`   Horário: ${hora_envio}`);
            console.log(`   Dias: ${dias_semana.join(', ')}`);

            if (!hora_envio || !dias_semana || dias_semana.length === 0) {
                console.log(`   ⚠️  Dados incompletos. Pulando.\n`);
                erros++;
                continue;
            }

            const proximoEnvio = calcularProximoEnvio(hora_envio, dias_semana, data_termino);

            if (proximoEnvio) {
                const { error: updateError } = await supabase
                    .from('agendamentos')
                    .update({ proximo_envio: proximoEnvio.toISOString() })
                    .eq('id', id);

                if (updateError) {
                    console.log(`   ❌ Erro ao atualizar: ${updateError.message}\n`);
                    erros++;
                } else {
                    console.log(`   ✅ Próximo envio: ${proximoEnvio.toLocaleString('pt-BR')}\n`);
                    atualizados++;
                }
            } else {
                // Agendamento expirado (passou da data de término)
                const { error: updateError } = await supabase
                    .from('agendamentos')
                    .update({ ativo: false })
                    .eq('id', id);

                if (updateError) {
                    console.log(`   ❌ Erro ao desativar: ${updateError.message}\n`);
                    erros++;
                } else {
                    console.log(`   ⏸️  Desativado (passou da data de término)\n`);
                    desativados++;
                }
            }
        }

        console.log('='.repeat(60));
        console.log('✅ PROCESSAMENTO CONCLUÍDO!');
        console.log('='.repeat(60));
        console.log(`📊 Resumo:`);
        console.log(`   ✅ Atualizados: ${atualizados}`);
        console.log(`   ⏸️  Desativados: ${desativados}`);
        console.log(`   ❌ Erros: ${erros}`);
        console.log('='.repeat(60));

    } catch (error) {
        console.error('❌ Erro geral:', error);
        process.exit(1);
    }
}

atualizarProximosEnvios();

