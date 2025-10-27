import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const telefoneParaAprovar = '55319679744'

console.log('\n🔍 VERIFICANDO USUÁRIO ESPECÍFICO...\n')
console.log('='.repeat(70))
console.log(`📞 Telefone: ${telefoneParaAprovar}`)
console.log('')

// Buscar usuário exato
const { data: usuario, error } = await supabase
  .from('usuarios_autorizados')
  .select('*')
  .eq('telefone', telefoneParaAprovar)
  .single()

if (error) {
  console.log('❌ ERRO ao buscar usuário:')
  console.log(error)
  console.log('')
  
  // Tentar buscar com LIKE
  console.log('🔍 Tentando buscar com LIKE...\n')
  const { data: usuarios } = await supabase
    .from('usuarios_autorizados')
    .select('*')
    .like('telefone', `%${telefoneParaAprovar}%`)
  
  if (usuarios && usuarios.length > 0) {
    console.log(`✅ Encontrados ${usuarios.length} usuários similares:\n`)
    usuarios.forEach(u => {
      console.log(`   📞 ${u.telefone}`)
      console.log(`   👤 ${u.nome}`)
      console.log(`   ${u.ativo ? '✅' : '❌'} Status: ${u.ativo ? 'Ativo' : 'Pendente'}`)
      console.log('')
    })
  } else {
    console.log('❌ Nenhum usuário encontrado com esse número\n')
  }
} else {
  console.log('✅ USUÁRIO ENCONTRADO:\n')
  console.log(`   👤 Nome: ${usuario.nome}`)
  console.log(`   📞 Telefone: ${usuario.telefone}`)
  console.log(`   🎭 Role: ${usuario.role}`)
  console.log(`   ${usuario.ativo ? '✅' : '❌'} Status: ${usuario.ativo ? 'Ativo' : 'Pendente'}`)
  console.log(`   📅 Criado em: ${new Date(usuario.criado_em).toLocaleString('pt-BR')}`)
  console.log('')
  
  if (usuario.ativo) {
    console.log('⚠️  ATENÇÃO: Usuário já está ATIVO!')
    console.log('   Não é possível aprovar um usuário que já está ativo.')
  } else {
    console.log('✅ Usuário está PENDENTE e pode ser aprovado!')
    console.log(`   💡 Comando: /aprovar ${usuario.telefone}`)
  }
}

console.log('')
console.log('='.repeat(70))
console.log('')

// Listar TODOS os usuários para debug
console.log('📋 TODOS OS USUÁRIOS NO BANCO:\n')
const { data: todos } = await supabase
  .from('usuarios_autorizados')
  .select('*')
  .order('criado_em', { ascending: false })

todos?.forEach(u => {
  const statusEmoji = u.ativo ? '✅' : '❌'
  const roleEmoji = u.role === 'admin' ? '👑' : '👤'
  console.log(`${roleEmoji} ${statusEmoji} ${u.nome}`)
  console.log(`   📞 ${u.telefone}`)
  console.log('')
})

console.log('='.repeat(70))
console.log('')

