# PRD — VPN Monitor

## Resumo

O Monitor é a superfície privada para o streamer conectar sua Twitch, consentir
com monitoramento e clips, acompanhar sessões e revisar possíveis ocorrências.
O valor do produto está em detectar gatilhos e apresentar evidências revisáveis;
transcrever áudio é suporte técnico, não o objetivo do produto.

## Usuários e necessidades

- **Streamer/dono do canal:** controlar conexão, consentimentos, clips e acesso.
- **Administrador VPN:** acompanhar apenas dados autorizados e revisar sinais.
- **Convidado autorizado:** acessar somente sessões e informações concedidas.

## Escopo

- Login central VPN e navegação autenticada entre superfícies.
- Conectar/desconectar Twitch; consentimento de monitoramento e consentimento
  de processamento de clips são distintos.
- Consultar sessões, estado da conexão, convites e, conforme as fases entregues,
  clips e ocorrências.
- Compartilhar uma sessão específica com convite de uso único, limitado à sessão
  e ao período autorizado pelo dono.
- Submeter manualmente URL de clip do canal vinculado, com autorização
  incremental `clip_download` e apresentação clara de finalidade e consentimento.
- Revisar detecções candidatas por frase, origem, timestamp e estado; oferecer
  correção humana quando o fluxo de eventos estiver disponível.

## Histórias e critérios de aceite

- Como streamer, quero saber e controlar o que está sendo monitorado; a UI
  distingue vínculo Twitch, monitoramento de live e processamento de clips.
- Como streamer, quero enviar um clip do meu canal; o Monitor mostra estado de
  recebimento, duplicata e erro sem afirmar que já foi processado.
- Como revisor, quero abrir uma evidência no timestamp detectado; a ação leva ao
  ponto correspondente e identifica a regra que disparou.
- Como dono, quero compartilhar somente uma sessão; convite vencido, revogado,
  resgatado ou associado a outra sessão não concede acesso adicional.
- Quando captions Twitch estiverem acessíveis, elas são a fonte preferida para
  detectar gatilhos e evitar ASR. Whisper é fallback quando captions faltarem,
  sujeito às regras de consentimento e capacidade do piloto registradas nos
  ADRs.
- Eventos são sinais candidatos, não vereditos; o usuário pode confirmar,
  corrigir ou descartar uma detecção quando a revisão for implementada.
- Respostas privadas não ficam em cache público e erros não expõem credenciais,
  códigos OAuth, transcrições integrais ou URLs temporárias.

## Não objetivos

- Exibir ou retransmitir uma live continuamente.
- Tratar uma detecção automática como prova de infração.
- Publicar alertas em Discord externo ou matérias automaticamente.
- Executar workers, chamar Whisper ou acessar tokens de provedor no navegador.

## Integrações e limites

- Usa a API privada do Sentry através de proxy autenticado e contratos
  `packages/contracts`.
- Sessões e autorização vêm da identidade central; o app não promove usuários
  com `user_metadata`.
- O piloto atual é pessoal. Modelo multiusuário e hospedagem futura permanecem
  decisões separadas.

## Resultado esperado

O dono compreende e controla consentimentos; pode consultar sessões e submeter
clips autorizados; quando a revisão de detecções estiver entregue, consegue
inspecionar cada gatilho com timestamp e evidência.
