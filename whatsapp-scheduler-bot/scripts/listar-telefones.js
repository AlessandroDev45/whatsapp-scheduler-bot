import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Erro: SUPABASE_URL ou SUPABASE_SERVICE_KEY não configurados');
  console.error('Certifique-se de criar um arquivo .env com essas variáveis');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function listarTelefones() {
  try {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📱 NÚMEROS DE TELEFONE DO WHATSAPP');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Buscar usuários
    const { data: usuarios, error: erroUsuarios } = await supabase
      .from('usuarios_autorizados')
      .select('id, telefone, nome, ativo');

    if (erroUsuarios) {
      console.error('❌ Erro ao buscar usuários:', erroUsuarios);
      return;
    }

    if (usuarios && usuarios.length > 0) {
      console.log('👥 USUÁRIOS CADASTRADOS:\n');
      usuarios.forEach((u, i) => {
        const status = u.ativo ? '✅' : '❌';
        console.log(`${i + 1}. ${status} ${u.nome}`);
        console.log(`   📱 Telefone: ${u.telefone}`);
        console.log(`   🆔 ID: ${u.id}\n`);
      });
    } else {
      console.log('⚠️ Nenhum usuário encontrado\n');
    }

    // Buscar grupos e contatos
    const { data: grupos, error: erroGrupos } = await supabase
      .from('grupos_usuario')
      .select('grupo_jid, grupo_nome, tipo, ativo');

    if (erroGrupos) {
      console.error('❌ Erro ao buscar grupos:', erroGrupos);
      return;
    }

    if (grupos && grupos.length > 0) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📞 CONTATOS E GRUPOS SINCRONIZADOS:\n');
      
      const contatos = grupos.filter(g => g.tipo === 'contato' && g.ativo);
      const gruposAtivos = grupos.filter(g => g.tipo === 'grupo' && g.ativo);
      
      if (contatos.length > 0) {
        console.log(`\n🔵 CONTATOS (${contatos.length}):\n`);
        contatos.forEach((c, i) => {
          const numero = c.grupo_jid.replace('@s.whatsapp.net', '').replace('@c.us', '');
          console.log(`${i + 1}. ${c.grupo_nome || numero}`);
          console.log(`   📱 ${numero}\n`);
        });
      }
      
      if (gruposAtivos.length > 0) {
        console.log(`\n🟢 GRUPOS (${gruposAtivos.length}):\n`);
        gruposAtivos.forEach((g, i) => {
          const id = g.grupo_jid.replace('@g.us', '');
          console.log(`${i + 1}. ${g.grupo_nome}`);
          console.log(`   🆔 JID: ${id}\n`);
        });
      }
    } else {
      console.log('⚠️ Nenhum grupo ou contato sincronizado\n');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ Erro geral:', error.message);
    console.error(error);
  }
}

listarTelefones();
