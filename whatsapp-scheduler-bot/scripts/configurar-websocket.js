require('dotenv').config()
const axios = require('axios')

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY
const BOT_INSTANCE_NAME = process.env.BOT_INSTANCE_NAME || 'whatsapp_bot'

async function configurarWebsocket() {
  try {
    console.log('🔧 Configurando Websocket na Evolution API...\n')

    // Configurar instância com Websocket
    const instanceConfig = {
      instanceName: BOT_INSTANCE_NAME,
      integration: 'WHATSAPP-BAILEYS',
      websocket: {
        enabled: true,
        events: [
          'MESSAGES_UPSERT',
          'MESSAGES_UPDATE',
          'MESSAGES_DELETE',
          'SEND_MESSAGE',
          'GROUPS_UPSERT',
          'GROUPS_UPDATE',
          'GROUP_PARTICIPANTS_UPDATE',
          'CONNECTION_UPDATE'
        ]
      }
    }

    console.log('📡 Atualizando configurações da instância...')
    const response = await axios.put(
      `${EVOLUTION_API_URL}/instance/update/${BOT_INSTANCE_NAME}`,
      instanceConfig,
      {
        headers: {
          'Content-Type': 'application/json',
          'apikey': EVOLUTION_API_KEY
        }
      }
    )

    console.log('✅ Configurações atualizadas com sucesso!')
    console.log('\n📋 Resposta:')
    console.log(JSON.stringify(response.data, null, 2))

  } catch (error) {
    console.error('❌ Erro ao configurar Websocket:', error.response?.data || error.message)

    // Tentar método alternativo
    console.log('\n🔄 Tentando método alternativo...')
    try {
      const altResponse = await axios.post(
        `${EVOLUTION_API_URL}/settings/set/${BOT_INSTANCE_NAME}`,
        {
          websocket_enabled: true,
          websocket_events: ['MESSAGES_UPSERT', 'GROUPS_UPSERT', 'GROUPS_UPDATE']
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'apikey': EVOLUTION_API_KEY
          }
        }
      )
      console.log('✅ Método alternativo funcionou!')
      console.log(JSON.stringify(altResponse.data, null, 2))
    } catch (altError) {
      console.error('❌ Método alternativo também falhou:', altError.response?.data || altError.message)
    }
  }
}

configurarWebsocket()

