# 🤖 Bot Telegram — Vendas com InfinitePay

Bot de vendas para Telegram com pagamento via **Pix e Cartão** pela InfinitePay, com liberação automática de acesso após confirmação.

---

## 🧰 Stack

| Componente | Tecnologia |
|---|---|
| Bot Telegram | Grammy (Node.js) |
| Gateway de pagamento | InfinitePay Checkout API |
| Banco de dados | SQLite (better-sqlite3) |
| Servidor webhook | Express |
| Hospedagem | Railway |

---

## 🚀 Setup passo a passo

### 1. Criar o Bot no Telegram

1. Fale com **@BotFather** no Telegram
2. Envie `/newbot` e siga as instruções
3. Copie o **token** gerado

### 2. Configurar a InfinitePay

1. Baixe o app InfinitePay e crie sua conta (PF ou PJ)
2. Sua **InfiniteTag** aparece no canto superior esquerdo do app (ex: `$meunegocio`)
3. No app: vá em *Vendas → Checkout → Criar checkout*
4. Isso habilita a API de Checkout na sua conta

> ℹ️ A InfinitePay não exige token de API — a autenticação é feita pelo seu **handle** (InfiniteTag).

### 3. Descobrir seu ID do Telegram (para admin)

Fale com **@userinfobot** no Telegram — ele responde com seu ID numérico.

### 4. Configurar variáveis de ambiente

```bash
cp .env.example .env
```

Edite o `.env`:

```env
TELEGRAM_BOT_TOKEN=123456:ABC-DEF...
IP_HANDLE=meunegocio          # sem o $ inicial
ADMIN_ID=123456789
PUBLIC_URL=https://meu-bot.railway.app
PORT=3000
```

### 5. Instalar e rodar

```bash
npm install
npm start
```

---

## ☁️ Deploy no Railway

1. Crie conta em https://railway.app
2. **New Project → Deploy from GitHub repo**
3. Selecione o repositório
4. Vá em **Variables** e adicione todas as variáveis do `.env`
5. A `PUBLIC_URL` será o domínio gerado pelo Railway (ex: `https://bot-production-abc.up.railway.app`)
6. Railway faz o deploy automaticamente ao detectar o `package.json`

---

## 💳 Como funciona o fluxo de pagamento

```
Usuário clica "Comprar"
    ↓
Bot chama POST /links na InfinitePay
    ↓
InfinitePay devolve uma URL de checkout
    ↓
Bot envia a URL como botão para o usuário
    ↓
Usuário abre o link e paga (Pix ou Cartão)
    ↓
InfinitePay chama nosso /webhook/infinitepay
    ↓
Bot libera o acesso automaticamente ⚡
```

---

## 📦 Cadastrar produtos (via Telegram)

Fale com seu bot e use os comandos admin:

### Acesso a grupo/canal privado

```
/addproduto Grupo VIP | Acesso vitalício | 29.90 | group | -1001234567890
```

**Como pegar o ID do grupo:**
1. Adicione seu bot ao grupo como **administrador**
2. Envie uma mensagem no grupo
3. Acesse: `https://api.telegram.org/bot<TOKEN>/getUpdates`
4. Procure `chat.id` (número negativo como `-1001234567890`)

### Arquivo (PDF, vídeo, etc.)

1. Envie o arquivo para o próprio bot no privado
2. Acesse `getUpdates` e copie o `file_id`
3. Use:

```
/addproduto Ebook | Guia completo | 19.90 | file | BQACAgIA...
```

### Link externo

```
/addproduto Curso Online | Acesso à plataforma | 97.00 | link | https://plataforma.com/acesso
```

### Outros comandos admin

```
/admin           → Painel de ajuda
/listaprodutos   → Lista produtos ativos
/removeproduto 3 → Desativa produto de ID 3
```

---

## 🗂️ Estrutura de arquivos

```
telegram-pix-bot/
├── src/
│   ├── index.js        # Entry point
│   ├── bot.js          # Comandos + callbacks do Telegram
│   ├── admin.js        # Comandos de administração
│   ├── webhook.js      # Servidor Express + webhook InfinitePay
│   ├── infinitepay.js  # Integração com a API da InfinitePay
│   ├── delivery.js     # Lógica de entrega por tipo de produto
│   └── database.js     # SQLite (esquema + queries)
├── data/
│   └── bot.db          # Banco gerado automaticamente
├── .env.example
├── package.json
└── README.md
```

---

## 🐞 Troubleshooting

**Webhook não está sendo chamado:**
- Confirme que `PUBLIC_URL` está acessível publicamente
- Teste: `curl -X POST https://seu-app.railway.app/webhook/infinitepay -H "Content-Type: application/json" -d '{"order_nsu":"teste","paid_amount":100}'`

**Erro "IP_HANDLE inválido":**
- Use a InfiniteTag **sem** o `$` inicial
- Confirme que o Checkout está habilitado no app da InfinitePay

**Bot não responde:**
- Verifique o token com `/start`
- Confirme que está rodando com `npm start`
