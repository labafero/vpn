# Fundação da VPN

Referência técnica corrente para identidade, acesso, consentimento e retenção. Decisões transversais: [ADR-0001](../adr/0001-product-surfaces.md), [ADR-0002](../adr/0002-identidade-consentimento-e-dados-privados.md) e [ADR-0003](../adr/0003-deteccao-de-clips.md). VPN identifica a rede privada de monitoramento de roleplay; não um túnel de rede.

## Fronteiras

| Superfície         | Responsabilidade                                                                               | Limite                                                     |
| ------------------ | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| vpn-news           | Matérias, redação, cidades e overlays                                                          | Não publica transmissões ou credenciais privadas           |
| vpn-monitor        | Experiência autenticada para consentimento, conexão Twitch, sessões, clips e revisão de sinais | Browser consome proxy de mesma origem, nunca banco privado |
| vpn-sentry         | Autorização, OAuth, persistência privada e workers                                             | Confere identidade e dono em cada operação                 |
| vpn-site           | Site institucional existente                                                                   | Sem mudança nesta fase                                     |
| packages/contracts | OpenAPI e tipos gerados de API                                                                 | Fonte de formatos compartilhados                           |
| packages/database  | Tipos Supabase gerados                                                                         | Não editar manualmente                                     |

Twitch é uma vinculação a uma conta VPN autenticada por Supabase, não um método alternativo de login. Conectar não habilita coleta. Na Fase 0 `monitoring_enabled` permanece falso por constraint.

## Acesso

| Ação                           | Público/convidado | Membro             | Dono               | vpn_admin                                     |
| ------------------------------ | ----------------- | ------------------ | ------------------ | --------------------------------------------- |
| Ler notícias públicas          | Sim               | Sim                | Sim                | Sim                                           |
| Ler conexão/canal privado      | Não               | Não                | Próprios           | Todos os metadados                            |
| Conectar/desconectar Twitch    | Não               | Própria vinculação | Própria vinculação | Somente a própria                             |
| Conceder/retirar consentimento | Não               | Próprio            | Próprio            | Somente o próprio                             |
| Ler tokens                     | Não               | Não                | Não                | Não                                           |
| Alterar papel global           | Não               | Não                | Não                | Operação administrativa confiável fora da API |

`auth.users` é a identidade canônica. `public.user_roles` guarda somente `member` ou `vpn_admin`; ausência de registro significa `member`. Dono e convidado são relações, não papéis globais. Papéis de redação não concedem acesso administrativo VPN. A autorização consulta a atribuição atual; `user_metadata` e claims desatualizadas não decidem privilégios.

## Modelo físico inicial

- `public.provider_connections`: um vínculo por usuário e identidade Twitch única; consentimento, identidade do canal e estados `connected`, `expired`, `revocation_pending`, `revoked`.
- `public.channels`: um canal por conexão, dono consistente com ela, monitoramento desabilitado.
- `private.provider_credentials`: tokens cifrados AES-256-GCM, IV/tag, versão da chave, validade, última validação e prazo de revogação. Schema fora da Data API.
- `private.oauth_transactions`: hashes de state/nonce, dono, consentimento, validade de dez minutos e consumo atômico.
- `private.clip_processing_consents`: consentimento `clip-processing-v1`, separado do vínculo Twitch e do monitoramento ao vivo, com modos manual/agendado e horário de revogação.
- `private.clip_submissions`: URL canônica, ID e metadados permitidos da Twitch, canal dono, modo de captura, estado, tentativas e lease do worker; somente `vpn_sentry` lê ou escreve. Não armazena áudio, vídeo ou transcrição integral.
- `private.clip_detections`: frase/versionamento, origem e timestamps mínimos por submissão; somente `vpn_sentry` lê ou escreve.
- `private.user_provider_credentials`: chave OpenAI cifrada por usuário, usada se a chave central do Sentry não estiver configurada; somente `vpn_sentry` lê ou escreve.

RLS protege todas as tabelas públicas. Clientes autenticados podem somente ler os próprios metadados ou os permitidos ao administrador. Escritas acontecem no Sentry com papel Postgres restrito; não usar chave administrativa nas APIs públicas. Índices acompanham chaves estrangeiras e buscas do worker.

## Evolução conceitual

| Entidade futura               | Relações e responsabilidade                                                             | Fase |
| ----------------------------- | --------------------------------------------------------------------------------------- | ---- |
| `private.monitoring_sessions` | Canal, dono, início/fim e consentimento que permitiu coleta; leitura apenas pelo Sentry | 1    |
| `private.access_invites`      | Hash do convite de uso único, sessão/canal, emissor, expiração e revogação              | 1    |
| notification_recipients       | Dono, destinatário VPN/Discord e autorização                                            | 2/4  |
| monitoring_events             | Sessão, origem, versão de regra, confiança e estado de possível risco                   | 2    |
| evidence                      | Evento/sessão, referência temporal, mídia privada e expiração                           | 2    |
| notification_deliveries       | Evento, destinatário, canal, tentativa e resultado                                      | 2    |
| editorial_items               | Evento/evidência e matéria existente; publicação exige revisão                          | 4    |

Essas entidades não recebem tabelas ou endpoints nesta fase. Convites vencidos/revogados não concederão acesso; escopos não poderão ampliar autorização do emissor. Nenhum dado de monitoramento chega ao portal por associação implícita.

## Consentimento e OAuth

Versão `monitoring-v1`: o dono aceita vincular sua identidade Twitch para preparar monitoramento privado autorizado. O texto explica que esta fase não coleta áudio/vídeo, que o administrador VPN acessa metadados e que desconectar retira a autorização local. Checkbox começa desmarcado. Registrar versão e horário somente ao concluir conexão válida.

Authorization Code com escopos vazios, state aleatório de 32 bytes e nonce independente. Proxy Monitor grava cookie HttpOnly, SameSite=Lax, Secure em produção; callback passa pelo proxy com sessão VPN validada. Rejeitar ausência/expiração/reuso de state, nonce incompatível ou identidade VPN diferente. Redirect final fixo em `/conexao`; nunca aceitar destino enviado pelo cliente.

Tokens são trocados, validados e cifrados somente no Sentry. Worker valida no início e em intervalos de até uma hora; refresh serializado por conexão. Chave de cifra de 32 bytes em configuração privada, diferente de credenciais Supabase. Logs e erros não guardam tokens, códigos OAuth, URLs de callback com query nem respostas brutas Twitch.

Desconexão bloqueia uso local imediatamente. Sucesso de revogação remove credenciais; indisponibilidade gera `revocation_pending`, retentativas limitadas a 24 horas e registro operacional sanitizado. Ao terminar o prazo, apagar credenciais, registrar falha remota e orientar o dono a remover a integração no painel Twitch. Não declarar revogação remota confirmada nesse caso.

Após o prazo de revogação, `canReconnect=true` permite nova autorização com consentimento explícito. O estado anterior permanece pendente até que um novo vínculo seja concluído; o registro de falha remota é preservado. Uma autorização expirada mantém os tokens cifrados apenas para desconexão/revogação explícita; nunca para monitoramento. Isso permite ao dono desconectar e reconectar sem um bloqueio permanente.

## Retenção e exclusão

### Clips e processamento

Consentimento de clip não decorre de `monitoring-v1` ou `monitoring-v2`. O streamer autoriza separadamente o envio manual e/ou a captura agendada. Cada submissão aponta para `public.channels`; o Sentry deriva o dono por essa relação, sem confiar em um `owner_id` recebido do cliente. A chave `(channel_id, twitch_clip_id)` impede duplicatas. A ordem de fonte e os limites do piloto estão no ADR-0003.

Uma referência entra na fila durável e é transcrita pela OpenAI com a chave central do Sentry; se ela não estiver configurada, usa a chave pessoal do dono. Sem ambas, fica em `needs_openai_key` até haver uma chave. A fila é limitada a três pendências por canal e cinco globalmente; um clip é processado por vez, com até três tentativas. Não guardar MP4, áudio, transcrição ou URL temporária da Twitch. Detecções mantêm somente frase, origem e timestamps. Estados terminais mantêm metadados mínimos por 90 dias depois de `finished_at`; a rotina `private.purge_expired_clip_submissions` remove submissões vencidas em cascade. Agendamento da limpeza e do worker requer ativação operacional separada.

### Monitoramento privado da Fase 1

O vínculo OAuth usa `monitoring-v1` e não ativa coleta. O dono precisa aceitar `monitoring-v2` separadamente. Enquanto a conexão estiver válida e o consentimento vigente, Sentry processa somente os eventos Twitch `stream.online` e `stream.offline`; guarda ID, título, categoria e horários. Não há player, áudio ou vídeo. A UI declara monitoramento ativo apenas quando as duas inscrições EventSub estão habilitadas e a primeira reconciliação terminou.

Sessões, hashes de convites de uso único, subscriptions e IDs deduplicados ficam em `private`, fora da Data API; somente o papel `vpn_sentry` tem acesso ao banco. Sentry autoriza dono, administrador ou convidado autenticado por sessão, revalidando concessão e sessão ativa a cada leitura. Desativar ou perder a conexão encerra sessões e revoga convites em transação; limpeza de subscriptions remotas é retentada pelo Cron.

| Categoria                          | Prazo                                                                  | Executor                    |
| ---------------------------------- | ---------------------------------------------------------------------- | --------------------------- |
| Transação OAuth                    | Até 24 horas após expiração                                            | Worker Sentry               |
| Credenciais válidas                | Enquanto conexão autorizada                                            | Sentry                      |
| Credencial de revogação pendente   | Até 24 horas após retirada                                             | Worker Sentry               |
| Consentimento e metadados          | Enquanto conta existir; no máximo 30 dias após solicitação de exclusão | Operação de exclusão Sentry |
| Mídia/transcrição de processamento | Temporária durante o job; não persistir por padrão                     | Worker Sentry               |
| Resultados mínimos de clip         | Conforme estado; terminais por 90 dias após `finished_at`              | Sentry e rotina de retenção |
| Eventos de monitoramento futuro    | Definir na decisão do fluxo de eventos antes de persistir              | A definir                   |

Na Fase 0, exclusão da conta é uma operação administrativa: primeiro retirar autorização e tentar revogar todas as conexões, aguardar resolução/prazo, depois excluir a conta Supabase. Exclusão direta em `auth.users` faz cascade e remove credenciais locais, mas não revoga Twitch; esse caminho não atende o procedimento. Os 30 dias são teto, não obrigação de reter: cascade imediato após revogação é permitido. Publicação editorial não prolonga automaticamente retenção de evidências.

## Critérios de passagem

Produto/dados e fronteiras documentados; contratos validados e tipos gerados sem divergência; testes de acesso/RLS aprovados; OAuth real conectado e revogado com evidência sanitizada; portal, redação e overlays preservados. Sem credenciais/ambiente para provar integração, registrar o critério como pendente, sem declarar a fase concluída.
