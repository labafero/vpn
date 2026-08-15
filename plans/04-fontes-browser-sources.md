# PRD 04 — Fontes e Browser Sources

## Visão geral

Adicionar controle da visibilidade de fontes e atualização dos Browser Sources usados pelos overlays VPN.

## Objetivo

Permitir que o operador mostre ou oculte elementos gráficos e recarregue overlays travados sem acessar manualmente cada cena no OBS.

## Escopo

- Listar os itens da cena selecionada e da cena em programa.
- Mostrar estado visível, oculto, bloqueado e agrupado.
- Habilitar ou desabilitar itens de cena.
- Identificar fontes do tipo Browser Source.
- Atualizar o conteúdo de uma Browser Source.
- Abrir a URL configurada para inspeção, quando apropriado e sem expor segredos.
- Criar atalhos para fontes mapeadas: GC, ticker, identidade, destaques e sinal remoto.

## Requisitos funcionais

1. A visibilidade deve reagir a eventos do OBS.
2. Fontes aninhadas em grupos devem manter contexto suficiente para serem controladas corretamente.
3. A atualização de Browser Source deve preservar sua configuração.
4. O painel deve impedir comandos enquanto o item não estiver resolvido ou o OBS estiver desconectado.
5. Fontes com o mesmo nome em cenas distintas não podem ser confundidas.

## Critérios de aceite

- O operador vê e altera a visibilidade dos itens da cena.
- Mudanças feitas diretamente no OBS aparecem no painel.
- É possível recarregar cada overlay VPN individualmente.
- Grupos e itens duplicados são tratados pelo identificador da cena, não apenas pelo nome.
- Uma falha ao atualizar uma fonte não afeta as demais.
- O painel não altera dimensões, URL ou propriedades da fonte durante um simples refresh.

## Dependências e riscos

- Depende dos PRDs 01 a 03.
- A API diferencia input de item de cena; a implementação deve preservar essa distinção.
- Recarregar uma Browser Source pode reiniciar animações e estado local do overlay.

