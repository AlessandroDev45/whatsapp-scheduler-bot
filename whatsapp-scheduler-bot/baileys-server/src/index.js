import express from 'express';
import { config } from 'dotenv';
import { initWhatsApp, getWhatsAppClient } from './whatsapp.js';
import { startScheduler } from './scheduler.js';
import { setupRoutes } from './api.js';

// Carregar variáveis de ambiente
config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Health check (para Fly.io monitorar)
app.get('/health', (req, res) => {
  const sock = getWhatsAppClient();
  const isConnected = sock !== null;
  
  res.json({
    status: 'ok',
    whatsapp: isConnected ? 'connected' : 'disconnected',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Configurar rotas da API
setupRoutes(app);

// Iniciar servidor
app.listen(PORT, async () => {
  console.log(`
╔═══════════════════════════════════════════════╗
║  🚀 WHATSAPP BAILEYS SERVER                  ║
║  📡 Servidor rodando na porta ${PORT}           ║
╚═══════════════════════════════════════════════╝
  `);

  console.log('🔍 Verificando variáveis de ambiente...');
  console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Configurado' : '❌ Não configurado');
  console.log('SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_KEY ? '✅ Configurado' : '❌ Não configurado');
  console.log('SUPABASE_WEBHOOK_URL:', process.env.SUPABASE_WEBHOOK_URL ? '✅ Configurado' : '❌ Não configurado');
  console.log('BOT_INSTANCE_NAME:', process.env.BOT_INSTANCE_NAME || 'whatsapp_bot');

  try {
    // Inicializar WhatsApp
    console.log('\n📱 Inicializando conexão WhatsApp...');
    await initWhatsApp();
    console.log('✅ initWhatsApp() executado com sucesso');

    // Iniciar scheduler
    console.log('\n⏰ Iniciando scheduler de agendamentos...');
    startScheduler();
    console.log('✅ Scheduler iniciado com sucesso');

    console.log('\n✅ Sistema totalmente operacional!\n');
  } catch (error) {
    console.error('❌ ERRO CRÍTICO ao inicializar:', error);
    console.error('Stack trace:', error.stack);
  }
});

// Tratamento de erros não capturados
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled Rejection:', error);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('⚠️ SIGTERM recebido, encerrando gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('⚠️ SIGINT recebido, encerrando gracefully...');
  process.exit(0);
});

