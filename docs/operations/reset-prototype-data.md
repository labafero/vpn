# Reset de dados do protótipo

Use somente no VPN enquanto o projeto continuar sendo um protótipo sem usuários
externos. O procedimento limpa a instância Supabase indicada para permitir uma
nova conta de teste, sem reconstruir o schema.

O script valida o nome e a referência do projeto antes de consultar o escopo. Sem
`--apply`, é somente leitura. Com `--apply`, exige confirmação digitada e grava
um backup local antes de qualquer exclusão.

```bash
supabase/operations/reset-prototype-data.sh \
  --project-name VPN_RP \
  --project-ref <project-ref>

supabase/operations/reset-prototype-data.sh \
  --project-name VPN_RP \
  --project-ref <project-ref> \
  --apply
```

O script precisa de Supabase CLI autenticado, `jq`, Python 3 e `sha256sum`. O
backup fica em `$XDG_STATE_HOME/vpn-backups` ou em
`~/.local/state/vpn-backups`, com permissões restritas. Inclui dumps de schema e
dados de `auth`, `storage`, `public` e `private`, além dos arquivos binários dos
buckets. Os segredos do Vault não são exportados. Os checksums ficam em
`SHA256SUMS`; o backup não é enviado ao Git.

## Escopo

O reset revoga as conexões Twitch pelo fluxo operacional do Sentry, remove as
inscrições EventSub remotas, apaga arquivos dos buckets sem apagar os buckets e
exclui as contas Auth. A exclusão das contas remove em cascade canais, clips,
consentimentos, credenciais, vínculos e papéis. O script também remove posts,
temporadas, valores, convites, mensagens EventSub sem chave estrangeira para uma
conta, todos os itens de `market_items` e todas as linhas de `city_config`.
Convites são excluídos antes das contas porque sua restrição exige manter
`accepted_by` e `accepted_at` juntos.

Depois da limpeza, o catálogo recebe novamente os oito itens padrão de
[`supabase/seed.sql`](../../supabase/seed.sql). Itens personalizados são
removidos. `city_config` fica vazia; as cidades precisam ser configuradas de novo
pela redação. Se quiser liberar o acesso editorial à nova conta, siga o guia
opcional de [acesso à redação](editorial-access.md); isso não faz parte do reset.
Schema, migrations, buckets e segredos do Vault são preservados.
Os quatro crons VPN são pausados durante o procedimento e voltam ao estado ativo
que tinham no início, inclusive quando uma etapa falha.

Se a revogação Twitch ou a cópia falhar, o script para antes de excluir dados e
reativa os crons. A limpeza do Storage usa uma API remota e não pode ser parte da
mesma transação Postgres: se ela falhar parcialmente, alguns arquivos podem já
ter sido removidos enquanto os registros do banco permanecem. O script informa
o caminho do backup/logs; preserve-o. Se a aplicação do seed falhar depois da
limpeza, os dados continuam removidos e o backup permite recuperar o estado
anterior. Uma conexão que ficou `revocation_pending` pode ser processada
novamente pelo mesmo comando.

O reset direto de uma instância com vários usuários não faz parte deste
procedimento. Revogar ou excluir contas fora deste escopo precisa seguir o fluxo
de exclusão e retenção da [fundação](../architecture/foundation.md).
