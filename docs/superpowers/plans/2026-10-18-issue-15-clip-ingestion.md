# Issue #15 — Consentimento e ingestão privada de clips

> **For agentic workers:** Use superpowers:executing-plans nesta sessão. As etapas usam checkbox (`- [ ]`) para acompanhamento.

**Goal:** Permitir envio manual de clips do próprio canal, com consentimento específico e upgrade OAuth que preserve a conexão existente quando recusado.

**Architecture:** Monitor usa o proxy autenticado existente; Sentry autentica sessão VPN, resolve clips por Helix e persiste somente referências e metadados privados da #14. Capacidade OAuth é validada no servidor e vinculada à conexão e identidade existentes. Não executar Whisper nem criar um agendador nesta entrega.

**Tech Stack:** Nuxt 4/Nuxt UI v4, Nitro/H3, Supabase Postgres com papel vpn_sentry, OpenAPI, Vitest/PGlite e pgTAP.

**Spec:** [Desenho aprovado](../specs/2026-10-18-sentry-cloud-clip-processing-design.md), seções de autorização incremental, ingestão, consentimento e privacidade; requisitos atuais da issue https://github.com/labafero/vpn/issues/15.

## Decisões e limites

- Entregar envio manual e consentimento `clip-processing-v1`; manter captura agendada desabilitada até existir o agendador. `clip_create` permanece um identificador permitido pelo servidor, solicitado somente por uma funcionalidade de captura ativada; a UI desta entrega solicita apenas `clip_download`.
- O vínculo inicial continua sem escopos. O upgrade pede `channel:manage:clips`; `clips:edit` só pertence à capacidade `clip_create`. Não aceitar scopes arbitrários no request.
- Preservar conexão, monitoramento e credencial anteriores em recusa, outra identidade, falta de escopo, replay ou transação vencida. Atualização de tokens e escopos é atômica e revalida a conexão sob o lock compartilhado com a desconexão.
- Não persistir mídia, transcrição nem URL temporária. Não buscar a URL de entrada; usar exclusivamente endpoints oficiais Helix para resolver o ID.
- Assumir implementação local e PR revisável como destino. Merge, alteração de banco remoto e produção desta nova issue não foram autorizados pelo pedido de desenvolvimento.

## Review Focus

- Validação periódica e refresh não podem expirar tokens legitimamente atualizados com escopos; cobrir em Task 1.
- Recusa de OAuth e callbacks concorrentes não podem substituir nem invalidar o token anterior; cobrir em Task 1.
- Revogação concorrente à consulta Helix impede persistência posterior; serializar revalidação e escrita em Task 2.
- Duplicatas concorrentes retornam o registro existente, inclusive em estados terminais, sem reiniciar processamento; cobrir em Task 2.
- Erros e callback não podem expor segredos, código OAuth ou URL temporária, inclusive no proxy; cobrir em Tasks 1 e 3.

## Task 1: OAuth incremental e persistência dos escopos

**Arquivos:** `vpn-sentry/server/utils/twitch-oauth.ts`, `private-database.ts`, rotas authorize/callback existentes; migration nova criada pela CLI; testes OAuth/gateway/DB existentes e pgTAP dedicado.

**Interfaces:** Estender POST `/provider-connections/twitch/authorize` com variante de upgrade contendo `consentVersion: clip-processing-v1`, `consentAccepted: true` e `capabilities: [clip_download]` (enum também reconhece clip_create). A variante monitoring-v1 mantém compatibilidade. A transação privada guarda propósito, conexão/identidade esperadas e escopos requeridos; consume retorna esses dados de forma atômica. Credencial privada guarda escopos validados, default vazio para vínculos existentes; não expor tokens em contratos públicos.

- [x] Escrever e executar testes de upgrade conectado, scopes arbitrários, identidade/client_id divergentes, escopo ausente, recusa, nonce/state incorretos, replay, callback após desconexão e callbacks concorrentes.
- [x] Criar migration com Supabase CLI para transações de upgrade e escopos privados; preservar grants e dados anteriores. Cobrir constraints e negação anon/authenticated com pgTAP e PGlite.
- [x] Implementar variante de autorização e callback usando state/nonce existentes; não alterar conexão/credencial antiga antes de validar o novo token e revalidar a conexão sob lock. Não revogar o token antigo na falha nem revogar um token retornado idêntico ao que ainda está em uso.
- [x] Ajustar validação periódica/refresh para comparar escopos concedidos e capacidades em vez de exigir scopes.length === 0; manter criptografia e rotação de refresh token.
- [x] Em cancelamento OAuth, consumir transação válida e voltar a `/conexao` com resultado sanitizado por cookie curto, sem refletir query do provedor na UI. Adaptar proxy para manter validação estrita do redirect e limpar nonce.
- [x] Executar testes direcionados de OAuth, gateway, proxy e banco; revisar diff e commitar.

## Task 2: Consentimento e ingestão privada

**Arquivos:** novos módulos focados `clip-ingestion.ts`, `clip-repository.ts` e `twitch-clips.ts` no Sentry; rotas `/channels/[id]/clip-consent` e `/channels/[id]/clips`; testes correspondentes.

**Interfaces:** GET/PATCH `/channels/{id}/clip-consent` retornam consentimento e disponibilidade de `clip_download`; ativação exige `consentVersion`, aceite explícito e `manualEnabled: true`, revogação aceita `manualEnabled: false`. POST `/channels/{id}/clips` recebe somente `{ url }` e retorna `{ id, state, duplicate }`. Todas as operações derivam dono da sessão e canal, nunca de owner_id no request.

- [x] Escrever e executar testes de usuário anônimo, outro dono, sem consentimento/escopo, URLs inválidas, clip inexistente/de outro broadcaster, duplicata e revogação concorrente.
- [x] Parser aceita HTTPS `clips.twitch.tv/{id}` e `www.twitch.tv/{login}/clip/{id}` ou `twitch.tv/{login}/clip/{id}`; extrai ID compatível com a constraint da #14, ignora query/fragmento na canonicalização e rejeita userinfo, portas, hosts adicionais, segmentos extras e encoding ambíguo. Não seguir redirects de entrada.
- [x] Consultar GET Helix clips por ID com timeout e token validado do broadcaster; validar formato da resposta e broadcaster_id igual à identidade vinculada. Persistir somente allowlist existente.
- [x] Revalidar conexão, escopo e consentimento em transação com lock compartilhado antes do INSERT; inserir com deduplicação concorrente e retornar o registro existente sem reiniciá-lo. Estado inicial após metadados válidos: pending_captions. Falha de Helix anterior à confirmação do broadcaster não aceita submissão nem cria registro.
- [x] Consentimento desativado grava revoked_at, desabilita modos e cancela pendências atomicamente como cancelled_consent com finished_at; preservar terminais. Reativação exige novo aceite e não reabre automaticamente submissões canceladas.
- [x] Usar erros estáveis e sanitizados: 400 URL inválida, 403 canal/consentimento/escopo recusado, 404 clip ausente e 503 dependência indisponível. Nunca retornar erro bruto Helix.
- [x] Executar testes de serviço e banco, inclusive concorrência, e commitar.

## Task 3: Contratos, proxy e interface do Monitor

**Arquivos:** `packages/contracts/openapi.yaml` e tipos gerados; proxy existente; componente de clips extraído de `/conexao` para manter a página pequena; testes proxy/contratos.

- [x] Definir contratos dos endpoints e capacidades; gerar tipos pelo script existente, sem editar gerados. Incluir somente os campos necessários à UI e erros estáveis.
- [x] Adicionar rotas ao allowlist do proxy, preservando autenticação, origin/CSRF e respostas no-store; manter segredo de bypass exclusivamente no servidor.
- [x] Exibir consentimento separado, finalidade das permissões, orientação GTA RP +18, captions e retenção limitada de VOD/clip. Informar que a mídia pode desaparecer e Whisper exige solicitação futura explícita.
- [x] Adicionar autorização para clip_download, ativação/revogação do consentimento manual e formulário de URL; exibir sucesso/duplicata/erro sem prometer processamento ou download já realizados. Não mostrar captura agendada como funcional.
- [x] Cobrir proxy, schemas, payloads estritos e sanitização; validar UI responsiva e estados de loading/erro. Executar lint/typecheck/contracts e commitar.

## Task 4: Prova de integração e entrega

- [x] Executar pipeline necessário: pnpm lint, pnpm format, pnpm format:check, pnpm typecheck, pnpm contracts:check, pnpm test:foundation e build com configuração local apropriada.
- [x] Aplicar migrations somente no Supabase local e executar pgTAP; regenerar tipos Supabase por CLI. Não editar database.types.ts manualmente.
- [ ] Com conta de teste do próprio broadcaster e consentimento real, validar OAuth incremental, envio do próprio clip, duplicata e recusa de upgrade preservando vínculo. Se depender de interação humana, registrar bloqueio e ponto de retomada sem afirmar conclusão end-to-end.
- [ ] Provar Get Clips Download pelo endpoint oficial em ensaio explícito, limitado e temporário; não adicionar download automático à submissão, guardar URL temporária ou expor mídia no Monitor. Registrar limites observados e limpeza; não anunciar capacidade de mídia sem essa prova.
- [ ] Registrar evidências, autorizações e pendências em `docs/validation/phase-2-ingestion.md`; revisar requisitos, publicar branch/PR vinculada à #15 para revisão. Não encerrar a issue sem evidência dos critérios de aceite.

## Retomada de 18/10/2026

Implementação nos commits `c23f314`, `9c479c3` e `5f4c231`. Evidências, limites e pendências em [phase-2-ingestion](../../validation/phase-2-ingestion.md). Os itens que incluem provas ainda indisponíveis permanecem abertos; a fase não está concluída.

Provas adicionais: pgTAP 113/113, tipos gerados via CLI, concorrência PostgreSQL em duas conexões, build completo e UI Chromium local. O teste de UI descobriu e corrigiu corrida preexistente no middleware de login, com regressão RED→GREEN e login local comprovado. OAuth/download reais continuam abertos.
