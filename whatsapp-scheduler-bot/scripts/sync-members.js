const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
const GROUP_ID = process.env.GROUP_ID;
const BOT_INSTANCE_NAME = process.env.BOT_INSTANCE_NAME || 'main';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function getGroupMembers() {
    const url = `${EVOLUTION_API_URL}/group/participants/${BOT_INSTANCE_NAME}?groupJid=${GROUP_ID}`;
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: { 'apikey': EVOLUTION_API_KEY },
        });
        if (!response.ok) throw new Error(`Erro da API: ${response.statusText}`);
        const data = await response.json();
        return data.participants ? data.participants.map(p => p.id.split('@')[0]) : data.map(p => p.id.split('@')[0]);
    } catch (error) {
        console.error('Falha ao buscar membros do grupo:', error);
        return null;
    }
}

async function syncMembers() {
    console.log('Iniciando sincronização de membros...');
    const membersFromAPI = await getGroupMembers();

    if (!membersFromAPI) {
        console.log('Não foi possível buscar membros da API. Abortando.');
        return;
    }
    console.log(`Encontrados ${membersFromAPI.length} membros no grupo.`);

    const { data: membersInDB, error: fetchError } = await supabase
        .from('usuarios_autorizados')
        .select('telefone');

    if (fetchError) {
        console.error('Erro ao buscar usuários do banco:', fetchError);
        return;
    }

    const memberPhonesInDB = membersInDB.map(m => m.telefone);
    
    const newMembers = membersFromAPI.filter(phone => !memberPhonesInDB.includes(phone));
    if (newMembers.length > 0) {
        const newUsers = newMembers.map(phone => ({
            telefone: phone,
            nome: `Usuário ${phone}`,
            ativo: true,
        }));
        const { error: insertError } = await supabase.from('usuarios_autorizados').insert(newUsers);
        if (insertError) console.error('Erro ao inserir novos membros:', insertError);
        else console.log(`${newMembers.length} novos membros adicionados.`);
    }

    const removedMembers = memberPhonesInDB.filter(phone => !membersFromAPI.includes(phone));
    if (removedMembers.length > 0) {
        const { error: updateError } = await supabase
            .from('usuarios_autorizados')
            .update({ ativo: false })
            .in('telefone', removedMembers);
        
        if (updateError) console.error('Erro ao desativar membros:', updateError);
        else console.log(`${removedMembers.length} membros desativados.`);
    }
    
    console.log('Sincronização finalizada.');
}

syncMembers();
