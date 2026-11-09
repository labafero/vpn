# Reset do protótipo e dados de instalação

## Intenção

Documentar como convidar um usuário e conceder acesso editorial de forma
independente do reset, e fazer o reset do protótipo voltar a um estado limpo e
reproduzível. O PR também remove `server_clock`, sem uso no produto atual.

## Objetivos e limites

- Documentar convite pelo Supabase e concessão separada em
  `public.editorial_members`, com verificação do acesso.
- No reset, apagar todos os registros de `city_config` e `market_items`, depois
  recriar somente o catálogo padrão de `market_items` a partir do seed. Não
  recriar configurações de cidade nem enviar convites durante o reset.
- Remover `public.server_clock` por migration nova; manter migrations aplicadas
  imutáveis e regenerar os tipos de banco.
- Não conceder `vpn_admin` como efeito de acesso editorial.

## Abordagens consideradas

- Manter o cadastro acoplado ao reset e convidar por Auth Admin API: descartada
  porque mistura convite com uma operação destrutiva e exige uma chave secreta.
- Limpar cidades e re-semeá-las com valores padrão: descartada a pedido do
  usuário; após reset, `city_config` deve permanecer vazia.
- Manter todo catálogo na migration: descartada porque o catálogo padrão precisa
  ser reaplicável pelo procedimento de reset. Supabase CLI suporta seed após
  migrations e execução de arquivo SQL; manter o histórico de migrations
  imutável evita reescrever o estado já aplicado.

## Decisões

- Um guia operacional independente explica o convite pelo painel Supabase e a
  inserção/remoção do vínculo editorial usando SQL confiável pelo Dashboard ou
  CLI. O guia de reset só aponta para ele.
- `supabase/seed.sql` mantém os itens padrão de mercado e usa conflito pelo nome
  normalizado para não duplicar as linhas inseridas pela migration histórica.
  O script de reset apaga o catálogo inteiro e executa esse arquivo depois da
  limpeza.
- A migration nova remove `server_clock` sem `CASCADE`; os tipos permanecem
  gerados em `packages/database`.

## Critérios observáveis

- O guia separa convite Auth e autorização editorial, esclarece que redação não
  significa `vpn_admin` e não inclui credenciais.
- O reset termina sem usuários, posts, temporadas, valores, itens de mercado
  personalizados ou cidades; restaura apenas os itens de mercado padrão.
- Uma instalação local por `supabase db reset` termina com schema aplicado,
  seeds carregados e sem a tabela `server_clock`.
- Nenhuma mudança é aplicada ao projeto Supabase remoto neste trabalho; entregar
  um PR aberto para validação do usuário.
