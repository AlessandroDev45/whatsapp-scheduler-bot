import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const ADMIN_NUMBER = '553184549893'

console.log('\n🔍 VERIFICAÇÃO COMPLETA DE ADMIN\n')
console.log('='.repeat(70))

// 1. Verificar ADMIN_NUMBER hardcoded
console.log('\n1️⃣ ADMIN HARDCODED NO CÓDIGO:\n')
console.log(`   📞 ADMIN_NUMBER: ${ADMIN_NUMBER}`)
console.log('')

// 2. Buscar esse número no banco
console.log('2️⃣ BUSCANDO NO BANCO DE DADOS:\n')

const { data: adminUser, error } = await supabase
  .from('usuarios_autorizados')
  .select('*')
  .eq('telefone', ADMIN_NUMBER)
  .single()

if (error) {
  console.log('   ❌ ERRO: Admin não encontrado no banco!')
  console.log(`   ${error.message}`)
  console.log('')
  console.log('   🔴 PROBLEMA CRÍTICO: O número hardcoded não existe no banco!')
} else {
  console.log('   ✅ Admin encontrado no banco:')
  console.log(`      👤 Nome: ${adminUser.nome}`)
  console.log(`      📞 Telefone: ${adminUser.telefone}`)
  console.log(`      🎭 Role: ${adminUser.role}`)
  console.log(`      ${adminUser.ativo ? '✅' : '❌'} Status: ${adminUser.ativo ? 'Ativo' : 'Inativo'}`)
  console.log('')
  
  if (adminUser.role !== 'admin') {
    console.log('   ⚠️  ATENÇÃO: Role não é "admin"!')
    console.log('   Isso pode causar problemas em verificações baseadas em role.')
  }
  
  if (!adminUser.ativo) {
    console.log('   ⚠️  ATENÇÃO: Admin está INATIVO!')
    console.log('   Isso pode causar problemas.')
  }
}

console.log('')
console.log('='.repeat(70))

// 3. Verificar se há verificação de role no código
console.log('\n3️⃣ VERIFICAÇÃO DE PERMISSÃO:\n')
console.log('   O código usa duas formas de verificar admin:')
console.log('   A) verificarPermissaoAdmin(telefone) - Compara com ADMIN_NUMBER')
console.log('   B) user.role === "admin" - Verifica role no banco')
console.log('')

// 4. Simular verificação
const sender = '553184549893'
const numeroLimpo = sender.split('@')[0]
const isAdminByNumber = numeroLimpo === ADMIN_NUMBER
const isAdminByRole = adminUser?.role === 'admin'

console.log('4️⃣ SIMULAÇÃO DE VERIFICAÇÃO:\n')
console.log(`   Sender: ${sender}`)
console.log(`   ✅ Por número (ADMIN_NUMBER): ${isAdminByNumber}`)
console.log(`   ${isAdminByRole ? '✅' : '❌'} Por role (banco): ${isAdminByRole}`)
console.log('')

if (isAdminByNumber && isAdminByRole) {
  console.log('   ✅ TUDO OK! Admin verificado por ambos os métodos.')
} else if (isAdminByNumber && !isAdminByRole) {
  console.log('   ⚠️  Admin verificado por número, mas role não é "admin"!')
} else if (!isAdminByNumber && isAdminByRole) {
  console.log('   ⚠️  Admin verificado por role, mas número não bate!')
} else {
  console.log('   ❌ ERRO! Admin não verificado por nenhum método!')
}

console.log('')
console.log('='.repeat(70))
console.log('')

