# Base de Dados — proposta para issue #3

Status: proposta para revisão; regra de compartilhamento confirmada pelo usuário em 10/10/2026. Sem autorização de implementação ou produção.

Issue: https://github.com/labafero/vpn/issues/3.

## Contexto e objetivo

Em `origin/main` `e797899` já existem `db_records`, `db_record_notes`, `useDbRecords` e páginas `/redacao/base`, `/novo`, `/[id]`. Cadastro, edição, remoção, filtros e notas estão implementados. O que falta é relacionamento referencial, consulta em tabela com paginação e exportação completa/correta. Não recriar o módulo.

O usuário confirmou: **compartilhada entre usuários autorizados da redação**. Tratar dados como dados de roleplay. Hoje RLS libera registros para qualquer autenticado, inclusive edição e remoção; autenticação das páginas não define autorização editorial.

## Abordagens

Recomendação: evoluir os registros tipados existentes e adicionar relações explícitas. Preserva dados e atende a issue com menor migração. Alternativas: tabelas físicas por tipo dão maior rigidez, mas exigem conversão de JSON; construtor genérico de bancos ao estilo Notion aumenta muito o escopo. A referência ao Notion será traduzida em tabela pesquisável, filtros, ordenação, relações e exportação; não inclui fórmulas, blocos, campos arbitrários ou colaboração em tempo real.

## Autorização editorial

Adicionar `public.editorial_members(user_id UUID PK, created_at)` ligada a `auth.users`. Atribuição/revogação somente por operação administrativa confiável; clientes não podem escrever a associação. Usuário pode consultar a própria associação para navegação; as políticas consultam a associação atual, não `user_metadata`. Não migrar automaticamente todas as contas autenticadas para editores. Preparar inventário e lista de membros a serem aprovados antes de aplicar restrição no ambiente remoto.

Todos os membros editoriais podem ler/criar/editar/remover registros compartilhados e suas relações. Autoria original imutável. Todos podem ler/criar notas; só autor da nota pode editar/remover a própria nota. RLS e grants aplicam essas regras inclusive no acesso direto à Data API; middleware serve apenas à experiência de navegação. Revogação de associação deve bloquear a próxima operação. Sem promoção a `vpn_admin` ou alteração de políticas do Monitor.

O mesmo helper `useEditorialAccess` protege as páginas de valores na proposta #1. As demais áreas legadas da redação não terão suas permissões redesenhadas neste lote.

## Registros, relações e notas

Preservar tipos Pessoa, Empresa Legal, Empresa Ilegal e Veículo, seus IDs e `dados` JSONB. Manter campos atuais, com schemas Valibot por tipo. Limites propostos: nome 1–200, campo textual até 1.000, nota 1–5.000 caracteres; strings renderizadas como texto. Aplicar restrições pertinentes também no banco, com auditoria prévia de dados incompatíveis.

Criar `db_record_relations`: ID, `source_id`, `target_id`, `kind` (1–50 caracteres), autor e data. FK para registros; impedir relação consigo mesmo e duplicação de `(source_id,target_id,kind)`. Relação é direcionada; a ficha mostra vínculos de saída e de entrada. Exemplos sugeridos: trabalha em, pertence a, lidera, possui. FK com cascade remove vínculos quando um registro é removido, sem apagar o outro registro. Novos vínculos exigem acesso aos dois extremos. Dados históricos como `dono`, `lider` ou `proprietario` em texto permanecem; não convertê-los automaticamente por coincidência de nome.

## Interface e exportação

`/redacao/base`: UTable com tipo, nome, cidade e atualização; busca por nome, filtros por tipo/cidade, ordenação nome/atualização, paginação de 25 linhas no servidor. Busca literal com escape de curingas, debounce e proteção contra respostas fora de ordem. Ficha mantém edição e notas, adicionando relações pesquisáveis e exclusão com confirmação do impacto em notas/vínculos. Incluir loading, vazio, erro, proibido e não encontrado; ações acessíveis por teclado.

Exportar todos os registros autorizados que correspondem ao filtro, e não apenas a página. Exportação em pacote de três CSVs: registros (inclui `dados` em JSON), relações (IDs dos extremos exportados) e notas (record_id, autor, data e corpo). Reutilizar download via browser, sem integração Notion. Escapar aspas, vírgulas e quebras de linha; UTF-8 com BOM e CRLF; neutralizar fórmulas de planilha em células textuais; buscar em lotes, permitir cancelamento e não declarar sucesso em exportação parcial. Evitar pacote ZIP/dependência nova no MVP: três downloads explícitos via ações do menu Exportar.

## Aceite e limites

Consulta compartilhada funciona entre dois editores; membro comum/anon não consegue ler ou escrever registros, notas, relações ou exportação. Autoria não pode ser reassinada; revogação efetiva; relações sem órfãos, duplicatas ou autorreferência. Tipos gerados substituem casts `as never`. Nenhuma alteração destrutiva nos dados existentes. CSV completo por filtro, incluindo notas e vínculos, com caracteres especiais e proteção de fórmulas. Não expor dados editoriais ao overlay ou ao Monitor.

Pré-requisitos de produção: lista aprovada de editores, auditoria dos dados existentes e verificação remota das migrations/grants. Aplicação remota e merge exigem autorização separada; proposta local não comprova estado do banco remoto.
