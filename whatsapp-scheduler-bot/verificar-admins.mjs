import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

console.log('\n🔍 VERIFICANDO ADMINISTRADORES...\n')
console.log('='.repeat(70))

// Buscar todos os usuários
const { data: usuarios, error } = await supabase
  .from('usuarios_autorizados')
  .select('*')
  .order('role', { ascending: false })
  .order('nome')

if (error) {
  console.error('❌ Erro ao buscar usuários:', error)
  process.exit(1)
}

console.log('\n👥 USUÁRIOS CADASTRADOS:\n')

let totalAdmins = 0
let totalUsers = 0

usuarios?.forEach(u => {
  const roleEmoji = u.role === 'admin' ? '👑' : '👤'
  const statusEmoji = u.ativo ? '✅' : '❌'
  const roleText = u.role === 'admin' ? 'ADMIN' : 'USER'
  
  console.log(`${roleEmoji} ${statusEmoji} ${u.nome}`)
  console.log(`   📞 Telefone: ${u.telefone}`)
  console.log(`   🎭 Role: ${roleText}`)
  console.log(`   📅 Criado em: ${new Date(u.criado_em).toLocaleString('pt-BR')}`)
  console.log('')
  
  if (u.role === 'admin') totalAdmins++
  else totalUsers++
})

console.log('='.repeat(70))
console.log(`\n📊 RESUMO:`)
console.log(`   👑 Administradores: ${totalAdmins}`)
console.log(`   👤 Usuários: ${totalUsers}`)
console.log(`   📱 Total: ${usuarios?.length || 0}`)
console.log('')

// Verificar o número hardcoded no código
console.log('='.repeat(70))
console.log('\n🔧 ADMIN HARDCODED NO CÓDIGO:')
console.log('   📞 Número: 553184549893')
console.log('')

// Verificar se esse número está cadastrado
const adminHardcoded = usuarios?.find(u => u.telefone === '553184549893')
if (adminHardcoded) {
  console.log(`   ✅ Encontrado no banco: ${adminHardcoded.nome}`)
  console.log(`   🎭 Role: ${adminHardcoded.role}`)
  console.log(`   ${adminHardcoded.ativo ? '✅' : '❌'} Status: ${adminHardcoded.ativo ? 'Ativo' : 'Inativo'}`)
} else {
  console.log('   ❌ NÃO encontrado no banco de dados!')
}
console.log('')

