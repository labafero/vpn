# Fase 0 — fundação: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Estabelecer os limites de produto, acesso e dados da VPN e validar uma conexão Twitch segura antes de construir o monitoramento privado.

**Architecture:** Supabase Auth identifica usuários VPN; vincular Twitch é uma autorização separada, operada pelo Sentry. O Monitor consome contratos privados e o News conserva suas APIs e fluxos editoriais. A fundação entrega documentação de domínio, contratos verificáveis, persistência mínima com RLS e uma prova vertical OAuth; sessões, convites e detecção ficam nas próximas fases.

**Tech Stack:** pnpm, Nuxt 4/Nitro, TypeScript, Supabase Auth/Postgres, OpenAPI 3.1, Nuxt UI 4, Tailwind CSS 4 e valibot.

**Spec:** `PRD.md`, especialmente “Privacidade e modelo de acesso”, “Segurança e confiança” e “Fase 0 — fundação”; `DESIGN.md`; `AGENTS.md`.

## Global Constraints

- “Toda transmissão é privada por padrão.”
- “Nenhuma transmissão será indexada publicamente ou exibida no portal público sem autorização explícita.”
- “Tokens de provedores não podem aparecer em URLs, logs ou payloads públicos.”
- “Tipos de banco gerados não devem ser editados manualmente.”
- “Não adicionar `pages/` na raiz do repositório — os projetos Nuxt 4 usam o diretório `app/`.”
- “Idioma: strings de UI em português (pt-BR).”
- “Não sugerir atalhos ou workarounds quando o problema real ainda não foi resolvido.”
- Preservar `lint → typecheck → build`; adicionar validação de contratos e testes de segurança sem eliminar essas etapas.
- Não aplicar migrações em produção, publicar serviços ou incluir credenciais no Git durante a execução deste plano.

## Review Focus

1. Usuário autenticado acessando conexão de outro dono: negar tanto na API quanto via Data API/RLS.
2. Callback OAuth sem cookie, expirado, repetido ou com identidade VPN diferente: rejeitar sem persistir tokens.
3. Mudança de papel administrativo com JWT ainda válido: consultar a atribuição atual, sem confiar em metadados editáveis.
4. Twitch indisponível durante desconexão: bloquear uso local imediatamente e manter revogação remota pendente para nova tentativa.
5. Credenciais ou parâmetros OAuth presentes em erros/logs: devolver códigos estáveis e mensagens sanitizadas; nunca registrar respostas brutas do provedor.

## Estado observado e limites

- `packages/contracts/openapi.yaml` e `src/index.ts` descrevem somente `/health`, `/cities` e `/posts`; os tipos são manuais.
- `check-openapi.mjs` procura strings, sem validar OpenAPI ou compatibilidade dos tipos.
- O Monitor tem somente uma página inicial. O Sentry tem três rotas públicas e um helper REST que usa a chave pública, sem identidade do solicitante.
- `supabase/config.toml` expõe `public` e `graphql_public`; credenciais precisam permanecer em schema não exposto.
- Ainda não existe infraestrutura de testes. Introduzi-la somente para contratos, RLS, autorização e OAuth, onde regressões comprometem privacidade.
- Existe também `vpn-site`; não migrar nem alterar essa superfície nesta fase. Documentar sua presença ao atualizar a arquitetura.
- Não criar antecipadamente todas as dez entidades do PRD. Nesta fase persistir apenas papéis, conexão, consentimento, canal, transação OAuth e credenciais. Definir o restante no modelo conceitual.

## Decisões propostas para revisão

Estas decisões completam lacunas do PRD; são propostas deste plano, não requisitos previamente aprovados.

- Manter contas existentes em `auth.users`; não criar outra tabela `users`. Papéis globais: `member` e `vpn_admin`; dono e convidado são relações com recursos. Redação não recebe privilégio administrativo implicitamente.
- O administrador pode ler metadados privados do domínio, mas somente o dono conecta/desconecta Twitch e concede/retira consentimento. Nenhum cliente recebe tokens.
- Login VPN continua por e-mail/senha no Supabase. Twitch vincula canal a uma conta VPN já autenticada; não cria nem substitui a identidade VPN.
- Consentimento `monitoring-v1`, registrado separadamente do OAuth. Conectar não ativa monitoramento. Fase 0 mantém `monitoring_enabled=false`.
- OAuth Authorization Code no Sentry, sem solicitar e-mail, chat, assinaturas ou criação de clips. Validar identidade pelo endpoint `/validate`; confirmar em conta real que o fluxo com escopos vazios atende a essa necessidade.
- Uma conexão Twitch por usuário VPN; um canal Twitch não pode pertencer a dois donos VPN. Troca de conta exige desconexão explícita.
- Transações OAuth expiram em 10 minutos, são de uso único e vinculam usuário VPN, estado aleatório e cookie HttpOnly. A Twitch retorna ao proxy de mesma origem do Monitor em `/api/sentry/provider-connections/twitch/callback`; ele encaminha sessão VPN e nonce ao Sentry. Retorno final somente a `/conexao` na origem configurada do Monitor.
- Retenção inicial proposta: transações OAuth por até 24 horas após expiração; consentimento e metadados da conexão enquanto a conta existir, mais 30 dias após exclusão solicitada; tokens removidos após revogação confirmada. Revogação pendente guarda apenas credencial cifrada necessária à tentativa, por até 24 horas, com falha operacional registrada se esse prazo terminar.
- Evidências de fases futuras: proposta de 30 dias para mídia e 90 dias para eventos, sem coleta nesta fase. Aprovar essa política antes da Fase 2; publicação editorial não amplia retenção automaticamente.
- Cifrar credenciais com AES-256-GCM no Sentry, chave de 32 bytes e identificador de versão em configuração privada. Não usar chave Supabase como chave de cifra.
- Monitor usa um proxy Nitro de mesma origem para o Sentry. O navegador envia sua sessão ao Monitor; o proxy transmite o JWT validado ao Sentry. Evita um contrato dependente de cookies compartilhados entre domínios.

## Arquivos e responsabilidades

| Área | Arquivos | Responsabilidade |
| --- | --- | --- |
| Domínio | `docs/architecture/foundation.md`, `PRD.md`, `README.md`, `AGENTS.md` | Fronteiras, entidades, matriz de acesso, consentimento e retenção |
| Contratos | `packages/contracts/openapi.yaml`, `src/index.ts`, `src/generated.ts`, `scripts/check-openapi.mjs`, `scripts/generate-types.mjs`, `tests/openapi.test.ts`, `package.json` | OpenAPI como fonte de verdade, geração e verificação |
| Banco | Nova migração via CLI em `supabase/migrations/`, `supabase/tests/foundation.test.sql`, `packages/database/src/database.types.ts` | Persistência, privilégios e RLS; tipos regenerados |
| Auth Sentry | `vpn-sentry/server/utils/auth.ts`, `private-database.ts`, `api-error.ts`, `server/api/v1/me.get.ts`, `tests/auth.test.ts` | Validar identidade, acesso privado e erros |
| OAuth Sentry | `server/utils/twitch-oauth.ts`, `token-crypto.ts`, `server/api/v1/provider-connections/twitch/{authorize.post,callback.get,index.get,index.delete}.ts`, `tests/twitch-oauth.test.ts`, `tests/token-crypto.test.ts`, `workers/validate-twitch.mjs` | Vincular, consultar, revogar e validar credenciais |
| Prova Monitor | `vpn-monitor/app/pages/login.vue`, `app/pages/conexao.vue`, `app/middleware/auth.ts`, `server/api/sentry/[...path].ts`, `tests/sentry-proxy.test.ts`, `nuxt.config.ts`, `.env.example` | Login existente e UI mínima de consentimento/conexão |
| Qualidade | `package.json`, `pnpm-lock.yaml`, `vitest.config.ts`, `.github/workflows/ci.yml`, `docs/validation/fase-0-oauth.md`, `vpn-sentry/{nuxt.config.ts,.env.example,package.json}` | Testes, configuração privada e evidência de integração |

Os caminhos da linha OAuth são relativos a `vpn-sentry/`. A migração recebe o timestamp gerado pela CLI, nunca um nome inventado. Atualizar pacotes e lockfile apenas nas tarefas que necessitem dependências; não adicionar dependências nativas.

### Task 1: Consolidar domínio e política de acesso

**Files:** criar `docs/architecture/foundation.md`; atualizar `PRD.md`, `README.md` e `AGENTS.md` nas seções de arquitetura/dados efetivamente alteradas.

**Interfaces:** consome PRD; produz matriz de ações por ator, dicionário de entidades, política `monitoring-v1` e fronteira pública/privada usados nas Tasks 2–5.

- [ ] **Step 1:** Registrar os critérios de aceite: conta VPN independente de Twitch; conexão não ativa monitoramento; dono/admin leem metadados; apenas dono muda OAuth/consentimento; convidado e público não acessam conexões.
- [ ] **Step 2:** Escrever o modelo conceitual das entidades do PRD com dono, relações, estados e fronteiras de exposição. Para entidades adiadas, documentar somente a relação necessária para evolução, sem migrations nem endpoints.
- [ ] **Step 3:** Incorporar as decisões propostas acima ao documento, com consentimento, revogação, retenção por categoria, exclusão e responsáveis. Revisar os prazos com o usuário antes da implementação que depende deles.
- [ ] **Step 4:** Definir contrato de fronteira: News acessa dados editoriais; Monitor usa API privada; Sentry valida identidade/autorização e opera provedores; workers não servem respostas públicas. Registrar a presença de `vpn-site` e corrigir somente documentação desatualizada relacionada ao escopo.
- [ ] **Step 5:** Conferir os cinco itens da Fase 0 contra as Tasks 1–6; cada item precisa de entregável e evidência. Commit: `docs: define VPN foundation and access boundaries`.

### Task 2: Tornar contratos verificáveis e definir a API privada mínima

**Files:** arquivos de contratos e qualidade indicados no mapa; `packages/contracts/src/generated.ts` é gerado.

**Interfaces:** produzir `ApiError = { code: string; message: string; requestId: string }`, `Me = { userId: string; role: 'member' | 'vpn_admin' }` e `TwitchConnection = { id: string; provider: 'twitch'; providerUserId: string; login: string; status: 'connected' | 'expired' | 'revocation_pending' | 'revoked'; monitoringEnabled: false; consentVersion: string; consentedAt: string; connectedAt: string; revokedAt: string | null }`. IDs UUID, timestamps RFC3339 UTC; nunca incluir tokens.

- [ ] **Step 1:** Adicionar Vitest na raiz e scripts `test:foundation`, `contracts:generate`, `contracts:check`. Adicionar parser/validador OpenAPI e gerador TypeScript como dependências de desenvolvimento, com versões resolvidas e fixadas no lockfile.
- [ ] **Step 2:** Em `openapi.test.ts`, criar casos `rejectsUnresolvedRef`, `rejectsInvalidSchema`, `rejectsGeneratedTypeDrift`, `preservesPublicContracts` e `rejectsSecretsInConnectionSchema`. Verificar referência inexistente, schema inválido, mudança não regenerada, três contratos públicos preservados e ausência de `access_token`/`refresh_token`/ciphertext.
- [ ] **Step 3:** Executar `pnpm test:foundation -- packages/contracts/tests/openapi.test.ts`; confirmar que as fixtures inválidas demonstram limitações do verificador atual antes de substituí-lo.
- [ ] **Step 4:** Definir `/me` GET 200/401; `/provider-connections/twitch/authorize` POST com `{ consentVersion: 'monitoring-v1', consentAccepted: true }`, resposta 200 `{ authorizationUrl: string }`, erros 400/401/409/503; `/provider-connections/twitch/callback` GET com `code`/`state` ou erro do provedor, resposta 303 para retorno fixo e erros 400/503; `/provider-connections/twitch` GET 200 `TwitchConnection | null`, DELETE 204 ou 202 `{ status: 'revocation_pending' }`, erros 401/503. Identidade do dono vem do JWT, nunca de parâmetro.
- [ ] **Step 5:** Marcar segurança bearer nas rotas privadas, inclusive callback Sentry: a Twitch retorna ao proxy Monitor, que acrescenta bearer da sessão e encaminha o nonce do cookie. Adicionar 401 ao callback e exigir estado/transação além do bearer. Corrigir `nullable` para a sintaxe OpenAPI 3.1, preservando o significado dos campos públicos. Gerar tipos e reexportar aliases atuais `HealthResponse`, `CityConfig`, `Post`, `ContractsApi` em `src/index.ts`.
- [ ] **Step 6:** Substituir busca de strings por validação estrutural e comparação da geração em memória com `generated.ts`. Rodar `pnpm contracts:check`, testes e `pnpm typecheck`. Commit: `feat: validate shared API contracts and generate types`.

### Task 3: Persistir a fundação com privilégios mínimos

**Files:** migração criada via CLI, `supabase/tests/foundation.test.sql`, tipos gerados; documento de domínio atualizado com esquema físico.

**Interfaces:** `public.user_roles(user_id uuid PK FK auth.users, role member|vpn_admin)`; `public.provider_connections(id uuid PK, user_id uuid UNIQUE FK auth.users, provider twitch, provider_user_id text, login text, status, consent_version, consented_at, connected_at, revoked_at)`; UNIQUE `(provider, provider_user_id)`; `public.channels(id uuid PK, connection_id uuid UNIQUE FK provider_connections, owner_id uuid FK auth.users, monitoring_enabled boolean DEFAULT false CHECK false)`.

Schema não exposto `private`: `provider_credentials(connection_id uuid PK FK provider_connections, ciphertext text, iv text, tag text, key_version text, expires_at timestamptz, validated_at timestamptz, retry_until timestamptz)` e `oauth_transactions(state_hash text PK, user_id uuid FK auth.users, browser_nonce_hash text, consent_version text, expires_at timestamptz, consumed_at timestamptz)`. Nenhum token em colunas públicas. Estado consumido atomicamente; FKs e exclusão em cascata impedem órfãos.

- [ ] **Step 1:** Consultar `supabase --version` e `--help` dos comandos de migração, testes e geração. Usar banco local isolado; confirmar migrations existentes aplicáveis antes de testar alterações. Criar migração com `supabase migration new foundation_access`.
- [ ] **Step 2:** Escrever testes SQL com fixtures de dono A, membro B, administrador e anon: A lê sua conexão; B/anon não leem; admin lê metadados; todos os clientes falham ao ler credenciais, promover papel, mudar dono ou habilitar monitoramento. Retirada de admin precisa valer na próxima consulta com o mesmo JWT.
- [ ] **Step 3:** Executar `supabase test db`; confirmar falha por ausência das entidades da fundação.
- [ ] **Step 4:** Implementar tabelas, checks, índices e grants explícitos; RLS em tabelas públicas. Papéis são gravados somente por operação administrativa confiável. Para consultar papel em policies, usar helper em schema privado com retorno booleano, `search_path` fixo e privilégios limitados, sem recursão na própria RLS. Qualquer `SECURITY DEFINER` precisa de justificativa e teste de isolamento.
- [ ] **Step 5:** Aplicar/recriar banco local, rodar testes e advisors disponíveis. Regenerar `database.types.ts` pela CLI para os schemas necessários; não editar esse arquivo manualmente. Não conceder acesso Data API ao schema privado para facilitar o Sentry: usar conexão Postgres restrita no backend.
- [ ] **Step 6:** Registrar bootstrap do primeiro administrador por UUID via operação administrativa, sem e-mail hardcoded nem endpoint público de promoção. Commit: `feat: add private connection model and access policies`.

### Task 4: Validar identidade VPN no Sentry

**Files:** `auth.ts`, `private-database.ts`, `api-error.ts`, `/me`, `tests/auth.test.ts`; configuração privada Sentry.

**Interfaces:** `requireVpnUser(event: H3Event): Promise<Me>` verifica bearer com Supabase Auth e consulta papel atual; `toApiError(error: unknown, requestId: string): ApiError`; `withPrivateDatabase<T>(operation: (transaction: FoundationTransaction) => Promise<T>): Promise<T>` executa operações restritas em transação. `FoundationTransaction` contém apenas métodos do domínio, nunca expõe SQL ou credenciais ao cliente.

- [ ] **Step 1:** Criar testes `missingTokenReturns401`, `forgedTokenReturns401`, `expiredTokenReturns401`, `editableMetadataCannotGrantAdmin`, `removedAdminLosesAccess`, `upstreamErrorIsSanitized`. Assertions: status correto, papel consultado no banco e ausência de JWT/token em corpo ou logs capturados.
- [ ] **Step 2:** Rodar `pnpm test:foundation -- vpn-sentry/tests/auth.test.ts`; confirmar falha antes de implementar.
- [ ] **Step 3:** Implementar autenticação com chamada de validação Supabase, sem confiar em `getSession()` ou decodificação local sem verificação. Usar cliente por solicitação, sem compartilhar estado de sessão. Negar indisponibilidade de validação com 503; não tratar como usuário anônimo válido.
- [ ] **Step 4:** Implementar acesso Postgres privado com credencial somente servidor, parâmetros SQL e privilégios restritos. Manter `supabase-rest.ts` no fluxo público existente; não substituir chave pública por chave privilegiada nas rotas públicas.
- [ ] **Step 5:** Implementar `/me` e erros privados no contrato definido na Task 2. Verificar `/health`, `/posts` e `/cities` continuam com respostas públicas anteriores. Rodar testes, lint e typecheck Sentry. Commit: `feat: authenticate private Sentry requests`.

### Task 5: Provar OAuth Twitch com consentimento e revogação

**Files:** arquivos OAuth Sentry, prova mínima Monitor, testes e exemplos de ambiente indicados no mapa. Adicionar dependências UI/validação somente se necessárias.

**Interfaces:** `beginTwitchAuthorization(user: Me, consent: { consentVersion: 'monitoring-v1'; consentAccepted: true }, browserNonce: string): Promise<{ authorizationUrl: string }>`; `completeTwitchAuthorization(user: Me, input: { code: string; state: string; browserNonce: string }): Promise<void>`; `getTwitchConnection(user: Me): Promise<TwitchConnection | null>`; `disconnectTwitch(user: Me): Promise<'revoked' | 'revocation_pending'>`; `validateStoredConnections(now: Date): Promise<{ checked: number; expired: number; failed: number }>`.

- [ ] **Step 1:** Criar testes OAuth para callback válido; recusa de consentimento; estado ausente/expirado/reutilizado; cookie incompatível; duas respostas concorrentes; `client_id` inesperado; canal já vinculado a outro dono; timeout/401 Twitch; falha de persistência; desconexão repetida; revogação remota pendente. Assertions: nenhum token público, nenhum segundo consumo, nenhum canal duplicado e monitoramento sempre false. Criar testes de cifra para roundtrip, adulteração rejeitada e chave ausente recusada.
- [ ] **Step 2:** Rodar `pnpm test:foundation -- vpn-sentry/tests/twitch-oauth.test.ts vpn-sentry/tests/token-crypto.test.ts`; confirmar falha inicial.
- [ ] **Step 3:** Implementar estado criptograficamente aleatório de 32 bytes e nonce separado, armazenar hashes; proxy Monitor grava cookie HttpOnly/SameSite=Lax, Secure fora de localhost, expiração 10 minutos. Sentry verifica bearer e compara usuário validado com dono da transação na conclusão; sessão ausente/inválida ou usuário diferente rejeita o callback. Consumir transação atomicamente antes da troca; falha exige iniciar novo fluxo. Não aceitar `user_id` vindo do callback.
- [ ] **Step 4:** Trocar code por tokens somente servidor, validar identidade/client_id/escopos, cifrar e persistir conexão/canal/consentimento em transação. Redirecionar ao retorno fixo sem code/token. Sanitizar também logs de acesso do callback e do proxy; códigos de autorização não devem persistir em logs.
- [ ] **Step 5:** Implementar refresh com exclusão mútua por conexão e atualização atômica dos tokens; 401 não recuperável marca `expired`. Validar no início do worker e no máximo a cada hora enquanto mantiver sessões OAuth. Worker deve ter execução contínua explícita e instrução de operação; não depender de timer em função serverless ou de visitas ao painel.
- [ ] **Step 6:** Implementar desconexão idempotente: negar uso local imediatamente, revogar no provedor, apagar credenciais após sucesso. Timeout mantém `revocation_pending` sem uso ativo; worker tenta novamente até `retry_until`, então apaga credenciais e registra falha remota. Implementar limpeza de transações vencidas conforme política. Registrar exclusão de conta sem apagar credencial antes de tentar revogação.
- [ ] **Step 7:** Implementar login VPN e `/conexao` no Monitor com consentimento desmarcado, conectar, status e desconectar. Usar Nuxt UI/valibot e pt-BR. Proxy aceita apenas as rotas privadas explicitamente permitidas, encaminha o JWT ao Sentry e não aceita destino arbitrário. Mutations exigem origem permitida e proteção CSRF; callback não recebe esse bloqueio genérico.
- [ ] **Step 8:** Testar proxy com ausência de sessão, destino arbitrário, origem indevida, GET versus mutação e credenciais privadas ausentes no bundle. Rodar testes, lint/typecheck dos workspaces e contratos. Commit: `feat: validate Twitch linking with explicit consent`.

### Task 6: Registrar evidência real e fechar a fundação

**Files:** `docs/validation/fase-0-oauth.md`, `.github/workflows/ci.yml`, exemplos de ambiente e README operacional.

**Interfaces:** consome Tasks 1–5; produz evidência reproduzível e critérios de passagem para a Fase 1.

- [ ] **Step 1:** Adicionar testes de fundação e `pnpm contracts:check` à CI, preservando ordem `lint → typecheck → build`. Testes RLS usam Supabase local em job próprio; não acessar banco de produção na CI.
- [ ] **Step 2:** Documentar variáveis privadas `NUXT_TWITCH_CLIENT_ID`, `NUXT_TWITCH_CLIENT_SECRET`, `NUXT_TWITCH_REDIRECT_URI`, `NUXT_MONITOR_ORIGIN`, `NUXT_TOKEN_ENCRYPTION_KEY`, `NUXT_TOKEN_KEY_VERSION`, `NUXT_PRIVATE_DATABASE_URL` e configuração de validação Supabase. Monitor recebe somente chaves publicáveis e URL interna Sentry para o proxy. Nenhum valor secreto em exemplos.
- [ ] **Step 3:** Com aplicação Twitch registrada e conta de teste autorizada, executar conectar → validar identidade → consultar metadados → desconectar → confirmar token inválido. Repetir recusa, expiração do state e revogação pela Twitch. Registrar data, ambiente, passos e resultado sem identificadores sensíveis/tokens; mock não comprova integração real. Credenciais ausentes tornam este critério pendente, não aprovado.
- [ ] **Step 4:** Executar `pnpm contracts:check`, `pnpm test:foundation`, `supabase test db`, `pnpm lint`, `pnpm typecheck`, `pnpm build`. Registrar comandos, saídas e limitações reais, sem declarar sucesso de etapas não executadas.
- [ ] **Step 5:** Verificar portal público, login/edição de matéria, página de cidade e overlay em 1920×1080; Monitor sem sessão vai ao login e não contém dados privados no HTML. `/health` continua disponível sem autenticação. Conferir bundle do Monitor e payloads públicos sem segredos.
- [ ] **Step 6:** Conferir os cinco itens da Fase 0: produto/dados documentados; acesso/consentimento/retenção definidos; OAuth real validado; contratos verificáveis; fronteiras documentadas e exercitadas. Commit: `chore: verify foundation contracts auth and OAuth`.

## Dependências e ordem

Executar Tasks 1 → 2 → 3 → 4 → 5 → 6. Rever as decisões propostas antes de começar código. A prova OAuth requer app Twitch e ambiente de teste; preparar contratos e testes locais enquanto isso, sem substituir evidência real por mocks. Workers de análise audiovisual, painel de sessões, convites e Discord não fazem parte deste plano.

## Fontes técnicas consultadas

- [Twitch — Authorization Code](https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/): troca servidor a servidor e proteção com state.
- [Twitch — validação de tokens](https://dev.twitch.tv/docs/authentication/validate-tokens/): validação no início e a cada hora.
- [Twitch — revogação](https://dev.twitch.tv/docs/authentication/revoke-tokens/): endpoint e respostas de revogação.
- [Supabase — RBAC](https://supabase.com/docs/guides/api/custom-claims-and-role-based-access-control-rbac): modelo de papéis e autorização.
- [Supabase — validação de JWT](https://supabase.com/docs/reference/javascript/auth-getclaims): verificação de identidade, distinta de leitura de sessão local.

Reconsultar documentação e changelog Supabase antes de executar: bibliotecas e CLI podem mudar. Este plano não certifica o funcionamento atual da integração nem a aprovação dos prazos de retenção.
