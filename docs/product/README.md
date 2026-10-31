# Documentação de produto

Este diretório contém requisitos duráveis por superfície. O [PRD geral](../../PRD.md)
define a visão e as fronteiras do ecossistema; os documentos abaixo definem o
resultado esperado de cada subapp.

- [News](news.md): portal público, redação e overlays.
- [Monitor](monitor.md): experiência privada do streamer e revisão de sinais.
- [Sentry](sentry.md): API privada, integrações e processamento assíncrono.

## Fonte de verdade

- **PRDs** descrevem usuários, comportamento, limites e critérios de produto.
- **ADRs** em `docs/adr/` registram decisões transversais aceitas e suas
  consequências. Uma decisão substituída recebe novo ADR; não é reescrita em
  silêncio.
- **`docs/architecture/foundation.md`** mantém os detalhes correntes de acesso,
  consentimento, dados e retenção.
- Planos de execução são temporários. Ao entregar uma mudança, atualizar PRD ou
  ADR conforme o tipo de fato e remover o plano concluído. Plano antigo não é
  fonte de requisitos.

Atualizar os PRDs quando mudar comportamento, público ou escopo de produto.
Não copiar neles comandos de operação, checklists de implementação, resultados
de testes ou histórico de cada PR.
