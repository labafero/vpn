# PRD 03 — Controle de cenas

## Visão geral

Permitir que o operador consulte as cenas do OBS e altere a cena atualmente em programa diretamente pela página de transmissão.

## Objetivo

Oferecer uma mesa de corte básica para colocar no ar as superfícies já existentes no projeto, como Jornal, Monitoramento, Sem Sinal e Stand-by.

## Escopo

- Carregar a coleção e a lista de cenas do OBS conectado.
- Identificar e destacar a cena atualmente em programa.
- Trocar a cena em programa.
- Atualizar a interface quando a mudança ocorrer no próprio OBS ou em outro cliente.
- Permitir mapear cenas do OBS para papéis semânticos do VPN.
- Persistir o mapeamento por estação, sem persistir a senha do OBS.

## Requisitos funcionais

1. A lista deve refletir a ordem informada pelo OBS.
2. Trocas devem apresentar estado pendente até a confirmação do OBS.
3. Falhas não podem deixar a interface indicando uma cena que não entrou no ar.
4. Mudanças externas devem aparecer no painel por eventos, sem polling contínuo.
5. Mapeamentos inválidos devem ser sinalizados quando uma cena for removida ou renomeada.
6. Ações destrutivas ou de alto impacto devem evitar duplo clique acidental.

## Modelo de configuração

Cada estação poderá associar papéis como `jornal`, `monitoramento`, `sem_sinal`, `standby` e `sinal_remoto` aos nomes reais das cenas no OBS. Assim, as macros futuras não dependerão de nomes rígidos.

## Critérios de aceite

- Todas as cenas da coleção ativa são listadas.
- A cena em programa é marcada corretamente.
- Uma troca solicitada no painel é confirmada pelo evento correspondente do OBS.
- Uma troca feita no OBS atualiza o painel.
- A aplicação lida com cena inexistente, coleção trocada e OBS desconectado.
- Não há troca otimista permanente quando o OBS rejeita a solicitação.

## Dependências e riscos

- Depende dos PRDs 01 e 02.
- Nomes de cenas não são identificadores permanentes; o mapeamento deve ser revalidado após alterações na coleção.

