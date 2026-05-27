// src/admin.js
//
// Comandos de administração acessíveis apenas ao dono do bot.
// Configure ADMIN_ID no .env com seu ID numérico do Telegram.
// Para descobrir seu ID: fale com @userinfobot no Telegram.
//

import { productDB } from './database.js';

const ADMIN_ID = parseInt(process.env.ADMIN_ID ?? '0');

function isAdmin(ctx) {
  return ctx.from?.id === ADMIN_ID;
}

export function registerAdminHandlers(bot) {

  // ─── /admin ─────────────────────────────────────────────────
  bot.command('admin', async (ctx) => {
    if (!isAdmin(ctx)) return;

    await ctx.reply(
      `🔧 *Painel Admin*\n\n` +
      `Comandos disponíveis:\n\n` +
      `/addproduto — Adiciona um produto\n` +
      `/listaprodutos — Lista todos os produtos\n` +
      `/removeproduto <id> — Desativa um produto\n\n` +
      `*Formato para adicionar produto:*\n` +
      `/addproduto Nome | Descrição | Preço | Tipo | Entrega\n\n` +
      `*Tipos:*\n` +
      `• \`group\` — ID do grupo privado (ex: -1001234567)\n` +
      `• \`channel\` — ID do canal privado\n` +
      `• \`file\` — file\\_id do Telegram\n` +
      `• \`link\` — URL externa\n\n` +
      `*Exemplos:*\n` +
      `/addproduto Grupo VIP | Acesso vitalício ao grupo | 29.90 | group | -1001234567890\n` +
      `/addproduto Ebook PDF | Guia completo | 19.90 | file | BQACAgIA...\n` +
      `/addproduto Curso Online | Acesso em 2024 | 97.00 | link | https://curso.com/acesso`,
      { parse_mode: 'Markdown' }
    );
  });

  // ─── /addproduto ────────────────────────────────────────────
  // Formato: /addproduto Nome | Descrição | Preço | Tipo | Entrega
  bot.command('addproduto', async (ctx) => {
    if (!isAdmin(ctx)) return;

    const text = ctx.message?.text?.replace('/addproduto', '').trim() ?? '';
    const parts = text.split('|').map(s => s.trim());

    if (parts.length < 5) {
      return ctx.reply(
        '❌ Formato inválido.\n\n' +
        'Use: `/addproduto Nome | Descrição | Preço | Tipo | Entrega`',
        { parse_mode: 'Markdown' }
      );
    }

    const [name, description, priceStr, type, delivery] = parts;
    const price = parseFloat(priceStr.replace(',', '.'));

    if (isNaN(price) || price <= 0) {
      return ctx.reply('❌ Preço inválido. Use números como `29.90` ou `29,90`.', {
        parse_mode: 'Markdown',
      });
    }

    const validTypes = ['group', 'channel', 'file', 'link'];
    if (!validTypes.includes(type)) {
      return ctx.reply(`❌ Tipo inválido. Use: ${validTypes.join(', ')}`);
    }

    const result = productDB.create({ name, description, price, type, delivery });

    await ctx.reply(
      `✅ *Produto adicionado com sucesso!*\n\n` +
      `🆔 ID: \`${result.lastInsertRowid}\`\n` +
      `📦 Nome: *${name}*\n` +
      `💰 Preço: R$ ${price.toFixed(2)}\n` +
      `📂 Tipo: ${type}`,
      { parse_mode: 'Markdown' }
    );
  });

  // ─── /listaprodutos ─────────────────────────────────────────
  bot.command('listaprodutos', async (ctx) => {
    if (!isAdmin(ctx)) return;

    const products = productDB.getAll();

    if (products.length === 0) {
      return ctx.reply('📭 Nenhum produto cadastrado.');
    }

    let msg = `📦 *Produtos ativos (${products.length}):*\n\n`;
    for (const p of products) {
      msg += `*[${p.id}]* ${p.name}\n`;
      msg += `    💰 R$ ${p.price.toFixed(2)} | 📂 ${p.type}\n`;
      msg += `    📎 \`${p.delivery.slice(0, 40)}${p.delivery.length > 40 ? '...' : ''}\`\n\n`;
    }

    await ctx.reply(msg, { parse_mode: 'Markdown' });
  });

  // ─── /removeproduto ─────────────────────────────────────────
  bot.command('removeproduto', async (ctx) => {
    if (!isAdmin(ctx)) return;

    const idStr = ctx.message?.text?.replace('/removeproduto', '').trim();
    const id = parseInt(idStr ?? '');

    if (isNaN(id)) {
      return ctx.reply('❌ Use: `/removeproduto <id>`', { parse_mode: 'Markdown' });
    }

    const product = productDB.getById(id);
    if (!product) {
      return ctx.reply(`❌ Produto #${id} não encontrado.`);
    }

    productDB.deactivate(id);
    await ctx.reply(`✅ Produto *${product.name}* desativado.`, { parse_mode: 'Markdown' });
  });
}
