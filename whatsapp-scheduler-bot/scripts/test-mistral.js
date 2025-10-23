const https = require('https');

const MISTRAL_API_KEY = 'a5ejxknqUm2z8s3Ticnys0N5Fg3DKQ2W';
const MISTRAL_MODEL = 'devstral-small-2505';

const data = JSON.stringify({
  model: MISTRAL_MODEL,
  messages: [
    {
      role: 'system',
      content: 'Voce e um especialista em comunicacao. Melhore esta mensagem para WhatsApp. RETORNE APENAS a mensagem melhorada, sem explicacoes.'
    },
    {
      role: 'user',
      content: 'Bom dia pessoal'
    }
  ],
  temperature: 0.7,
  max_tokens: 500
});

const options = {
  hostname: 'api.mistral.ai',
  port: 443,
  path: '/v1/chat/completions',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${MISTRAL_API_KEY}`,
    'Content-Length': data.length
  }
};

console.log('🔄 Testando Mistral AI...\n');

const req = https.request(options, (res) => {
  console.log(`✅ Status: ${res.statusCode}`);
  
  let responseData = '';
  
  res.on('data', (chunk) => {
    responseData += chunk;
  });
  
  res.on('end', () => {
    console.log('📊 Resposta completa:', responseData);
    
    try {
      const json = JSON.parse(responseData);
      if (json.choices && json.choices[0]) {
        console.log('\n✨ Mensagem melhorada:');
        console.log(json.choices[0].message.content);
      } else {
        console.log('\n❌ Formato inesperado:', json);
      }
    } catch (e) {
      console.error('\n❌ Erro ao parsear JSON:', e.message);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Erro:', error.message);
});

req.write(data);
req.end();

