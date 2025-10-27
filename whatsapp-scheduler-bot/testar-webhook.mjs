import * as dotenv from 'dotenv'

dotenv.config()

const WEBHOOK_URL = 'https://aiwwocigvktmtiawslrx.supabase.co/functions/v1/webhook-whatsapp'

console.log('\n🔍 TESTANDO WEBHOOK...\n')
console.log('='.repeat(70))
console.log(`📍 URL: ${WEBHOOK_URL}`)
console.log('')

// Simular uma mensagem do WhatsApp
const mensagemTeste = {
  event: 'messages.upsert',
  instance: 'whatsapp_bot',
  data: {
    key: {
      remoteJid: '553196797442@s.whatsapp.net',
      fromMe: false,
      id: 'teste123'
    },
    pushName: 'Isa🐱',
    message: {
      conversation: '/menu'
    },
    messageType: 'conversation',
    messageTimestamp: Math.floor(Date.now() / 1000)
  }
}

console.log('📤 ENVIANDO MENSAGEM DE TESTE:\n')
console.log(JSON.stringify(mensagemTeste, null, 2))
console.log('')

try {
  const response = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(mensagemTeste)
  })

  console.log('📥 RESPOSTA DO WEBHOOK:\n')
  console.log(`   Status: ${response.status} ${response.statusText}`)
  
  const text = await response.text()
  console.log(`   Body: ${text}`)
  console.log('')

  if (response.ok) {
    console.log('✅ Webhook respondeu com sucesso!')
  } else {
    console.log('❌ Webhook retornou erro!')
  }
} catch (error) {
  console.log('❌ ERRO ao chamar webhook:')
  console.log(error.message)
}

console.log('')
console.log('='.repeat(70))
console.log('')

