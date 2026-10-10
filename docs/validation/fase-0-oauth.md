# Evidência da Fase 0

Registro de implementação em 6 de outubro de 2026. Esta fase não está certificada para produção: a prova com Twitch real e o Supabase local completo precisam dos ambientes abaixo.

## Ambiente necessário

1. Supabase local iniciado por Docker, com todas as migrations aplicadas e usuários de teste A/B/admin.
2. Login Postgres restrito `vpn_sentry`: a migration cria o papel NOLOGIN. Um administrador configura LOGIN/senha fora do Git e fornece URL privada. O Sentry recusa outra identidade Postgres, inclusive `postgres`. Não usar URL administrativa em runtime.
3. Conta de teste VPN com e-mail/senha. Primeiro administrador por UUID em `public.user_roles`, via SQL administrativo; não existe rota de promoção. Contas comuns não precisam de registro explícito de papel.
4. App Twitch registrado com redirect exato `http://localhost:3001/api/sentry/provider-connections/twitch/callback`; em produção, HTTPS e origens fixas. Segredos apenas em `.env` ignorado/configuração privada. Sentry recebe client ID/secret, URL de retorno, origem Monitor, chave base64 de 32 bytes, versão da chave e URL Postgres restrita.
5. Monitor recebe URL/key publicáveis Supabase, `NUXT_SENTRY_URL` e `NUXT_MONITOR_ORIGIN`. A URL Sentry é configuração servidor, não pública. Não habilitar CORS genérico na API privada.

Subir Monitor com `pnpm --filter @vpn/monitor dev --port 3001` e Sentry com `pnpm dev:sentry`. Worker em processo persistente: `pnpm --filter @vpn/sentry workers:twitch`. O processo carrega `.env`, valida na inicialização e repete a cada 50 minutos; não publicar esse worker como função serverless. Uma execução pontual usa `pnpm --filter @vpn/sentry exec tsx --env-file=.env workers/validate-twitch.mjs --once` e falha com exit code 1 se indisponível.

## Registro de verificação

| Critério | Evidência local | Estado |
| --- | --- | --- |
| Referências/schema OpenAPI e divergência de tipos | Fixtures inválidas rejeitadas; tipos gerados da fonte | Validado por testes |
| Isolamento RLS dono/membro/admin/anon | Migration executada em Postgres PGlite, sem simular policies | Validado nesse ambiente |
| RLS sobre instalação Supabase completa | Migrations aplicadas e 9 testes pgTAP passaram localmente e na CI | Validado |
| Identidade, papel atual e sessão revogada | Signup/Auth real local e handler Sentry com papel atual e logout | Validado com Supabase real |
| Callback OAuth e credenciais cifradas | Consentimento, replay, concorrência, falhas, cifra e revogação cobertos | Validado por testes com provedor simulado |
| Proxy HTTP privado | H3 real com auth/provedor simulados; CSRF, cookies, destino e erros | Validado por testes |
| Conta Twitch real conectada/revogada | Vínculo pela UI, validate/refresh reais, retirada pela UI e token inválido na Twitch | Validado; reconexão completa ainda sem nova autorização |
| Tipos do banco após migration | CLI 2.119.0 gerou public, private e graphql_public a partir do banco local | Gerados automaticamente; verificação de compatibilidade abaixo |
| Lint/typecheck/build globais | Registrar os resultados finais abaixo | Sem presumir sucesso |

### Resultado final local

- `pnpm test:foundation`: 43 testes aprovados em sete arquivos. Inclui regressões de reconexão depois de refresh inválido e depois do prazo de revogação.
- `pnpm contracts:check`: aprovado; tipos API regenerados após adicionar `canReconnect`, sem expor credenciais.
- `pnpm build`: aprovado para todos os workspaces, com configuração Supabase publicável existente copiada para `.env` ignorado do worktree. Nenhuma credencial Twitch foi copiada/fornecida.
- `pnpm --filter @vpn/{news,monitor,sentry} lint` e `typecheck`, executados separadamente: aprovados. Verificação direta adicional por `vue-tsc` do servidor Sentry e servidor/app Monitor: aprovada.
- `pnpm lint` global: falha preexistente no `vpn-site`, com 67 erros de estilo e 66 warnings. Não foram desabilitadas regras para contornar a falha.
- `pnpm typecheck` global: falha preexistente por ausência de `vpn-site/tsconfig.json`. Site permanece fora do escopo desta fase.
- `supabase test db`: conexão recusada na porta local 54322; Docker/Supabase não iniciados. Tipos de banco não foram editados manualmente; job de CI exporta a geração para revisão.
- API construída Sentry: `/health` 200, `/cities` 200, `/posts?limit=1` 200, `/me` 401 e conexão Twitch 401 sem sessão.
- Browser: portal carregou matérias, `/neon` apresentou Neon TV; redação sem sessão redirecionou ao login. Monitor `/conexao` sem sessão redirecionou ao login; tema escuro confirmado por classe e estilo computado após fixar modo por página.
- Overlay `/overlay/idle` carregou como `Overlay Monitoramento`, sem overflow em viewport 1920×1080. A rota canônica do índice é `/overlay`, com parâmetro broadcaster obrigatório; a referência antiga `/overlay/index` em AGENTS.md foi corrigida.
- Captura de screenshot pelo browser indisponível; a inspeção de DOM não substitui aprovação visual por imagem. Edição autenticada de matéria e conexão real Twitch continuam pendentes.
- Busca por variáveis privadas Twitch/chave de cifra/URL Postgres no bundle público Monitor não encontrou ocorrências.

### Decisões de execução e revisão

- Execução nativa em worktree isolado; commits locais, sem merge, push ou publicação.
- Scripts da skill executados com Git Bash no Windows; progresso registrado por tarefa.
- Redocly complementa SwaggerParser, cuja validação OpenAPI 3.1 deixou passar uma fixture inválida.
- PGlite acrescenta uma execução real das policies PostgreSQL, sem substituir integração Supabase/pgTAP ou geração dos tipos do banco.
- Lookup backend de `auth.sessions` garante retirada de sessão imediata; papel administrativo consultado no banco atual.
- Auditoria privada registra somente códigos de expiração/falha de revogação, sem respostas ou tokens.
- Falha de validação após refresh preserva o token rotacionado em transação, evitando perder a nova credencial.
- Revisão independente encontrou um bloqueio permanente de reconexão. Correção mantém a distinção entre revogação confirmada e pendente, disponibiliza `canReconnect` e exige novo consentimento; testes observaram falha antes da correção e depois passaram.
- Comando de build News agora passa o limite de heap diretamente ao Node, preservando 4096 MiB e compatibilidade com Windows/Linux. A atribuição POSIX anterior falhava no Windows.
- Tema escuro fixado nas páginas Monitor porque a preferência do browser podia selecionar claro.

Os riscos restantes são as verificações de ambiente não executadas, não uma aprovação implícita para produção. A revisão não julgou prova Twitch, instalação completa Supabase, redaction de logs de hosting e edição autenticada editorial sem seus ambientes; estes itens permanecem pendentes. Falhas preexistentes do site continuam registradas, com regras e comandos preservados.

PGlite executa a mesma migration e RLS, mas o bootstrap mínimo de `auth` não substitui Supabase Auth, pgTAP nem instalação completa. Mocks de Twitch não demonstram aceitação dos escopos vazios nem revogação no provedor.

## Roteiro de OAuth real

- Entrar no Monitor como A; consentimento começa desmarcado e a conexão só inicia após aceitação.
- Conectar com Twitch de teste; confirmar identidade do canal, `monitoringEnabled=false`, versão/horário do consentimento e ausência de tokens em response/HTML/bundle.
- Reusar callback e abrir em outra sessão/browser: ambos falham sem alterar vínculo. Repetir com state vencido após dez minutos.
- Tentar vincular o mesmo canal à conta B: conflito, sem substituir o dono.
- Recusar na Twitch: nenhuma conexão nova. Não registrar query do callback ou error_description.
- Remover integração no painel Twitch; executar worker pontual; conexão deve expirar, sem coletar mídia.
- Reconectar após desconexão explícita, depois desconectar pelo Monitor. `/validate` com o access token guardado somente no ambiente seguro deve devolver token inválido; excluir essa credencial de teste depois. Registrar apenas status HTTP.
- Simular indisponibilidade na revogação: estado local pendente, retentativa pelo worker e remoção de credencial ao terminar 24 horas. O fim do prazo não comprova revogação remota.
- Revogar a sessão VPN iniciadora antes do callback: retorno é recusado apesar de o JWT não ter expirado.

## Operação e limites

Supabase Auth continua independente de Twitch. Antes de excluir uma conta, retirar autorização e processar revogação até sucesso ou prazo; só então excluir `auth.users`. A FK faz cascade. Não há endpoint de exclusão de conta nesta fase. Retenção de 30 dias de metadados é teto, permitindo exclusão mais cedo depois da revogação.

Configurar proxy/hosting para não registrar query strings de `/api/sentry/provider-connections/twitch/callback` nem `/api/v1/provider-connections/twitch/callback`. O código sanitiza exceções e não registra requests/respostas brutas; logs de acesso do provedor de hospedagem são responsabilidade da configuração de operação. Não incluir tokens em ferramentas de tracing.

Rotação de chave exige recriptografar credenciais usando chave antiga em operação privada antes de trocar versão; esta fase falha de forma fechada se versão/chave divergirem, sem implementar um gerenciador de múltiplas chaves. Não trocar segredo com conexões existentes sem esse procedimento.

Se Twitch emitir token e a persistência falhar, o callback tenta revogá-lo antes de falhar. Falha simultânea de banco e revogação remota não pode ser tornada atômica entre provedores: não há conexão local autorizada, e a remoção da integração no painel Twitch encerra a autorização remota. Isso deve ser registrado como falha da prova real, nunca conexão bem-sucedida.

## Fechamento

Atualizar este registro com comandos/exit codes e prova real antes de marcar Fase 0 concluída. Nenhuma migration foi aplicada a ambiente remoto; nenhuma publicação foi feita.

## Atualização de integração — 7 de outubro de 2026

- Docker Desktop disponível e ativo. CLI Supabase 2.119.0 executada via `pnpm dlx`; pgTAP incluído no banco, sem instalação separada.
- `supabase start`: instalação local completa iniciada, com todas as migrations aplicadas. O projeto remoto não foi alterado.
- `supabase test db`: PASS, nove testes. A CI da PR #4 também passou no job foundation-db: https://github.com/labafero/vpn/actions/runs/37559249167/job/112592541780.
- `supabase gen types typescript --local --schema public,private,graphql_public`: arquivo de tipos do banco regenerado automaticamente. graphql_public preservado também no comando da CI.
- Prova HTTP com Auth real: signup local, identidade validada pelo handler Sentry, member → vpn_admin → member com o mesmo JWT, logout global e resposta 401 imediata. Usou conexão Postgres restrita vpn_sentry; conta temporária excluída e role devolvida a NOLOGIN/PASSWORD NULL no finally.
- `supabase db advisors --local --type security --level warn --fail-on error`: exit 0, nenhum ERROR. Três WARN preexistentes: search_path de public.set_updated_at e policies INSERT/UPDATE de public.city_seasons para authenticated. Não pertencem ao modelo privado desta migration e não foram alteradas nesta verificação.
- Problemas preexistentes do vpn-site seguem em branch/PR independente para não ampliar o escopo da PR #4.
- A prova Twitch real permanece pendente: aplicação ainda não registrada pelo usuário. Requer Client ID/Secret privados, callback cadastrado e consentimento da conta de teste. Logs de hosting e edição editorial autenticada permanecem sem prova.

Os resultados históricos acima documentam a primeira execução; esta atualização substitui especificamente as pendências de Supabase completo, sessão real e geração dos tipos. Ainda não declara a Fase 0 concluída.`pnpm --filter @vpn/news typecheck`, Monitor e Sentry: exit 0 com os tipos novos. `pnpm contracts:check`: exit 0. Os 43 testes passaram novamente em 10,55s após encerrar o Supabase local; uma execução anterior sob carga concorrente atingiu o timeout de 5s de um subprocesso de contrato, sem alteração dos testes ou timeouts. A geração normaliza apenas whitespace final; não houve edição manual do schema gerado.

### Correção observada no OAuth real

A tentativa real chegou a token HTTP 200 e validate HTTP 200, mas o gateway rejeitou scopes sem array. A resposta real de autorização sem permissões usa scopes:null. O gateway agora normaliza exclusivamente null para [], preservando rejeição de campo ausente, string, número ou objeto e mantendo a rejeição de permissões não vazias pelo serviço. O teste de regressão falhou antes da correção e passou depois. Logs temporários de diagnóstico removidos; não incluíam tokens ou query strings. Credenciais da aplicação confirmadas por HTTP 200; token temporário de diagnóstico revogado com HTTP 200. Escrita restrita no banco verificada em transação com rollback.

49 testes passaram em oito arquivos com `vitest run --maxWorkers=1`. A execução concorrente atingiu o timeout de cinco segundos de um subprocesso OpenAPI sob carga; não houve alteração de timeout nem dos checks. A conexão real completa permanece pendente de uma nova autorização humana, pois o estado anterior foi consumido.
Lint e typecheck Sentry passaram após a correção.

### Prova Twitch real concluída — 7 de outubro de 2026

- Monitor exibiu canal conectado depois da autorização humana. Consentimento monitoring-v1 registrado, monitoramento false e identidade vinculada ao client/user esperado.
- validate real confirmou identidade e zero permissões. DTO de conexão não continha access token nem refresh token.
- Worker executou validação real: checked=1, expired=0, failed=0.
- Para testar refresh sem esperar horas, somente expires_at da credencial de teste foi antecipado no banco local; token Twitch não foi artificialmente invalidado. O worker fez refresh real, persistiu cifra e validou o novo access token, sem avançar o relógio.
- Desconexão feita pelo botão do Monitor. O banco ficou revoked, credencial removida e reconexão disponível. A Twitch rejeitou o access token atualizado em validate (401).
- Script de prova terminou com exit 0. Tokens ficaram somente em memória; saída continha apenas asserções de sucesso, sem credenciais ou queries de callback.
- Reconexão disponível na UI ainda requer novo consentimento humano para uma segunda prova de ligação. Hosting e redação autenticada continuam em verificação; esta evidência não encerra toda a Fase 0.
### Redação autenticada e CI

- News apontado somente ao Supabase local por .env.foundation ignorado, preservando o .env existente do projeto.
- Conta local autenticou no News, abriu redação, criou matéria descartável, editou o título e salvou pela interface. Consulta SQL independente confirmou novo título e owner esperado; a matéria de teste foi removida somente do banco local depois da prova. Nenhuma alteração de código News foi necessária.
- CI da PR do site passou em lint/typecheck/build do site, mas falhou depois no build News por ausência de Supabase para gerar páginas estáticas. Causa confirmada por revisão independente: o workflow não fornecia URL/chave nem fonte city_config.
- Workflow da fundação inicia Supabase isolado para build e exporta apenas API_URL/ANON_KEY locais, sem credenciais de produção, sem desabilitar o prerender e sem alterar o código News. YAML parseado e leitura pública local de city_config confirmada HTTP 200. O build em CI da combinação das PRs ainda depende da integração da PR do site, que permanece separada para revisão humana.
- Hosting de Sentry/worker ainda sem destino definido. A política documentada exige omitir queries de callback e credenciais dos logs; não há evidência de produção até verificar esse destino.

## Agendador Vercel Hobby — 7 de outubro de 2026

- Destino escolhido: Vercel Hobby para Sentry/Monitor, Supabase Cron para acionar a validação a cada 30 minutos. Rota interna POST com segredo exclusivo, sem autorização por JWT de usuário.
- Orçamento de 200 segundos por execução, função Vercel com máximo de 300 segundos e Fluid Compute. Contadores failed/deferred causam HTTP 503; fila ordenada por última tentativa persistida, separada de validated_at. Revisão identificou e corrigiu bloqueio de progresso por falhas repetidas.
- Nova migration adiciona last_attempt_at apenas a credenciais privadas. Aplicada somente no Supabase local; tipos regenerados pela CLI, sem edição manual.
- Prova local com extensões reais pg_cron/pg_net/Vault: configuração incompleta rejeitada, agenda idempotente, chamada HTTP ao handler real retornou 200 e zero conexões ativas. Job e segredos temporários removidos. Essa prova não equivale a execução remota agendada.
- Nove testes pgTAP passaram novamente. O teste de administrador foi limitado à própria fixture, pois o vínculo Twitch real de teste permanece no banco local como revogado; nenhuma conexão real foi apagada para fazer a suíte passar.
- Build com VERCEL=1 confirmou preset vercel e artefato de função. Não houve deploy remoto.
- A documentação Vercel informa parâmetros de busca nos logs de runtime. Não há evidência de configuração que omita code/state do callback. Esse gate segue aberto e precisa ser resolvido antes da conclusão em produção; sanitizar logs da aplicação e redirecionar não remove metadados da requisição inicial.
- Procedimento de ativação e operação: docs/validation/twitch-scheduler.md. Supabase Cron remoto ainda não ativado; requer URL publicada, segredo compartilhado em Vault e ambiente privado do Sentry, e prova real da execução agendada.
- Verificação final desta adaptação: 60 testes em 10 arquivos passaram; lint e typecheck Sentry passaram; build Vercel passou com maxDuration 300 confirmado no artefato. Dois testes de fila executam migration e SQL reais em PGlite, incluindo falha Twitch e timeout de lock. Nove testes pgTAP passaram no Supabase completo.

## Descoberta remota e continuidade — 10 de outubro de 2026

- Consulta autenticada por Vercel CLI/API: equipe anilson-lopes-projects, Hobby. News/Site encontrados, com domínios e Root Directory confirmados. Sentry/Monitor não existiam; foram criados sem Git integrado ou deployment. Leitura posterior confirmou zero deployments e Fluid Compute ativo. Registro em docs/operations/environments.md.
- Referência Supabase zxzigoaddoslkokbzmyc descoberta nas configurações locais de News/Monitor/Sentry, sem expor chaves. Consulta de projetos falhou por ausência de token de gerenciamento; fluxo oficial de login iniciado no navegador, aguardando autenticação humana. Nenhuma migration ou alteração de dados remota executada.
- Nova execução da CI no commit 0cb46da: foundation-db aprovado. CI geral falha no lint do Site, cuja correção permanece na PR #5. Previews News/Site aprovados; não são prova de deployment Sentry/Monitor.
- Rotina reaproveitável registrada em docs/workflows/entrega.md e vinculada pelo AGENTS.md: recuperar decisões aprovadas, descobrir ferramentas/ambientes antes de perguntar, separar evidências locais/remotas, preparar mudanças antes da autorização necessária e preservar o ponto de continuidade.
- Próxima ação: após login Supabase, confirmar organização/projeto e comparar migrations remotas com o plano. Preparar as variáveis e o destino dos previews Sentry/Monitor. A restrição original do plano contra publicação de serviços/migrations de produção continua registrada; obter autorização específica ao apresentar a preparação concreta, caso a ação não tenha sido autorizada posteriormente.

### Login e comparação remota — 10 de outubro de 2026

Login da CLI Supabase concluído pelo fluxo oficial. Projeto vpn confirmado ACTIVE_HEALTHY, referência zxzigoaddoslkokbzmyc. Worktree vinculado localmente. migration list: 18 versões alinhadas, somente foundation_access e twitch_validation_attempts pendentes. db push --dry-run --skip-vault confirmou as duas, seeds=[] e roles=[]. Consultas SQL de catálogo confirmaram ausência de user_roles/provider_connections/channels/provider_credentials e vpn_sentry; Vault instalado, pg_cron/pg_net ausentes. Nenhuma migration de produto aplicada. Próximo passo preparado: aplicar essas duas migrations no projeto confirmado mediante autorização específica compatível com a restrição do plano original; verificar histórico, objetos e advisors depois da aplicação. Não executar testes com fixtures de escrita no banco de produção.

### Migrations remotas aplicadas — 10 de outubro de 2026

Usuário autorizou explicitamente aplicar as duas migrations no Supabase vpn, ampliando a restrição original do plano somente para esta aplicação. db push --linked --skip-vault --yes aplicou 20261007011841_foundation_access.sql e 20261007124000_twitch_validation_attempts.sql, sem seeds ou roles adicionais. migration list posterior confirmou todas as 20 versões alinhadas. Consultas de catálogo confirmaram RLS em user_roles/provider_connections/channels, coluna last_attempt_at, authenticated sem SELECT nas credenciais e sem UPDATE em provider_connections; vpn_sentry pode atualizar credenciais, mas permanece NOLOGIN. USAGE no schema private para authenticated existe para chamar o helper de RLS; não concede acesso às tabelas privadas.

Advisors remotos security/warn/fail-on-error: exit 0, nenhum ERROR. WARN em public.set_updated_at (search_path mutável) e Auth (proteção contra senhas vazadas desabilitada). Nenhum warning aponta para as novas estruturas. Não alterei função preexistente ou configuração Auth nesta aplicação.

Ainda pendentes: provisionamento de acesso restrito do Sentry e variáveis privadas, previews Sentry/Monitor, callback Twitch remoto, habilitação pg_cron/pg_net e ativação/prova do job remoto, gate de logs OAuth. Nenhum deployment publicado ou job remoto ativado nesta etapa.

### Autorização de conclusão — 10 de outubro de 2026

Usuário reiterou a autorização para concluir a Fase 0 e pediu não repetir confirmações gerais. Continuação autorizada: configurar serviços e acesso restrito, publicar previews na equipe Vercel identificada, configurar e provar Cron no Supabase vpn e investigar/resolver logs OAuth. Pedir intervenção somente diante de um bloqueio concreto que exija ação humana ou mudança material de escopo. Esta autorização amplia a restrição original do plano para essas operações. Não autoriza merge das PRs, custos pagos ou promoção automática da branch main.

## Prova remota — domínio personalizado, 10 de outubro de 2026

Monitor e Sentry conectados ao GitHub labafero/vpn na Vercel, Root Directories vpn-monitor e vpn-sentry, branch de produção main. Domínios vpn-monitor.labafero.com e vpn-sentry.labafero.com verificados e vinculados à branch codex/fase-0-fundacao durante a validação; proteção de preview permanece ativa. Previews manuais READY: dpl_46KjxWu47XxUxesGC89gFQeD7WAN e dpl_HF9HvtJZz2MAJT77m1njsSATvwuv. Push posterior gerou checks de deployments automáticos, ainda em andamento nesta consulta.

Conta Twitch VPN_RP e Client ID comparados ao ambiente antes da alteração. Usuário concluiu login VPN e consentimento Twitch no domínio personalizado. Callback retornou 303; UI mostrou canal vpn_rp conectado. Consulta remota confirmou status connected, credencial com ciphertext/iv/tag presentes, validated_at preenchido e monitoring_enabled=false. Não foram exibidos tokens nem alteradas datas para simular elegibilidade do worker.

Endpoint Cron no domínio personalizado respondeu HTTP 200 com segredo próprio e bypass Vercel. URL do Vault atualizada para o domínio personalizado. Prova agendada anterior executou o mesmo comando com HTTP 200; checked=0 é esperado antes da elegibilidade das credenciais recém-validadas. Não equivale a prova de refresh remoto; refresh e revogação real foram comprovados localmente.

Logs consultados pela CLI incluíram callback de teste 401 e callback OAuth real 303. requestPath veio sem query e a string canário não apareceu no registro retornado. Isso comprova a representação consultada, não assegura ausência de parâmetros em todas as superfícies de logs da plataforma; manter essa fronteira explícita no fechamento.

CI geral da PR #4 continua falhando; correção separada do Site permanece na PR #5 e nenhum merge foi realizado. Não declarar entrega integral concluída enquanto os gates finais não estiverem resolvidos e verificados.

Execução normal da agenda em 10/10/2026 às 15h30 (America/Sao_Paulo): cron.job_run_details status succeeded; resposta pg_net HTTP 200, timed_out=false, checked=1, failed=0. Esta é prova de validação periódica da conexão remota real, sem job temporário nem alteração de timestamps.

CI da PR #5: diagnosticada ausência de configuração pública Supabase no passo Build. Variáveis públicas do repositório configuradas e workflow corrigido no commit d63fce5; nova execução 38076027238 disparada. Nenhuma chave de serviço enviada ao GitHub Actions.

## Produção e auditoria de logs — 10 de outubro de 2026

Usuário solicitou explicitamente domínios em produção, sem ambiente adicional. Variáveis provisionadas para production e builds realizados com target production. Monitor dpl_2SULH45mVne1w4CynZhot6KjkGP8 e Sentry dpl_CvRmLfoyZnZdVy5bQcxyvzL6hnLG READY. Domínios personalizados associados a esses deployments; gitBranch=null em ambos. Não houve merge das PRs. Publicado o código da fundação já validado, preservando conexão remota e chave de criptografia. Endpoint Sentry de produção respondeu HTTP 200 com checked=1, failed=0, expired=0, deferred=0.

Auditoria Supabase projeto zxzigoaddoslkokbzmyc, janela 09/10 15h38–10/10 15h38 (America/Sao_Paulo): 28 warnings 01006 de REVOKE pg_net, 1 warning HTTP 406 do teste da Data API, erro 42501 de UPDATE cron.job substituído por cron.alter_job e erro 42703 da consulta diagnóstica p.scopes corrigida. Todos originados nas nossas operações/validações. Auth, PostgREST, Storage, Realtime, Edge Functions, Supavisor, PgBouncer e Compute sem warnings/errors nessa janela; Auth apresentou eventos HTTP 200 do login remoto. Nenhuma evidência de falha da aplicação nessa amostra; não confundir estes logs com os avisos dos advisors.
Verificação final de produção: Monitor /login HTTP 200, UI autenticada mostra vpn_rp conectado; Sentry sem segredo HTTP 401. Sessão e vínculo preservados após troca do deployment.
