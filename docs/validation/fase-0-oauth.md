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
| RLS sobre instalação Supabase completa | `supabase test db` não conectou em 127.0.0.1:54322 | Pendente; job de CI preparado |
| Identidade, papel atual e sessão revogada | Testes de validação e lookup de sessão | Validado por testes; sessão real pendente |
| Callback OAuth e credenciais cifradas | Consentimento, replay, concorrência, falhas, cifra e revogação cobertos | Validado por testes com provedor simulado |
| Proxy HTTP privado | H3 real com auth/provedor simulados; CSRF, cookies, destino e erros | Validado por testes |
| Conta Twitch real conectada/revogada | Nenhuma credencial Twitch de teste fornecida no worktree | Pendente |
| Tipos do banco após migration | Arquivo gerado existente preservado; CI exporta novo artefato | Regeneração/revisão pendentes |
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
