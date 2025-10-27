import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const telefoneParaAprovar = '553196797442'

console.log('\n🔧 APROVAÇÃO MANUAL DE USUÁRIO\n')
console.log('='.repeat(70))
console.log(`📞 Telefone: ${telefoneParaAprovar}`)
console.log('')

// 1. Buscar usuário
console.log('1️⃣ BUSCANDO USUÁRIO...\n')

const { data: usuario, error: erroBusca } = await supabase
  .from('usuarios_autorizados')
  .select('*')
  .eq('telefone', telefoneParaAprovar)
  .single()

if (erroBusca || !usuario) {
  console.log('❌ ERRO: Usuário não encontrado!')
  console.log(erroBusca)
  process.exit(1)
}

console.log('   ✅ Usuário encontrado:')
console.log(`      👤 Nome: ${usuario.nome}`)
console.log(`      📞 Telefone: ${usuario.telefone}`)
console.log(`      🎭 Role: ${usuario.role}`)
console.log(`      ${usuario.ativo ? '✅' : '❌'} Status: ${usuario.ativo ? 'Ativo' : 'Pendente'}`)
console.log('')

if (usuario.ativo) {
  console.log('⚠️  ATENÇÃO: Usuário já está ATIVO!')
  console.log('   Não é necessário aprovar.')
  process.exit(0)
}

// 2. Aprovar usuário
console.log('2️⃣ APROVANDO USUÁRIO...\n')

const { error: erroAprovar } = await supabase
  .from('usuarios_autorizados')
  .update({ ativo: true })
  .eq('telefone', telefoneParaAprovar)

if (erroAprovar) {
  console.log('❌ ERRO ao aprovar usuário!')
  console.log(erroAprovar)
  process.exit(1)
}

console.log('   ✅ Usuário aprovado com sucesso!')
console.log('')

// 3. Verificar aprovação
console.log('3️⃣ VERIFICANDO APROVAÇÃO...\n')

const { data: usuarioAtualizado } = await supabase
  .from('usuarios_autorizados')
  .select('*')
  .eq('telefone', telefoneParaAprovar)
  .single()

console.log('   📊 Status atual:')
console.log(`      👤 Nome: ${usuarioAtualizado.nome}`)
console.log(`      ${usuarioAtualizado.ativo ? '✅' : '❌'} Status: ${usuarioAtualizado.ativo ? 'Ativo' : 'Pendente'}`)
console.log('')

console.log('='.repeat(70))
console.log('\n✅ APROVAÇÃO CONCLUÍDA!\n')
console.log(`   O usuário ${usuarioAtualizado.nome} agora pode usar o bot.`)
console.log('')

