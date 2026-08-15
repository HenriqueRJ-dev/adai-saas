# AdAI SaaS

Versão V5 do projeto.

## Fluxos

- `/` — site principal
- `/login` — login
- `/signup` — cadastro
- `/dashboard` — painel interno do cliente
- `/dashboard/analyze` — análise de marca com IA
- `/dashboard/meta-setup` — seleção de Página e conta de anúncios
- `/dashboard/campaign-setup` — criação de campanha

## Campanhas

O fluxo de campanha aceita upload de imagem/vídeo usando Supabase Storage temporário ou um link de publicação existente. Os arquivos enviados ao bucket temporário são removidos após a tentativa de criação na Meta.

As campanhas são criadas inicialmente como `PAUSED` para revisão antes da ativação.
