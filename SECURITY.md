# Segurança

Este projeto está preparado para ser publicado como repositório público, desde que os segredos fiquem fora do Git.

## O que nunca deve ir para o GitHub

- `.env`
- `.env.*`
- chaves Resend
- URLs de bases de dados reais
- passwords
- tokens
- logs com dados pessoais
- dumps de base de dados

## Ficheiros seguros para commit

- `.env.example`
- `portfolio.html`
- `bruno-jesus-portfolio-backend/src/**`
- `bruno-jesus-portfolio-backend/prisma/schema.prisma`
- documentação
- testes

## Variáveis de ambiente

Configura os valores reais apenas no ambiente de deploy:

- `DATABASE_URL`
- `RESEND_API_KEY`
- `CONTACT_RECEIVER_EMAIL`
- `CONTACT_FROM_EMAIL`
- `FRONTEND_URL`

## Antes de publicar

Executa:

```bash
cd bruno-jesus-portfolio-backend
npm run build
npm run lint
npm test
npm audit --audit-level=high
```

Na raiz do projeto:

```bash
git check-ignore -v bruno-jesus-portfolio-backend/.env
```

O comando deve confirmar que o `.env` está ignorado.

## Contacto de segurança

Usa o canal de contacto público do portefólio para reportar problemas.
