# Mobile-first — News, Site e Monitor

## Autorizações e destino

11/10/2026: usuário autorizou mesclar PR #8 e melhorar a responsividade. PR #8 mesclada no commit dc8c2130ff38af861f63f3a55516e69dc1d47df1 após todos os checks passarem. Desenho aprovado explicitamente: telas existentes de News, Site e Monitor, navegação mobile, ações reorganizadas, formulários em uma coluna e tabelas com rolagem própria; larguras 320, 375, 768 e 1280 px; preservar OBS; entregar em nova PR.

Branch codex/mobile-first baseada em origin/main após merge, no worktree isolado já anexado issues-editoriais/vpn. Registros posteriores à PR anterior preservados na branch codex/issues-editoriais (commits documentais c536aac e f5af183). As quatro migrations editoriais foram aplicadas no banco compartilhado/produção por autorização explícita do usuário; somente a conta indicada recebeu associação. Esta etapa de responsividade não altera schema nem acessos remotos.

## Mudanças

- Navbar da redação com título e ações reorganizados no celular; filtros e formulários sem padding duplicado, largura mínima desnecessária ou duas colunas prematuras.
- Sidebar fecha também em tablets abaixo de 1024 px, alinhada ao breakpoint real do Nuxt UI.
- Tabelas com rolagem no próprio UTable, região nomeada/focável, paginação compacta e nomes longos em duas linhas com largura legível.
- Textos longos em notas, relações e Monitor quebram sem exceder a tela. Inputs mobile evitam zoom por fonte pequena; controles da redação e Monitor têm área de toque ampliada.
- Site com menu mobile acessível e ações do hero empilhadas.
- Destaques públicos: PostSlider opta por modo responsivo somente na News pública; padrão usado pelo OBS preservado. Páginas de cidade não cortam texto por altura fixa; controles anterior/próximo pertencem a cada destaque.

## Verificação

Roteiro versionado: vpn-news/tests/mobile-browser.cjs. Executar da raiz com News em 127.0.0.1:3010, Site em :3011 e Monitor em :3012, todos conectados ao Supabase local isolado. Exige VPN_TEST_SUPABASE_STATUS (status CLI local) e VPN_PLAYWRIGHT_MODULE se Playwright não estiver resolvível. Usa Edge headless; recusa Supabase remoto. CLI pnpm disponível (VPN_PNPM_BINARY permite fornecer o executável). Credenciais, logs e screenshots apenas em .superpowers/runtime ignorado.

Para bundles de produção: executar com VPN_MOBILE_PHASE=prepare antes do build; conectar o build ao mesmo Supabase local; iniciar os três .output/server/index.mjs nas portas acima; executar com VPN_MOBILE_PHASE=verify. O modo prepare conserva fixtures para o prerender e o modo verify as remove. Sem a variável, faz setup/verificação/limpeza em uma execução para servidores dev. Páginas de cidade em produção usam noScripts: o teste verifica HTML/links nativos, sem exigir hidratação, e confirma ausência de bundles de hidratação (o inicializador inline de tema do Nuxt permanece).

Fixtures: uma conta editorial temporária, 70 registros com nomes longos, nota longa, 70 cotações de valor alto e dois destaques. Monitor usa respostas API interceptadas para estados preenchidos e títulos/canais longos, sem chamadas à Twitch. Limpeza por IDs próprios; não resetar banco nem executar este roteiro em produção. Consulta somente leitura confirmou select_posts/qual=true em produção, enquanto o baseline local possui apenas select own posts. O roteiro cria e remove vpn_mobile_fixture_read somente no banco local, liberando anon apenas para posts da conta temporária da suite. Nenhuma policy remota alterada.

Roteiro cobre 19 rotas por largura, conteúdo carregado, ausência de overflow da página e corte de controles, navegação mobile, confirmação do wizard e rolagem da tabela pelo teclado. Inclui avanço por teclado entre dois destaques da cidade. Revisão independente exigiu colocar o foco no verdadeiro scroll container e aguardar conteúdo carregado; ambos corrigidos.

Evidências RED: menu mobile do Site ausente; navegação próxima dos destaques não avançava. Primeiro startup dev excedeu timeout antes de avaliar layouts; servidores aquecidos confirmados HTTP 200. Suite unitária teve timeout de startup em rejectsUnresolvedRef sob carga; repetição completa passou 92/92 sem alterar testes/timeouts.

Verificação local em 11/10/2026: pnpm lint, pnpm typecheck, pnpm build (quatro aplicações), pnpm contracts:check e pnpm test:foundation passaram; 92 testes em 21 arquivos. Aceitação mobile em dev e bundles de produção: 76 combinações de rota/largura passaram. Aceitação editorial: 12 grupos passaram, incluindo overlays OBS em 1280/1920 px, cidade vazia e falha de rede. Revisão independente sem regressão de produto bloqueante; limpeza do roteiro reforçada para tentar cada operação mesmo após falha. Uma asserção inicial de noScripts foi corrigida para reconhecer o inicializador inline de tema; navegação do carrossel aguarda o término da rolagem suave antes de voltar. Pendentes por destino: publicar nova PR e verificar CI/preview; merge desta nova PR não autorizado nesta fase.

Limpeza confirmada por SQL local: auth.users, db_records, posts e market_values = 0; policy temporária = 0; catálogo original = 8. Última repetição dos 76 checks mobile passou após reforçar limpeza e sincronizar a animação do carrossel.
Preview inicial do commit 4b536a8: todos os checks da CI e quatro deploys passaram. Verificação remota do Site em viewport 320 px detectou largura útil 305 px com scrollbar clássica: body min-width 320px causava overflow. Restrição removida; build e lint do Site repetidos com sucesso, e navegador sobre o bundle final passou em 305/320/375/768/1280 px, incluindo abertura/fechamento do menu. Caso adicional de 305 px incorporado ao roteiro versionado. Preview News abriu e redirecionou corretamente /redacao/base para login; aceitação editorial autenticada permanece comprovada localmente, sem criar fixtures remotas.
