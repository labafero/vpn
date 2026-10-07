# Validação Twitch na Vercel Hobby

O Supabase Cron chama `POST /api/internal/twitch/validate` a cada 30 minutos. Não depende do cron da Vercel. O endpoint exige um segredo próprio; sessões de usuário não autorizam sua execução. Tokens e erros do provedor não são retornados.

## Ativação

1. Configurar Root Directory como `vpn-sentry` e hospedar na Vercel com Fluid Compute ativo. O preset Vercel configura duração máxima de 300 segundos; o serviço deixa de iniciar novos usuários após 200 segundos. Configurar as variáveis de `.env.example`, incluindo `NUXT_TWITCH_CRON_SECRET`, com 32 bytes aleatórios ou mais. Usar a conexão privada com o papel restrito `vpn_sentry`, nunca o usuário postgres da aplicação.
2. No Supabase, habilitar Vault e cadastrar os segredos `vpn_sentry_validation_url` (URL HTTPS completa do endpoint) e `vpn_twitch_cron_secret` (mesmo valor da variável do Sentry). Usar o formulário de segredos do dashboard para evitar valores em SQL versionado ou histórico de consultas. Nenhum segredo deve usar prefixo `NUXT_PUBLIC_`.
3. Executar `supabase/operations/schedule-twitch-validation.sql` como postgres. É uma operação de ambiente, não uma migration automática. Reexecutar atualiza o job com o mesmo nome.
4. Executar uma chamada autenticada e conferir HTTP 200 com os contadores. Conferir também uma execução real agendada. O sucesso de `cron.job_run_details` prova apenas que a solicitação foi enfileirada: conferir `net._http_response` para confirmar HTTP 200 e ausência de timeout. Não imprimir os cabeçalhos da fila HTTP.

## Operação

Conexões com tentativa mais antiga são processadas primeiro. Resposta 503 indica falha ou trabalho adiado e exige investigação. O limite é cooperativo entre usuários, não cancela uma transação já iniciada; os pedidos Twitch têm timeout individual de 10 segundos. Manter o volume e os tempos de execução abaixo do orçamento, com validação de cada conexão em menos de uma hora. A agenda isoladamente não garante isso durante indisponibilidade ou excesso de carga.

O worker contínuo `pnpm --filter @vpn/sentry workers:twitch` permanece disponível para ambiente local. Não executar simultaneamente como agendador permanente em produção. Para desativar somente este job: `SELECT cron.unschedule('vpn-twitch-validation');`. Rotacionar o segredo tanto no Sentry quanto no Vault.

## Logs de OAuth: pendência de produção

O código sanitiza suas respostas e logs, mas a documentação da Vercel informa que os logs de runtime incluem parâmetros de busca. O callback Twitch recebe `code` e `state` pela URL; o redirecionamento posterior não elimina o registro da requisição inicial. Não está comprovada a ausência desses parâmetros nos logs da hospedagem. A exigência de não registrar o código OAuth precisa ser resolvida e verificada antes de fechar esse gate da Fase 0. Não registrar access token, refresh token nem o segredo do cron em ferramentas de diagnóstico.

Referências: [Supabase Cron e Vault](https://supabase.com/docs/guides/functions/schedule-functions), [duração Vercel](https://vercel.com/docs/functions/configuring-functions/duration), [logs Vercel](https://vercel.com/docs/logs/runtime).
