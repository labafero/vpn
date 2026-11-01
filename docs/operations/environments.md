# Ambientes e serviços

Estado revalidado em 31 de outubro de 2026. Conta, vínculo e saúde remota
mudam; consulte Vercel e Supabase CLI antes de operar e nunca registre valores
de credenciais.

## Local

- Repositório: `/home/anils/labafero/vpn`, WSL2, Node 24.21.0 e pnpm 11.1.3.
- Vercel CLI 64.5.0 e Supabase CLI 2.119.0 disponíveis.
- Arquivos `.env` são locais, ignorados pelo Git e com permissão restrita. Os
  nomes de variáveis esperados estão nos `.env.example` de cada aplicativo.

## Vercel

Equipe `anilson-lopes-projects`; os projetos estão vinculados ao repositório
`labafero/vpn` com raiz correspondente ao aplicativo.

| Aplicativo | Projeto       | Domínio                    |
| ---------- | ------------- | -------------------------- |
| News       | `vpn-news`    | `vpn-news.labafero.com`    |
| Site       | `vpn-site`    | `vpn.labafero.com`         |
| Monitor    | `vpn-monitor` | `vpn-monitor.labafero.com` |
| Sentry     | `vpn-sentry`  | `vpn-sentry.labafero.com`  |

Os domínios de produção usam autenticação VPN própria; a proteção dos previews
permanece ativa. Em 31/10, Monitor e Sentry estavam READY. A interface do
Monitor exige autenticação. Deployments de produção são direcionados por app;
publicar um deles não autoriza publicar os demais.

Deployments Git automáticos estão habilitados somente para `main` nos quatro
projetos Vercel; previews de branches e PRs ficam desativados. A produção de
cada projeto acompanha `main`, e merges nessa branch publicam automaticamente.
Publicações manuais direcionadas continuam disponíveis pela CLI.

Variáveis privadas ficam somente no projeto Sentry:

- `NUXT_TWITCH_EVENTSUB_SECRET` e `NUXT_TWITCH_EVENTSUB_CALLBACK` para EventSub.
- `NUXT_TWITCH_CRON_SECRET` para validação agendada de credenciais Twitch.
- `NUXT_CLIP_WORKER_SECRET` para autenticar o worker de clips.
- `NUXT_OPENAI_API_KEY` é opcional e central. Quando configurada, é usada antes
  da chave OpenAI individual do dono; a chave individual é cifrada no schema
  `private` e não é devolvida pela API.

## Supabase

Projeto `VPN_RP`, ref `zxzigoaddoslkokbzmyc`, região `us-east-2`. Em 31/10, as
migrations locais e remotas estavam alinhadas, incluindo persistência, chaves
individuais e processamento de clips. Postgres 17.6.1.155 na última leitura.

O cron `vpn-clip-processing` está ativo a cada 30 minutos (`7,37 * * * *`). A
URL do worker, seu segredo e o bypass de proteção Vercel ficam no Vault sob os
nomes `vpn_clip_worker_url`, `vpn_clip_worker_secret` e
`vpn_vercel_cron_bypass`. A limpeza automática de submissões vencidas ainda não
está agendada; a operação está descrita em
[`schedule-clip-retention.sql`](../../supabase/operations/schedule-clip-retention.sql).

O cron de validação Twitch é separado do processamento de clips. A última
observação em 31/10 retornou 503; isso não bloqueia o worker de clips.

## Twitch

Callback OAuth do Sentry: `https://vpn-monitor.labafero.com/api/sentry/provider-connections/twitch/callback`.
EventSub aponta para `https://vpn-sentry.labafero.com/api/eventsub/twitch`.
Client IDs, tokens e segredos não devem ser copiados para documentação ou
mensagens.
