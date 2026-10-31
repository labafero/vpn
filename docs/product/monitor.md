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
- Consultar clips numa tela própria e configurar uma chave OpenAI por usuário;
  o sistema usa primeiro a chave central, depois a chave pessoal, e apresenta
  somente gatilhos, origem e timestamp.
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
- O processamento envia a mídia temporariamente para transcrição OpenAI usando
  primeiro a chave central e depois a chave pessoal do dono. Sem nenhuma chave,
  não produz resultado.
- A tela atualiza estados manualmente e mostra resultados mínimos; não oferece
  confirmação ou edição humana de detecções nesta fase.
- Eventos são sinais candidatos, não vereditos; o usuário pode confirmar,
  corrigir ou descartar uma detecção quando a revisão for implementada.
- Respostas privadas não ficam em cache público e erros não expõem credenciais,
  códigos OAuth, transcrições integrais ou URLs temporárias.

## Não objetivos

- Exibir ou retransmitir uma live continuamente.
- Tratar uma detecção automática como prova de infração.
- Publicar alertas em Discord externo ou matérias automaticamente.
- Executar workers, chamar provedores ou acessar credenciais no navegador.

## Integrações e limites

- Usa a API privada do Sentry através de proxy autenticado e contratos
  `packages/contracts`.
- Sessões e autorização vêm da identidade central; o app não promove usuários
  com `user_metadata`.
- O piloto atual é pessoal. Modelo multiusuário e hospedagem futura permanecem
  decisões separadas.

## Resultado esperado

O dono compreende e controla consentimentos, configura a própria chave OpenAI,
consulta clips autorizados e inspeciona gatilhos com origem e timestamp.
