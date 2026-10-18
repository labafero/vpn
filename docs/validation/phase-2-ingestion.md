# Validação da ingestão privada — issue #15

Estado em 18/10/2026: implementação local de OAuth incremental, consentimento e envio manual preparada; entrega em rascunho, sem encerramento da issue. Plano: [issue 15](../superpowers/plans/2026-10-18-issue-15-clip-ingestion.md). Base: `083e900` (issue #14 integrada). Branch: `codex/issue-15-ingestion`; worktree: `/home/anewkilla/worktrees/vpn-issue-15-ingestion`.

## Autorizações e limites

Pedido vigente: continuar issue 15. Destino recuperado do plano: implementação local e PR revisável. Não foi autorizado merge, migration no banco remoto, ativação de captura, produção ou armazenamento de mídia. Nenhum desses passos foi executado. A PR permanece rascunho até as provas abaixo.

## Implementado

- Upgrade de OAuth aceita capacidades definidas no servidor. A UI pede apenas `clip_download` (`channel:manage:clips`); `clip_create` permanece reservado, sem captura agendada nesta entrega.
- Transação privada de OAuth vincula dono, nonce, conexão, identidade, scopes requeridos e fingerprint da credencial. Callback consome state uma única vez. O lock compartilhado impede sobrescrever tokens alterados por outro callback, refresh ou desconexão.
- Recusa, identidade/client_id divergentes, falta de scope ou callback inválido preservam o vínculo anterior. Um token retornado igual ao que está em uso não é revogado na falha. Refresh preserva os scopes concedidos e a rotação do refresh token.
- Monitor retorna a `/conexao` após recusa ou falha de upgrade, com cookie de resultado fixo de 60 segundos, sem refletir query do provedor. Redirect de upstream continua restrito ao destino configurado.
- GET/PATCH `/channels/{id}/clip-consent` e POST `/channels/{id}/clips` exigem sessão VPN. Dono vem da sessão, sem exceção para administrador enviar clips de outro dono.
- Parser valida a string original para recusar host/porta/userinfo/encoding/caminho ambíguos. Apenas o ID é enviado ao Helix oficial, com timeout; a URL fornecida nunca é buscada. Query/fragmento são descartados na canonicalização.
- Persistência contém somente referência canônica e metadados allowlisted. Não armazena URL temporária, MP4, captions ou transcrição. Estado inicial `pending_captions` não significa processamento realizado.
- Revalidação sob lock de dono verifica conexão, scope e revisão de consentimento antes de inserir. Revogação desativa modos e cancela pendências atomicamente; terminais são preservados. Reativação gera nova revisão e não reabre cancelados.
- Duplicatas, inclusive terminais ou de fonte já indisponível, retornam o registro existente. Inserções concorrentes também usam a chave única de canal/clip.
- UI separa autorização Twitch de ativação do envio manual, explica +18, captions, VOD/clip temporário e transcrição futura explícita.

## Decisões registradas

- Uma revisão UUID privada identifica cada alteração de consentimento. Comparar apenas timestamps convertidos para milissegundos perderia precisão em revoke/reaccept rápidos. Custo: coluna privada adicional; nenhuma mudança no contrato público.
- Captura e `clip_create` continuam desativados porque não há agendador nesta issue; aceitar o identificador no enum geral não ativa essa capacidade.
- A prova oficial de download permanece condição de aceite antes de disponibilizar amplamente ingestão/processamento. O formulário implementado não prova viabilidade de download.

## Evidências locais

- Testes de upgrade observados RED (seis falhas por rejeição da versão de consentimento) e GREEN após implementação.
- Regressões de parsing de query, payload de revogação, scopes malformados, revisão de consentimento, duplicata indisponível e recuperação de callback observadas RED e GREEN.
- Testes de OAuth cobrem callbacks realmente sobrepostos, replay, desconexão durante exchange, escopo ausente, identidade/client_id divergentes, refresh e preservação do token em uso.
- PGlite executa o SQL do repositório de clips com `vpn_sentry`, incluindo isolamento por dono, chamadas simultâneas de insert, cancelamento, estado terminal e revoke/reaccept enquanto Helix está suspenso. A prova complementar PostgreSQL real está registrada abaixo.
- Testes HTTP verificam autenticação, respostas no-store, sanitização e retorno fixo do OAuth. Gateway verifica host oficial, allowlist de metadata e erros 403/404/503.
- `pnpm lint`, `pnpm format`, `pnpm format:check`, `pnpm typecheck`, `pnpm contracts:check`: passaram após as correções finais da revisão.
- Builds de `@vpn/monitor` e `@vpn/sentry`: passaram; Monitor recompilado após a correção de recuperação do callback. Avisos existentes de sourcemap/chunk e ausência de configuração Supabase local; build não comprova integração autenticada.
- A suíte sem limite de concorrência excedeu 5 segundos em `packages/contracts/tests/openapi.test.ts > rejectsInvalidSchema`, inclusive no baseline anterior à implementação. O teste isolado passou (6/6) e a suíte final `pnpm test:foundation --maxWorkers=2` passou: **30 arquivos, 179 testes**. Não foi removido check nem aumentado timeout; registrar abaixo o resultado final.

## Revisão independente

Revisão somente leitura identificou dois pontos importantes: recuperação da UI após falha de upgrade e cobertura de operações sobrepostas. Recuperação corrigida com regressão HTTP RED→GREEN; testes agora exercitam operações sobrepostas no serviço e no SQL/PGlite. A prova de lock em PostgreSQL com duas conexões reais passou posteriormente; o teste observou o callback aguardando `wait_event=advisory` antes da retirada local da conexão.

Nota menor adiada: o contrato geral de capacidades inclui `clip_create`, mas o endpoint atual o recusa enquanto captura agendada não está disponível. Isso está descrito no contrato; a UI pede apenas `clip_download`.

A revisão inicial deixou sem prova download real/token Twitch, navegação no navegador, pgTAP/advisory locks reais e logs da plataforma. PgTAP, locks e interface local foram comprovados posteriormente conforme registros abaixo; não foi realizada auditoria completa de acessibilidade nem de logs da hospedagem. Workers, captions, Whisper e agendador estão fora desta implementação. Sanitização da aplicação não prova ausência de query nos logs de acesso da hospedagem.

## Pendências e próxima ação

1. **Docker local resolvido:** o processo original não reconhecia o grupo suplementar `docker`. Uma nova sessão via `wsl.exe --distribution labafero --user anewkilla --exec ...` reconheceu o grupo, sem alterar permissões. O dry run identificou somente `20261018213419_clip_ingestion_oauth.sql`; `supabase db push --local --yes` aplicou apenas essa migration, sem reset nem mudança remota.
2. `supabase test db --local`: **8 arquivos, 113 testes, PASS**. Tipos regenerados com `supabase gen types typescript --local --schema public,private,graphql_public` e formatados com `oxfmt` conforme instrução do gerador; diff contém apenas 18 linhas adicionadas, sem edição manual.
3. `pnpm exec vitest run --config vpn-sentry/integration/vitest.config.ts`: **1/1 passou** contra Supabase local. Duas conexões reais com `SET ROLE vpn_sentry` provaram duplicatas, revoke/reaccept com Helix suspenso e callback OAuth esperando advisory lock durante retirada. Fixtures removidas em `finally` e ausência do canal confirmada. A tentativa inicial com `postgres` falhou por permissão de SET ROLE; a prova passou com `supabase_admin` local, sem mudar grants ou criar logins. [Instruções reproduzíveis](../../vpn-sentry/integration/README.md).
4. **UI local validada em Chromium**, larguras 375 e 1280, sem overflow horizontal: login Supabase real, aceite inicialmente desmarcado, ativação, envio/sucesso/duplicata/erro, revogação/novo aceite e recuperação de upgrade falho. Respostas Sentry/Twitch simuladas nesta prova de interface; ela não comprova OAuth Twitch real. Screenshots inspecionados e mantidos no runtime ignorado `.superpowers/sdd/2026-10-18-issue-15-clip-ingestion/screenshots/`; usuário sintético removido e servidor local encerrado. Falta interação/consentimento real do broadcaster para OAuth incremental e prova de envio Helix autenticado ponta a ponta.
5. Ensaio explicitamente consentido de Get Clips Download oficial: usar token do próprio broadcaster com `channel:manage:clips`, confirmar identidade e clip pelo Helix, chamar o endpoint oficial documentado, baixar um único arquivo temporário com limites de tamanho/tempo e removê-lo. Registrar somente status, tamanho, duração e limpeza, nunca token ou URL temporária. Não adicionar download automático ao endpoint de submissão.
6. `pnpm build` completo passou, com URL/chave pública capturadas do Supabase local para o prerender do News, sem configuração de produção.

Referências verificadas: [Twitch OAuth](https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/), [Get Clips e Get Clips Download](https://dev.twitch.tv/docs/api/reference/#get-clips-download), [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security). Changelog Supabase consultado; nenhuma alteração relevante para este DDL foi identificada.

## Entrega em rascunho

PR: https://github.com/labafero/vpn/pull/24. Código inicial em `c23f314`, `9c479c3`, `5f4c231`; registro inicial `0edc9ff`. A CI e previews automáticos não substituem as provas de OAuth/download Twitch ainda pendentes. UI foi validada localmente com respostas de Sentry/Twitch simuladas. A primeira tentativa de push encontrou falha transitória de DNS no WSL; a repetição publicou a branch normalmente.

## Correção de login descoberta no navegador

O login local retornou HTTP 200 e criou `sb-127-auth-token`, mas a navegação permaneceu em `/login`. A inspeção do plugin instalado `@nuxtjs/supabase` 2.0.9 mostrou `onAuthStateChange` preenchendo `useSupabaseUser` somente depois de `getClaims()` assíncrono. O middleware síncrono consultava o ref antes dessa validação e rejeitava a navegação. A correção aguarda `auth.getClaims()` no middleware e exige `sub` válido/não anônimo. As APIs continuam verificando sessão e permissões no servidor.

A regressão falhou RED antes da mudança (`/login` em vez de permitir a navegação), passou GREEN depois, e o mesmo roteiro Chromium completou o login e o formulário sem reload. Suíte final: **179/179**, mais **113 assertions pgTAP** e **1 integração PostgreSQL com duas conexões**. Monitor foi recompilado após a correção; lint/typecheck do Monitor e formatação/contratos passaram. O build completo anterior à correção também passou; a mudança afetou apenas o Monitor, reconstruído em seguida.

## Atualização da validação ponta a ponta — 18/10/2026

As autorizações posteriores do usuário substituem os limites históricos acima para esta execução: foram autorizadas a migração exata previamente revisada, publicação de Sentry/Monitor em produção para teste, autorização Twitch real e uma única tentativa temporária de download oficial. Não houve merge. Esta atualização registra apenas evidência observada nesta rodada.

- No domínio oficial, o usuário completou OAuth Twitch em navegador normal após o bloqueio do navegador automatizado. A Vercel registrou callback com HTTP 303, consultas de consentimento e dois POSTs de submissão HTTP 200. O usuário confirmou que autorizou e enviou um clip; o estado persistido observado antes do probe era consentimento ativo, `channel:manage:clips` concedido e submissões pendentes de captions.
- Para a tentativa autorizada, foi publicado temporariamente o deployment de produção `dpl_DaduWx3NiR5FPzzwRPU9YC3erTGy` (`69fb422766868390f00f26b4dabfa561eecc8032`). Após o usuário enviar a URL de teste pelo formulário, a Vercel registrou POST HTTP 200 em `/api/v1/channels/{id}/clips` nesse deployment. A interface informou que a submissão já existia e preservou o registro.
- **Download Twitch não comprovado:** a consulta aos logs de runtime (janela geral e janela do deployment) retornou zero registros, apesar do registro da requisição. A interface não expõe o campo de resultado do probe. Portanto, não há evidência disponível do status da resposta Helix, do status HTTP do MP4, dos bytes recebidos ou da remoção do arquivo. A tentativa pode ter executado, mas não se declara sucesso nem falha do download sem esses dados. Nenhum token, URL temporária ou arquivo foi registrado neste relatório.
- O código temporário do probe foi removido logo após a tentativa. A versão limpa foi publicada diretamente para produção em `dpl_D6jWkdpDkLRTDz3yKdmyBpjsiWjN`, commit `3d7e1f93ccc0319bb6e101df91fbc3fd5491aa4b`, estado READY, alias oficial `vpn-sentry.labafero.com` confirmado e verificação HTTP 200. A resposta de saúde confirma disponibilidade do domínio, não a integração Twitch. `.vercelignore` passou a excluir `.superpowers`; dry run confirmou que o diretório privado não foi enviado. A busca no código final não encontrou rota nem marcador do probe.
- Assim, OAuth e submissão têm evidência de produção, mas o critério de aceite de download real permanece aberto até obter prova sanitizada do resultado e limpeza do temporário. A tentativa autorizada já foi consumida; não repetir download sem autorização nova. A branch local contém o commit de higiene, ainda não enviado à PR #24.
