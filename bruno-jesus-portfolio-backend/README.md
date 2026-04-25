# bruno-jesus-portfolio-backend

Backend e runtime web do portefólio de Bruno Jesus. A API valida pedidos de contacto, guarda mensagens em PostgreSQL com Prisma, envia emails com Resend e serve o front-end no mesmo servidor para um deploy simples, sem Docker.

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

## Estrutura

```txt
bruno-jesus-portfolio-backend/
├── prisma/
├── public/
├── scripts/
├── src/
├── tests/
├── .env.example
├── package.json
├── README.md
├── tsconfig.json
└── vitest.config.ts
```

## Instalação

```bash
npm install
```

## Ambiente

Cria o `.env` local a partir do exemplo:

```bash
cp .env.example .env
```

No Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Valores obrigatórios:

- `NODE_ENV`
- `PORT`
- `HOST`
- `TRUST_PROXY`
- `DATABASE_URL`
- `FRONTEND_URL`
- `RESEND_API_KEY`
- `CONTACT_RECEIVER_EMAIL`
- `CONTACT_FROM_EMAIL`

Nunca coloques valores reais no GitHub. Usa `.env.example` apenas com placeholders.

## PostgreSQL

Podes usar PostgreSQL local ou uma base de dados gerida pelo fornecedor de deploy.

```bash
npm run prisma:generate
npx prisma migrate dev
```

Em produção:

```bash
npm run prisma:deploy
```

## Front-end incluído

O backend serve o portefólio no mesmo domínio:

- fonte de verdade: `../portfolio.html`
- ficheiro servido: `public/index.html`

Sempre que alterares o front-end:

```bash
npm run sync:frontend
```

O `predev` e o `prebuild` já executam esta sincronização automaticamente.

## Desenvolvimento

```bash
npm run dev
```

URLs locais:

- site: `http://localhost:3333`
- health: `http://localhost:3333/health`
- API info: `http://localhost:3333/api`

## Build e produção

```bash
npm run build
npm start
```

Preparação completa antes do deploy:

```bash
npm run deploy:prepare
```

Este comando sincroniza o front-end, gera o cliente Prisma, aplica migrations de produção e compila TypeScript.

## Health check

```bash
curl http://localhost:3333/health
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

Se o front-end for servido noutro domínio, define CORS no `.env` com `FRONTEND_URL` e configura o endpoint no front-end sem colocar segredos no HTML.

## Testes

```bash
npm test
```

Os testes usam mocks para Prisma e Resend, por isso não precisam de base de dados real nem credenciais válidas.

## Segurança

- Não commitar `.env`.
- Não commitar logs, `node_modules`, `dist` ou `coverage`.
- Configurar segredos reais apenas no painel do fornecedor de deploy.
- Usar `NODE_ENV=production` em produção.
- Usar `TRUST_PROXY=true` apenas atrás de reverse proxy confiável.
- Manter `FRONTEND_URL` alinhado com o domínio real.
- Manter `RATE_LIMIT_CONTACT_MAX` baixo para reduzir spam.
