# PRD — VPN News

## Resumo

O News publica conteúdo de roleplay para leitores e oferece à redação ferramentas
para preparar matérias, valores e configurações editoriais. A publicação é
revisada por uma pessoa; o app também fornece overlays autocontidos para OBS.

## Usuários e necessidades

- **Leitor:** encontrar notícias e destaques da VPN e de sua cidade.
- **Redator/editor:** criar, revisar e manter matérias, cidades e valores.
- **Streamer/editor de transmissão:** configurar overlays sem expor ferramentas
  administrativas ao público.

## Escopo

- Portal público com índice de notícias, destaques e páginas por cidade.
- Redação autenticada para listar, criar e editar posts, administrar cidades,
  valores e configurações de transmissão.
- Ferramentas editoriais de valores de mercado com histórico por série e
  visualização de stocks em overlay, quando houver cotação aplicável.
- Overlays de OBS com rotas simples, leves e independentes do dashboard.
- Identidade visual por cidade baseada em `city_config.cor_primaria` e no mapa
  estático de cores do app.

## Histórias e critérios de aceite

- Como leitor, quero encontrar destaques e notícias por cidade para acompanhar
  o conteúdo da minha comunidade; páginas públicas mostram apenas conteúdo
  publicado e respeitam a configuração visual da cidade.
- Como redator, quero criar e editar matérias para preparar conteúdo editorial;
  páginas de redação exigem sessão autorizada e falhas de gravação preservam o
  trabalho não salvo sempre que possível.
- Como editor, quero manter cidades, valores e transmissão sem alterar código;
  cada operação valida entradas e informa sucesso ou erro em pt-BR.
- Como visitante ou espectador do OBS, quero ler matérias e valores autorizados;
  os dados públicos não incluem credenciais nem metadados privados de sessão.
- Como streamer, quero usar uma Browser Source em OBS; overlays não dependem de
  navegação, sidebar ou interação para exibir seu estado.
- A publicação final de matérias sempre requer ação humana; detecções do Monitor
  não viram notícia automaticamente.

## Não objetivos

- Monitorar transmissões, executar OAuth de provedores ou processar mídia.
- Publicar conteúdo gerado por IA sem revisão editorial.
- Expor dados privados de sessões, clips ou evidências no portal público.

## Integrações e limites

- Supabase fornece dados editoriais e autenticação conforme as políticas do
  repositório.
- Contratos compartilhados ficam em `packages/contracts`; tipos de banco são
  gerados em `packages/database`.
- O Sentry não é chamado diretamente pelo navegador do News para operações
  privadas; o Monitor consome sua API autenticada.

## Resultado esperado

Leitor consegue navegar pelas notícias públicas; redação autorizada mantém o
conteúdo sem expor ferramentas administrativas; overlays funcionam em Chromium
do OBS sem degradar a transmissão.

## Fora do escopo atual

Integração automática de eventos, clips ou alertas do Monitor com matérias.
Uma ligação editorial futura deve passar por fluxo de revisão explícito.
