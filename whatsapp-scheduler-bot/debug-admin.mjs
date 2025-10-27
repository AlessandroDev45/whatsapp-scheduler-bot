// Debug da verificação de admin

const ADMIN_NUMBER = '553184549893'

function verificarPermissaoAdmin(telefone) {
  const numeroLimpo = telefone.split('@')[0]
  console.log(`   🔍 Verificando admin:`)
  console.log(`      Input: "${telefone}"`)
  console.log(`      Limpo: "${numeroLimpo}"`)
  console.log(`      Admin: "${ADMIN_NUMBER}"`)
  console.log(`      Match: ${numeroLimpo === ADMIN_NUMBER}`)
  return numeroLimpo === ADMIN_NUMBER
}

console.log('\n🔍 DEBUG DA VERIFICAÇÃO DE ADMIN\n')
console.log('='.repeat(70))

// Simular o que acontece no webhook
console.log('\n📱 CENÁRIO 1: Mensagem do admin Alessandro\n')

// No webhook, o sender é extraído assim:
const remoteJid1 = '553184549893@s.whatsapp.net'
const sender1 = remoteJid1.split('@')[0]  // Linha 434 do código

console.log(`1️⃣ RemoteJid: ${remoteJid1}`)
console.log(`2️⃣ Sender extraído: ${sender1}`)
console.log(`3️⃣ Verificando permissão:`)
const isAdmin1 = verificarPermissaoAdmin(sender1)
console.log(`4️⃣ Resultado: ${isAdmin1 ? '✅ É ADMIN' : '❌ NÃO É ADMIN'}`)

console.log('\n' + '='.repeat(70))
console.log('\n📱 CENÁRIO 2: Mensagem de outro usuário\n')

const remoteJid2 = '5531999999999@s.whatsapp.net'
const sender2 = remoteJid2.split('@')[0]

console.log(`1️⃣ RemoteJid: ${remoteJid2}`)
console.log(`2️⃣ Sender extraído: ${sender2}`)
console.log(`3️⃣ Verificando permissão:`)
const isAdmin2 = verificarPermissaoAdmin(sender2)
console.log(`4️⃣ Resultado: ${isAdmin2 ? '✅ É ADMIN' : '❌ NÃO É ADMIN'}`)

console.log('\n' + '='.repeat(70))
console.log('\n💡 CONCLUSÃO:\n')
console.log('A função deveria funcionar corretamente!')
console.log('Se ainda está dando erro, pode ser outro problema...')
console.log('')

