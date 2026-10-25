# Identidade compartilhada entre os apps VPN

Data: 24 de outubro de 2026

Status: implementação concluída e publicada em produção em 24 de outubro de 2026. A validação autenticada real do Sentry segue pendente de sessão de usuário na automação.

## Intenção

Fazer Site, News e Monitor parecerem partes do mesmo produto quando a pessoa navega entre eles, sem esconder que cada app tem suas próprias telas. O acesso continua centralizado no portal VPN e a sessão Supabase existente continua compartilhada entre os subdomínios.

## Resultado esperado

- No Site, os CTAs “Abrir portal” e “Entrar no universo” dão lugar a dois acessos claros: News e Monitor. O botão “Explorar a VPN” permanece.
- Uma barra superior comum de 56 px exibe a marca VPN, a navegação para Site/News/Monitor, o app atual destacado e a conta atual. A barra usa `UHeader` e `UButton` do Nuxt UI.
- Com sessão, a conta mostra a identidade disponível e oferece sair. Sem sessão, oferece entrar pelo Site central e volta para o app e rota de origem.
- News e Monitor adotam o tema do Site, preservando a leitura e as funções próprias. News mantém a cor temática de cada cidade.
- News mantém o filtro de cidade junto à lista de matérias; a barra adicional “Todas as cidades” é removida.
- O mockup temporário aprovado demonstra a mesma barra no Site, News público, redação e Monitor; o desenho funcional é este arquivo.

## Escopo

- Novo pacote de workspace `@vpn/ui`, com tokens visuais VPN, marca e componente comum de navegação superior.
- Aplicar o componente ao Site (páginas públicas, login/cadastro e páginas legais), ao News (páginas públicas e redação) e ao Monitor (telas autenticadas).
- Unificar fundo, tipografia e cores semânticas de News e Monitor com a identidade vermelha e escura do Site. Conservar `corClasses` e os temas dinâmicos de cidade no News.
- No News editorial, a barra ocupa o topo acima do dashboard. Sidebar, atalhos e pesquisa continuam disponíveis; a identidade e o logout saem do rodapé da sidebar e passam para a conta comum no topo. As opções de aparência continuam acessíveis pelo menu da conta.
- Em largura pequena, recolher os destinos em menu acessível sem perder o estado da conta.

## Fora do escopo

- Alterar login/cadastro, provedores, callbacks, cookies, domínio da sessão, autorização editorial, papéis, APIs ou banco Supabase.
- Inserir a barra nos layouts Overlay do OBS, em páginas de callback OAuth e em páginas transitórias cuja única função seja redirecionar.
- Redesenhar o conteúdo editorial, formulários de redação ou fluxos de monitoramento Twitch.
- Adicionar Sentry como destino de navegação; Sentry segue sendo validado no fluxo de ponta a ponta, mas é uma API privada.

## Abordagens

1. **`@vpn/ui` com tema, marca e componente compartilhados — escolhida.** Uma fonte de verdade para a barra e tokens reduz divergência visual entre três apps. A barra recebe estado da sessão e callbacks do app que a hospeda, evitando acoplar o pacote ao Supabase ou a uma única configuração Nuxt.
2. **Pacote só com tokens CSS e barras implementadas em cada app.** Menor acoplamento de componentes, mas navegação, responsividade e estado da conta podem divergir.
3. **Copiar estilos e markup entre os apps.** Mudança rápida inicial, porém futuras correções precisariam ser repetidas e poderiam divergir.

## Direção visual e comportamento

- Usar a identidade do Site como base: vermelho VPN `#ed1c24`, fundo escuro `#05090c`, Inter e superfícies escuras. Usar tokens semânticos do Nuxt UI quando houver componentes Nuxt UI.
- Barra horizontal com marca à esquerda, links Site/News/Monitor ao centro e conta à direita; o item do app atual recebe destaque visual e `aria-current`.
- Menu da conta autenticada exibe a identidade disponível e ação Sair. A ação encerra a sessão Supabase compartilhada pelo cliente do app atual. Pessoa anônima vê Entrar.
- Entrar aponta ao portal central com `return_to` contendo a origem e rota atuais. O portal mantém a validação exata de origens autorizadas já existente.
- A barra é sticky no desktop e responsiva em telas estreitas; controles têm foco de teclado, rótulos acessíveis e alvos de toque utilizáveis.
- `@vpn/ui` exporta CSS de tokens e componentes Vue compartilhados. Cada app escolhe/configura as cores semânticas do Nuxt UI e fornece o estado da conta e handlers locais.
- O Site continua servindo de origem visual e de autenticação. News/Monitor usam o mesmo cabeçalho e superfícies, mas podem organizar conteúdo e painéis de modo próprio.

## Restrições e segurança

- Manter o SSO existente em `@vpn/auth`, os cookies atuais e os três projetos Supabase/Vercel atuais. A interface nunca recebe nem transfere tokens entre apps.
- Não alterar os controles de consentimento da Twitch nem os gates editoriais do News.
- Preservar os temas de cidade e o layout bare dos overlays do OBS.
- Manter textos em pt-BR e sem depender de novos serviços externos.

## Verificação

- Lint, formatação, typecheck e build dos apps afetados e do workspace completo conforme o fluxo de CI.
- Testar em browser desktop e mobile: navegação entre três apps, link de login com retorno à rota correta, estado de conta, logout global, foco/teclado e compatibilidade da barra com a sidebar editorial.
- Verificar que rotas `/overlay*`, callback OAuth e páginas transitórias continuam sem barra.
- Validar as páginas públicas de News e temas de cidade, e os estados autenticados do Monitor sem alterar dados reais.
- Como a conta Supabase é compartilhada, a validação final do fluxo continua incluindo Site, News, Monitor e operação autenticada do Sentry, conforme `docs/workflows/entrega.md`.

## Pontos de implementação deixados ao builder

- Definir exports, convenções de CSS, compatibilidade Nuxt e a forma de passar o estado da conta para `@vpn/ui` com o menor acoplamento possível.
- Integrar a barra aos shells atuais sem duplicar navegação, respeitando o layout editorial e as rotas isentas acima.
- Reutilizar a sessão atual e as funções de URL de `@vpn/auth`; não criar um segundo sistema de autenticação.
