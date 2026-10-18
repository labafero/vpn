# Issue 13 — Spike de clips, transcrição e detector inicial

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Decidir com evidências se a Fase 2 deve avançar para ingestão persistente e workers, validando um fluxo local e reproduzível de transcrição de clips autorizados e detecção de poucas frases fixas.

**Architecture:** Manter o spike isolado dos serviços Nuxt/Supabase/Vercel. Um corpus pequeno com manifesto de consentimento passa por pelo menos uma opção local e uma opção hospedada de transcrição; saídas com timestamps alimentam um detector determinístico, com frases versionadas. Áudio e saídas brutas ficam em armazenamento temporário local, enquanto o relatório versionado registra apenas metadados sanitizados, métricas agregadas e a decisão de go/no-go.

**Tech Stack:** Node.js ESM e pnpm para o runner e detector, adaptadores finos para provedores de transcrição, Vitest para regras determinísticas e arquivos JSON/Markdown para corpus versionado por metadados e relatório. Provedores e ferramentas locais serão fixados no início da execução conforme disponibilidade e documentação atual; nenhuma credencial entra no repositório.

**Spec:** [Issue #13 — Spike técnico: clips, transcrição e detector inicial](https://github.com/labafero/vpn/issues/13); limites de privacidade e retenção em `docs/architecture/foundation.md`.

## Global Constraints

- Nenhum clip real entra no corpus sem autorização explícita documentada; preferir amostras sintéticas ou gravadas para o teste.
- O corpus deve cobrir exemplos positivos e negativos representativos e ter origem, consentimento e cenário registrados.
- Não criar ingestão persistente, workers, captura ao vivo, integrações Twitch, UI, schema ou alteração de produção neste spike.
- Áudio, transcrições completas e credenciais ficam fora do Git; usar diretório ignorado temporário e removê-lo ao terminar, anotando a limpeza.
- Não assumir a proposta de retenção de 30 dias para mídia ou 90 dias para eventos como política aprovada; registrar retenção/uso dos provedores avaliados e recomendar política separadamente.
- Frases, regras de normalização e versão do detector são explícitas e reproduzíveis; cada detecção guarda timestamp, regra/versão, confiança disponível e referência opaca ao clip.
- Erros e relatório não devem expor áudio, transcrição integral, tokens, credenciais ou dados pessoais.

## Review Focus

- Clip sem consentimento, origem ou manifesto válido precisa ser recusado antes de qualquer upload; fixar em `scripts/phase-2-spike/tests/corpus.test.mjs`.
- Áudio vazio, corrompido ou em formato não suportado deve falhar com erro sanitizado e sem resultado falso; fixar no teste do runner.
- Frase com variação de caixa, acento ou pontuação deve seguir a normalização versionada sem ampliar correspondências semanticamente; fixar em `scripts/phase-2-spike/tests/detector.test.mjs`.
- Frase em trecho negativo, ambíguo ou citada por outra pessoa deve aparecer no conjunto de falsos positivos definido e não ser tratada como prova de infração; fixar no conjunto negativo e relatório de métricas.
- Resposta sem timestamps ou confiança do provedor deve preservar a referência ao clip e registrar o campo como indisponível, nunca inventar um valor; fixar no teste do adaptador.

---

### Task 1: Corpus autorizado e baseline de avaliação

**Files:**
- Create: `scripts/phase-2-spike/corpus.example.json` (somente metadados, sem mídia)
- Create: `scripts/phase-2-spike/README.md`
- Create: `scripts/phase-2-spike/tests/corpus.test.mjs`
- Modify: `vitest.config.ts` (descoberta dos testes `.test.mjs` do spike)
- Ignore/local only: `.superpowers/runtime/phase-2-spike/corpus/` (mídia e manifesto preenchido)

**Interfaces:**
- Manifesto local: `{ id, path, source, consent, scenario, expectedPhrases, expectedNegative }`; `id` é uma referência opaca, e `path` aponta para arquivo fora do Git.
- Loader `loadCorpus(manifestPath): Promise<CorpusClip[]>` valida presença de arquivo, consentimento, metadados obrigatórios e extensão/tamanho permitidos antes de chamar qualquer provedor.
- O conjunto deve conter exemplos positivos e negativos para cada frase escolhida e registrar quem autorizou, finalidade e cenário sem versionar dados pessoais.

- [x] **Step 1: Definir o corpus mínimo, cenários e caminhos de obtenção** no README; comparar amostras sintéticas/gravadas e exportação manual consentida, registrar a opção escolhida e os comandos de preparação sem incluir mídia no repositório.
- [x] **Step 2: Escrever testes de recusa do manifesto** em `corpus.test.mjs` para consentimento ausente, caminho fora do diretório temporário, arquivo inexistente, extensão não suportada e manifesto válido.
- [x] **Step 3: Implementar `loadCorpus`** em `scripts/phase-2-spike/corpus.mjs`; bloquear processamento antes de validar consentimento e resolver caminhos dentro do diretório temporário.
- [x] **Step 4: Rodar `pnpm exec vitest run scripts/phase-2-spike/tests/corpus.test.mjs`**; confirmar recusa dos casos inválidos e aceitação apenas do manifesto permitido.
- [x] **Step 5: Conferir `git status --short` e o ignore local**; mídia/manifesto preenchido não podem aparecer como arquivos rastreáveis.

### Task 2: Comparação reproduzível de transcrição

**Files:**
- Create: `scripts/phase-2-spike/transcribe.mjs`
- Create: `scripts/phase-2-spike/providers/local-whisper.mjs`
- Create: `scripts/phase-2-spike/providers/hosted.mjs`
- Create: `scripts/phase-2-spike/tests/providers.test.mjs`
- Modify: `scripts/phase-2-spike/README.md`

**Interfaces:**
- Adaptador `transcribe(clip, options): Promise<{ segments: Array<{ startMs, endMs, text, confidence? }>, provider, model, elapsedMs }>`; valores de confidence ausentes permanecem ausentes.
- O runner usa um CLI local Whisper e um provedor hospedado selecionado após verificar suporte/documentação vigente; ambos recebem o mesmo corpus e parâmetros equivalentes.
- A execução salva respostas brutas apenas no diretório temporário; o resultado comparável sanitizado contém identificador opaco, provedor/modelo, duração, latência, timestamps e texto necessário ao detector, sem credenciais.

- [x] **Step 1: Fixar as opções candidatas e a matriz experimental** no README: versões/modelos, idioma, formatos, parâmetros, equipamento local, limites de upload, requisitos de conta, custo por minuto e armazenamento temporário local versus remoto; comparar retenção/exclusão e treinamento antes de enviar qualquer mídia a terceiros.
- [x] **Step 2: Definir um fixture sanitizado de resposta** e testes do adaptador para timestamps válidos, áudio vazio/corrompido/não suportado, transcrição vazia, timeout/erro HTTP, resposta malformada e confiança/timestamps ausentes.
- [x] **Step 3: Implementar o runner e adaptadores** em `transcribe.mjs` e `providers/`; ler credenciais apenas do ambiente local, usar timeout/limite de tamanho, medir latência e nunca imprimir segredo nem corpo de áudio/transcrição em logs de falha.
- [x] **Step 4: Rodar `pnpm exec vitest run scripts/phase-2-spike/tests/providers.test.mjs`**; confirmar validação de resposta e sanitização de erros.
- [ ] **Step 5: Executar cada provedor com o mesmo corpus**, repetir as rodadas para reportar mediana e dispersão da latência, calcular custo observado/estimado por minuto e registrar cobertura de frases esperadas e limitações de idioma/ruído.

### Task 3: Detector determinístico versionado

**Files:**
- Create: `scripts/phase-2-spike/phrases.v1.json`
- Create: `scripts/phase-2-spike/detector.mjs`
- Create: `scripts/phase-2-spike/tests/detector.test.mjs`

**Interfaces:**
- `phrases.v1.json` declara `version: 1`, locale e uma lista pequena de IDs/frases literais; mudanças criam nova versão, sem atualizar silenciosamente a lista usada no benchmark.
- `detectPhrases(segments, phraseSet): Detection[]` retorna `{ clipId, phraseId, phraseVersion, startMs, endMs, confidence? }`; referência de clip é anexada pelo runner, sem texto integral na saída final.
- Matching ignora somente caixa, acentos e pontuação definidos explicitamente; não usa embeddings/modelo generativo nem inferência de intenção.

- [x] **Step 1: Fixar de 3 a 5 frases e regras de normalização** em `phrases.v1.json`; incluir exemplos positivos, negativos, citações e ambiguidades com rótulo esperado no corpus local.
- [x] **Step 2: Escrever testes unitários** para correspondência literal em segmento, frase dividida entre segmentos, variações permitidas, falso positivo negativo, duplicação, timestamp inválido e confiança ausente.
- [x] **Step 3: Implementar `detectPhrases`** em `detector.mjs` com matching determinístico sobre segmentos temporizados e saída reduzida a metadados da detecção.
- [x] **Step 4: Rodar `pnpm exec vitest run scripts/phase-2-spike/tests/detector.test.mjs`**; comparar saídas esperadas exatas, inclusive timestamps e versão da regra.

### Task 4: Benchmark e decisão de arquitetura

**Files:**
- Create: `scripts/phase-2-spike/run.mjs`
- Create: `docs/validation/phase-2-spike.md`
- Modify: `scripts/phase-2-spike/README.md`

**Interfaces:**
- `run.mjs --manifest <path> --provider <local|hosted>` executa validação do corpus, transcrição, detector e cálculo de métricas sem persistência fora do diretório temporário.
- Relatório `phase-2-spike.md` registra commit, versões/configuração não secreta, hash do corpus sanitizado, métricas por provedor, limitações, limpeza, critérios go/no-go e recomendação da próxima issue.
- Métricas: precisão, recall e falsos positivos por frase no corpus rotulado; latência mediana e dispersão; custo por minuto; cobertura de timestamps/confiança; tempo total e taxa de falhas.

- [x] **Step 1: Definir limiares go/no-go antes de olhar resultados** no relatório: cobertura mínima de exemplos positivos, falso positivo máximo, limite aceitável de custo/latência e requisitos obrigatórios de consentimento, retenção e exclusão.
- [x] **Step 2: Implementar execução repetível** em `run.mjs`; identificar cada rodada, registrar configuração não secreta, resultados agregados e erro sanitizado, sem log de texto/áudio.
- [ ] **Step 3: Rodar o corpus nos provedores comparados e calcular métricas**; avaliar separadamente erros de ASR e erros do detector para distinguir falso negativo de transcrição de falso negativo de regra.
- [x] **Step 4: Registrar a decisão e recomendação** em `docs/validation/phase-2-spike.md`, incluindo opções avaliadas, custo/latência, privacidade, limites amostrais, retenção de terceiros, limpeza confirmada e go/no-go explícito para ingestão persistente/workers.
- [x] **Step 5: Apagar mídia e artefatos temporários**, verificar ausência de dados sensíveis rastreados por Git e registrar o resultado da limpeza no relatório.
- [x] **Step 6: Rodar `pnpm exec vitest run scripts/phase-2-spike/tests` e `pnpm format:check` nos arquivos alterados**; confirmar reprodução do detector e relatório sem áudio, transcrição integral ou credenciais.

**Execução real dos provedores (Tasks 2 Step 5 e 4 Step 3): bloqueada neste ambiente.** Não há `DEEPGRAM_API_KEY` nem egress permitido a `api.deepgram.com`; também faltam CLI e modelo do `whisper.cpp`. Não enviar clips ou buscar contornar a política de rede; registrar ausência de resultados e manter go/no-go inconclusivo até executar em ambiente controlado com os pré-requisitos.

## Critérios de conclusão

- Corpus documentado com consentimento/origem/cenário e exemplos positivos/negativos; nenhum clip real usado sem consentimento explícito.
- Spike executável e repetível em ambiente local/controlado, com as mesmas entradas/configurações produzindo as mesmas detecções.
- Saídas incluem timestamp, ID e versão da regra, confiança quando disponível e referência opaca ao clip.
- Relatório compara provedores/armazenamento temporário, latência, custo, cobertura, falsos positivos, privacidade, retenção e limpeza.
- Limiares go/no-go e próxima decisão estão explícitos; não iniciar ingestão persistente ou workers como parte deste plano.
