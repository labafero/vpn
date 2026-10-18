# Splash da home e prova de publicação

Data: 17/10/2026. Branch: `feat/site-splash`. PR: https://github.com/labafero/vpn/pull/21. Base: `b47ee83`.

## Resultado aprovado

O usuário aprovou a abertura local e autorizou explicitamente publicação direta em produção, dispensando novo preview.

A home usa a mesma marca do header (`VpnBrand.vue`). O símbolo entra em fade-in; o texto entra com fade-in e movimento da esquerda para a direita. Toda visita e F5 repetem a intro. Depois de pelo menos 2,5 segundos e do carregamento da página, a composição desaparece em 1,5 segundo, há 500 ms de preto opaco e a página surge em 900 ms. O carregamento pode ocorrer durante a permanência mínima; os tempos não são somados em série.

Pular/Escape antecipam a revelação, inclusive durante a saída automática. Movimento reduzido dispensa a abertura. Sem JavaScript, CSS encerra a animação e libera a página. Timers e listeners são removidos ao sair/desmontar.

## Ambiente e destinos

- Ferramentas: Node 24.22.0, pnpm 11.1.3, Vercel CLI 64.5.0, Supabase CLI 2.119.0.
- Site: `vpn-site`, equipe `anilson-lopes-projects`, root directory `vpn-site`, Node 24.x, domínio https://vpn.labafero.com.
- A home institucional não usa banco. Não confundir prova de publicação do Site com integração funcional Supabase. Vínculo e 25 migrations alinhadas estão registrados em `ambiente-local.md`.
- Não alterar banco ou publicar outros aplicativos como parte desta entrega. Publicação do Site pela CLI direcionada ao projeto existente, a partir da raiz do monorepo. Nenhum merge em main foi autorizado ou executado nesta publicação.
- Reversão: deployment anterior `dpl_3KvVfsezVwoEtaB81JFpGDQrYspy`, URL https://vpn-site-75ikog9ox-anilson-lopes-projects.vercel.app. Se necessário, usar o fluxo oficial de rollback e conferir o domínio após reverter.

## Evidências

- Preview inicial do commit `a064a165f9bca86c49c68d0415e81fa4e9287c36`: https://vpn-site-knp64evg0-anilson-lopes-projects.vercel.app, `dpl_2ZJTf7W4j8cyMoiGh6Z1KHCzqJbY`, target Preview e READY. Build Vercel em 38s; CI GitHub `39081535272` passou. Essa URL contém a primeira versão, anterior aos refinamentos aprovados localmente.
- O push inicial disparou quatro previews Vercel; a CI selecionou apenas o Site. O novo deploy direcionado pela CLI evita publicar os outros aplicativos em produção.
- Revisão final local: lint, formatação, typecheck, contratos e 92 testes passaram. Build local da primeira versão passou; build remoto da versão final integra a publicação em produção.
- Chromium/Playwright local validou desktop 1440×1000 e mobile 390×844, F5, Pular/foco, Escape, movimento reduzido e JavaScript desativado, sem erros de página/console ou overflow horizontal.
- Teste de carregamento lento (imagem atrasada em 6,5s) confirmou a espera por load além da permanência mínima. Teste da passagem pelo preto confirmou composição com opacidade zero sobre fundo preto e opaco antes da revelação da página.
- Revisão independente identificou Escape sem foco e interrupção da saída automática; ambos corrigidos e retestados no navegador. Revisor não encontrou bloqueadores restantes.
- Dry run de produção reconheceu Nuxt e fontes do monorepo. `.vercelignore` exclui credenciais locais, configurações de ferramentas, dependências e saídas geradas.
- Capturas e resultados de navegador são artefatos temporários em `/tmp/vpn-browser/`; não são anexos persistentes da PR. A pasta de capturas foi reutilizada nas revisões locais.
- A proteção de previews permanece ativa; a CLI gerou credencial de automação e usou cookie privado, sem segredo em URL. Dependências Linux do Chromium exigiram instalação humana via sudo; WSLg permitiu janela visível.

## Publicação em produção

Autorizada pelo usuário. Pendente: registrar commit publicado, deployment READY, associação ao domínio e verificação real da versão final em Chromium. Só então declarar publicação concluída.
