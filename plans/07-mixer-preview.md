# PRD 07 — Mixer de áudio e preview

## Visão geral

Adicionar um mixer simplificado e miniaturas de programa, preview e fontes para operação remota assistida.

## Objetivo

Permitir diagnóstico visual e controle essencial de áudio sem tentar reproduzir toda a interface nativa do OBS.

## Escopo

- Listar inputs de áudio relevantes.
- Controlar mute e volume.
- Mostrar medidores de nível com frequência limitada.
- Exibir estado de monitoramento quando suportado.
- Capturar miniaturas da cena em programa, preview e fontes selecionadas.
- Atualizar miniaturas sob demanda e em intervalo configurável moderado.
- Acionar transição do preview para programa no modo estúdio.

## Fora do escopo

- Streaming de vídeo em tempo real através de screenshots.
- Mixer avançado com filtros, roteamento multicanal ou edição de propriedades internas.
- Substituir o multiview nativo do OBS.

## Requisitos funcionais

1. Valores de volume devem usar a mesma escala de forma consistente.
2. Mute e volume devem reagir a alterações feitas no OBS.
3. Eventos de volume de alta frequência devem ser assinados apenas enquanto o mixer estiver visível.
4. Screenshots devem ter resolução e qualidade limitadas.
5. Imagens devem permanecer apenas durante o tempo necessário para visualização.
6. A transição do modo estúdio deve indicar claramente preview e programa.

## Critérios de aceite

- O operador consegue mutar e ajustar inputs selecionados.
- Medidores são responsivos sem prejudicar a página.
- Programa e preview possuem identificação inequívoca.
- Miniaturas podem ser atualizadas individualmente.
- Falha na geração de uma screenshot não bloqueia os controles de áudio.
- Nenhuma captura é persistida no Supabase sem uma funcionalidade futura que autorize isso explicitamente.

## Dependências e riscos

- Depende dos PRDs 01 a 05.
- Screenshots são operações relativamente pesadas; polling agressivo deve ser evitado.
- Eventos de volume podem gerar tráfego elevado e precisam de assinatura e descarte cuidadosos.

