import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const ADMIN_NUMBER = '553184549893'

console.log('\n🔍 TESTANDO FLUXO COMPLETO DE APROVAÇÃO\n')
console.log('='.repeat(70))

// CENÁRIO: Admin Alessandro tenta aprovar usuário
const adminTelefone = '553184549893'
const usuarioParaAprovar = '553196797442'

console.log('\n📋 CENÁRIO:\n')
console.log(`   Admin: ${adminTelefone}`)
console.log(`   Usuário para aprovar: ${usuarioParaAprovar}`)
console.log('')

// PASSO 1: Verificar se quem está tentando aprovar é admin
console.log('1️⃣ VERIFICANDO SE É ADMIN:\n')

const { data: adminUser, error: adminError } = await supabase
  .from('usuarios_autorizados')
  .select('*')
  .eq('telefone', adminTelefone)
  .single()

if (adminError || !adminUser) {
  console.log('   ❌ ERRO: Admin não encontrado no banco!')
  console.log(`   ${adminError?.message}`)
} else {
  console.log(`   👤 Nome: ${adminUser.nome}`)
  console.log(`   📞 Telefone: ${adminUser.telefone}`)
  console.log(`   🎭 Role: ${adminUser.role}`)
  console.log(`   ${adminUser.ativo ? '✅' : '❌'} Ativo: ${adminUser.ativo}`)
  console.log('')
  
  // Verificação 1: Por número hardcoded
  const numeroLimpo = adminTelefone.split('@')[0]
  const isAdminByNumber = numeroLimpo === ADMIN_NUMBER
  console.log(`   Verificação por número: ${isAdminByNumber ? '✅' : '❌'} ${isAdminByNumber}`)
  
  // Verificação 2: Por role no banco
  const isAdminByRole = adminUser.role === 'admin'
  console.log(`   Verificação por role: ${isAdminByRole ? '✅' : '❌'} ${isAdminByRole}`)
  
  // Verificação 3: Está ativo?
  const isAtivo = adminUser.ativo === true
  console.log(`   Está ativo: ${isAtivo ? '✅' : '❌'} ${isAtivo}`)
  console.log('')
  
  if (!isAdminByNumber) {
    console.log('   🔴 PROBLEMA: Número não bate com ADMIN_NUMBER!')
    console.log(`      Esperado: ${ADMIN_NUMBER}`)
    console.log(`      Recebido: ${numeroLimpo}`)
  }
  
  if (!isAdminByRole) {
    console.log('   🔴 PROBLEMA: Role não é "admin"!')
  }
  
  if (!isAtivo) {
    console.log('   🔴 PROBLEMA: Admin está INATIVO!')
  }
}

console.log('')
console.log('='.repeat(70))

// PASSO 2: Verificar usuário a ser aprovado
console.log('\n2️⃣ VERIFICANDO USUÁRIO A SER APROVADO:\n')

const { data: userToApprove, error: userError } = await supabase
  .from('usuarios_autorizados')
  .select('*')
  .eq('telefone', usuarioParaAprovar)
  .eq('ativo', false)
  .single()

if (userError || !userToApprove) {
  console.log('   ❌ ERRO: Usuário não encontrado ou já aprovado!')
  console.log(`   ${userError?.message}`)
  console.log('')
  
  // Tentar buscar sem filtro de ativo
  const { data: anyUser } = await supabase
    .from('usuarios_autorizados')
    .select('*')
    .eq('telefone', usuarioParaAprovar)
    .single()
  
  if (anyUser) {
    console.log('   ℹ️  Usuário existe mas:')
    console.log(`      Ativo: ${anyUser.ativo}`)
    if (anyUser.ativo) {
      console.log('      ⚠️  Já está APROVADO!')
    }
  }
} else {
  console.log(`   👤 Nome: ${userToApprove.nome}`)
  console.log(`   📞 Telefone: ${userToApprove.telefone}`)
  console.log(`   🎭 Role: ${userToApprove.role}`)
  console.log(`   ❌ Ativo: ${userToApprove.ativo}`)
  console.log('')
  console.log('   ✅ Usuário pode ser aprovado!')
}

console.log('')
console.log('='.repeat(70))

// PASSO 3: Simular aprovação
console.log('\n3️⃣ SIMULANDO APROVAÇÃO:\n')

if (adminUser && (adminUser.role === 'admin' || adminTelefone === ADMIN_NUMBER)) {
  if (userToApprove) {
    console.log('   ✅ Todas as condições atendidas!')
    console.log('   ✅ Admin pode aprovar este usuário!')
    console.log('')
    console.log('   💡 Comando correto: /aprovar 553196797442')
  } else {
    console.log('   ❌ Usuário não pode ser aprovado (não encontrado ou já ativo)')
  }
} else {
  console.log('   ❌ Quem está tentando aprovar NÃO é admin!')
}

console.log('')
console.log('='.repeat(70))
console.log('')

