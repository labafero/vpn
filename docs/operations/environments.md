# Ambientes e descoberta

Registro de consulta, sem credenciais. Última consulta remota: 10 de outubro de 2026. Revalidar antes de alterar configurações; ausência abaixo vale somente para essa consulta.

## Vercel

CLI 62.7.0 autenticada como quila. Única equipe retornada: anilson-lopes-projects, plano Hobby. Repositório GitHub: labafero/vpn.

| Aplicativo | Projeto | Root Directory | Domínio de produção observado |
|---|---|---|---|
| News | vpn-news | vpn-news | vpn-news.labafero.com |
| Site | vpn-site | vpn-site | vpn.labafero.com |
| Sentry | vpn-sentry | vpn-sentry | Não publicado |
| Monitor | vpn-monitor | vpn-monitor | Não publicado |

News e Site estão ligados ao repositório e têm Fluid Compute ativo. A PR #4 possui previews desses dois projetos; isso não demonstra deploy de Sentry ou Monitor.

Sentry e Monitor não existiam na consulta inicial e foram provisionados nesta equipe em 10 de outubro, pela API autenticada, sem vincular Git nem publicar deployments. A leitura posterior confirmou configuração e zero deployments, com Fluid Compute ativo em ambos. IDs: Sentry prj_LSA0iDCAKmk8cMBmQJVMJkwRVyjk; Monitor prj_Zad1GA7fd9Gn4I1Y7k2daO0VTxm7. A integração Git e as variáveis de ambiente ainda precisam ser preparadas; não configurar produção por consequência de um push sem verificar o destino.

Consulta sem vincular nem criar projeto:

```powershell
vercel whoami
vercel teams list --format json
vercel api '/v9/projects?limit=100' --scope anilson-lopes-projects --raw
```

Filtrar a resposta para metadados necessários antes de exibir ou registrar. Conferir paginação antes de concluir que um projeto não existe. Não imprimir respostas de endpoints de variáveis privadas.

## Supabase

As configurações locais de News, Monitor e Sentry apontam para https://zxzigoaddoslkokbzmyc.supabase.co. Isso identifica o destino configurado, mas ainda não comprova nome, organização, estado ou migrations do projeto remoto. A CLI 2.119.0 consultada não tinha sessão de gerenciamento; login oficial foi iniciado. Chave pública ou service key da aplicação não substitui autenticação de gerenciamento.

```powershell
pnpm dlx supabase@2.119.0 projects list --help
pnpm dlx supabase@2.119.0 projects list --output-format json
# Fluxo humano, sem imprimir ou versionar token de acesso:
pnpm dlx supabase@2.119.0 login --no-browser --agent no --output-format text
```

Após autenticar, confirmar o projeto pela referência e consultar ajuda dos comandos de migrations/query/link. Vincular somente o worktree de trabalho ao destino confirmado. Preparar comparação/dry run antes de aplicar migrations remotas, preservando as restrições e autorizações da fase.

O .env remoto de desenvolvimento do Sentry contém configuração Supabase e Client ID/Secret Twitch, mas não fornece ainda conexão privada vpn_sentry, chave de criptografia, segredo Cron ou callback remoto. A existência de segredos locais não demonstra que as variáveis estejam configuradas na Vercel. Não copiar o .env local de teste: ele aponta para Supabase local e usa material gerado para essa prova.

## Fundação

Plano: docs/superpowers/plans/2026-10-06-fase-0-fundacao.md. Evidências: docs/validation/fase-0-oauth.md. Operação do agendador: docs/validation/twitch-scheduler.md.

- PR #4: fundação, branch codex/fase-0-fundacao. Job foundation-db aprovado no commit 0cb46da; CI geral falhou no lint preexistente do Site.
- PR #5: correção separada do Site, branch codex/vpn-site-checks. Ambas abertas na consulta de 10 de outubro; nenhum merge realizado pelo agente.
- Supabase Cron e OAuth reais já têm provas locais. Deployment Sentry/Monitor, migrations/job remotos e ausência de parâmetros OAuth nos logs de hosting ainda não foram comprovados.

Esses fatos devem evitar perguntas repetidas, não substituir verificação ao vivo. Atualizar o registro após novas descobertas e entregas.
