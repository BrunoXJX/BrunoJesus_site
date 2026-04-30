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

Este comando sincroniza `frontend/` para `public/`, verifica ficheiros sensíveis, valida a estrutura estática, executa lint, testes, build e `npm audit --audit-level=high`.

## Front-end seguro

- HTML sem `<style>` inline.
- HTML sem `<script>` inline.
- CSS em `frontend/assets/css/styles.css`.
- JavaScript em `frontend/assets/js/`.
- Imagens locais em `frontend/assets/img/`.
- `bruno-jesus-portfolio-backend/public/` é gerado no build e não deve ser commitado.
- Sem `unsafe-inline` na CSP.
- Lucide está fixado por versão e com SRI.

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
