# Fase 1 — monitoramento privado

## Contexto e objetivo

A Fase 0 estabeleceu autenticação VPN, vínculo OAuth com Twitch, consentimento para preparar a integração e a fronteira entre `vpn-monitor`, `vpn-sentry` e Supabase. O monitoramento ainda está desabilitado por constraint. Esta fase transforma a autorização explícita do dono em sessões privadas consultáveis e compartilháveis com escopo limitado.

O resultado é uma central privada em `vpn-monitor` que mostra canais autorizados e sessões Twitch online e anteriores. O Sentry recebe os eventos da Twitch, mantém sessões idempotentes e oferece contratos privados para a central e para convidados autorizados.

## Decisões de produto

- O monitoramento continua desabilitado por padrão. O dono deve ativá-lo em uma ação separada e explícita, após aceitar uma nova versão de consentimento (`monitoring-v2`). O consentimento da Fase 0 não autoriza coleta de sessões.
- A Fase 1 coleta metadados de canal e sessões (identificador Twitch da transmissão, início, fim e estado). Não captura, armazena, retransmite nem reproduz áudio ou vídeo.
- O painel apresenta estado online/offline, identidade e metadados básicos do canal, sessões anteriores e controles do dono. Um player Twitch pode ser avaliado em outra fase, com análise própria de privacidade, incorporação e consentimento.
- O dono pode desligar o monitoramento ou desconectar Twitch. Isso impede novas sessões e invalida imediatamente os convites associados. Uma sessão aberta é encerrada localmente com causa registrada.
- O acesso de administrador VPN continua limitado aos metadados autorizados descritos na fundação; não permite ativar o monitoramento nem emitir convites em nome do dono.

## Detecção de sessões

O `vpn-sentry` usa Twitch EventSub por webhook para `stream.online` e `stream.offline`. O endpoint HTTPS público fica no Sentry sob o domínio personalizado de produção já escolhido. A inscrição é criada com App Access Token. O callback responde ao desafio inicial da Twitch, valida assinatura HMAC e timestamp antes de processar notificações, rejeita mensagens inválidas ou antigas e deduplica pelo identificador da mensagem EventSub. Segredos e payloads sensíveis não entram em logs.

`stream.online` abre uma sessão usando o ID de transmissão da Twitch como chave idempotente e o `started_at` fornecido. `stream.offline` fecha essa sessão. Eventos duplicados não criam nem encerram sessões diferentes. A ordem de chegada não pode reabrir uma sessão já encerrada.

Uma reconciliação periódica via Cron Supabase consulta o estado atual da Twitch para canais ativos e corrige sessões que ficaram inconsistentes por indisponibilidade ou perda de webhook. Ela não substitui EventSub como caminho normal. A implementação deve reutilizar a execução agendada e os limites operacionais existentes; a frequência final deve evitar concorrência com validação OAuth e respeitar quotas da Twitch/Supabase. Canais sem autorização Twitch válida passam a `unavailable`/`authorization_expired`, não são consultados e não abrem sessões.

A inscrição EventSub é criada após ativação válida e removida quando o dono desativa o monitoramento ou desconecta. Falhas de criação/remoção ficam visíveis como estado operacional recuperável; a UI não declara monitoramento ativo enquanto a inscrição não estiver habilitada e a reconciliação inicial não tiver sido concluída.

## Convites temporários e autorização

- Um dono pode criar convite de uso único, vinculado a uma sessão ativa específica, com validade de 24 horas e revogação manual antes do aceite.
- O convite é um bearer secret gerado aleatoriamente; somente seu hash é persistido. A aceitação exige uma sessão VPN autenticada e vincula o convite atomicamente ao primeiro usuário elegível. Um convite expirado, revogado ou já resgatado não concede acesso.
- Um convite concede leitura dos metadados daquela sessão; não concede acesso a outras sessões, a tokens Twitch, ao controle do canal ou ao banco diretamente. O acesso termina ao fim da sessão ou com revogação/desativação da autorização do dono.
- Dono lê e gerencia seus canais, sessões e convites. Convidado autenticado lê apenas a sessão concedida. `vpn_admin` lê metadados privados conforme o modelo da Fase 0. Demais membros não veem esses dados.
- O status e o escopo são verificados no Sentry em cada operação. RLS protege tabelas expostas; tabelas privadas permanecem fora da Data API. Nenhum dado da Fase 1 é exposto por `vpn-news`.

## Dados e contratos

Adicionar migração versionada para sessões, convites, deduplicação/estado de EventSub e eventual cursor de reconciliação, com chaves estrangeiras, constraints e índices para proprietário, canal, sessão ativa e validade. Preservar unicidade de uma sessão por ID de transmissão Twitch e exigir consentimento `monitoring-v2` vigente para novas coletas. Alterar a constraint da Fase 0 que fixa `channels.monitoring_enabled=false`, mantendo o default `false`.

Novos formatos e erros públicos da API privada são descritos em OpenAPI e tipos compartilhados de `packages/contracts`. `packages/database/src/database.types.ts` é regenerado pela ferramenta do projeto; nunca editado manualmente. O browser chama endpoints de mesma origem no Monitor, e o Sentry autentica a identidade VPN e autoriza o proprietário/convidado/admin antes de consultar dados privados.

## Experiência da central

`vpn-monitor` terá uma rota protegida de central com filtros simples por estado, uma página/detalhe de canal com estado e ações do dono, histórico paginado de sessões e ações para criar/copiar, listar e revogar convites. O fluxo de ativação mostra o texto `monitoring-v2`, começa sem consentimento marcado e distingue conectado de monitoramento ativo. Estados de carregamento, Twitch indisponível, autorização expirada, monitoramento desativado e falha de EventSub/reconciliação têm mensagens em português.

## Fora de escopo

- Player incorporado ou SDK de reprodução Twitch, captura ou análise de áudio/vídeo.
- Detecção de risco, clips, evidências, notificações, Discord, lista de destinatários permanente e integração com redação.
- Novos serviços, ambientes ou domínios. A fase utiliza os projetos de produção existentes em Vercel/Supabase e o domínio personalizado `vpn-sentry.labafero.com`.
- Reautorização Twitch para habilitar escopos adicionais: as inscrições de status não devem ampliar os escopos OAuth do usuário sem um novo requisito e consentimento.

## Critérios de aceite

1. Uma conexão Twitch válida, sozinha, não abre sessão; somente ativação com consentimento `monitoring-v2` e inscrição EventSub habilitada inicia monitoramento.
2. Eventos online/offline legítimos criam e encerram a sessão correta; assinatura inválida, replay, duplicação e entrega fora de ordem não concedem acesso nem corrompem o histórico.
3. A reconciliação corrige uma sessão deliberadamente deixada obsoleta e não consulta conexão desativada ou expirada.
4. Dono, convidado, admin e membro sem concessão observam exatamente os limites de acesso acima, inclusive sob chamadas concorrentes de resgate de convite.
5. Convites são de uso único, limitados à sessão, expiram em 24 horas, podem ser revogados e ficam inválidos ao revogar o consentimento.
6. Segredos OAuth, segredo EventSub, tokens, códigos de convite e payloads sensíveis não aparecem em resposta pública, logs ou portal público.
7. O painel não carrega player, áudio ou vídeo Twitch; o histórico contém somente metadados de sessão.
8. Migrações locais, políticas, contratos, tipos gerados, lint, typecheck e build passam no pipeline estabelecido pelo repositório antes da entrega.

## Referências técnicas

- [Twitch EventSub — gerenciar inscrições](https://dev.twitch.tv/docs/eventsub/manage-subscriptions/): transporte webhook, App Access Token, verificação do callback e estados da inscrição.
- [Twitch EventSub — referência](https://dev.twitch.tv/docs/eventsub/eventsub-reference/): condições e payloads `stream.online`/`stream.offline`.
- [Supabase Database — segurança e RLS](https://supabase.com/docs/guides/database/postgres/row-level-security): políticas de acesso a tabelas.
- `PRD.md` — privacidade, entidades e fases do produto.
- `docs/architecture/foundation.md` — autenticação, papéis, consentimento e limites entre projetos.
