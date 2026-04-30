# bruno-jesus-portfolio-backend

Backend e runtime web do portefólio de Bruno Jesus. A API valida pedidos de contacto, guarda mensagens em PostgreSQL com Prisma, envia emails com Resend e serve o front-end no mesmo domínio para um deploy simples, sem Docker.

## Stack

- Node.js 22+
- TypeScript
- Fastify
- Prisma ORM
- PostgreSQL
- Zod
- Resend
- Pino Logger
- Vitest

## Instalação

```bash
npm install
```

## Ambiente local

Cria o `.env` local a partir do exemplo:

```bash
cp .env.example .env
```

No Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Valores principais:

- `PORT=3333`
- `DATABASE_URL`
- `FRONTEND_URL`
- `RESEND_API_KEY`
- `CONTACT_RECEIVER_EMAIL`
- `CONTACT_FROM_EMAIL`

Nunca coloques valores reais no GitHub. O `.env.example` deve ficar sempre com placeholders.

## Ambiente de produção

Para domínio público, configura no painel do fornecedor:

```env
NODE_ENV=production
PORT=3333
HOST=0.0.0.0
TRUST_PROXY=true

FRONTEND_URL="https://teu-dominio.pt"
CORS_ORIGINS="https://www.teu-dominio.pt"

DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"

RESEND_API_KEY="re_..."
CONTACT_RECEIVER_EMAIL="bruno.asjesuss@gmail.com"
CONTACT_FROM_EMAIL="Bruno Jesus Portfolio <contacto@teu-dominio.pt>"

REQUEST_BODY_LIMIT_BYTES=65536
EMAIL_TIMEOUT_MS=5000
RATE_LIMIT_CONTACT_MAX=5
RATE_LIMIT_CONTACT_WINDOW_MINUTES=10
RATE_LIMIT_GLOBAL_MAX=100
RATE_LIMIT_GLOBAL_WINDOW_MINUTES=15
```

Notas importantes:

- `FRONTEND_URL` tem de usar HTTPS em produção.
- `CORS_ORIGINS` é opcional e aceita origens extra separadas por vírgulas, por exemplo domínio com `www`.
- `CONTACT_FROM_EMAIL` deve estar verificado no Resend.
- `TRUST_PROXY=true` é necessário quando a app fica atrás de proxy, load balancer, Cloudflare, Render, Railway, Nginx ou semelhante.

## PostgreSQL e Prisma

Desenvolvimento:

```bash
npm run prisma:generate
npx prisma migrate dev
```

Produção:

```bash
npm run prisma:deploy
```

## Front-end incluído

Fonte de verdade visual:

```txt
../frontend/
├── index.html
└── assets/
    ├── css/styles.css
    ├── js/boot-preload.js
    ├── js/main.js
    └── img/
```

Pasta servida em produção:

```txt
public/
```

Sincronizar:

```bash
npm run sync:frontend
```

O script limpa a pasta `public` e copia a estrutura de `frontend/`, evitando ficheiros antigos expostos por engano.

A pasta `public/` é gerada e não deve ser commitada. O deploy deve correr `npm run build` ou `npm run deploy:prepare` para a recriar a partir de `../frontend/`.

O HTML não contém CSS ou JavaScript inline. A CSP permite apenas scripts próprios, Lucide fixado por versão, estilos próprios e CDNs de fontes.

## Desenvolvimento

```bash
npm run dev
```

URLs locais:

- site: `http://localhost:3333`
- health: `http://localhost:3333/health`
- API info: `http://localhost:3333/api`

## Produção

Preparar release:

```bash
npm run deploy:prepare
```

Verificação completa antes de publicar:

```bash
npm run verify:production
```

Arrancar depois do build:

```bash
npm start
```

## Health check

```bash
curl https://teu-dominio.pt/health
```

Resposta esperada:

```json
{
  "status": "ok",
  "service": "bruno-jesus-portfolio-backend",
  "timestamp": "2026-04-23T00:00:00.000Z"
}
```

## Contacto

```bash
curl -X POST http://localhost:3333/api/contact \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Pessoa de Teste",
    "email": "teste@example.com",
    "subject": "Projeto de automação",
    "message": "Gostaria de falar sobre um projeto de automação para a minha empresa."
  }'
```

Se o envio de email falhar, a mensagem continua guardada na base de dados e a API devolve sucesso parcial.

## Integração com o front-end

Quando o portefólio é servido pelo backend, o formulário usa:

```js
fetch("/api/contact")
```

Se precisares de servir o HTML noutro domínio, define `FRONTEND_URL`, adiciona origens extra em `CORS_ORIGINS` e expõe a URL da API através de `window.BRUNO_PORTFOLIO_API_URL`, sem colocar segredos no HTML.

## Segurança

- CORS controlado, sem wildcard.
- CSP restritiva com fontes e CDNs necessários.
- HSTS ativo apenas em produção.
- Rate limit global e específico no formulário.
- Body limit configurável.
- Validação com Zod.
- Sanitização de HTML perigoso.
- Honeypot anti-spam.
- Bloqueio simples de excesso de links.
- Logs sem expor conteúdo completo da mensagem.
- `.env` e logs ignorados por Git.

## Testes

```bash
npm test
```

Os testes usam mocks para Prisma e Resend, por isso não precisam de base de dados real nem credenciais válidas.
