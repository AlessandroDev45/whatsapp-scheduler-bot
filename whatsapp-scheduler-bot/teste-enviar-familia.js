import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function enviarTeste() {
  try {
    // ── 1. Buscar grupo da família ──────────────────────────
    console.log('🔍 Buscando grupo da família...\n');

    const { data: grupos, error: grupoError } = await supabase
      .from('grupos_usuario')
      .select('grupo_jid, grupo_nome')
      .ilike('grupo_nome', '%famil%')
      .limit(10);

    if (grupoError) throw grupoError;

    if (!grupos || grupos.length === 0) {
      console.log('❌ Nenhum grupo com "famil" encontrado. Listando todos os grupos:\n');

      const { data: todos } = await supabase
        .from('grupos_usuario')
        .select('grupo_jid, grupo_nome, tipo')
        .eq('tipo', 'grupo')
        .order('grupo_nome')
        .limit(30);

      todos?.forEach(g => console.log(`  📌 ${g.grupo_nome}\n     JID: ${g.grupo_jid}\n`));
      return;
    }

    console.log(`✅ Grupos encontrados:`);
    grupos.forEach((g, i) => console.log(`  ${i + 1}. ${g.grupo_nome} → ${g.grupo_jid}`));

    // Usar o primeiro encontrado
    const grupo = grupos[0];
    console.log(`\n🎯 Usando: ${grupo.grupo_nome}\n`);

    // ── 2. Buscar usuário admin ─────────────────────────────
    const { data: usuarios } = await supabase
      .from('usuarios_autorizados')
      .select('id, nome')
      .eq('role', 'admin')
      .limit(1);

    if (!usuarios || usuarios.length === 0) {
      console.log('❌ Nenhum usuário admin encontrado!');
      return;
    }

    const admin = usuarios[0];
    console.log(`👤 Admin: ${admin.nome} (${admin.id})`);

    // ── 3. Calcular proximo_envio = agora + 5 minutos (UTC) ─
    const proximoEnvio = new Date(Date.now() + 5 * 60 * 1000);
    const proximoEnvioISO = proximoEnvio.toISOString();

    // Hora em BRT para registrar como hora_envio
    const horaBRT = proximoEnvio.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const [datePart, timePart] = horaBRT.split(', ');
    const horaEnvio = timePart.substring(0, 5); // HH:MM

    // ── 4. Criar agendamento de uso único ───────────────────
    const mensagem = `✅ Mensagem de teste do WhatsMatic!\n\nEnviada automaticamente em: ${horaBRT} (horário de Brasília)\n\n🤖 Bot funcionando corretamente.`;

    const { data: novo, error: insertError } = await supabase
      .from('agendamentos')
      .insert({
        usuario_id:        admin.id,
        destinatario_id:   grupo.grupo_jid,
        destinatario_nome: grupo.grupo_nome,
        mensagem,
        hora_envio:        horaEnvio,
        dias_semana:       null,      // sem restrição de dia
        proximo_envio:     proximoEnvioISO,
        ativo:             true,
        randomizar:        false,
        data_termino:      proximoEnvioISO  // expira logo após o envio
      })
      .select('id')
      .single();

    if (insertError) throw insertError;

    console.log(`\n✅ Agendamento de teste criado!`);
    console.log(`   ID:            ${novo.id}`);
    console.log(`   Grupo:         ${grupo.grupo_nome}`);
    console.log(`   Horário BRT:   ${horaBRT}`);
    console.log(`   proximo_envio: ${proximoEnvioISO}`);
    console.log(`\n⏳ O bot enviará a mensagem em ~5 minutos.`);
    console.log(`   Certifique-se de que o bot está rodando!`);
    console.log(`   (docker compose up -d  OU  node src/index.js)\n`);

  } catch (err) {
    console.error('❌ Erro:', err.message || err);
  }
}

enviarTeste();
