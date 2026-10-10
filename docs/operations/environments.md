# Ambientes e descoberta

Estado verificado em 10 de outubro de 2026. Revalidar destino, conta e projeto antes de alterar configurações. Nunca imprimir credenciais ou respostas completas de variáveis privadas.

## Vercel

CLI 62.7.0 autenticada como quila; equipe anilson-lopes-projects, plano Hobby, Fluid Compute ativo. Todos os projetos ligados a labafero/vpn, produção main.

| Aplicativo | Projeto / Root Directory | Domínio |
|---|---|---|
| News | vpn-news | vpn-news.labafero.com |
| Site | vpn-site | vpn.labafero.com |
| Monitor | vpn-monitor | vpn-monitor.labafero.com |
| Sentry | vpn-sentry | vpn-sentry.labafero.com |

Monitor e Sentry têm domínios verificados, associados à branch codex/fase-0-fundacao durante a validação. Ambos os previews estão READY. Monitor: dpl_46KjxWu47XxUxesGC89gFQeD7WAN; Sentry: dpl_HF9HvtJZz2MAJT77m1njsSATvwuv. Não houve promoção de main nem merge. As variáveis estão configuradas para preview; produção ainda não foi provisionada. Os primeiros deploys dos projetos novos foram classificados como produção pela Vercel apesar da opção preview e foram cancelados antes de servir.

A proteção de previews permanece ativa. Monitor usa uma credencial privada de automação para acessar Sentry; Cron usa uma credencial separada, além do segredo próprio do endpoint. Não enviar esses valores ao browser nem em query strings. A associação do domínio a uma branch de preview também aplica a proteção Vercel ao domínio personalizado.

## Supabase

CLI 2.119.0 autenticada e worktree vinculado ao projeto vpn, ref zxzigoaddoslkokbzmyc, ACTIVE_HEALTHY, us-east-2, Postgres 17.6.1.155. As 20 migrations estão alinhadas, incluindo foundation_access e twitch_validation_attempts, aplicadas com autorização específica do usuário.

RLS ativa nas três tabelas públicas da fundação. Credenciais privadas sem acesso SELECT para authenticated. Papel vpn_sentry LOGIN NOINHERIT, conexão TLS pelo pooler, permissões restritas verificadas. Criptografia e segredos remotos armazenados fora do Git. Advisors sem ERROR; dois WARN preexistentes: search_path de set_updated_at e proteção de senhas vazadas no Auth.

Cron vpn-twitch-validation ativo a cada 30 minutos; URL no Vault atualizada para https://vpn-sentry.labafero.com/api/internal/twitch/validate. Prova agendada temporária executou o mesmo comando com HTTP 200; job temporário removido. Endpoint personalizado também respondeu 200 com credenciais corretas, checked=0, failed=0, deferred=0, expired=0; vínculo remoto posteriormente confirmado com credencial criptografada e monitoramento desativado.

Supabase gerencia grants de pg_net e postgres não consegue revogá-los. net está excluído da Data API (406 PGRST106), anon/authenticated são NOLOGIN e todos os papéis LOGIN foram auditados como confiáveis. Não declarar que as filas são inacessíveis a outros logins SQL confiáveis. Consultar docs/validation/twitch-scheduler.md.

## Twitch e entrega

Conta VPN_RP e Client ID conferidos contra o .env antes da alteração. Callback configurado para https://vpn-monitor.labafero.com/api/sentry/provider-connections/twitch/callback. Conta quilamcz contém outro aplicativo e não deve ser usada para gerenciar esta aplicação.

PR #4: fundação, codex/fase-0-fundacao. PR #5: correção separada do Site, codex/vpn-site-checks. Nenhum merge realizado. Workflow obrigatório: docs/workflows/entrega.md. Evidências: docs/validation/fase-0-oauth.md.

OAuth local completo já comprovado. OAuth remoto comprovado com callback 303 e vínculo persistido; CLI de logs retornou requestPath sem query, sem assegurar outras superfícies da plataforma. Não declarar Fase 0 concluída antes de registrar os resultados. Login VPN no domínio personalizado confirmado pelo usuário; estado de conexão carregado corretamente.

