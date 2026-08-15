# PRD 02 — Diagnóstico da conexão OBS

## Visão geral

Adicionar à página `/redacao/transmissao` uma área de configuração e diagnóstico da integração com o OBS. O operador deve saber se a aplicação está conectada, qual instância está sendo controlada e como corrigir os problemas mais comuns.

## Objetivo

Transformar o estado técnico fornecido por `useObsConnection` em uma experiência operacional clara, sem exigir leitura de logs ou conhecimento do protocolo WebSocket.

## Escopo

- Formulário de endereço, porta e senha.
- Ações de conectar, testar novamente e desconectar.
- Indicador visual do estado atual.
- Exibição das versões do OBS Studio, obs-websocket e RPC negociado.
- Diagnóstico de autenticação inválida, conexão recusada, timeout, protocolo incompatível e conexão insegura bloqueada.
- Registro local das últimas transições de estado, sem dados sensíveis.

## Requisitos funcionais

1. A seção deve permanecer separada da configuração editorial de título e cidade.
2. Enquanto conecta, os campos e ações conflitantes devem ficar bloqueados.
3. Ao conectar, o sistema deve consultar informações básicas da instância.
4. O painel deve indicar quando os comandos operacionais estão indisponíveis.
5. A interface e as mensagens devem estar em pt-BR.

## Experiência esperada

- Verde: conectado e pronto.
- Amarelo: conectando ou reconectando.
- Vermelho: erro que exige ação.
- Neutro: desconectado por escolha do operador.

As mensagens devem orientar ações concretas, como conferir se o servidor WebSocket está habilitado em `Ferramentas → Configurações do servidor WebSocket` no OBS.

## Critérios de aceite

- O operador identifica o estado da integração sem abrir ferramentas de desenvolvedor.
- A interface diferencia senha incorreta de servidor indisponível.
- Após conexão, as versões da instância são exibidas.
- Desconectar remove imediatamente a disponibilidade dos controles dependentes.
- Nenhuma mensagem ou histórico revela a senha.
- A área funciona corretamente em telas desktop e notebook.

## Dependências e riscos

- Depende do PRD 01.
- Mensagens de erro variam entre navegador e sistema operacional; devem ser normalizadas pela aplicação.

