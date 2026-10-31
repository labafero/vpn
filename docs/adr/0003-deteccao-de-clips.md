# ADR-0003: Fontes para detecção em clips

- **Estado:** Aceita
- **Data:** 2026-10-31
- **Contexto de produto:** [PRD do Monitor](../product/monitor.md) e
  [PRD do Sentry](../product/sentry.md)

## Decisão

- Transcrever os clips pela API da OpenAI com a chave central do projeto. Se ela
  não estiver configurada, usar a chave pessoal do dono daquele canal. Se
  nenhuma chave estiver configurada, registrar que falta uma fonte de texto e
  não gerar detecção.
- A leitura de captions da Twitch fica fora do comportamento atual e poderá ser
  acrescentada depois, antes da transcrição OpenAI.
- Guardar chaves OpenAI por usuário, criptografadas no schema privado, sem nunca
  retorná-las à interface. O dono pode substituir ou remover a própria chave.
- Baixar mídia para transcrição OpenAI, processá-la temporariamente e removê-la
  em sucesso ou falha. Não persistir a transcrição completa.
- Persistir apenas gatilhos, origem e timestamps necessários à revisão humana.
- O piloto é pessoal e roda dentro dos limites atuais da Vercel. O consumo da
  chave central fica na conta do projeto; o consumo da chave pessoal fica na
  conta do usuário.

## Consequências

Clips enviados usam primeiro a chave central; o consumo é cobrado no projeto.
Quando ela não estiver configurada, a chave pessoal é usada e o consumo fica na
conta OpenAI do usuário. Sem chave, o Sentry conserva os metadados e informa que
não há fonte de transcrição. As detecções permanecem candidatas para revisão,
não conclusões sobre intenção.
