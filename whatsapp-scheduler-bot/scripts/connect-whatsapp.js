require('dotenv').config();
const axios = require('axios');
const qrcode = require('qrcode-terminal');
const EventSource = require('eventsource');

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
const BOT_INSTANCE_NAME = process.env.BOT_INSTANCE_NAME;

async function connectWhatsApp() {
  try {
    console.log('🔄 Verificando status da instância...');

    // Verificar status da instância
    const statusResponse = await axios.get(
      `${EVOLUTION_API_URL}/instance/connectionState/${BOT_INSTANCE_NAME}`,
      {
        headers: {
          'apikey': EVOLUTION_API_KEY
        }
      }
    );

    console.log('📊 Status:', statusResponse.data);

    if (statusResponse.data.instance.state === 'open') {
      console.log('✅ WhatsApp já está conectado!');
      return;
    }

    console.log('\n📱 Aguardando QR Code...');
    console.log('⏳ Abra o WhatsApp no celular e vá em "Dispositivos Conectados"');
    console.log('📸 Escaneie o QR Code que vai aparecer abaixo:\n');

    // Conectar ao SSE para receber eventos
    const eventSource = new EventSource(
      `${EVOLUTION_API_URL}/instance/events/${BOT_INSTANCE_NAME}`,
      {
        headers: {
          'apikey': EVOLUTION_API_KEY
        }
      }
    );

    let connected = false;

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.event === 'qrcode.updated') {
          console.log('\n📱 NOVO QR CODE:\n');
          qrcode.generate(data.data.qrcode, { small: true });
          console.log('\n⏳ Escaneie o QR Code acima com seu WhatsApp...\n');
        }

        if (data.event === 'connection.update' && data.data.state === 'open') {
          console.log('\n✅ WhatsApp conectado com sucesso!');
          connected = true;
          eventSource.close();
          process.exit(0);
        }
      } catch (error) {
        console.log('⚠️  Erro ao processar evento:', error.message);
      }
    };

    eventSource.onerror = (error) => {
      console.log('⚠️  Erro na conexão SSE, tentando polling...');
      eventSource.close();
      pollForQRCode();
    };

    // Timeout de 2 minutos
    setTimeout(() => {
      if (!connected) {
        console.log('\n❌ Timeout: Não foi possível conectar o WhatsApp');
        console.log('💡 Tente acessar o Manager: ' + EVOLUTION_API_URL + '/manager');
        eventSource.close();
        process.exit(1);
      }
    }, 120000);

  } catch (error) {
    console.error('❌ Erro:', error.response?.data || error.message);
    console.log('\n💡 Tentando método alternativo...');
    pollForQRCode();
  }
}

async function pollForQRCode() {
  console.log('\n🔄 Buscando QR Code via polling...\n');

  let attempts = 0;
  const maxAttempts = 60;

  while (attempts < maxAttempts) {
    try {
      const response = await axios.get(
        `${EVOLUTION_API_URL}/instance/fetchInstances?instanceName=${BOT_INSTANCE_NAME}`,
        {
          headers: {
            'apikey': EVOLUTION_API_KEY
          }
        }
      );

      const instance = response.data[0];

      if (instance.connectionStatus === 'open') {
        console.log('\n✅ WhatsApp conectado com sucesso!');
        console.log('📱 Número:', instance.number || 'N/A');
        console.log('👤 Nome:', instance.profileName || 'N/A');
        process.exit(0);
      }

      console.log(`⏳ Tentativa ${attempts + 1}/${maxAttempts} - Status: ${instance.connectionStatus}`);

      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts++;
    } catch (error) {
      console.log('⚠️  Erro:', error.message);
      attempts++;
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log('\n❌ Não foi possível obter o QR Code');
  console.log('💡 Acesse o Manager manualmente: ' + EVOLUTION_API_URL + '/manager');
  process.exit(1);
}

connectWhatsApp();

