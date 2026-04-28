# Segurança

Este projeto está preparado para repositório público e deploy em domínio real, desde que os segredos fiquem fora do Git.

## Nunca publicar

- `.env`
- `.env.*`
- chaves Resend
- URLs reais de base de dados
- passwords
- tokens
- logs com dados pessoais
- dumps de base de dados

## Verificação antes de deploy

```bash
cd bruno-jesus-portfolio-backend
npm run verify:production
```

Este comando sincroniza o front-end, verifica ficheiros sensíveis, executa lint, testes, build e `npm audit --audit-level=high`.

## Variáveis obrigatórias em produção

- `NODE_ENV=production`
- `TRUST_PROXY=true`
- `FRONTEND_URL=https://teu-dominio.pt`
- `DATABASE_URL` com PostgreSQL de produção
- `RESEND_API_KEY` real
- `CONTACT_RECEIVER_EMAIL` real
- `CONTACT_FROM_EMAIL` com domínio verificado no Resend

## Cabeçalhos e proteções

- CSP restritiva
- HSTS apenas em produção
- CORS sem `*`
- rate limit global e no formulário
- limite de payload
- validação com Zod
- sanitização de HTML perigoso
- honeypot anti-spam
- logs sem expor mensagens completas
