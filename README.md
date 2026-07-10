# VITALLE OPS

Sistema operacional interno para a Vitalle Odontologia & Harmonizacao.

O projeto foi separado em um repositorio limpo, sem dependencias de produto legado.

## Stack

- Backend: FastAPI em Python
- Frontend: Next.js App Router + TypeScript + Tailwind CSS
- Banco: PostgreSQL no Supabase
- Auth: Supabase Auth, API key administrativa e personas locais de desenvolvimento

## Banco Supabase

Projeto configurado para:

- URL: `https://lhorlqgyinabovqsbgae.supabase.co`
- Publishable key: `sb_publishable_tVhG2LMV-AYTSpSrcX6O2A_qCkpoiIe`
- Project ref: `lhorlqgyinabovqsbgae`

Configure a senha do banco em `SUPABASE_DB_URL` antes de rodar migrations.

## Instalar

```bash
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
cd web
npm install
```

## Variaveis

Copie os exemplos:

```bash
cp .env.example .env
cp web/.env.example web/.env.local
```

## Migrations

```bash
vitalle-migrate status
vitalle-migrate apply
```

## Seed

```bash
python scripts/seed_vitalle_ops.py --demo-users --sync-today
```

## Rodar local

API:

```bash
vitalle-api
```

Web:

```bash
cd web
npm run dev
```

## Rotas principais

- `/login`
- `/dashboard`
- `/meu-dia`
- `/operacao`
- `/setores`
- `/alertas`
- `/historico`
- `/relatorios`
- `/auditoria`
- `/admin/tarefas`
- `/admin/setores`
- `/admin/usuarios`
- `/admin/configuracoes`

## Documentacao

- [Arquitetura](docs/ARCHITECTURE.md)
- [Banco](docs/DATABASE.md)
- [Operacao](docs/OPERATIONS.md)
- [Permissoes](docs/PERMISSIONS.md)
