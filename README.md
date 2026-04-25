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


