# APP-FIT

Aplicativo web para gestao de assessoria fitness. A aplicacao separa perfis de admin, personal e aluno, com cadastro de alunos, biblioteca de exercicios, modelos de treino, dietas, avaliacoes fisicas, fotos, convites e perfil do usuario.

## Requisitos

- Node.js 20+ recomendado
- npm
- PostgreSQL acessivel pela aplicacao

## Instalacao

```bash
npm install
```

## Configuracao local

Crie um arquivo `.env` na raiz usando `.env.example` como base:

```bash
PORT=3000
DATABASE_URL=postgresql://usuario:senha@localhost:5432/appfit
DATABASE_SSL=false
UPLOAD_DIR=./data/uploads
```

O servidor carrega `.env` automaticamente. O schema em `database/schema.sql` e aplicado ao iniciar a API.

## Rodar o projeto

Para iniciar frontend e API juntos:

```bash
npm run dev:full
```

Servicos locais:

- Frontend: http://localhost:5173
- API: http://localhost:3000
- Healthcheck: http://localhost:3000/api/health

Tambem e possivel iniciar separadamente:

```bash
npm run dev
npm run dev:api
```

## Primeiro acesso

Use a aba de cadastro para criar o primeiro usuario. O cadastro permite escolher entre `admin`, `personal` e `aluno`; alunos tambem podem entrar por convite gerado por um personal.

## Build de producao

```bash
npm run build
npm start
```

## Deploy

Em producao, defina as variaveis de ambiente do provedor:

```bash
PORT=8080
DATABASE_URL=postgresql://usuario:senha@host:25060/appfit
DATABASE_SSL=true
UPLOAD_DIR=/var/lib/app-fit/uploads
```

Se o provedor usar outro valor de `PORT`, mantenha o valor fornecido por ele. Para uploads persistentes, aponte `UPLOAD_DIR` para um volume persistente.
