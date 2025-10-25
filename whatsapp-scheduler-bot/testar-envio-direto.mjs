import * as dotenv from 'dotenv'

dotenv.config()

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY
const BOT_INSTANCE_NAME = process.env.BOT_INSTANCE_NAME

console.log('🧪 TESTANDO ENVIO DIRETO PELA EVOLUTION API\n')
console.log('='.repeat(60))
console.log(`📡 URL: ${EVOLUTION_API_URL}`)
console.log(`🔑 API Key: ${EVOLUTION_API_KEY}`)
console.log(`📱 Instância: ${BOT_INSTANCE_NAME}`)
console.log('='.repeat(60))

const destinatario = '120363318862188145@g.us'
const mensagem = `🧪 TESTE DIRETO - ${new Date().toLocaleTimeString('pt-BR')}

Este é um teste de envio direto pela Evolution API.

Se você recebeu esta mensagem, a API está funcionando! ✅`

console.log(`\n📤 Enviando para: ${destinatario}`)
console.log(`💬 Mensagem: ${mensagem.substring(0, 50)}...`)

const url = `${EVOLUTION_API_URL}/message/sendText/${BOT_INSTANCE_NAME}`

console.log(`\n🌐 Endpoint: ${url}`)

try {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30000)
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': EVOLUTION_API_KEY
    },
    body: JSON.stringify({
      number: destinatario,
      options: {
        delay: 1200,
        presence: 'composing',
      },
      textMessage: {
        text: mensagem
      }
    }),
    signal: controller.signal
  })
  
  clearTimeout(timeoutId)
  
  const responseText = await response.text()
  
  console.log(`\n📊 Status: ${response.status}`)
  console.log(`📋 Resposta:`)
  
  try {
    const json = JSON.parse(responseText)
    console.log(JSON.stringify(json, null, 2))
  } catch {
    console.log(responseText)
  }
  
  if (response.ok) {
    console.log('\n✅ MENSAGEM ENVIADA COM SUCESSO!')
  } else {
    console.log('\n❌ FALHA NO ENVIO!')
  }
  
} catch (error) {
  if (error.name === 'AbortError') {
    console.error('\n❌ Timeout após 30 segundos')
  } else {
    console.error('\n❌ Erro:', error.message)
  }
}

