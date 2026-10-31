# ADR-0003: Captions Twitch primeiro, Whisper como fallback

- **Estado:** Aceita
- **Data:** 2026-10-28
- **Contexto de produto:** [PRD do Monitor](../product/monitor.md) e
  [PRD do Sentry](../product/sentry.md)

## Contexto

O produto VPN Monitor detecta gatilhos; transcrição não é a função principal.
Captions Twitch podem evitar custo de ASR. O spike #13 validou transcrição local
Whisper de MP4, detecção versionada de frases e revisão HTML com timestamps, mas
isso não prova que captions nativas Twitch possam ser obtidas pelo worker.

O resultado local aprovado processou 13 partes sem falhas e encontrou 5
ocorrências de `topada`, 2 de `ação` e 0 de `jonathan`; 34 testes, lint e
formatação passaram. Precisão/recall não foram calculados por falta de corpus
rotulado e denominadores revisados. O comentário de encerramento da issue #13
registra o resultado e a aprovação da página HTML.

## Decisão

- Tentar captions Twitch por interface oficial quando disponíveis e aplicá-las
  primeiro ao detector de gatilhos.
- Acionar Whisper automaticamente como fallback quando não houver captions
  utilizáveis, desde que haja consentimento para processamento do clip.
- O piloto é pessoal, de um usuário, e executa dentro dos limites da Vercel
  atualmente configurada. Se o limite impedir um job, preservá-lo para retomar ou
  pausar; não ampliar automaticamente o plano.
- Não desenhar cotas multiusuário nem escolher hospedagem futura nesta entrega.
  Para outras pessoas, avaliar hospedagem VPN, contas próprias Vercel/Supabase ou
  outra alternativa por decisão posterior.
- O detector do primeiro ciclo é determinístico e usa frases fixas/versionadas:
  normaliza caixa, acentos e pontuação, combina segmentos separados por até
  1,2 segundos e não interpreta ironia, citação, alvo ou intenção. Uma detecção
  é candidata à revisão humana, não uma conclusão.
- Baixar o arquivo do clip pelo endpoint oficial Twitch não depende de possuir
  o VOD de origem. A origem e a versão de frases precisam acompanhar cada
  resultado. Guardar detecções/timestamps necessários à revisão; transcrição
  integral e mídia ficam temporárias, salvo decisão posterior.

## Decisões ainda abertas

- A interface oficial que fornece captions nativas ao processamento. O player
  Twitch documenta o evento de captions para VOD/live; o player de clips não
  oferece a API interativa. É necessário provar um caminho utilizável com um clip
  autorizado, inclusive quando o VOD não está disponível, antes de anunciar
  detecção captions-first.

## Consequências

A falha de captions Twitch não é falha de detecção definitiva: o fluxo usa
Whisper como fallback após consentimento para processamento do clip. Não
armazenar mídia ou transcrição longa por conveniência. A implementação do worker mede duração,
CPU, memória e resultado com um clip consentido no ambiente Vercel ativo.
