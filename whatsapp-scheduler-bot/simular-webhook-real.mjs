// Simular EXATAMENTE o que acontece no webhook

const ADMIN_NUMBER = '553184549893'

function verificarPermissaoAdmin(telefone) {
  const numeroLimpo = telefone.split('@')[0]
  console.log(`\n   🔍 verificarPermissaoAdmin():`)
  console.log(`      Input: "${telefone}"`)
  console.log(`      Limpo: "${numeroLimpo}"`)
  console.log(`      Admin: "${ADMIN_NUMBER}"`)
  console.log(`      Comparação: "${numeroLimpo}" === "${ADMIN_NUMBER}"`)
  console.log(`      Resultado: ${numeroLimpo === ADMIN_NUMBER}`)
  return numeroLimpo === ADMIN_NUMBER
}

console.log('\n🔍 SIMULANDO WEBHOOK REAL - COMANDO /aprovar\n')
console.log('='.repeat(70))

// CENÁRIO REAL: Você envia "/aprovar 553196797442" do WhatsApp
console.log('\n📱 MENSAGEM RECEBIDA PELO WEBHOOK:\n')

const webhookBody = {
  event: 'messages.upsert',
  instance: 'whatsapp_bot',
  data: {
    key: {
      remoteJid: '553184549893@s.whatsapp.net',  // Você
      fromMe: false,
      id: 'msg123'
    },
    pushName: 'Alessandro Alves Souza',
    message: {
      conversation: '/aprovar 553196797442'
    },
    messageType: 'conversation'
  }
}

console.log(JSON.stringify(webhookBody, null, 2))
console.log('')

// PASSO 1: Extrair sender (linha 434 do código)
const remoteJid = webhookBody.data.key.remoteJid
const sender = remoteJid.split('@')[0]

console.log('1️⃣ EXTRAÇÃO DO SENDER (linha 434):')
console.log(`   remoteJid: ${remoteJid}`)
console.log(`   sender = remoteJid.split('@')[0]`)
console.log(`   sender: "${sender}"`)
console.log('')

// PASSO 2: Verificar se é admin (linha 543)
console.log('2️⃣ VERIFICAÇÃO DE ADMIN (linha 543):')
const isAdmin = verificarPermissaoAdmin(sender)
console.log('')

if (isAdmin) {
  console.log('   ✅ RESULTADO: É ADMIN - Pode aprovar!')
} else {
  console.log('   ❌ RESULTADO: NÃO É ADMIN - Bloqueado!')
  console.log('')
  console.log('   🔴 ERRO RETORNADO:')
  console.log('   "Apenas o administrador pode aprovar usuários."')
}

console.log('')
console.log('='.repeat(70))

// DIAGNÓSTICO
console.log('\n💡 DIAGNÓSTICO:\n')

if (isAdmin) {
  console.log('✅ A verificação está funcionando corretamente!')
  console.log('   Se ainda está dando erro, o problema é outro.')
} else {
  console.log('❌ A verificação está FALHANDO!')
  console.log('')
  console.log('Possíveis causas:')
  console.log('1. ADMIN_NUMBER no código deployado é diferente')
  console.log('2. O sender está vindo em formato diferente')
  console.log('3. Há algum caractere invisível ou espaço')
  console.log('')
  console.log('Verificação detalhada:')
  console.log(`   sender.length: ${sender.length}`)
  console.log(`   ADMIN_NUMBER.length: ${ADMIN_NUMBER.length}`)
  console.log(`   sender bytes: ${Buffer.from(sender).toString('hex')}`)
  console.log(`   ADMIN_NUMBER bytes: ${Buffer.from(ADMIN_NUMBER).toString('hex')}`)
}

console.log('')

