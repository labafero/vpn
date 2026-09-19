# VPN Roleplay — Design System

Sistema visual compartilhado pelo ecossistema VPN Roleplay. A interface deve parecer um produto editorial urbano de roleplay: técnico, direto, legível e cinematográfico, sem parecer um dashboard SaaS genérico.

## Product surfaces

- **vpn-news:** portal público, redação editorial e overlays OBS.
- **vpn-monitor:** portal privado para sessões, convites e alertas; atualmente em fundação visual.
- **vpn-sentry:** backend Nitro e API; sua superfície visual deve ser mínima e operacional.

## Colors

### Base palette

- **Background:** `#05090C` — fundo principal dos overlays e superfícies técnicas.
- **Background neutral:** `neutral-950` — fundo escuro de aplicações e visualizações.
- **Surface:** `bg-elevated` do Nuxt UI — cartões, campos e áreas elevadas.
- **Text primary:** `#FFFFFF` — títulos, dados principais e telemetria ativa.
- **Text secondary:** `text-neutral-400` — informações auxiliares.
- **Text muted:** `text-white/45` ou `text-neutral-500` — metadados e rótulos de baixa prioridade.
- **Border:** `neutral-700` — divisórias comuns.
- **Border technical:** `rgba(103, 232, 249, 0.25)` — molduras e divisórias do monitoramento remoto.

### Semantic colors

- **Primary:** `zinc` — ação e identidade padrão do Nuxt UI.
- **Connected:** `#67E8F9` — link ativo, uplink e telemetria conectada.
- **Success:** `green` — confirmação e metas atingidas.
- **Warning:** `amber` — atenção e estado intermediário.
- **Error:** `#EF4444` — falha, perda de sinal e indisponibilidade.
- **Chroma key:** `#22C55E` — verde puro somente quando uma Browser Source exigir fundo removível.

### City branding

As cidades podem usar `red`, `orange`, `amber`, `green`, `teal`, `blue`, `violet`, `purple`, `pink`, `rose` ou `zinc`.

- Nunca montar classes Tailwind de cor por interpolação.
- Usar exclusivamente `vpn-news/app/utils/cidadeColors.ts`.
- Cada cor fornece as variantes `text`, `border`, `bg` e `muted`.
- A cor da cidade é um acento contextual; não deve substituir o contraste neutro da interface.

## Typography

### Font families

- **Interface:** Inter, fonte sans-serif principal.
- **Telemetria/OSD:** fonte monoespaçada do sistema.
- **Chamadas editoriais:** Oswald, somente quando uma manchete precisar de personalidade visual adicional.

### Type scale

- **Display:** `36–48px`, peso 600–700; títulos de tela e chamadas principais.
- **Heading:** `24–32px`, peso 600; títulos de seção e matérias.
- **Body:** `16px`, peso 400; leitura editorial e descrições.
- **Label:** `12–14px`, peso 500–600; formulários, menus e estados.
- **Technical:** `10–12px`, monoespaçada, tracking entre `0.12em` e `0.22em`; OSD, nós e telemetria.
- **Caption:** `11–12px`, peso 400; metadados e informações secundárias.

### Typography rules

- Usar sentence case em textos administrativos e pt-BR.
- Usar caixa alta apenas em labels operacionais, telemetria e microcopy de overlay.
- Manter line-height confortável em textos editoriais; não aplicar tracking técnico a parágrafos.
- Títulos de notícia devem ter no máximo a quantidade de linhas necessária para preservar a hierarquia da capa.

## Spacing

- **Base unit:** 4px.
- **Micro gap:** 4px — ícone e label ou elementos muito relacionados.
- **Compact gap:** 8px — controles e itens de formulário.
- **Section gap:** 12–16px — grupos de conteúdo.
- **Panel padding:** 20–24px — cartões e painéis de redação.
- **Overlay padding:** 20–40px — composição de transmissão e OSD.
- **Safe area:** aproximadamente 40px em canvas 1920×1080.
- **Desktop content width:** manter leitura editorial em coluna limitada; não esticar parágrafos por toda a viewport.

Use as classes de espaçamento do Tailwind e mantenha ritmo consistente dentro de cada superfície. Evite valores isolados sem necessidade visual clara.

## Layout

### Portal público

- Priorizar manchete, imagem, cidade e data.
- Usar base clara ou neutra conforme o componente, mantendo acentos da cidade.
- Preservar leitura confortável em desktop e mobile.

### Redação

- Usar `UDashboardGroup` e `UDashboardSidebar`.
- Sidebar com navegação, busca e menu do usuário.
- Priorizar tabelas, formulários e ações explícitas.
- Colapsar a sidebar em telas menores sem esconder a navegação essencial.

### Monitor

- Tema escuro operacional.
- Densidade moderada, com estados e alertas visualmente prioritários.
- Não criar telas completas de sessões, convites ou alertas até que os fluxos estejam definidos.

### Overlays OBS

- Canvas prioritário: 1920×1080; compatibilidade: 1280×720.
- Sem rolagem, navegação persistente ou interação necessária.
- Elementos ancorados às margens e respeitando a área segura.
- Compatíveis com transparência ou chroma key conforme a rota.

## Components

### Web application components

- **Buttons:** Nuxt UI; ação primária em `primary`, secundária neutra e destrutiva em `error`.
- **Inputs:** label visível, placeholder curto, estado de foco evidente e mensagem de validação próxima ao campo.
- **Cards:** superfície elevada, borda discreta e padding de 20–24px; não usar sombras fortes.
- **Tables:** cabeçalho contrastante, linhas compactas e estado vazio explícito.
- **Badges:** indicar estado ou metadado curto; não usar como substituto de uma mensagem importante.
- **Toast/alert:** feedback acionável e texto em pt-BR.
- **Sidebar:** navegação persistente apenas na redação e em futuros portais privados.

### Editorial components

- **PostForm:** formulário de criação e edição de matéria.
- **PostSlider:** destaques e chamadas editoriais.
- **CityHighlights:** conteúdo contextual da cidade.
- **UserMenu:** sessão e logout.

### Overlay components

- **OverlayBroadcastStatus:** personagem, passaporte, telefone e título da transmissão.
- **OverlayTinker / OverlayTinkerNews:** ticker de notícias e identidade da emissora.
- **OverlaySpectrum / OverlaySpectrumMotion:** sinal, áudio e visualização espectral.
- **OverlayRemoteLinkOsd:** estado de conexão, uplink, energia e nó remoto.
- **OverlayRemoteLinkDeck:** painel técnico inferior com monitoramento de notícias e imagem de capa.
- **OverlayRecord:** indicador REC e relógio.
- **OverlayGoalDonation:** progresso de meta de arrecadação.
- **OverlayDashboard:** composição de status para a transmissão.

### Component states

- **Loading:** skeleton ou inicialização técnica sem deslocar o layout.
- **Empty:** preservar a identificação da superfície e explicar a ausência de dados.
- **Connected:** ciano, texto `REMOTE LINK ACTIVE` ou equivalente em pt-BR quando administrativo.
- **Error:** vermelho, texto explícito como `LINK LOST` e orientação quando possível.
- **Success:** verde ou cor de cidade, sempre acompanhado de texto/ícone.
- **Disabled:** contraste reduzido, mas ainda legível; nunca depender apenas de opacidade.

## Elevation and effects

- **Level 0:** fundo plano, sem sombra.
- **Level 1:** superfície `bg-elevated` com borda discreta para cartões e campos.
- **Level 2:** painel translúcido com `backdrop-blur` leve para proteger texto sobre vídeo.
- **Technical glow:** brilho ciano sutil em linhas, pontos de conexão e barras de sinal.
- **Error glow:** vermelho reservado para perda de sinal ou falha real.
- **Texture:** grids, retículas e ruído devem ser discretos e nunca competir com a notícia ou o vídeo.
- **Radius:** componentes administrativos seguem o Nuxt UI; overlays técnicos usam pouco arredondamento e cantos marcados.

## Motion

- Pulsos lentos comunicam conexão e atividade.
- Marquee/ticker pode ser contínuo, mas deve permanecer lento e legível.
- Transições devem representar troca de notícia ou mudança de estado.
- Evitar flashes, deslocamentos bruscos e animações decorativas em excesso.
- Respeitar `prefers-reduced-motion` em superfícies interativas sempre que possível.

## Iconography and imagery

- Usar ícones Lucide por meio do Nuxt Icon.
- Ícones devem reforçar a ação ou o estado, não substituir texto crítico.
- Capas de notícias são informativas e devem preservar proporção e legibilidade.
- Overlays podem usar retículas, barras de sinal, pontos de conexão, energia e identificadores de nó.
- Imagens decorativas usam `alt=""`; imagens informativas recebem texto alternativo adequado.

## Accessibility

- Buscar contraste equivalente a WCAG AA para textos e controles.
- Manter foco de teclado visível em redação e Monitor.
- Atalhos de teclado nunca são a única forma de navegação.
- Não comunicar estado somente por cor; combinar cor com texto, ícone ou forma.
- Telemetria decorativa dos overlays pode usar `aria-hidden`.
- Manter alvos de toque confortáveis em telas menores.

## Content and voice

- Interface administrativa: pt-BR, clara, direta e acionável.
- Editorial: urbano, contextual e objetivo.
- Overlay: conciso e técnico; termos ficcionais permitidos incluem `REMOTE LINK`, `LIVE FEED`, `NODE`, `UPLINK`, `PWR` e `LINK LOST`.
- Não misturar inglês técnico em formulários administrativos sem necessidade.
- Datas e horários devem seguir o formato brasileiro.

## Do / Don’t

### Do

- Usar o mapa `corClasses` para identidade de cidade.
- Dar prioridade visual ao título, status ou alerta que resolve a tarefa atual.
- Manter overlays estáveis sobre vídeo e legíveis no OBS.
- Usar componentes Nuxt UI antes de criar variações locais.
- Atualizar este documento quando tokens, componentes ou estados forem alterados.

### Don’t

- Não usar classes Tailwind de cor dinâmicas para cidades.
- Não transformar o Sentry em uma interface rica sem necessidade.
- Não usar verde chroma key como cor de sucesso dentro de um overlay que será exibido sobre vídeo.
- Não adicionar efeitos VHS, glow ou ruído que reduzam a leitura.
- Não criar funcionalidades de Monitor que ainda não tenham fluxo de negócio definido.

## Implementation constraints

- Framework: Nuxt 4 e Vue 3.
- UI: Nuxt UI 4 e Tailwind CSS 4.
- CSS global: importar Tailwind antes de Nuxt UI.
- Todos os projetos Nuxt usam a convenção `app/`.
- Overlays permanecem autocontidos e leves para Chromium/CEF.
- Contratos REST são definidos em `packages/contracts/openapi.yaml`.
- Tipos Supabase são gerados em `packages/database`; não editar manualmente.
- `SUPABASE_SERVICE_ROLE_KEY` nunca pode chegar ao navegador.

## Validation checklist

- Executar lint e typecheck do workspace alterado.
- Validar `packages/contracts/openapi.yaml` após mudanças de API.
- Executar build do projeto alterado quando o ambiente Supabase estiver disponível.
- Verificar portal público, redação e pelo menos um overlay em 1920×1080.
- Verificar a tela inicial do Monitor em tema escuro.
- Verificar `/api/v1/health` do Sentry e respostas públicas com Supabase configurado.
