/**
 * Script: Sincronizar TODOS os Contatos (não apenas conversas recentes)
 * 
 * Usa endpoint diferente para pegar TODOS os contatos da agenda
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
const BOT_INSTANCE_NAME = process.env.BOT_INSTANCE_NAME;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🔄 SINCRONIZAÇÃO COMPLETA - TODOS OS CONTATOS');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

async function testarEndpoints() {
  console.log('🔍 Testando endpoints disponíveis da Evolution API...\n');

  const endpoints = [
    { nome: 'findContacts', url: `/chat/findContacts/${BOT_INSTANCE_NAME}` },
    { nome: 'findChats', url: `/chat/findChats/${BOT_INSTANCE_NAME}` },
    { nome: 'fetchAllGroups', url: `/group/fetchAllGroups/${BOT_INSTANCE_NAME}?getParticipants=false` },
  ];

  const resultados = {};

  for (const endpoint of endpoints) {
    try {
      console.log(`📡 Testando: ${endpoint.nome}`);
      console.log(`   URL: ${EVOLUTION_API_URL}${endpoint.url}`);
      
      const response = await fetch(`${EVOLUTION_API_URL}${endpoint.url}`, {
        method: 'GET',
        headers: { 'apikey': EVOLUTION_API_KEY },
        signal: AbortSignal.timeout(15000) // 15 segundos timeout
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`   ✅ Status: ${response.status}`);
        console.log(`   📊 Total de itens: ${data.length}`);
        
        // Mostrar primeiros 3 itens
        if (data.length > 0) {
          console.log(`   📋 Primeiros 3 itens:`);
          data.slice(0, 3).forEach((item, i) => {
            const nome = item.name || item.pushName || item.subject || item.id?.split('@')[0] || 'Sem nome';
            const tipo = item.id?.endsWith('@g.us') ? 'grupo' : 'contato';
            console.log(`      ${i + 1}. ${nome} (${tipo})`);
          });
        }
        
        resultados[endpoint.nome] = data;
      } else {
        console.log(`   ❌ Status: ${response.status}`);
        resultados[endpoint.nome] = [];
      }
    } catch (error) {
      console.log(`   ❌ Erro: ${error.message}`);
      resultados[endpoint.nome] = [];
    }
    console.log('');
  }

  return resultados;
}

async function sincronizarTudo() {
  try {
    // 1. Buscar usuário
    console.log('📋 ETAPA 1: Buscando usuário...\n');
    const { data: users } = await supabase
      .from('usuarios_autorizados')
      .select('*')
      .limit(1);

    if (!users || users.length === 0) {
      console.error('❌ Nenhum usuário encontrado!');
      return;
    }

    const user = users[0];
    console.log(`✅ Usuário: ${user.nome} (ID: ${user.id})\n`);

    // 2. Testar todos os endpoints
    console.log('📋 ETAPA 2: Testando endpoints...\n');
    const resultados = await testarEndpoints();

    // 3. Combinar todos os resultados
    console.log('📋 ETAPA 3: Combinando resultados...\n');
    
    const todosItens = new Map(); // Usar Map para evitar duplicatas

    // Adicionar do findChats (conversas recentes)
    if (resultados.findChats) {
      resultados.findChats.forEach(item => {
        const id = item.id;
        const nome = item.name || item.pushName || item.id?.split('@')[0] || 'Sem nome';
        const tipo = id?.endsWith('@g.us') ? 'grupo' : 'contato';
        
        if (!todosItens.has(id)) {
          todosItens.set(id, { id, nome, tipo });
        }
      });
    }

    // Adicionar do findContacts
    if (resultados.findContacts) {
      resultados.findContacts.forEach(item => {
        const id = item.id;
        const nome = item.name || item.pushName || item.verifiedName || item.id?.split('@')[0] || 'Sem nome';
        const tipo = 'contato';
        
        if (!todosItens.has(id)) {
          todosItens.set(id, { id, nome, tipo });
        }
      });
    }

    // Adicionar do fetchAllGroups
    if (resultados.fetchAllGroups) {
      resultados.fetchAllGroups.forEach(item => {
        const id = item.id;
        const nome = item.subject || item.id?.split('@')[0] || 'Sem nome';
        const tipo = 'grupo';
        
        if (!todosItens.has(id)) {
          todosItens.set(id, { id, nome, tipo });
        }
      });
    }

    const itensArray = Array.from(todosItens.values());
    
    console.log(`📊 Total de itens únicos encontrados: ${itensArray.length}`);
    console.log(`   📱 Contatos: ${itensArray.filter(i => i.tipo === 'contato').length}`);
    console.log(`   👥 Grupos: ${itensArray.filter(i => i.tipo === 'grupo').length}\n`);

    if (itensArray.length === 0) {
      console.log('⚠️ Nenhum item encontrado para sincronizar!');
      console.log('\n💡 Possíveis causas:');
      console.log('   1. WhatsApp não está conectado');
      console.log('   2. Nenhuma conversa recente');
      console.log('   3. API da Evolution está com problemas\n');
      return;
    }

    // 4. Preparar dados para inserção
    console.log('📋 ETAPA 4: Preparando dados para inserção...\n');
    
    const registrosParaInserir = itensArray.map(item => ({
      usuario_id: user.id,
      grupo_jid: item.id,
      grupo_nome: item.nome,
      tipo: item.tipo,
      ativo: true
    }));

    // 5. Limpar dados antigos
    console.log('📋 ETAPA 5: Limpando dados antigos...\n');
    
    const { error: deleteError } = await supabase
      .from('grupos_usuario')
      .delete()
      .eq('usuario_id', user.id);

    if (deleteError) {
      console.error('❌ Erro ao limpar dados antigos:', deleteError);
    } else {
      console.log('✅ Dados antigos removidos\n');
    }

    // 6. Inserir novos dados em lotes
    console.log('📋 ETAPA 6: Inserindo novos dados...\n');
    
    const BATCH_SIZE = 100;
    let totalInserido = 0;
    
    for (let i = 0; i < registrosParaInserir.length; i += BATCH_SIZE) {
      const batch = registrosParaInserir.slice(i, i + BATCH_SIZE);
      
      const { error: insertError } = await supabase
        .from('grupos_usuario')
        .insert(batch);

      if (insertError) {
        console.error(`❌ Erro ao inserir lote ${Math.floor(i / BATCH_SIZE) + 1}:`, insertError);
      } else {
        totalInserido += batch.length;
        console.log(`✅ Lote ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length} registros (Total: ${totalInserido}/${registrosParaInserir.length})`);
      }
    }

    // 7. Verificar resultado
    console.log('\n📋 ETAPA 7: Verificando resultado...\n');
    
    const { data: verificacao } = await supabase
      .from('grupos_usuario')
      .select('tipo')
      .eq('usuario_id', user.id);

    const totalContatos = verificacao?.filter(r => r.tipo === 'contato').length || 0;
    const totalGrupos = verificacao?.filter(r => r.tipo === 'grupo').length || 0;
    
    console.log(`✅ Verificação concluída:`);
    console.log(`   📱 Contatos no banco: ${totalContatos}`);
    console.log(`   👥 Grupos no banco: ${totalGrupos}`);
    console.log(`   📊 Total no banco: ${verificacao?.length || 0}\n`);

    // 8. Mostrar primeiros 10
    const { data: primeiros } = await supabase
      .from('grupos_usuario')
      .select('grupo_nome, tipo')
      .eq('usuario_id', user.id)
      .order('grupo_nome')
      .limit(10);

    if (primeiros && primeiros.length > 0) {
      console.log('📋 Primeiros 10 registros:\n');
      primeiros.forEach((r, i) => {
        const icone = r.tipo === 'grupo' ? '👥' : '📱';
        console.log(`   ${i + 1}. ${icone} ${r.grupo_nome}`);
      });
    }

    // Resumo final
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 RESUMO DA SINCRONIZAÇÃO');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`✅ Usuário: ${user.nome}`);
    console.log(`📱 Contatos: ${totalContatos}`);
    console.log(`👥 Grupos: ${totalGrupos}`);
    console.log(`📊 Total: ${totalInserido}`);
    console.log('\n🎉 SINCRONIZAÇÃO CONCLUÍDA!\n');
    
    if (totalInserido > 0) {
      console.log('💡 Agora você pode buscar destinatários!');
      console.log('💡 A busca será RÁPIDA (~100ms)!\n');
    } else {
      console.log('⚠️ Nenhum dado foi sincronizado.');
      console.log('💡 Verifique se o WhatsApp está conectado.\n');
    }

  } catch (error) {
    console.error('\n❌ ERRO GERAL:', error);
  }
}

sincronizarTudo().catch(console.error);

