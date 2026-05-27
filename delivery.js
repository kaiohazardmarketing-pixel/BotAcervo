// src/delivery.js
export async function deliverProduct(bot, order, product, captureMethod = 'pix') {
  const userId = order.user_id;
  const methodLabel = captureMethod === 'pix' ? 'Pix' : 'Cartão';

  switch (product.type) {
    case 'group':
    case 'channel':
      await deliverGroupAccess(bot, userId, product, methodLabel);
      break;
    case 'file':
      await deliverFile(bot, userId, product, methodLabel);
      break;
    case 'link':
      await deliverLink(bot, userId, product, methodLabel);
      break;
    default:
      await bot.api.sendMessage(userId,
        `✅ *Pagamento confirmado via ${methodLabel}!*\n\n` +
        `Produto: *${product.name}*\nEntrega: ${product.delivery}`,
        { parse_mode: 'Markdown' }
      );
  }
}

async function deliverGroupAccess(bot, userId, product, methodLabel) {
  const invite = await bot.api.createChatInviteLink(product.delivery, {
    member_limit: 1,
    expire_date: Math.floor(Date.now() / 1000) + 7 * 24 * 3600,
    name: `Pedido - ${userId}`,
  });

  await bot.api.sendMessage(userId,
    `🎉 *Pagamento confirmado via ${methodLabel}!*\n\n` +
    `Obrigado pela compra de *${product.name}*!\n\n` +
    `👇 Seu link de acesso:\n${invite.invite_link}\n\n` +
    `⚠️ _Link de uso único, válido por 7 dias._`,
    { parse_mode: 'Markdown' }
  );
}

async function deliverFile(bot, userId, product, methodLabel) {
  await bot.api.sendMessage(userId,
    `🎉 *Pagamento confirmado via ${methodLabel}!*\n\nEnviando *${product.name}*...`,
    { parse_mode: 'Markdown' }
  );
  try {
    await bot.api.sendDocument(userId, product.delivery, {
      caption: `📦 *${product.name}*\nObrigado pela compra!`,
      parse_mode: 'Markdown',
    });
  } catch {
    await bot.api.sendMessage(userId, `📦 Arquivo: \`${product.delivery}\``, { parse_mode: 'Markdown' });
  }
}

async function deliverLink(bot, userId, product, methodLabel) {
  await bot.api.sendMessage(userId,
    `🎉 *Pagamento confirmado via ${methodLabel}!*\n\n` +
    `Obrigado pela compra de *${product.name}*!\n\n` +
    `🔗 Seu acesso:\n${product.delivery}\n\n` +
    `_Guarde este link._`,
    { parse_mode: 'Markdown' }
  );
}
