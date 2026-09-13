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
- O servidor salva uploads em `/tmp/app-fit/uploads` por padrao. Esse armazenamento e temporario no App Platform.
- A API expõe healthcheck em /api/health.

## Configuração recomendada para DigitalOcean

Este projeto usa SQLite, então a configuração estável na DigitalOcean é um volume persistente, não uma conexão remota de banco. O erro de runtime “Cannot open database because the directory does not exist” acontece quando o diretório /var/lib/app-fit/data não está montado no container.

Defina estas variáveis de ambiente no App Platform:

```bash
PORT=8080
DATABASE_PATH=/var/lib/app-fit/data/app-fit.db
UPLOAD_DIR=/var/lib/app-fit/data/uploads
```

No painel do DigitalOcean App Platform:

1. Vá em Settings > App-Level Environment Variables
2. Adicione as três variáveis acima
3. Vá em Storage / Volumes e crie um volume persistente
4. Monte o volume em /var/lib/app-fit/data
5. Mantenha HTTP Port em 8080

Com isso, o SQLite fica persistente entre deploys e reinicializações. O projeto já cria os diretórios automaticamente se as variáveis existirem.

> Se você quiser migrar para PostgreSQL/MySQL do DigitalOcean Managed Database, será necessário refatorar a camada de acesso do banco e ajustar schema/queries, porque o código atual está construído em better-sqlite3.
