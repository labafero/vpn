# Evidências da ingestão de clips — issue #15

Estado em 28/10/2026: [PR #24 mergeada](https://github.com/labafero/vpn/pull/24); [issue #15 encerrada](https://github.com/labafero/vpn/issues/15). O fluxo manual, consentimento separado e OAuth incremental foram implementados. Decisões duráveis estão em [ADR-0002](../adr/0002-identidade-consentimento-e-dados-privados.md) e [ADR-0003](../adr/0003-deteccao-de-clips.md).

## Evidências locais

- `pnpm test:foundation --maxWorkers=2`: 188 testes passaram na validação final registrada.
- `supabase test db --local`: 113 assertions; tipos Supabase gerados pelo CLI.
- Integração PostgreSQL local com duas conexões provou deduplicação, revoke/reaccept durante Helix e callback OAuth aguardando advisory lock. Fixtures removidas.
- Chromium validou login, consentimento, submissão, duplicata, erro, revogação e recuperação de upgrade falho; respostas Sentry/Twitch foram simuladas nessa prova de UI.
- Lint, typecheck, contratos, formatação e builds de Monitor/Sentry passaram conforme a revisão final.

## Prova real limitada

- O usuário autorizou teste com o próprio canal. OAuth Twitch real foi concluído; a submissão manual autenticada retornou sucesso.
- `Get Clips Download` oficial respondeu HTTP 200 e entregou um único MP4 temporário. O arquivo foi removido e a limpeza confirmada; o produto não persistiu mídia nem URL temporária.
- A submissão preservou metadados e ficou em `pending_captions`. Isso não comprova leitura de captions Twitch nem processamento pelo worker.
- A issue não inclui captura agendada, `clip_create`, retenção de mídia ou transcrição automática. A interface de captions nativas e o worker permanecem na #16.

Referências: [API Twitch de clips](https://dev.twitch.tv/docs/api/reference) e [player Twitch](https://dev.twitch.tv/docs/embed/video-and-clips/).
