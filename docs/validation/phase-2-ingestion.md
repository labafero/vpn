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
- PGlite executa o SQL do repositório de clips com `vpn_sentry`, incluindo isolamento por dono, chamadas simultâneas de insert, cancelamento, estado terminal e revoke/reaccept enquanto Helix está suspenso. Isso não comprova coordenação de advisory locks entre duas conexões PostgreSQL reais.
- Testes HTTP verificam autenticação, respostas no-store, sanitização e retorno fixo do OAuth. Gateway verifica host oficial, allowlist de metadata e erros 403/404/503.
- `pnpm lint`, `pnpm format`, `pnpm format:check`, `pnpm typecheck`, `pnpm contracts:check`: passaram após as correções finais da revisão.
- Builds de `@vpn/monitor` e `@vpn/sentry`: passaram; Monitor recompilado após a correção de recuperação do callback. Avisos existentes de sourcemap/chunk e ausência de configuração Supabase local; build não comprova integração autenticada.
- A suíte sem limite de concorrência excedeu 5 segundos em `packages/contracts/tests/openapi.test.ts > rejectsInvalidSchema`, inclusive no baseline anterior à implementação. O teste isolado passou (6/6) e a suíte final `pnpm test:foundation --maxWorkers=2` passou: **29 arquivos, 176 testes**. Não foi removido check nem aumentado timeout; registrar abaixo o resultado final.

## Revisão independente

Revisão somente leitura identificou dois pontos importantes: recuperação da UI após falha de upgrade e cobertura de operações sobrepostas. Recuperação corrigida com regressão HTTP RED→GREEN; testes agora exercitam operações sobrepostas no serviço e no SQL/PGlite. Permanece pendente prova de lock em PostgreSQL com duas conexões reais.

Nota menor adiada: o contrato geral de capacidades inclui `clip_create`, mas o endpoint atual o recusa enquanto captura agendada não está disponível. Isso está descrito no contrato; a UI pede apenas `clip_download`.

A revisão não julgou como comprovados: download real/token Twitch, navegação/acessibilidade no navegador, pgTAP/advisory locks reais e logs da plataforma. Workers, captions, Whisper e agendador estão fora desta implementação. Sanitização da aplicação não prova ausência de query nos logs de acesso da hospedagem.

## Pendências e próxima ação

1. **Docker local:** socket `/var/run/docker.sock` retorna permission denied. O usuário consta no grupo `docker` no cadastro do sistema, mas o processo atual não tem esse grupo suplementar. `sudo -n` requer autenticação humana; `sg`/`newgrp` não estão disponíveis neste ambiente. Não foi alterada a permissão do socket nem aplicado SQL remoto.
2. Em uma sessão com acesso ao Docker, aplicar migrations somente no banco local da worktree correta, executar `supabase test db --local` e regenerar `packages/database/src/database.types.ts` usando `supabase gen types typescript --local --schema public,private,graphql_public`. Não editar o gerado manualmente. A migration foi criada pela CLI 2.119.0. O novo pgTAP contém 12 assertions, ainda não executadas localmente.
3. Provar concorrência de insert/consentimento/OAuth em PostgreSQL local com duas conexões reais; PGlite não substitui essa evidência.
4. Preparar ambiente isolado com a nova migration antes de navegação autenticada. Validar UI em desktop/mobile, autorização/recusa de upgrade preservando vínculo, próprio clip, canal alheio, ausência de consentimento/scope e duplicata. Falta consentimento/interação real do broadcaster; nenhuma prova real Twitch foi executada nesta retomada.
5. Ensaio explicitamente consentido de Get Clips Download oficial: usar token do próprio broadcaster com `channel:manage:clips`, confirmar identidade e clip pelo Helix, chamar o endpoint oficial documentado, baixar um único arquivo temporário com limites de tamanho/tempo e removê-lo. Registrar somente status, tamanho, duração e limpeza, nunca token ou URL temporária. Não adicionar download automático ao endpoint de submissão.
6. Build completo do monorepo requer configuração Supabase local do News para prerender. Não carregar credenciais de produção apenas para esse check.

Referências verificadas: [Twitch OAuth](https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/), [Get Clips e Get Clips Download](https://dev.twitch.tv/docs/api/reference/#get-clips-download), [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security). Changelog Supabase consultado; nenhuma alteração relevante para este DDL foi identificada.
