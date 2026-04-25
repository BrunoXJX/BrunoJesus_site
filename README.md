# Bruno Jesus Portfolio

Portefólio pessoal de Bruno Jesus com front-end premium em HTML/CSS/JavaScript e backend opcional para o formulário de contacto.

## Estrutura

```txt
JarvisBJ/
├── portfolio.html
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

O ficheiro principal e a fonte de verdade visual é:

```txt
portfolio.html
```

Pode ser aberto diretamente no browser. Quando for servido pelo backend, o ficheiro é sincronizado para:

```txt
bruno-jesus-portfolio-backend/public/index.html
```

## Backend

O backend é necessário apenas se quiseres que o formulário de contacto seja real.

Ele faz:

- validação do formulario;
- proteção contra spam simples;
- rate limit;
- gravação das mensagens em PostgreSQL;
- envio de emails com Resend;
- endpoint de health check;
- serving do front-end no mesmo domínio.

## Segurança antes de publicar

Nunca enviar para GitHub:

- `.env`;
- `.env.*`;
- `node_modules/`;
- `dist/`;
- `coverage/`;
- logs;
- credenciais reais;
- chaves de API;
- dumps de base de dados.

O repositório deve incluir apenas `.env.example`, com placeholders seguros.

## Comandos principais

```bash
cd bruno-jesus-portfolio-backend
npm install
npm run sync:frontend
npm run build
npm run lint
npm test
```

## Publicar no GitHub

Antes de criares o commit:

```bash
git status --short
git check-ignore -v bruno-jesus-portfolio-backend/.env
```

Se o segundo comando confirmar que `.env` está ignorado, está correto.

Não faças push de segredos. Configura as variáveis reais apenas no painel do fornecedor de deploy.
