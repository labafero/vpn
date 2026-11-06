# PRD — VPN Sentry

## Resumo

O Sentry é o backend privado que valida identidade e consentimento, integra-se
com provedores, persiste estado privado e executa processamento assíncrono.
Para clips, sua função de produto é detectar gatilhos com evidência e timestamps.
A transcrição automática de áudio usa OpenAI. Em retry manual individual, o
Sentry consulta captions do VOD associado pelo player interativo da Twitch e
recorre à transcrição OpenAI quando o VOD ou as captions não estão disponíveis.
Se as captions estão disponíveis e não contêm gatilhos, não há chamada OpenAI.
O texto de captions e transcrição existe apenas durante o processamento e não é
persistido.

## Usuários e necessidades

- **VPN Monitor:** precisa de contratos estáveis para operações privadas.
- **Streamer autenticado:** precisa que o Sentry limite cada operação ao canal
  vinculado, consentimento vigente e capacidades autorizadas.
- **Operador VPN:** precisa observar jobs, falhas e cotas sem acessar conteúdo
  bruto desnecessário.

## Escopo

- API autenticada para identidade, conexão Twitch, sessões, convites,
  consentimento, descoberta agendada de clips, configuração de frases e
  submissão manual.
- Acesso a dados privados por papéis mínimos; browser nunca recebe tokens de
  provedor nem acesso direto às tabelas privadas.
- Fila durável para processamento e consumidor Node.js com idempotência,
  revalidação de consentimento, limites de mídia e limpeza temporária.
- Worker Node.js transcreve o áudio pela OpenAI usando primeiro a chave central
  do projeto e, se não estiver configurada, a chave individual criptografada do
  dono. A mídia é limitada e temporária.
- O dono pode pedir retry de um clip elegível. O retry individual tem prioridade
  na fila, verifica novamente consentimento e tenta captions Twitch antes da
  OpenAI quando há VOD associado.
- Logs estruturados identificam etapa, resultado e falhas de quota/limite sem
  registrar chave, texto integral, URL assinada ou mensagem bruta do provedor.
- Detecção determinística sobre segmentos temporizados e persistência somente de
  gatilhos, origem e timestamps; transcrição integral não é persistida.
- Descoberta paginada e retomável de clips históricos via Helix, seguida de
  consultas incrementais. Checkpoints e frases versionadas ficam no schema
  privado; todos os clips consentidos permanecem listáveis mesmo sem capacidade
  imediata de análise.
- Persistir estado e resultados mínimos: fonte do texto, versão das frases,
  IDs das regras, timestamps e evidência necessária à revisão.

## Histórias e critérios de aceite

- Como consumidor privado, quero uma API autenticada e versionada; payloads,
  erros e estados seguem `packages/contracts`.
- Como dono, quero que consentimento revogado interrompa jobs pendentes e bloqueie
  download/gravação posteriores.
- Consentimento agendado `clip-scheduled-v1` autoriza consulta e persistência de
  metadados históricos/futuros, além de download e processamento; ele é
  independente do consentimento manual e pode ser revogado isoladamente.
- O backfill começa no início da conta Twitch, persiste cursores e divide janelas
  perto do limite de resultados da API; falhas retomam sem duplicar clips.
- A análise usa frases habilitadas do canal, congela ID/versão/texto no job e
  preserva evidências antigas após edição ou desativação.
- Como worker, quero receber IDs internos de jobs e revalidar dono, consentimento
  e disponibilidade antes de obter mídia ou salvar resultados.
- Como sistema de detecção, quero usar a chave central OpenAI ou, quando ela
  estiver ausente, a chave pessoal do dono; sem nenhuma chave, não produzir
  resultado.
- Reentrega ou retry não duplica detecções; erros são sanitizados, estados são
  observáveis e arquivos temporários são removidos em sucesso ou falha.
- O Sentry processa somente clips do canal conectado pelo próprio usuário. Jobs
  respeitam os limites da implantação Vercel e permanecem recuperáveis quando
  esses limites impedem a execução; não há capacidade multiusuário.

## Não objetivos

- Servir UI rica ou expor credenciais ao Monitor.
- Armazenar a chave OpenAI fora do schema privado ou expô-la ao navegador.
- Interpretar intenção ou decidir infrações; gatilhos são candidatos à revisão.
- Hospedar processamento para contas de terceiros.

## Integrações e privacidade

- Twitch Helix e interfaces oficiais documentadas; não fazer scraping ou chamar
  endpoints privados/não documentados.
- Supabase Postgres privado guarda consentimentos, referências, jobs e resultados
  mínimos; nunca persistir mídia ou transcrição integral sem decisão própria.
- Vercel executa o worker. Mudanças de infraestrutura exigem ADR e atualização
  deste PRD.

## Resultado esperado

Um clip autorizado chega a uma detecção de gatilho com origem e timestamp; o
Monitor pode revisar o resultado sem acessar mídia ou texto além do necessário.
