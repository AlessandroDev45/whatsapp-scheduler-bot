import { sendMessage, sendButtonMessage, getWhatsAppClient, getQRCode, resetConnection, fetchAllGroups } from './whatsapp.js';

/**
 * Configura as rotas da API REST
 */
export function setupRoutes(app) {

  // Endpoint para buscar grupos do WhatsApp
  app.get('/api/groups', async (req, res) => {
    try {
      const groups = await fetchAllGroups();

      res.json({
        success: true,
        count: groups.length,
        groups: groups
      });

    } catch (error) {
      console.error('❌ Erro ao buscar grupos:', error);
      res.status(500).json({
        error: error.message
      });
    }
  });

  // Endpoint para buscar metadata de um grupo específico
  app.get('/api/group-metadata', async (req, res) => {
    try {
      const { jid } = req.query;

      if (!jid) {
        return res.status(400).json({
          error: 'Parâmetro obrigatório: jid'
        });
      }

      const sock = getWhatsAppClient();
      if (!sock) {
        return res.status(503).json({
          error: 'WhatsApp não conectado'
        });
      }

      const metadata = await sock.groupMetadata(jid);

      res.json({
        success: true,
        id: metadata.id,
        subject: metadata.subject,
        subjectOwner: metadata.subjectOwner,
        subjectTime: metadata.subjectTime,
        creation: metadata.creation,
        owner: metadata.owner,
        desc: metadata.desc,
        descOwner: metadata.descOwner,
        descId: metadata.descId,
        restrict: metadata.restrict,
        announce: metadata.announce,
        size: metadata.participants?.length || 0,
        participants: metadata.participants
      });

    } catch (error) {
      console.error('❌ Erro ao buscar metadata do grupo:', error);
      res.status(500).json({
        error: error.message
      });
    }
  });

  // Endpoint para enviar mensagem de texto
  app.post('/api/send-message', async (req, res) => {
    try {
      const { jid, text } = req.body;
      
      if (!jid || !text) {
        return res.status(400).json({
          error: 'Parâmetros obrigatórios: jid, text'
        });
      }
      
      const result = await sendMessage(jid, text);
      
      res.json({
        success: true,
        messageId: result.key?.id,
        timestamp: result.messageTimestamp
      });
      
    } catch (error) {
      console.error('❌ Erro ao enviar mensagem:', error);
      res.status(500).json({
        error: error.message
      });
    }
  });
  
  // Endpoint para enviar mensagem com botões
  app.post('/api/send-buttons', async (req, res) => {
    try {
      const { jid, text, buttons } = req.body;
      
      if (!jid || !text || !buttons) {
        return res.status(400).json({
          error: 'Parâmetros obrigatórios: jid, text, buttons'
        });
      }
      
      const result = await sendButtonMessage(jid, text, buttons);
      
      res.json({
        success: true,
        messageId: result.key?.id,
        timestamp: result.messageTimestamp
      });
      
    } catch (error) {
      console.error('❌ Erro ao enviar mensagem com botões:', error);
      res.status(500).json({
        error: error.message
      });
    }
  });
  
  // Endpoint para verificar status da conexão
  app.get('/api/status', (req, res) => {
    const sock = getWhatsAppClient();
    const qr = getQRCode();
    
    res.json({
      connected: sock !== null,
      qrCode: qr,
      timestamp: new Date().toISOString()
    });
  });
  
  // Endpoint para obter QR Code (para conectar WhatsApp)
  app.get('/api/qrcode', (req, res) => {
    const qr = getQRCode();

    if (qr) {
      res.json({
        qrCode: qr,
        message: 'Escaneie o QR Code com seu WhatsApp'
      });
    } else {
      const sock = getWhatsAppClient();
      if (sock) {
        res.json({
          message: 'WhatsApp já está conectado',
          connected: true
        });
      } else {
        res.json({
          message: 'Aguardando geração do QR Code...',
          connected: false
        });
      }
    }
  });

  // Endpoint para exibir QR Code em HTML
  app.get('/qrcode', (req, res) => {
    const qr = getQRCode();

    if (qr) {
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>WhatsApp QR Code</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }
            .container {
              background: white;
              padding: 40px;
              border-radius: 20px;
              box-shadow: 0 10px 40px rgba(0,0,0,0.2);
              text-align: center;
            }
            h1 {
              color: #25D366;
              margin-bottom: 10px;
            }
            p {
              color: #666;
              margin-bottom: 30px;
            }
            #qrcode {
              margin: 20px auto;
              padding: 20px;
              background: white;
            }
            .refresh-btn {
              background: #25D366;
              color: white;
              border: none;
              padding: 12px 30px;
              border-radius: 25px;
              cursor: pointer;
              font-size: 16px;
              margin-top: 20px;
            }
            .refresh-btn:hover {
              background: #128C7E;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>📱 WhatsApp Bot - Conexão</h1>
            <p>Escaneie o QR Code abaixo com seu WhatsApp</p>
            <div id="qrcode"></div>
            <p style="font-size: 14px; color: #999;">
              Abra o WhatsApp → Dispositivos Conectados → Conectar Dispositivo
            </p>
            <button class="refresh-btn" onclick="location.reload()">🔄 Atualizar</button>
          </div>
          <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
          <script>
            const qrData = ${JSON.stringify(qr)};
            new QRCode(document.getElementById("qrcode"), {
              text: qrData,
              width: 300,
              height: 300,
              colorDark: "#000000",
              colorLight: "#ffffff",
              correctLevel: QRCode.CorrectLevel.H
            });
          </script>
        </body>
        </html>
      `);
    } else {
      const sock = getWhatsAppClient();
      if (sock) {
        res.send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>WhatsApp Conectado</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                margin: 0;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              }
              .container {
                background: white;
                padding: 40px;
                border-radius: 20px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                text-align: center;
              }
              h1 {
                color: #25D366;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>✅ WhatsApp Conectado!</h1>
              <p>Seu bot está online e funcionando.</p>
            </div>
          </body>
          </html>
        `);
      } else {
        res.send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Aguardando QR Code</title>
            <meta http-equiv="refresh" content="3">
            <style>
              body {
                font-family: Arial, sans-serif;
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                margin: 0;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              }
              .container {
                background: white;
                padding: 40px;
                border-radius: 20px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                text-align: center;
              }
              .spinner {
                border: 4px solid #f3f3f3;
                border-top: 4px solid #25D366;
                border-radius: 50%;
                width: 50px;
                height: 50px;
                animation: spin 1s linear infinite;
                margin: 20px auto;
              }
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>⏳ Aguardando QR Code...</h1>
              <div class="spinner"></div>
              <p>A página será atualizada automaticamente.</p>
            </div>
          </body>
          </html>
        `);
      }
    }
  });

  // Endpoint para resetar conexão WhatsApp
  app.post('/api/reset', async (req, res) => {
    try {
      const result = await resetConnection();
      res.json(result);
    } catch (error) {
      console.error('❌ Erro ao resetar conexão:', error);
      res.status(500).json({
        error: error.message
      });
    }
  });
  
  // Endpoint para webhook (compatibilidade com Edge Function)
  app.post('/webhook', async (req, res) => {
    try {
      // Este endpoint pode ser usado pela Edge Function para enviar mensagens
      const { action, data } = req.body;
      
      if (action === 'send_message') {
        const result = await sendMessage(data.jid, data.text);
        return res.json({ success: true, result });
      }
      
      if (action === 'send_buttons') {
        const result = await sendButtonMessage(data.jid, data.text, data.buttons);
        return res.json({ success: true, result });
      }
      
      res.status(400).json({ error: 'Ação não reconhecida' });
      
    } catch (error) {
      console.error('❌ Erro no webhook:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  console.log('✅ Rotas da API configuradas');
}

