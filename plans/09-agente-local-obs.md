# PRD 09 — Agente local para operação remota

## Visão geral

Criar um pequeno agente executado no computador da transmissão para intermediar a comunicação entre o painel VPN e o OBS. A porta e a senha do obs-websocket permanecem locais, enquanto comandos e eventos atravessam um canal autenticado da aplicação.

## Objetivo

Permitir controle seguro do OBS fora da rede local, suportar múltiplas estações e eliminar a dependência de uma conexão WebSocket direta do navegador para `ws://127.0.0.1:4455`.

## Arquitetura proposta

```text
Painel VPN
    ↕ canal autenticado
Supabase / serviço de sinalização
    ↕ canal autenticado
Agente VPN local
    ↕ ws://127.0.0.1:4455
OBS Studio
```

## Escopo

- Processo local instalável e atualizável.
- Pareamento da estação com uma conta autorizada.
- Armazenamento local protegido da senha do OBS.
- Conexão e reconexão com o OBS.
- Recepção de comandos com identificador único, validade e autorização.
- Envio de resultados, eventos e heartbeat.
- Fila limitada, idempotência e descarte de comandos expirados.
- Identificação e seleção de múltiplas estações no painel.
- Logs locais sanitizados e trilha de auditoria no backend.

## Requisitos de segurança

1. A porta do OBS não deve ser exposta à internet.
2. A senha do OBS não deve sair do dispositivo.
3. O pareamento deve ser revogável.
4. Cada comando deve possuir autor, estação, escopo, validade e identificador.
5. O agente deve rejeitar replays, comandos expirados e comandos sem permissão.
6. Atualizações do agente devem ser verificáveis e não podem executar payload arbitrário vindo do painel.

## Requisitos operacionais

- O painel deve mostrar online, offline, OBS desconectado e versão incompatível.
- O agente deve iniciar automaticamente, se autorizado pelo operador.
- Uma queda de internet não pode reproduzir comandos antigos ao retornar.
- Ações locais no OBS continuam sendo refletidas no painel após a reconexão.
- Deve existir uma forma clara de remover a estação e apagar suas credenciais locais.

## Critérios de aceite

- Um usuário autorizado controla um OBS em outra rede sem abrir a porta `4455`.
- A senha do OBS não aparece no backend, tráfego de comandos ou logs remotos.
- Comandos duplicados são executados no máximo uma vez quando aplicável.
- Comandos expirados durante uma desconexão não são executados ao reconectar.
- Revogar uma estação interrompe novos comandos imediatamente.
- O estado mostrado no painel distingue conexão com o agente de conexão do agente com o OBS.
- Os recursos construídos nos PRDs anteriores funcionam através do novo transporte sem reescrever suas interfaces de domínio.

## Dependências e riscos

- Depende das interfaces e recursos estabelecidos nos PRDs 01 a 08.
- Requer decisão posterior sobre empacotamento e sistemas operacionais suportados.
- Distribuição, atualização e armazenamento seguro de credenciais elevam significativamente o custo operacional.
