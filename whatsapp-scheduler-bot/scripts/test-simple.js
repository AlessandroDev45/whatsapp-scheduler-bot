const https = require('https');

const data = JSON.stringify({
  event: 'messages.upsert',
  data: {
    key: {
      remoteJid: '553184549893@s.whatsapp.net',
      fromMe: false,
      id: 'TEST_' + Date.now()
    },
    pushName: 'Alessandro',
    message: {
      conversation: '/novo'
    }
  }
});

const options = {
  hostname: 'aiwwocigvktmtiawslrx.supabase.co',
  port: 443,
  path: '/functions/v1/webhook-whatsapp',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

console.log('🔄 Enviando requisição...\n');

const req = https.request(options, (res) => {
  console.log(`✅ Status: ${res.statusCode}`);
  
  let responseData = '';
  
  res.on('data', (chunk) => {
    responseData += chunk;
  });
  
  res.on('end', () => {
    console.log('📊 Resposta:', responseData);
  });
});

req.on('error', (error) => {
  console.error('❌ Erro:', error.message);
});

req.write(data);
req.end();

console.log('📤 Payload enviado!');

