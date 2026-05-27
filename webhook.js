// src/webhook.js
import express from 'express';
import { orderDB, deliveryDB, productDB } from './database.js';
import { deliverProduct } from './delivery.js';

export function createWebhookServer(bot) {
  const app = express();

  app.use('/webhook', express.json());

  // Rota de saúde
  app.get('/', (_req, res) => res.json({ status: 'ok', bot: 'Telegram InfinitePay Bot' }));

  // ─── Webhook da InfinitePay ────────────────────────────────
  //
  // A InfinitePay faz POST nesta rota quando um pagamento é confirmado.
  // Payload recebido:
  // {
  //   invoice_slug: "abc123",
  //   amount: 2990,            ← em centavos
  //   paid_amount: 2990,
  //   installments: 1,
  //   capture_method: "pix",   ← "pix" | "credit_card"
  //   transaction_nsu: "UUID",
  //   order_nsu: "nosso-uuid-do-pedido",
  //   receipt_url: "https://...",
  //   items: [...]
  // }
  //
  // IMPORTANTE: Responder com 200 em < 1s.
  //             Responder com 400 faz a InfinitePay tentar novamente.
  //
  app.post('/webhook/infinitepay', async (req, res) => {
    const payload = req.body;

    // Valida campos mínimos esperados
    if (!payload?.order_nsu || !payload?.paid_amount) {
      return res.status(400).json({ success: false, message: 'Payload inválido' });
    }

    const orderId = payload.order_nsu;
    const order = orderDB.getById(orderId);

    if (!order) {
      console.warn(`[webhook] Pedido não encontrado: ${orderId}`);
      // Responde 200 mesmo assim para não gerar reenvios desnecessários
      return res.status(200).json({ success: true, message: null });
    }

    // Evita processar duas vezes
    if (order.status === 'approved' || deliveryDB.wasDelivered(orderId)) {
      return res.status(200).json({ success: true, message: null });
    }

    // Responde 200 ANTES de processar (InfinitePay exige resposta rápida)
    res.status(200).json({ success: true, message: null });

    // Processa assincronamente
    try {
      // Salva referência da transação no pedido
      orderDB.updatePayment(orderId, payload.transaction_nsu, payload.invoice_slug);
      orderDB.approve(orderId);

      const product = productDB.getById(order.product_id);
      if (!product) {
        console.warn(`[webhook] Produto não encontrado: ${order.product_id}`);
        return;
      }

      deliveryDB.create({ orderId, userId: order.user_id, productId: order.product_id });

      const captureLabel = payload.capture_method === 'pix' ? 'Pix' : 'Cartão';
      console.log(`[webhook] ✅ Pedido ${orderId} pago via ${captureLabel} — entregando ao usuário ${order.user_id}`);

      await deliverProduct(bot, order, product, payload.capture_method);
      deliveryDB.markDelivered(orderId);

    } catch (err) {
      console.error('[webhook] Erro ao processar pagamento:', err.message);
    }
  });

  return app;
}
