# PRD — Objetivo e escopo do VPN Roleplay

## Visão geral

Este PRD estabelece a referência de produto para o VPN Roleplay: o problema que
ele resolve, seus públicos, as capacidades já disponíveis, a evolução planejada
e os limites que devem orientar os PRDs de implementação.

## Identidade do produto

Neste documento, **VPN** é o nome do produto **VPN Roleplay**, uma plataforma
jornalística para roleplay. O produto não é uma rede privada virtual e não tem
como finalidade fornecer conectividade de rede, túneis criptografados ou acesso
remoto a recursos corporativos.

## Problema

A produção de um jornal dentro do roleplay envolve atividades que normalmente
ficam dispersas: escrever e publicar matérias, manter identidades locais,
preparar elementos gráficos e configurar o conteúdo da transmissão.
Essa fragmentação aumenta o trabalho manual, dificulta manter o portal e a
transmissão coerentes e eleva o risco de colocar no ar conteúdo ou estados
incorretos.

## Objetivo

Centralizar o fluxo editorial e a operação visual do jornal em uma experiência
consistente, permitindo que a equipe:

- produza e publique matérias para um portal público organizado por cidade;
- mantenha a identidade editorial e visual de cada cidade;
- configure o conteúdo usado durante uma transmissão;
- apresente overlays legíveis e estados operacionais confiáveis em Browser Sources;
- disponibilize overlays e links de Browser Source para uso no software de
  transmissão, sem estabelecer conexão direta com ele.

O resultado esperado é reduzir tarefas manuais e divergências entre redação,
portal e transmissão, preservando clareza operacional durante o uso ao vivo.

## Públicos e ambientes

| Público | Necessidade principal | Ambiente |
| --- | --- | --- |
| Leitores | Consultar notícias e destaques por cidade | Portal público em navegador |
| Jornalistas | Criar, editar e publicar conteúdo | Redação autenticada em navegador |
| Operadores de transmissão | Preparar a pauta e configurar Browser Sources | Painel da redação e software de transmissão |
| Audiência da transmissão | Receber informação editorial clara e contextualizada | Overlays exibidos por Browser Sources |
| Administração técnica | Manter aplicação, dados, permissões e integrações | Nuxt e Supabase |

Os principais contextos de exibição são navegadores desktop e Browser Sources
em 1920x1080, com suporte a 1280x720. O portal público deve continuar
adaptável a telas menores conforme os componentes existentes.

## Escopo atual

O produto atualmente compreende três superfícies integradas:

### Portal público

- índice de notícias, destaques e filtro por cidade;
- páginas de notícias por cidade;
- identidade visual configurável por cidade;
- exibição de capas e mídias associadas às matérias.

### Redação

- autenticação e proteção das rotas administrativas;
- criação, edição e listagem de matérias;
- configuração editorial da transmissão por usuário;
- manutenção de cidades e suas identidades;
- edição de valores de mercado;
- configuração de personagem ou jogador usada pelas experiências editoriais.

### Overlays

- páginas autocontidas para uso como Browser Sources;
- estados visuais de transmissão, conexão, espera e ausência de sinal;
- elementos editoriais e de telemetria adequados à composição sobre vídeo;
- leitura dos estados publicados pela aplicação sem expor credenciais de transmissão.

## Evolução planejada

A evolução atual concentra-se no portal público, na redação, nos overlays e na
separação do monorepo. Não há cliente local, reconexão, controle de cenas,
controle de mixer ou agente para conexão direta com software de transmissão.

Novas capacidades de operação devem começar por uma decisão explícita de produto
e segurança. Até lá, o sistema fornece apenas conteúdo e links para Browser
Sources, enquanto a operação do software de transmissão permanece externa.

## Fora do escopo

- implantar ou administrar uma rede privada virtual;
- fornecer túneis de rede, criptografia de tráfego ou acesso corporativo remoto;
- substituir a interface completa, o multiview ou os recursos avançados do OBS;
- estabelecer conexão direta com OBS ou outro software de transmissão;
- armazenar credenciais de software de transmissão ou enviá-las aos overlays;
- reproduzir interfaces militares reais ou simular controles interativos nas
  Browser Sources;
- criar um sistema jornalístico generalista fora do contexto de roleplay;
- adicionar capacidades não previstas nos PRDs sem validação de produto e
  segurança.

## Responsabilidades e partes interessadas

Os responsáveis são definidos por papel até que pessoas sejam formalmente
designadas:

| Papel | Responsabilidade |
| --- | --- |
| Produto e negócio | Priorizar resultados, validar escopo e aprovar metas |
| Desenvolvimento | Projetar, implementar, revisar e manter aplicação e integrações |
| Redação | Validar fluxos editoriais, linguagem e organização do conteúdo |
| Operação de transmissão | Validar legibilidade e segurança operacional dos overlays e Browser Sources |
| Administração técnica | Manter Supabase, permissões, ambientes e processo de implantação |

Mudanças que afetem a operação ao vivo exigem validação de desenvolvimento e
operação de transmissão. Mudanças de fluxo editorial exigem validação de produto
e redação. Alterações de autenticação, dados ou acesso remoto também exigem
revisão da administração técnica.

## Dependências, restrições e premissas

- A aplicação permanece uma SPA em Nuxt 4, Vue 3, Nuxt UI 4 e Tailwind CSS 4.
- Supabase fornece PostgreSQL e autenticação; políticas de acesso devem separar
  conteúdo público, dados editoriais privados e comandos operacionais.
- A operação do software de transmissão ocorre externamente, usando os links
  gerados pelo painel como Browser Sources.
- Os overlays não recebem credenciais de software de transmissão.
- As interfaces e mensagens para usuários permanecem em pt-BR.
- Temas de cidade usam exclusivamente o mapa estático de cores do produto.
- Os overlays priorizam legibilidade em 1920x1080 e devem permanecer utilizáveis
  em 1280x720, sem rolagem ou corte de informação essencial.
- Os PRDs são a fonte de requisitos detalhados de cada etapa; este documento é a
  referência de objetivo, fronteiras e resultados do produto.

## Indicadores de sucesso

As metas abaixo são valores iniciais. Devem ser revistas após a primeira rodada
de medições reais, sem reduzir requisitos de segurança ou qualidade.

| Indicador | Meta inicial | Momento de avaliação |
| --- | --- | --- |
| Qualidade do código | 100% das entregas aprovadas em `pnpm lint` e `pnpm typecheck` | A cada mudança |
| Proteção de credenciais de transmissão | Zero credenciais persistidas no Supabase ou expostas em URL, logs e mensagens | A cada revisão de segurança |
| Legibilidade dos overlays críticos | 100% aprovados em 1920x1080 e 1280x720, sem rolagem ou corte de informação essencial | Antes de cada entrega visual |
| Conclusão dos fluxos editoriais críticos | Pelo menos 95% dos roteiros de aceite concluídos sem intervenção técnica | Em cada ciclo de aceite |
| Atualização editorial no ar | Percentil 95 de até 5 segundos entre alteração confirmada e atualização do overlay | Após o PRD 08 |

Os roteiros editoriais críticos devem incluir, no mínimo, criar ou editar uma
matéria, publicá-la, encontrá-la no portal da cidade correta e selecionar o
conteúdo destinado à transmissão. Falhas de infraestrutura externas devem ser
registradas separadamente para não mascarar problemas do fluxo do produto.

## Validação do escopo

O escopo é considerado validado quando:

- produto, desenvolvimento, redação e operação de transmissão aprovarem as
  fronteiras relevantes às suas responsabilidades;
- superfícies, públicos e ambientes de uso estiverem representados;
- estado atual e evolução planejada estiverem claramente separados;
- dependências, restrições de segurança e premissas estiverem registradas;
- os indicadores possuírem método e momento de avaliação;
- novas iniciativas puderem ser relacionadas ao objetivo do produto e a um PRD
  específico antes de serem implementadas.

## Rastreabilidade com o cartão de origem

| Entregável solicitado | Atendimento neste documento |
| --- | --- |
| Problema e objetivo documentados | Seções “Problema” e “Objetivo” |
| Usuários, equipes e ambientes mapeados | Seções “Públicos e ambientes” e “Responsabilidades e partes interessadas” |
| Escopo e não escopo definidos | Seções “Escopo atual”, “Evolução planejada” e “Fora do escopo” |
| Responsáveis e partes interessadas identificados | Seção “Responsabilidades e partes interessadas” |
| Indicadores de sucesso acordados | Seção “Indicadores de sucesso”, com metas iniciais sujeitas à validação dos papéis responsáveis |
