# Valores e overlay — proposta para issues #1 e #2

Status: design e implementação local aprovados pelo usuário em 10/10/2026. Produção e operações remotas exigem autorização separada. Evidências em `docs/validation/issues-editoriais.md`.

## Objetivo e contexto verificado

Implementar o wizard cidade → item existente ou novo → valor → salvar → dashboard de valores, com histórico; exibir stocks por cidade ativa no OBS e valores recentes sem repetição quando nenhuma cidade estiver ativa.

Issues: https://github.com/labafero/vpn/issues/1 e https://github.com/labafero/vpn/issues/2.
Base consultada: `origin/main` em `e797899`, em 10/10/2026. O workspace `32f1db5` tem os mesmos arquivos de aplicação. `city_config` já existe, com slug único; reutilizá-la, sem criar tabela paralela de cidades. `market_values` e sua view foram removidos pela migration `20260829154824_remove_market_values.sql`; composable, página e stocks não existem mais. O histórico Git tem o módulo anterior em `app/`, antes do monorepo. Não há promessa de recuperar dados eliminados pelo DROP.

## Decisões propostas

1. Recomendada: catálogo global de itens e snapshots normalizados por broadcaster/cidade/item; preserva a autoria antiga, viabiliza gráfico numérico e elimina duplicação por nome.
2. Alternativa: preços únicos compartilhados por cidade; simplifica colaboração, mas altera a semântica antiga por usuário.
3. Alternativa: restaurar label/value em texto; reduz mudanças iniciais, mas não resolve identidade dos itens nem histórico numérico confiável.

Adotar a primeira como proposta. Stocks sem cidade ativa deduplicam por item, pegando a observação mais recente do broadcaster em qualquer cidade e identificando a cidade de origem. Com cidade ativa, deduplicar por item apenas dentro dela. Não misturar broadcasters. Estas escolhas precisam constar da aprovação antes de executar.

## Modelo

- `market_items`: identidade, nome, chave de nome normalizada única, autoria opcional para seed e data. Normalização remove espaços externos, colapsa espaços internos e ignora caixa; preservar acentos. Nome de 1–100 caracteres. Não deletar item com snapshots.
- `market_values`: identidade, `user_id` derivado da sessão, `cidade` FK para `city_config.slug`, `item_id` FK, valor monetário `numeric(14,2)` não negativo e `created_at` do servidor. Histórico somente por INSERT; bloquear UPDATE/DELETE pela aplicação. Restrição de exclusão de cidade/item preserva histórico.
- Índice `(user_id, cidade, item_id, created_at DESC, id DESC)`; índice complementar por usuário/item/data para consulta sem cidade. Empates de horário resolvidos por ID descendente.
- `market_values_latest`: view `security_invoker=true`, último snapshot por usuário/cidade/item. Deduplicar entre cidades em consulta específica antes de aplicar limite.
- Seed somente de nomes: Kit médico civil, Kit médico policial, Analgésico, Tratamento médico, Auto tratamento médico, Apartamento padrão, Bitcoin e Kit de reparo. Os sete primeiros derivam do commit `4e26a58`; o último é solicitado na issue. Sem seed de valores.

## Acesso e fluxos

Proposta: catálogo e valores de mercado são públicos para leitura, como no módulo anterior, pois aparecem no OBS. Escritas exigem autorização editorial explícita; usuário insere apenas seus snapshots. A autorização editorial vem da tabela confiável proposta na spec da Base de Dados, sem promover usuários por metadados e sem dar privilégios do Monitor. Implementar a tabela de autorização primeiro, como pré-requisito compartilhado.

Wizard em `/redacao/valores/novo`: cidade obrigatória, escolha/criação de item, valor pt-BR e revisão antes de salvar. Novo item pode ser criado antes do snapshot; se salvar valor falhar, preservar formulário e reutilizar o item já criado na tentativa seguinte. Colisão de nome concorrente retorna o item existente. Bloquear duplo envio. Valor zero é permitido, negativo/infinito/inválido é rejeitado. Parse em centavos sem arredondamento silencioso. Cidade/item removido durante preenchimento gera erro acionável.

Dashboard `/redacao/valores`: filtros cidade/item/período, últimos valores e variação calculada contra o snapshot anterior da mesma série; primeiro registro é estável. Gráfico de linha de uma série selecionada (não conectar cidades ou itens diferentes), histórico paginado e estado vazio. Períodos 7/30/90 dias e todo o histórico, carregando série em páginas sem truncar silenciosamente. Voltar ao index após sucesso.

Overlay: `useOverlayState().broadcasterId` identifica origem; `cidadeSlug` define filtro. Novo `OverlayStocks` dentro de `overlay/tinker.vue`, conservando notícias e marca. No máximo dez itens após deduplicação, ordenados por recência. Se não houver preço na cidade ativa, esconder stocks; não recorrer a outra cidade. Consultar na inicialização e a cada 60 segundos; observar cidade/broadcaster, cancelar aplicação de respostas antigas, limpar timer no unmount. Não mudar o fluxo de atualização da configuração de transmissão nesta issue. Falha inicial esconde componente; falha posterior mantém último resultado válido, registrando erro sanitizado. OBS continua sem login e sem controles obrigatórios.

## Limites e aceite

Nuxt 4 `app/`, Nuxt UI v4, Valibot, pt-BR, `corClasses`, tipos Supabase gerados; nenhum serviço novo. Não alterar Monitor/Sentry nem reabrir a Fase 1. Sem importação automática de dados antigos, séries por season, notificações ou editor genérico de tabelas.

Aceite: FK impede cidade inexistente; seed sem duplicação; wizard completo e retry seguro; histórico numérico correto; isolamento de autoria; overlay filtra cidade e deduplica antes de limitar; troca de contexto não exibe resposta antiga; portal/notícias/OBS preservados em 1920×1080 e 1280×720. Evidência local, preview e produção são separadas conforme `docs/workflows/entrega.md`.
