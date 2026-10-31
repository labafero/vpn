# PRD — VPN Sentry

## Resumo

O Sentry é o backend privado que valida identidade e consentimento, integra-se
com provedores, persiste estado privado e executa processamento assíncrono.
Para clips, sua função de produto é detectar gatilhos com evidência e timestamps;
captions/ASR são fontes de texto para essa detecção.

## Usuários e necessidades

- **VPN Monitor:** precisa de contratos estáveis para operações privadas.
- **Streamer autenticado:** precisa que o Sentry limite cada operação ao canal
  vinculado, consentimento vigente e capacidades autorizadas.
- **Operador VPN:** precisa observar jobs, falhas e cotas sem acessar conteúdo
  bruto desnecessário.

## Escopo

- API autenticada para identidade, conexão Twitch, sessões, convites,
  consentimento e submissão de clips.
- Acesso a dados privados por papéis mínimos; browser nunca recebe tokens de
  provedor nem acesso direto às tabelas privadas.
- Fila durável para processamento e consumidor Node.js com idempotência,
  revalidação de consentimento, limites de mídia e limpeza temporária.
- Detecção determinística sobre captions Twitch quando disponíveis; Whisper
  fallback produz segmentos temporizados quando captions não estão disponíveis.
- Persistir estado e resultados mínimos: fonte do texto, versão das frases,
  IDs das regras, timestamps e evidência necessária à revisão.

## Histórias e critérios de aceite

- Como consumidor privado, quero uma API autenticada e versionada; payloads,
  erros e estados seguem `packages/contracts`.
- Como dono, quero que consentimento revogado interrompa jobs pendentes e bloqueie
  download/gravação posteriores.
- Como worker, quero receber IDs internos de jobs e revalidar dono, consentimento
  e disponibilidade antes de obter mídia ou salvar resultados.
- Como sistema de detecção, quero usar captions Twitch primeiro; Whisper é
  chamado automaticamente como fallback quando não houver captions utilizáveis
  e houver consentimento para processar o clip.
- Reentrega ou retry não duplica detecções; erros são sanitizados, estados são
  observáveis e arquivos temporários são removidos em sucesso ou falha.
- O piloto processa apenas uso pessoal dentro dos limites do plano Vercel ativo;
  se o limite impedir execução, o job permanece recuperável/pausado. Não se exige
  dimensionamento multiusuário nesta entrega.

## Não objetivos

- Servir UI rica ou expor credenciais ao Monitor.
- Transcrever todo clip quando captions Twitch forem suficientes.
- Interpretar intenção ou decidir infrações; gatilhos são candidatos à revisão.
- Definir agora a hospedagem multiusuário futura.

## Integrações e privacidade

- Twitch Helix e interfaces oficiais documentadas; não fazer scraping ou chamar
  endpoints privados/não documentados.
- Supabase Postgres privado guarda consentimentos, referências, jobs e resultados
  mínimos; nunca persistir mídia ou transcrição integral sem decisão própria.
- Vercel executa o worker no piloto. Extensão de infraestrutura exige ADR e
  atualização deste PRD.

## Resultado esperado

Um clip autorizado chega a uma detecção de gatilho com origem e timestamp; o
Monitor pode revisar o resultado sem acessar mídia ou texto além do necessário.
