# Bruno Jesus Portfolio

Portefólio pessoal de Bruno Jesus com front-end premium e backend Fastify para contacto real.

## Estrutura

```txt
JarvisBJ/
├── portfolio.html
├── SECURITY.md
├── bruno-jesus-portfolio-backend/
│   ├── prisma/
│   ├── public/
│   ├── scripts/
│   ├── src/
│   ├── tests/
│   ├── .env.example
│   └── package.json
└── README.md
```

## Front-end

O ficheiro visual principal é `portfolio.html`. Para produção, o backend sincroniza esse ficheiro para `bruno-jesus-portfolio-backend/public/index.html` e serve o site no mesmo domínio da API.

## Backend

O backend recebe o formulário de contacto, valida e sanitiza dados, aplica rate limit, guarda mensagens em PostgreSQL, envia emails via Resend e serve o front-end.

## Produção

Antes de lançar num domínio público:

```bash
cd bruno-jesus-portfolio-backend
npm install
npm run verify:production
```

Configura os segredos reais apenas no ambiente do fornecedor de deploy. Nunca coloques `.env` no GitHub.
