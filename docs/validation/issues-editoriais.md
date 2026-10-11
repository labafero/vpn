# Issues editoriais — implementação local

## Escopo e autorização

Planos e specs aprovados em 10/10/2026. Base compartilhada entre usuários autorizados da redação. Implementação direta nesta sessão; autorização cobre código e integração local. Não houve push, PR, preview remoto, atribuição de membros reais, migration remota, merge ou produção. Issues remotas permanecem abertas.

Plano coordenador: `docs/superpowers/plans/2026-10-10-issues-editoriais.md`. Worktree `C:/Users/anils/.codex/worktrees/issues-editoriais/vpn`, branch `codex/issues-editoriais`, base `e797899`. Documentação de DNS no checkout original preservada fora deste lote.

## Resultado

- #1: catálogo global com oito nomes sem preços fictícios e identidade normalizada; snapshots imutáveis por usuário/cidade/item; wizard de quatro etapas com revisão, volta, zero e retry; dashboard com seleção após salvar, períodos, gráfico temporal, tabela e paginação. Tendência usa a cotação anterior da mesma série, inclusive fora do período.
- #2: preços públicos por broadcaster; cidade ativa restringe a consulta, cidade ausente deduplica por item entre cidades e informa origem. Deduplicação antes do limite de dez; desempate por ID e tendência na mesma série. Polling de 60 segundos, descarte de respostas antigas, limpeza ao sair e preservação dos últimos dados em falha periódica no mesmo contexto.
- #3: associação editorial confiável; registros e relações compartilhados; autor original imutável; notas editáveis/removíveis somente pelo autor. Relações direcionadas com FK/cascade e proteção contra autorreferência/duplicação. Tabela com busca literal, filtros, ordenação, paginação de 25 e proteção contra respostas antigas. Três CSVs explícitos com todos os registros filtrados, notas e vínculos entre extremos exportados, BOM/CRLF e neutralização de fórmulas. Lotes de 500 por ID, cancelamento e rechecagem de autorização antes dos lotes e do download; falhas não geram arquivo parcial.

Correções descobertas pela integração: login confirma claims antes de navegar; menu móvel inicia fechado, preservando acesso aos controles no desktop; filtros gerais usam sentinela não vazia exigida pelo USelect. Nuxt UI configurado para pt-BR e seletores pesquisáveis receberam nomes acessíveis.

## Ambiente local

Supabase CLI 2.119.0, Docker Desktop, projeto isolado `vpn-editoriais`, API loopback:54421, DB:54422. Configuração em `.superpowers/runtime/supabase`; migrations/tests por junction para os arquivos versionados. Instância local preexistente `vpn` não foi resetada nem modificada. Status/credenciais e screenshots locais ficam no diretório ignorado; não versionar seu conteúdo.

Tipos de banco regenerados pelo CLI para public/private/graphql_public, sem edição manual. Dependências instaladas com lockfile congelado. Nenhuma dependência de produto adicionada.

## Evidências de 10/10/2026

| Verificação | Resultado |
|---|---|
| `pnpm lint` | PASS, todos os workspaces |
| `pnpm typecheck` com variáveis públicas do Supabase local | PASS, todos os workspaces |
| `pnpm contracts:check` | PASS |
| `pnpm test:foundation` | PASS, 92 testes em 21 arquivos |
| `pnpm dlx supabase@2.119.0 test db --workdir .superpowers/runtime` | PASS, 68 testes em 6 arquivos |
| `pnpm build` com Supabase local | PASS, todos os workspaces |
| `git diff --check` | PASS |
| Advisors locais, nível warn, fail-on error | Sem ERROR; avisos existentes sobre search_path, RLS initplan/permissivas e city_seasons; nenhum finding nas tabelas novas |
| `supabase/operations/editorial-preflight.sql` no banco local | PASS, somente leitura; zero dados incompatíveis na base local vazia após limpeza |
| Roteiro browser versionado contra build de produção local | PASS, 12 grupos de aceitação e limpeza das fixtures |

pgTAP novo: acesso editorial 17, catálogo/valores 13, overlay 8 e relações 8. Casos executados antes das migrations demonstraram RED; depois da aplicação local, GREEN. Cobertura: anon, não editor, dois editores, revogação, autopromoção, autoria, notas alheias, precisão/FK/imutabilidade, deduplicação/limite/cidade/broadcaster, relações e cascade. As suites anteriores da fundação continuam passando.

Um primeiro run unitário durante inicialização de dependências/Docker excedeu timeout; retry da baseline passou 78/78 e o lote final passou 92/92. Na repetição SQL após browser, duas fixtures de catálogo de tentativas interrompidas alteraram a contagem do seed. Foram removidas somente no projeto isolado; novo run passou 68/68. O roteiro versionado agora rastreia nomes antes do save e limpa mesmo se a verificação falhar. Warnings de build pertencem às dependências (anotações Rollup e resolução deprecated de exports); nenhum erro de build.

### Integração no navegador

Edge headless/Playwright, Nuxt real e Auth/Data API reais no Supabase local. Usuários temporários confirmados, associação editorial local e limpeza verificada. Roteiro: `vpn-news/tests/editorial-browser.cjs`. Exige `VPN_TEST_SUPABASE_STATUS` apontando ao status CLI local, Playwright disponível (`VPN_PLAYWRIGHT_MODULE` permite resolver instalação existente), app em loopback:3010 e Edge instalado. Recusa Supabase remoto. Não imprime senhas, sessões ou chaves.

Fluxos observados no dev e repetidos no build de produção local:

1. Login → redação; wizard cidade → item novo → moeda pt-BR → revisão → save → dashboard selecionado. Cotação seguinte aparece no dashboard.
2. Volta preserva valor; zero aceito; falha simulada no POST após criação do item preserva dados; retry salva uma única cotação. Duas chamadas concorrentes de editores distintos retornam o mesmo item.
3. Registro criado/editado pela interface; nota própria criada/editada; vínculo entre pessoa e empresa. Segundo editor lê ficha/nota sem controle de edição da nota alheia.
4. Downloads dos três CSVs incluem campos, IDs e conteúdo correspondente. Busca em 390×844 descarta registros fora do filtro; Tab alcança o filtro seguinte.
5. Overlay em contexto anônimo, 1920×1080 e 1280×720. Cidade ativa mostra preço/tendência; sem cidade informa origem; cidade sem cotação não faz fallback; falha de rede não impede o layout.
6. Revogação impede próxima navegação editorial com 403. Respostas 503/403 nos casos negativos foram induzidas pelo roteiro.

Screenshots inspecionados: dashboard, tabela desktop/mobile e overlays nas duas resoluções/com origem. Logs/imagens em `.superpowers/runtime`, fora do Git. Roteiro final: `browser-production.log`, exit 0; build final: `build-delivery.log`, exit 0. Consulta posterior confirmou zero usuários temporários e zero itens de fixture remanescentes.

## Revisão independente

Um revisor independente recebeu a implementação completa. Quatro findings P2 reproduzidos RED→GREEN e corrigidos; suite final 92/92:

- Offset na exportação podia omitir registro após exclusão concorrente: paginação por ID; teste conserva registro 501.
- Gráfico espaçava por posição no array: coordenada horizontal proporcional ao timestamp.
- Primeiro valor do período aparecia estável sem cotação anterior: busca precedente e compara na mesma série.
- Catálogo truncava no limite da Data API: lotes por ID; teste coleta 1.201 itens.

Nenhum finding da revisão adiado; nenhuma pendência de segurança editorial apontada pelo revisor.

## Decisões e custos (Rulings)

1. Branch único e commits separados, com geração conjunta dos tipos para migrations relacionadas, devido às dependências compartilhadas. Custo se forem exigidas PRs separadas: dividir/ordenar commits e regenerar tipos por entrega.
2. Supabase local isolado em portas 544xx para preservar a instância existente. Custo: containers/recursos adicionais locais; não cria infraestrutura remota.
3. Constraints dos dados legados usam `NOT VALID`: aplicam a novas gravações, preservando histórico até auditoria. Custo: dados antigos incompatíveis podem impedir edição; auditoria/correção e `VALIDATE CONSTRAINT` são obrigatórias antes de concluir implantação.
4. Vínculo com endpoint inexistente espera 42501 no teste, pois RLS o bloqueia antes da FK. Custo: cliente recebe erro de acesso em vez de FK; integridade permanece protegida pela FK.

## Commits de produto

- `2cd71ae`: associação editorial, RLS, middleware e planos.
- `ec428ab`: catálogo/snapshots, moeda e consultas iniciais.
- `05b90b0`: relações, RPC de overlay, SQL e tipos gerados.
- `ae87703`: sequência de login e locale pt-BR.
- `08f062c`: wizard/dashboard, gráfico, catálogo completo, paginador/CSV e navegação.
- `e8bbd85`: componente/polling do overlay.
- `4102597`: ficha/relações, tabela, exportações, validação, roteiro browser e preflight.

## Próxima entrega e reversão

Corpo de PR preparado em `docs/validation/issues-editoriais-pr.md`, contra main. Publicar branch pode disparar previews automáticos: não associar produção nem apontar preview de escrita ao banco de produção sem autorização compatível.

Antes de migrar remotamente: revalidar conta/projeto registrado em `docs/operations/environments.md`; obter migrations atuais/dry run; executar preflight somente leitura; obter lista explícita de UUIDs dos editores e revisar impacto sobre autores existentes. Quatro migrations novas neste lote, sem associação automática. Não aplicar restrição editorial sem preparar a lista aprovada e a janela de implantação.

Preview precisa de banco isolado com migrations/membros/fixtures compatíveis. Provar fluxo no destino real, executar CI e decidir merge separadamente. Sucesso local não substitui prova remota. Issues continuam abertas até entrega validada.

Rollback da UI: reverter interfaces e retirar stocks do ticker, preservando catálogo/snapshots/registros/notas. Se RLS bloquear usuários previstos, corrigir associação aprovada por operação administrativa; não reabrir acesso a todo autenticado. Rollback de banco exige operação revisada e preservação de dados, sem drops automáticos. Cascade de relações é destrutivo; operações remotas sobre registros exigem backup.

Limpeza: servidor de produção local encerrado depois da aceitação. A remoção dos dois diretórios temporários de ledger em `.superpowers/sdd` foi rejeitada automaticamente como `blocked by policy`; permanecem ignorados, sem afetar o código. Não tentar contornar o bloqueio. Worktree preservado para a decisão de integração. Parada do projeto Supabase isolado executada separadamente, preservando os dados locais.
