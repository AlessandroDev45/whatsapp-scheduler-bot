require('dotenv').config()
const axios = require('axios')

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY
const BOT_INSTANCE_NAME = process.env.BOT_INSTANCE_NAME || 'whatsapp_bot'

async function habilitarEventos() {
  try {
    console.log('🔧 Habilitando eventos do Websocket...\n')

    // Configuração completa (obrigatório enviar tudo)
    const config = {
      reject_call: false,
      groups_ignore: true,
      always_online: false,
      read_messages: false,
      read_status: false,
      sync_full_history: false,
      websocket: {
        enabled: true,
        events: [
          'MESSAGES_UPSERT',
          'MESSAGES_UPDATE',
          'GROUPS_UPSERT',
          'GROUPS_UPDATE',
          'GROUP_PARTICIPANTS_UPDATE'
        ]
      }
    }

    console.log('📡 Enviando configuração...')
    console.log(JSON.stringify(config, null, 2))

    const response = await axios.post(
      `${EVOLUTION_API_URL}/settings/set/${BOT_INSTANCE_NAME}`,
      config,
      {
        headers: {
          'Content-Type': 'application/json',
          'apikey': EVOLUTION_API_KEY
        }
      }
    )

    console.log('\n✅ Eventos habilitados com sucesso!')
    console.log(JSON.stringify(response.data, null, 2))

  } catch (error) {
    console.error('❌ Erro:', error.response?.data || error.message)
    
    // Mostrar detalhes do erro
    if (error.response?.data?.response?.message) {
      console.error('\n📋 Detalhes do erro:')
      console.error(JSON.stringify(error.response.data.response.message, null, 2))
    }
  }
}

habilitarEventos()

