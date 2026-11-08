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
- Consultar sessões, estado da conexão, convites, clips e ocorrências.
- Compartilhar uma sessão específica com convite de uso único, limitado à sessão
  e ao período autorizado pelo dono.
- Submeter manualmente URL de clip do canal vinculado, com autorização
  incremental `clip_download` e apresentação clara de finalidade e consentimento.
- Ativar captura futura `clip-scheduled-v2`, separada do envio manual. A
  importação histórica exige uma autorização adicional e opcional (`clip-history-v1`);
  sem ela, consultas começam no momento da autorização futura. A tela informa
  que o histórico autorizado vai da criação do canal Twitch até o opt-in.
- Configurar frases-gatilho por canal, ativar/desativar e editar regras. A página
  de detalhe do clip apresenta metadados, origem e timestamps das evidências;
  cada detecção preserva a versão da frase usada.
- O detalhe do clip permite retry individual para falhas elegíveis, mostra o
  player VOD durante a busca por captions e usa OpenAI como fallback; erros de
  quota/crédito indicam que o dono deve verificar o faturamento OpenAI.
- Após o processamento, o dono pode aprovar ou retirar a aprovação do clip como
  evidência. Clips aprovados são incluídos na sessão compartilhada quando
  pertencem ao canal da sessão e foram criados entre o início e o fim dela;
  sessões ativas usam o horário de início como limite inferior. Clips sem data
  de criação não são incluídos. A página compartilhada não indica o estado de
  aprovação.
- Configurar uma chave OpenAI por usuário;
  o sistema usa primeiro a chave central, depois a chave pessoal, e apresenta
  somente gatilhos, origem e timestamp.
- Revisar detecções candidatas por frase, origem, timestamp e estado. A revisão
  não altera nem converte uma detecção em decisão automática.

## Histórias e critérios de aceite

- Como streamer, quero saber e controlar o que está sendo monitorado; a UI
  distingue vínculo Twitch, monitoramento de live e processamento de clips.
- Como streamer, quero enviar um clip do meu canal; o Monitor mostra estado de
  recebimento, duplicata e erro sem afirmar que já foi processado.
- Como streamer, quero ativar a consulta agendada para ver clips antigos e
  futuros sem esperar uma nova criação; metadados e análise dependem de
  consentimento e autorização Twitch vigentes.
- Como streamer, quero configurar frases-gatilho e ver no detalhe do clip a
  frase, versão, origem e timestamp que sustentam cada detecção.
- Como revisor, quero abrir uma evidência no timestamp detectado; a ação leva ao
  ponto correspondente e identifica a regra que disparou.
- Como dono, quero aprovar ou retirar a aprovação de um clip processado como
  evidência; somente clips aprovados do intervalo da sessão aparecem para quem
  tem acesso compartilhado àquela sessão.
- Como dono, quero compartilhar somente uma sessão; convite vencido, revogado,
  resgatado ou associado a outra sessão não concede acesso adicional.
- O processamento envia a mídia temporariamente para transcrição OpenAI usando
  primeiro a chave central e depois a chave pessoal do dono. Sem nenhuma chave,
  não produz resultado.
- A tela atualiza estados periodicamente e permite carregar páginas de 50 clips;
  a configuração de frases não altera detecções já armazenadas.
- Eventos são sinais candidatos, nunca vereditos sobre intenção ou infração.
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
- O produto atende somente o dono do canal conectado; não oferece operação
  multiusuário nem hospedagem para contas de terceiros.

## Resultado esperado

O dono controla consentimentos independentes, importa o histórico disponível,
configura frases-gatilho e inspeciona clips e evidências com origem, versão e
timestamp.
