// src/index.js
import 'dotenv/config';
import { mkdirSync } from 'fs';
import { createBot } from './bot.js';
import { createWebhookServer } from './webhook.js';
import { registerAdminHandlers } from './admin.js';

// Garante que a pasta de dados existe
mkdirSync('./data', { recursive: true });

// ─── Validação de variáveis obrigatórias ─────────────────────
const required = ['TELEGRAM_BOT_TOKEN', 'MP_ACCESS_TOKEN', 'PUBLIC_URL'];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`❌ Variável de ambiente ausente: ${key}`);
    process.exit(1);
  }
}

const PORT = parseInt(process.env.PORT ?? '3000');

// ─── Inicia o bot ─────────────────────────────────────────────
const bot = createBot();
registerAdminHandlers(bot);

// ─── Inicia o servidor Express (webhook do Mercado Pago) ──────
const app = createWebhookServer(bot);
app.listen(PORT, () => {
  console.log(`🌐 Servidor rodando na porta ${PORT}`);
  console.log(`🔗 Webhook URL: ${process.env.PUBLIC_URL}/webhook/mercadopago`);
});

// ─── Inicia o bot em modo polling (desenvolvimento local) ─────
// Em produção no Railway, o bot usa polling com long-polling.
// Alternativamente, configure o webhook do Telegram apontando
// para PUBLIC_URL/bot (e use bot.start com webhook).
bot.start({
  onStart: () => console.log('🤖 Bot Telegram iniciado com sucesso!'),
});

console.log('✅ Bot Pix iniciado!');
