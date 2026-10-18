# Validação do spike da Fase 2

Status em 17/10/2026: **inconclusivo; no-go para ingestão automática até validar MP4s reais**. O runner, adapters e detector foram implementados, mas nenhum MP4 do canal do usuário foi fornecido para avaliação. A execução aqui também não dispõe de um backend de reconhecimento de fala configurado. Nenhum áudio foi enviado a terceiros e nenhuma métrica real de qualidade/latência/custo foi observada. O spike aceita MP4 local; o fornecedor da transcrição é detalhe de implementação e não precisa ser escolhido pelo usuário.

## Limiares definidos antes dos resultados

Usar MP4s reais do canal do próprio usuário, com rótulos positivos e negativos revisados. O issue não define quantidade mínima; registrar a quantidade por frase e marcar resultados de amostras pequenas como inconclusivos. Fala sintética pode validar a integração, mas não conta como evidência de precisão em fala humana.

Para cada frase, exigir precisão ≥ 0,95 e recall ≥ 0,90; pelo menos 99% dos segmentos com timestamp; taxa de falha de transcrição abaixo de 1%; custo hospedado ≤ US$ 0,01 por minuto; latência mediana abaixo da duração do áudio e p95 abaixo de 2× a duração do áudio. O provedor também precisa oferecer controles de retenção e exclusão compatíveis com uma política aprovada antes de qualquer ingestão persistente. Um limiar sem amostra ou com denominador zero não passa.

## Implementação disponível

- Corpus e manifesto locais exigem origem, consentimento explícito para gravação autorizada, cenário, rótulos e arquivo resolvido dentro da raiz ignorada pelo Git. O usuário autorizou o uso de clips do próprio canal para o spike.
- FFmpeg normaliza entradas para WAV mono PCM 16 kHz. Deepgram usa Nova-3 em `pt-BR` com `mip_opt_out=true`; Whisper.cpp usa idioma `pt` e modelo local configurável.
- `phrases.v1.json` define três frases ilustrativas. O detector faz correspondência literal após normalizar caixa, acentos e pontuação; concatena segmentos separados por no máximo 1,2 s e suprime os prefixos literais `não`, `nunca` e `nem`. Não interpreta citação, ironia, intenção ou alvo; detecções não são prova de infração.
- O runner aceita `--rounds 1..10`, calcula precisão/recall por frase, cobertura de timestamp/confiança, latência (mediana, p95, mínimo/máximo, tempo total) e estimativa de custo hospedado usando a tabela documentada de US$ 0,0052/min. O custo total é `null` se o `ffprobe` não conseguir obter duração.
- Resultados com transcrição ficam apenas em `.superpowers/runtime/phase-2-spike/runs/`, diretório ignorado e criado com acesso restrito. O manifesto preenchido, clips e resultados não entram no Git.

## Resultados

| Provedor                 | Rodadas | Métricas de qualidade | Latência / custo observados | Estado                                  |
| ------------------------ | ------: | --------------------- | --------------------------- | --------------------------------------- |
| Reconhecimento local     |       0 | Sem dados             | Sem dados                   | Aguardando MP4s reais e execução do ASR |
| Reconhecimento hospedado |       0 | Sem dados             | Sem dados                   | Aguardando MP4s reais e execução do ASR |

Separação de erro ASR e detector: pendente de corpus rotulado e saídas reais. A tabela de preço da documentação não é custo observado. As referências, configuração sugerida e informações de retenção consultadas estão no README do spike; revalidar antes de executar porque preço e termos podem mudar.

## Privacidade e limpeza

Não foram usados clips reais, não houve upload e nenhum artefato de áudio ou transcrição foi criado para o benchmark nesta execução. Os testes automatizados usam fixtures temporários e limpam seus diretórios ao terminar. A árvore `.superpowers/runtime/phase-2-spike/` foi conferida sem arquivos de corpus ou resultados de benchmark; não há mídia ou transcrição adicionada ao Git.

## Decisão e próxima etapa

**No-go por enquanto** para ingestão automática e workers, pois ainda falta validar o detector com MP4s reais. Próximo passo do spike: processar localmente alguns clips consentidos do canal do usuário, medir resultados e limitações, sem exigir setup técnico do usuário. A meta de produto para a etapa posterior é mostrar os clips da live no Monitor e ter uma página por clip com incidentes/evidências e correção manual de detecções perdidas.

Fase 1 hoje recebe apenas metadados `stream.online`/`stream.offline`. A Twitch tem endpoints oficiais para criar e baixar clips, mas a conexão existente não solicita os escopos necessários; automatizar isso requer pedir autorização explícita para clips e mídia no Monitor antes de implementar o fluxo. Fontes: [referência oficial da API de clips da Twitch](https://dev.twitch.tv/docs/api/reference) e [escopos OAuth da Twitch](https://dev.twitch.tv/docs/authentication/scopes/).
