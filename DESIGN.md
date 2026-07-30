# Design

## Source of truth

- Status: Active
- Last refreshed: 2026-07-29
- Primary product surfaces: portal público de notícias, painel da redação e overlays para OBS.
- Evidence reviewed: `README.md`, `app/assets/css/main.css`, `app/app.config.ts`, `app/components/overlay/*`, `app/pages/overlay/*`, `public/vpn_logo.png` e `public/static_background.png`.

## Brand

- Personality: jornalismo urbano de roleplay com linguagem técnica, direta e cinematográfica.
- Trust signals: informação legível, estados explícitos e dados operacionais consistentes.
- Avoid: decoração sem função, estética genérica de dashboard SaaS e excesso de efeitos que prejudiquem a transmissão.

## Product goals

- Goals: produzir overlays legíveis em OBS, reconhecer imediatamente o estado da transmissão e permitir identidade por cidade.
- Non-goals: reproduzir interfaces militares reais ou simular controles interativos dentro da Browser Source.
- Success signals: leitura imediata em 1080p, composição limpa sobre vídeo e estados de conexão distinguíveis.

## Personas and jobs

- Primary personas: jornalistas e operadores de transmissão do roleplay.
- User jobs: apresentar notícias, monitorar o sinal e contextualizar uma transmissão ao vivo.
- Key contexts of use: Browser Sources do OBS em 1920×1080, visualizadas durante jogo e transmissão.

## Information architecture

- Primary navigation: painel protegido em `/redacao`; overlays acessados por URLs próprias.
- Core routes/screens: `/redacao/transmissao`, `/overlay`, `/overlay/idle`, `/overlay/spectrum`, `/overlay/no-signal`, `/overlay/stream-signal` e `/overlay/stream-signal-deck`.
- Content hierarchy: estado operacional, conteúdo principal, identidade da cidade e telemetria secundária.

## Design principles

- Estado antes de ornamento: conexão, perda de sinal e transmissão ao vivo devem ser inequívocos.
- Legibilidade de broadcast: alto contraste, tipos monoespaçados para telemetria e margens seguras.
- Ficção técnica coerente: inspiração em câmeras de nave e monitoramento remoto sem copiar uma interface existente.
- Tradeoffs: preservar textura retro apenas como ruído e imperfeição; evitar referências literais a VHS.

## Visual language

- Color: base neutra escura; branco para informação; ciano para conexão; vermelho para falha; verde puro apenas para chroma key.
- Typography: Inter para UI; monoespaçada do sistema para telemetria; Oswald reservado a chamadas editoriais.
- Spacing/layout rhythm: margens seguras de 40 px em 1080p e agrupamentos compactos de 4–12 px.
- Shape/radius/elevation: linhas finas, cantos técnicos e painéis translúcidos; pouco arredondamento.
- Motion: pulsos lentos, telemetria contínua e ruído controlado; evitar movimento que compita com o vídeo.
- Imagery/iconography: retículas, barras de sinal, energia e identificadores de nó remoto.

## Components

- Existing components to reuse: layout `overlay`, `OverlaySpectrumMotion` e componentes Nuxt UI no painel.
- New/changed components: `OverlayRemoteLinkOsd`, com estados `connected` e `lost`, e `OverlayRemoteLinkDeck`, restrito à faixa inferior de 270 px sob conteúdo ultrawide e com feed de notícias em estilo de monitoramento, filtrado pela cidade ativa e acompanhado pela imagem de capa.
- Variants and states: conectado usa ciano; sinal perdido usa vermelho e alerta explícito.
- Token/component ownership: Tailwind e tokens do Nuxt UI; cores de cidade continuam em `cidadeColors.ts`.

## Accessibility

- Target standard: contraste equivalente a WCAG AA para informação textual.
- Keyboard/focus behavior: overlays são não interativos.
- Contrast/readability: sombras discretas e fundos translúcidos protegem a leitura sobre vídeo.
- Screen-reader semantics: telemetria decorativa fica fora da árvore acessível.
- Reduced motion and sensory considerations: animações devem ser lentas; efeitos intensos ficam restritos ao estado sem sinal.

## Responsive behavior

- Supported breakpoints/devices: prioridade para 1920×1080; deve permanecer utilizável em 1280×720.
- Layout adaptations: elementos ancorados às margens e tamanhos fluidos sem rolagem.
- Touch/hover differences: não aplicável aos overlays.

## Interaction states

- Loading: estado de conexão ainda não confirmado deve parecer inicialização técnica.
- Empty: conteúdo ausente não remove a identificação operacional.
- Error: vermelho e texto `LINK LOST`.
- Success: ciano e texto `REMOTE LINK ACTIVE`.
- Disabled: não aplicável.
- Offline/slow network: manter o OSD renderizado e sinalizar perda sem depender do backend.

## Content voice

- Tone: técnico, conciso e operacional.
- Terminology: `REMOTE LINK`, `LIVE FEED`, `NODE`, `UPLINK`, `PWR` e `LINK LOST`.
- Microcopy rules: rótulos curtos em caixa alta; data e hora em pt-BR.

## Implementation constraints

- Framework/styling system: Nuxt 4, Vue 3, Nuxt UI 4 e Tailwind CSS 4.
- Design-token constraints: usar classes estáticas; temas de cidade somente via `cidadeColors.ts`.
- Performance constraints: overlays devem manter animação estável no Chromium/CEF do OBS.
- Compatibility constraints: Browser Source em fundo transparente ou chroma key conforme a rota.
- Test/screenshot expectations: ESLint direcionado, typecheck quando a base permitir e smoke test no dev server.

## Open questions

- [ ] Confirmar se `/overlay/stream-signal` será usado com transparência real ou chroma key verde no OBS.
