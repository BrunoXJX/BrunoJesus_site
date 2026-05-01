# Bruno Jesus Portfolio

Portfolio pessoal de Bruno Jesus com frontend estatico profissional e backend Fastify para contacto real.

## Ver Online

Versao estatica no GitHub Pages:

```txt
https://brunoxjx.github.io/BrunoJesus_site/
```

No GitHub Pages o site visual funciona de forma clicavel. O formulario fica em modo pre-visualizacao ate o backend Fastify estar publicado num dominio/API real.

## Estrutura

```txt
JarvisBJ/
|-- frontend/
|   |-- index.html
|   `-- assets/
|       |-- css/styles.css
|       |-- js/boot-preload.js
|       |-- js/main.js
|       `-- img/
|-- bruno-jesus-portfolio-backend/
|   |-- prisma/
|   |-- scripts/
|   |-- src/
|   |-- tests/
|   |-- .env.example
|   `-- package.json
|-- .github/workflows/pages.yml
|-- SECURITY.md
`-- README.md
```

## Frontend

A fonte visual esta em `frontend/`. O GitHub Pages publica diretamente esta pasta atraves do workflow `.github/workflows/pages.yml`.

O backend tambem sincroniza `frontend/` para `bruno-jesus-portfolio-backend/public/` antes de correr em desenvolvimento, build ou validacao de producao.

O ficheiro `portfolio.html` na raiz e apenas um atalho legado para o servidor local.

## Backend

O backend recebe o formulario de contacto, valida e sanitiza dados, aplica rate limiting, guarda mensagens em PostgreSQL, envia emails via Resend e serve o frontend no mesmo dominio.

## Producao

Antes de lancar num dominio publico:

```bash
cd bruno-jesus-portfolio-backend
npm install
npm run verify:production
```

Configura os segredos reais apenas no ambiente do fornecedor de deploy. Nunca coloques `.env` no GitHub.
