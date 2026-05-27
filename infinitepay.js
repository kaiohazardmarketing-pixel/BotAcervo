// src/infinitepay.js
//
// Integração com a API Checkout da InfinitePay.
// Docs: https://ajuda.infinitepay.io/pt-BR/articles/10766888-como-usar-o-checkout-da-infinitepay
//
// Como funciona:
//   1. POST /links  → recebe uma URL de checkout
//   2. Bot envia a URL para o usuário pagar (Pix ou cartão)
//   3. InfinitePay chama nosso webhook_url quando o pagamento é confirmado
//   4. Webhook libera o acesso automaticamente
//
// Configurar no .env:
//   IP_HANDLE   = sua InfiniteTag (sem o $ inicial, ex: "meutag")
//   PUBLIC_URL  = URL pública do servidor (ex: https://meubot.railway.app)
//

const API_BASE = 'https://api.checkout.infinitepay.io';

/**
 * Cria um link de pagamento na InfinitePay.
 *
 * @param {object} opts
 * @param {string} opts.orderId       - ID único do pedido (nosso UUID)
 * @param {number} opts.amountReais   - Valor em reais (ex: 29.90)
 * @param {string} opts.description   - Descrição do produto
 * @param {object} [opts.customer]    - Dados do cliente (opcional)
 *
 * @returns {{ checkoutUrl: string }}
 */
export async function createCheckoutLink({ orderId, amountReais, description, customer }) {
  const amountCentavos = Math.round(amountReais * 100);

  const body = {
    handle: process.env.IP_HANDLE,
    webhook_url: `${process.env.PUBLIC_URL}/webhook/infinitepay`,
    order_nsu: orderId,       // usamos nosso UUID como referência
    items: [
      {
        quantity: 1,
        price: amountCentavos,
        description: description.slice(0, 100),
      },
    ],
  };

  // Inclui dados do cliente se disponíveis (melhora a experiência no checkout)
  if (customer) {
    body.customer = customer;
  }

  const response = await fetch(`${API_BASE}/links`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`InfinitePay API error ${response.status}: ${err}`);
  }

  const data = await response.json();

  if (!data.url) {
    throw new Error('InfinitePay não retornou URL de checkout');
  }

  return { checkoutUrl: data.url };
}

/**
 * Verifica manualmente se um pagamento foi aprovado.
 * Útil como fallback caso o webhook não tenha chegado.
 *
 * @param {object} opts
 * @param {string} opts.orderId        - Nosso order_nsu
 * @param {string} opts.transactionNsu - UUID da transação (vem no webhook)
 * @param {string} opts.slug           - Código da fatura (vem no webhook)
 *
 * @returns {{ paid: boolean, captureMethod: string, amount: number }}
 */
export async function checkPaymentStatus({ orderId, transactionNsu, slug }) {
  const response = await fetch(`${API_BASE}/payment_check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      handle: process.env.IP_HANDLE,
      order_nsu: orderId,
      transaction_nsu: transactionNsu,
      slug,
    }),
  });

  if (!response.ok) {
    throw new Error(`InfinitePay payment_check error ${response.status}`);
  }

  const data = await response.json();

  return {
    paid: data.paid === true,
    captureMethod: data.capture_method,   // 'pix' | 'credit_card'
    amount: data.paid_amount / 100,        // converte centavos → reais
  };
}
