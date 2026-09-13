# APP-FIT

Aplicativo de gestão para assessoria fitness com login por perfil, alunos, treinos, dietas, avaliações e biblioteca de exercícios.

## Requisitos

- Node.js 18+
- npm

## Instalação

```bash
npm install
```

## Rodar o projeto

Para iniciar frontend e API juntos em um único comando:

```bash
npm run dev:full
```

Isso executa:
- Frontend em http://localhost:5174
- API em http://localhost:3000

Também é possível iniciar separadamente:

```bash
npm run dev
npm run dev:api
```

## Usuários de demonstração

- personal@appfit.local / 123456
- admin@appfit.local / 123456
- aluno@appfit.local / 123456

## Build de produção

```bash
npm run build
```

## Observações

- O projeto usa PostgreSQL como banco principal.
- O servidor salva uploads em `/tmp/app-fit/uploads` por padrao. Esse armazenamento e temporario no App Platform.
- A API expõe healthcheck em `/api/health`.

## Configuração recomendada para DigitalOcean

No App Platform, vincule o banco gerenciado ao app e configure:

```bash
PORT=8080
DATABASE_URL=${dbappfit.DATABASE_URL}
DATABASE_SSL=true
UPLOAD_DIR=/tmp/app-fit/uploads
```

O nome `dbappfit` precisa ser exatamente o nome do recurso de banco vinculado ao app. Nao use uma URL de exemplo como `@base`, `@host` ou `@localhost`.
