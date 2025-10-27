// Simular exatamente o que acontece no webhook quando você envia /aprovar

const ADMIN_NUMBER = '553184549893'

function verificarPermissaoAdmin(telefone) {
  const numeroLimpo = telefone.split('@')[0]
  console.log(`   🔍 verificarPermissaoAdmin():`)
  console.log(`      Input: "${telefone}"`)
  console.log(`      Limpo: "${numeroLimpo}"`)
  console.log(`      Admin: "${ADMIN_NUMBER}"`)
  console.log(`      Match: ${numeroLimpo === ADMIN_NUMBER}`)
  return numeroLimpo === ADMIN_NUMBER
}

console.log('\n🔍 SIMULANDO WEBHOOK - COMANDO /aprovar\n')
console.log('='.repeat(70))

// CENÁRIO: Você (Alessandro) envia "/aprovar 553196797442"
console.log('\n📱 MENSAGEM RECEBIDA:\n')
console.log('   De: Alessandro (553184549893)')
console.log('   Texto: /aprovar 553196797442')
console.log('')

// Passo 1: Extrair sender do remoteJid
const remoteJid = '553184549893@s.whatsapp.net'
const sender = remoteJid.split('@')[0]  // Linha 434 do código

console.log('1️⃣ EXTRAÇÃO DO SENDER:')
console.log(`   RemoteJid: ${remoteJid}`)
console.log(`   Sender: ${sender}`)
console.log('')

// Passo 2: Verificar se é admin
console.log('2️⃣ VERIFICAÇÃO DE ADMIN:')
const isAdmin = verificarPermissaoAdmin(sender)
console.log(`   Resultado: ${isAdmin ? '✅ É ADMIN' : '❌ NÃO É ADMIN'}`)
console.log('')

if (!isAdmin) {
  console.log('❌ ERRO: Permissão negada!')
  console.log('   Mensagem: "Apenas o administrador pode aprovar usuários."')
  console.log('')
  console.log('🔴 PROBLEMA IDENTIFICADO!')
  console.log('')
} else {
  console.log('✅ Permissão concedida!')
  console.log('   Continuando com a aprovação...')
  console.log('')
}

console.log('='.repeat(70))
console.log('\n💡 ANÁLISE:\n')

if (isAdmin) {
  console.log('✅ A verificação de admin está funcionando corretamente!')
  console.log('   O problema deve ser outro (número errado, usuário já aprovado, etc.)')
} else {
  console.log('❌ A verificação de admin está FALHANDO!')
  console.log('   Possíveis causas:')
  console.log('   1. ADMIN_NUMBER está diferente no código deployado')
  console.log('   2. O sender está vindo em formato diferente')
  console.log('   3. Há algum problema com o deploy')
}

console.log('')

