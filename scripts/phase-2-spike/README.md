# Spike de clips e transcrição

O spike valida a detecção em arquivos MP4/áudio locais, de preferência clips reais do canal conectado, e não implementa ainda a captura automática nem as páginas de clips no Monitor. O corpus de execução fica em `.superpowers/runtime/phase-2-spike/corpus/`; não versionar mídia, manifestos preenchidos ou transcrições.

## Origem e consentimento

O consentimento atual do Monitor autoriza monitorar sessões e receber metadados `stream.online`/`stream.offline`; ele ainda não captura áudio ou vídeo. Para este spike, usar MP4s reais do canal do próprio usuário com a autorização explícita dada para o teste, guardados somente localmente. Também é possível gerar fala sintética em português com eSpeak NG para validar formato e plumbing, mas isso não mede qualidade em fala humana.

Cada arquivo do manifesto identifica origem, cenário e frases esperadas. Para origem `synthetic`, `consent.status` é `not_required_synthetic` e `reference` identifica a geração. Para `authorized_recording`, `consent.status` deve ser `explicit` e `reference` aponta para o registro de autorização, sem nome ou dado pessoal. O loader recusa origem desconhecida, autorização pendente e arquivos fora do diretório do corpus.

Exemplos de cenário: frase positiva dita isoladamente; frase negativa foneticamente parecida; frase citada ou negada; fala curta com pausa. Cada frase positiva tem ao menos um exemplo positivo e um negativo rotulados.

## Preparar o baseline local

1. Criar `.superpowers/runtime/phase-2-spike/corpus/clips/` e copiar `corpus.example.json` como `manifest.json` para a raiz do corpus.
2. Colocar MP4s do canal do próprio usuário em `clips/`. O usuário pode iniciar uma live, gerar clips no fluxo atual da Twitch e exportá-los como MP4 para este teste. Não é necessário enviar esses arquivos ao Twitch ou a outro provedor.
3. Ajustar os caminhos do manifesto para cada arquivo, cenário e rótulo esperado. Usar IDs opacos, sem nomes de pessoas; gravar `source: "authorized_recording"`, `consent.status: "explicit"` e uma referência opaca ao aceite.
4. Opcionalmente, incluir fala sintética pt-BR para testar formato; ela não substitui exemplos reais nem conta como evidência de precisão em fala humana.
5. Remover mídia/resultados locais ao terminar e registrar a limpeza em `docs/validation/phase-2-spike.md`.

O resultado com fala sintética mede funcionamento e limitações básicas, mas não substitui uma validação representativa com fala humana consentida. Se o corpus humano não estiver disponível, a recomendação final deve marcar precisão/cobertura em áudio real como pendente e não tratar o benchmark sintético como evidência de produção.

## Formato do manifesto

O manifesto é um array de clips. `path` é relativo à raiz do corpus; `id`, `scenario` e `consent.reference` não devem identificar uma pessoa. `expectedPhrases` lista regras esperadas presentes e `expectedNegative` lista regras que não devem disparar.

## Matriz inicial de transcrição (documentação consultada em 17/10/2026)

| Opção                   | Configuração do spike                                                                                                                                                                                                                                                                   | Custo e dados                                                                                                                                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Local                   | `whisper.cpp`, modelo multilíngue `base`, idioma `pt`; inferência CPU e arquivo `ggml` mantido apenas no runtime local.                                                                                                                                                                 | Sem cobrança por minuto de API; registrar modelo, threads, tempo e memória observada. O áudio não sai da máquina.                                                                                                                                           |
| Hospedada               | Deepgram pre-recorded `nova-3`, `language=pt-BR`, `utterances=true`, `mip_opt_out=true`.                                                                                                                                                                                                | A tabela PAYG consultada lista US$ 0,0052/min para Nova-3 multilingual pre-recorded. Com `mip_opt_out=true`, a documentação descreve retenção zero de áudio/texto após a resposta; metadados de requisição e logs de uso continuam disponíveis por 90 dias. |
| Alternativa considerada | OpenAI `/v1/audio/transcriptions`; não selecionada para o primeiro adapter porque a documentação consultada marca `whisper-1` como deprecated com remoção prevista para 26/02/2027 e o modelo recomendado `gpt-transcribe` prioriza transcrição, enquanto este spike requer timestamps. | Consultar custo e retenção novamente se essa opção voltar à avaliação.                                                                                                                                                                                      |

Antes de transcrever, `ffmpeg` normaliza arquivo de áudio/vídeo para WAV PCM 16 kHz, mono, em diretório temporário ignorado. O benchmark usa o mesmo WAV em todas as opções. Para o provedor remoto, só enviar fala sintética ou gravação com consentimento explícito; `mip_opt_out=true` é obrigatório no request. Não usar armazenamento remoto de arquivos neste spike.

Sources: [whisper.cpp README](https://github.com/ggml-org/whisper.cpp), [Deepgram pre-recorded API](https://developers.deepgram.com/reference/speech-to-text/listen-pre-recorded), [Deepgram models and languages](https://developers.deepgram.com/docs/models-languages-overview/), [Deepgram data controls](https://developers.deepgram.com/trust-security/your-data), [Deepgram pricing](https://deepgram.com/pricing), [OpenAI speech-to-text guide](https://developers.openai.com/api/docs/guides/speech-to-text), [OpenAI deprecations](https://developers.openai.com/api/docs/deprecations).

## Detector e execução

`phrases.v1.json` contém três frases literais de exemplo para exercitar o pipeline; elas não são uma política de moderação aprovada. A v1 ignora caixa, diacríticos e pontuação, aceita trechos divididos quando a pausa entre segmentos é de até 1,2 s e exclui prefixos literais `não`, `nunca` e `nem`. Isso não interpreta citação, ironia, alvo ou intenção. Toda detecção é apenas um candidato para revisão humana.

Depois de instalar `whisper.cpp` com modelo multilíngue compatível ou configurar `DEEPGRAM_API_KEY`, preparar manifesto e clips em `.superpowers/runtime/phase-2-spike/corpus/` e executar:

```sh
node scripts/phase-2-spike/run.mjs --manifest .superpowers/runtime/phase-2-spike/corpus/manifest.json --provider local --rounds 3
node scripts/phase-2-spike/run.mjs --manifest .superpowers/runtime/phase-2-spike/corpus/manifest.json --provider hosted --rounds 3
```

O reconhecimento de fala é uma etapa interna do spike: ela transforma o áudio do MP4 em texto com timestamps para o detector. O implementador configura uma opção local ou hospedada; quem fornece o clip não precisa escolher nem instalar isso. Se usar opção hospedada, só enviar áudio com autorização e `mip_opt_out=true`.

Começar com poucos clips reais confirma que o caminho funciona; a precisão estimada só é confiável com mais exemplos positivos e negativos por frase, revisados e representativos. Não há quantidade fixa aprovada pelo issue: registrar sempre os denominadores e tratar amostras pequenas como inconclusivas. Cada execução imprime o caminho de `summary.json` e guarda os detalhes em `.superpowers/runtime/phase-2-spike/runs/`; transcrever as métricas agregadas para o relatório após a execução.

## Caminho do produto depois do spike

O comportamento desejado é: Twitch sinaliza que a live começou; clips dessa live aparecem no Monitor; cada clip abre uma página de incidentes/evidências; o dono pode marcar uma detecção perdida para orientar melhorias. Isso não está implementado neste spike. A documentação da Fase 1 limita o consentimento atual a metadados de sessão. A API oficial da Twitch oferece criação e download de clips, mas precisa de escopos OAuth adicionais (`clips:edit` para criar; `channel:manage:clips` ou `editor:manage:clips` para baixar). A integração futura deve pedir esse acesso e explicar o uso de mídia explicitamente no Monitor antes de automatizar a captura. Ver [referência oficial da API de clips da Twitch](https://dev.twitch.tv/docs/api/reference).

O runner recusa manifesto fora da raiz local, transcreve em série, salva transcrições e resumo somente em `.superpowers/runtime/phase-2-spike/runs/` com modo de arquivo restrito, e imprime o resumo agregado. As métricas de qualidade usam a primeira rodada; latência e cobertura agregam todas as rodadas. Os erros de transcrição contam como falha e não criam detecção. O relatório de decisão e os limiares definidos antes do benchmark ficam em `docs/validation/phase-2-spike.md`.
