# ADR-0002: Identidade central e dados privados

- **Estado:** Aceita
- **Data:** 2026-10-28
- **Referência técnica corrente:** [fundação](../architecture/foundation.md)

## Contexto

News, Monitor e Sentry precisam compartilhar identidade sem compartilhar
credenciais de provedores ou tornar o banco privado acessível ao navegador.
Vínculo Twitch, monitoramento de live e processamento de clips têm finalidades
e permissões diferentes.

## Decisão

- A autenticação VPN central fornece a sessão entre os apps; APIs privadas
  validam a sessão no servidor.
- Nunca usar `user_metadata` para promover ou autorizar usuários.
- Consentimentos são versionados e separados por finalidade. Revogação bloqueia
  imediatamente operações posteriores e cancela trabalho pendente aplicável.
- OAuth usa escopos mínimos por capacidade. Tokens são cifrados e usados somente
  no Sentry; segredos não chegam ao browser nem a contratos públicos.
- Dados de monitoramento, consentimentos, credenciais e filas ficam em schema
  privado. O papel `vpn_sentry` recebe somente as permissões necessárias; RLS,
  grants e validações de dono são testados em conjunto.
- Guardar somente metadados necessários ao produto. Mídia e transcrições completas
  são temporárias até existir uma decisão de retenção específica.

## Consequências

Mudanças de auth, consentimento, RLS, grants, schemas ou retenção devem atualizar
`docs/architecture/foundation.md` e este ADR quando alterarem a decisão. Detalhes
operacionais e SQL continuam na fundação, migrations e registros de validação.
