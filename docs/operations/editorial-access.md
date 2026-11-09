# Conceder acesso à redação

O cadastro de um membro da redação é opcional e independente do reset dos dados
do protótipo. São duas etapas: criar a identidade no Supabase Auth e associar o
UUID dessa identidade a `public.editorial_members`. A associação libera as
rotas e operações editoriais protegidas pelas políticas do banco.

## 1. Convidar a pessoa pelo Supabase

No Dashboard do projeto Supabase:

1. Abra **Authentication → Users**.
2. Selecione **Add user → Send invitation**.
3. Informe o email e envie o convite.
4. Após a pessoa aceitar o convite, localize o usuário na lista e copie o valor
   **UID**.

O link enviado permite confirmar o email e concluir a configuração da conta,
incluindo a senha. O convite pode ser enviado pelo Dashboard ou pela Auth Admin
API em um ambiente confiável; a chave secreta do projeto nunca deve ser usada
no navegador.

O SMTP padrão do Supabase pode enviar emails somente para endereços que fazem
parte da equipe da organização e tem limite de envio. Se o destinatário não
receber o convite, confira a configuração de SMTP do projeto.

## 2. Conceder a autorização editorial

Use o SQL Editor do Dashboard ou, com o projeto correto já vinculado, o comando
`supabase db query --linked`. Substitua o UUID de exemplo pelo **UID** copiado
na etapa anterior:

```sql
INSERT INTO public.editorial_members (user_id)
VALUES ('00000000-0000-0000-0000-000000000000')
ON CONFLICT (user_id) DO NOTHING;
```

O vínculo é aplicado à identidade existente e pode ser removido a qualquer
momento:

```sql
DELETE FROM public.editorial_members
WHERE user_id = '00000000-0000-0000-0000-000000000000';
```

Confirme o vínculo no SQL Editor:

```sql
SELECT user_id, created_at
FROM public.editorial_members
WHERE user_id = '00000000-0000-0000-0000-000000000000';
```

Com a instância correta vinculada, a inserção também pode ser executada pela
CLI:

```bash
supabase db query --linked "INSERT INTO public.editorial_members (user_id) VALUES ('00000000-0000-0000-0000-000000000000') ON CONFLICT (user_id) DO NOTHING;"
```

Para consultar ou alterar `editorial_members`, use uma sessão administrativa
confiável como o SQL Editor ou a Supabase CLI autenticada. A tabela não concede
permissão de escrita ao usuário pelo cliente.

## 3. Verificar o acesso

Depois que a pessoa aceitar o convite, peça que entre no VPN e acesse `/redacao`.
O acesso deve abrir sem o aviso “Acesso restrito à equipe autorizada da
redação”. Se o aviso continuar, confirme que o UUID pertence ao usuário que
entrou e que a linha correspondente existe em `public.editorial_members`.

Este vínculo concede somente acesso editorial. Ele não cria nem altera uma
linha em `public.user_roles` e não concede o papel global `vpn_admin`.

Referências oficiais: [convidar usuários pelo Supabase Auth](https://supabase.com/docs/guides/auth/users) e [configurar o SMTP do Supabase Auth](https://supabase.com/docs/guides/auth/auth-smtp).
