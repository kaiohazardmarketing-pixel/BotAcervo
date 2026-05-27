// src/bot.js
import { Bot, InlineKeyboard } from 'grammy';
import { randomUUID } from 'crypto';
import { productDB, orderDB } from './database.js';
import { createCheckoutLink } from './infinitepay.js';

export function createBot() {
  const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN);

  // ─── /start ────────────────────────────────────────────────
  bot.command('start', async (ctx) => {
    const firstName = ctx.from?.first_name ?? 'você';
    await ctx.reply(
      `👋 Olá, *${firstName}*!\n\n` +
      `Bem-vindo à nossa loja. Use /loja para ver os produtos disponíveis.\n\n` +
      `Em caso de dúvidas, use /ajuda.`,
      { parse_mode: 'Markdown' }
    );
  });

  // ─── /loja ─────────────────────────────────────────────────
  bot.command('loja', async (ctx) => {
    const products = productDB.getAll();

    if (products.length === 0) {
      return ctx.reply('😕 Nenhum produto disponível no momento.');
    }

    await ctx.reply(
      `🛍️ *Nossa Loja*\n\nEscolha um produto abaixo:`,
      {
        parse_mode: 'Markdown',
        reply_markup: buildProductKeyboard(products),
      }
    );
  });

  // ─── /meus_pedidos ─────────────────────────────────────────
  bot.command('meus_pedidos', async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    const orders = orderDB.getPendingByUser(userId);

    if (orders.length === 0) {
      return ctx.reply('📭 Você não tem pedidos pendentes.');
    }

    let msg = `📋 *Seus pedidos recentes:*\n\n`;
    for (const order of orders) {
      const icon = order.status === 'approved' ? '✅' : '⏳';
      msg += `${icon} *${order.product_name}* — R$ ${order.amount.toFixed(2)}\n`;
      msg += `   ID: \`${order.id.slice(0, 8)}\`\n\n`;
    }

    await ctx.reply(msg, { parse_mode: 'Markdown' });
  });

  // ─── /ajuda ────────────────────────────────────────────────
  bot.command('ajuda', async (ctx) => {
    await ctx.reply(
      `ℹ️ *Ajuda*\n\n` +
      `/loja — Ver produtos\n` +
      `/meus\\_pedidos — Acompanhar pedidos\n` +
      `/ajuda — Esta mensagem\n\n` +
      `Após o pagamento, o acesso é liberado automaticamente. ✨`,
      { parse_mode: 'Markdown' }
    );
  });

  // ─── Callback: usuário clicou em produto ──────────────────
  bot.callbackQuery(/^produto:(\d+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();

    const productId = parseInt(ctx.match[1]);
    const product = productDB.getById(productId);

    if (!product) return ctx.reply('❌ Produto não encontrado.');

    const kb = new InlineKeyboard()
      .text(`💳 Comprar por R$ ${product.price.toFixed(2)}`, `comprar:${productId}`)
      .row()
      .text('← Voltar à loja', 'voltar_loja');

    await ctx.reply(
      `📦 *${product.name}*\n\n` +
      `${product.description}\n\n` +
      `💰 Valor: *R$ ${product.price.toFixed(2)}*\n` +
      `✅ Pague via *Pix* ou *Cartão de crédito*\n` +
      `⚡ Acesso liberado automaticamente após o pagamento.`,
      { parse_mode: 'Markdown', reply_markup: kb }
    );
  });

  // ─── Callback: gera o link de pagamento ───────────────────
  bot.callbackQuery(/^comprar:(\d+)$/, async (ctx) => {
    await ctx.answerCallbackQuery('Gerando link de pagamento...');

    const productId = parseInt(ctx.match[1]);
    const product = productDB.getById(productId);
    const userId = ctx.from?.id;
    const username = ctx.from?.username;
    const firstName = ctx.from?.first_name;

    if (!product || !userId) return;

    const orderId = randomUUID();

    let checkoutUrl;
    try {
      const result = await createCheckoutLink({
        orderId,
        amountReais: product.price,
        description: product.name,
        customer: firstName ? { name: firstName } : undefined,
      });
      checkoutUrl = result.checkoutUrl;
    } catch (err) {
      console.error('[bot] Erro ao criar checkout:', err.message);
      return ctx.reply('❌ Erro ao gerar o link de pagamento. Tente novamente.');
    }

    // Salva o pedido no banco
    orderDB.create({
      id: orderId,
      userId,
      username,
      productId,
      amount: product.price,
      checkoutUrl,
    });

    // Envia o link como botão clicável
    const kb = new InlineKeyboard()
      .url(`💳 Pagar R$ ${product.price.toFixed(2)}`, checkoutUrl);

    await ctx.reply(
      `🔗 *Link de pagamento gerado!*\n\n` +
      `🛍️ Produto: *${product.name}*\n` +
      `💰 Valor: *R$ ${product.price.toFixed(2)}*\n\n` +
      `Clique no botão abaixo para pagar via *Pix* ou *Cartão*:\n\n` +
      `_Após o pagamento, o acesso é liberado automaticamente. ⚡_`,
      { parse_mode: 'Markdown', reply_markup: kb }
    );
  });

  // ─── Callback: voltar para a loja ─────────────────────────
  bot.callbackQuery('voltar_loja', async (ctx) => {
    await ctx.answerCallbackQuery();
    const products = productDB.getAll();

    await ctx.reply(
      `🛍️ *Nossa Loja*\n\nEscolha um produto:`,
      { parse_mode: 'Markdown', reply_markup: buildProductKeyboard(products) }
    );
  });

  bot.catch((err) => console.error('[bot] Erro não tratado:', err.message));

  return bot;
}

function buildProductKeyboard(products) {
  const kb = new InlineKeyboard();
  for (const p of products) {
    kb.text(`${p.name} — R$ ${p.price.toFixed(2)}`, `produto:${p.id}`).row();
  }
  return kb;
}
