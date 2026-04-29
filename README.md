# Bruno Jesus Portfolio

Portefólio pessoal de Bruno Jesus com front-end estático profissional e backend Fastify para contacto real.

## Estrutura

```txt
JarvisBJ/
├── frontend/
│   ├── index.html
│   └── assets/
│       ├── css/styles.css
│       ├── js/boot-preload.js
│       ├── js/main.js
│       └── img/
├── bruno-jesus-portfolio-backend/
│   ├── public/
│   ├── prisma/
│   ├── scripts/
│   ├── src/
│   ├── tests/
│   ├── .env.example
│   └── package.json
├── SECURITY.md
└── README.md
```

## Front-end

A fonte visual está em `frontend/`. O backend sincroniza essa pasta para `bruno-jesus-portfolio-backend/public/` antes de correr em desenvolvimento, build ou validação de produção.

O ficheiro `portfolio.html` na raiz é apenas um atalho legado para o servidor local.

## Backend

O backend recebe o formulário de contacto, valida e sanitiza dados, aplica rate limiting, guarda mensagens em PostgreSQL, envia emails via Resend e serve o front-end no mesmo domínio.

## Produção

Antes de lançar num domínio público:

```bash
cd bruno-jesus-portfolio-backend
npm install
npm run verify:production
```

Configura os segredos reais apenas no ambiente do fornecedor de deploy. Nunca coloques `.env` no GitHub.
