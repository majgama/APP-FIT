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

- O banco SQLite é criado automaticamente em data/app-fit.db.
- O servidor salva uploads em data/uploads.
- A API expõe healthcheck em /api/health.
