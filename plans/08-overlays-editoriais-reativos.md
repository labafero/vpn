# PRD 08 — Overlays editoriais reativos

## Visão geral

Fazer com que alterações em matérias, título, cidade, personagem e valores apareçam nos Browser Sources sem recarregamento manual.

## Objetivo

Conectar o fluxo editorial ao que está no ar, permitindo selecionar uma matéria ativa e atualizar os elementos gráficos em tempo real.

## Escopo

- Definir uma matéria ativa por transmissão.
- Adicionar a ação `Colocar no ar` na redação.
- Publicar alterações relevantes via Supabase Realtime.
- Fazer `useOverlayState` assinar e aplicar alterações de configuração.
- Atualizar destaques e ticker quando posts mudarem.
- Reagir a mudanças de cidade e recarregar configurações dependentes.
- Disponibilizar comandos de exibir e ocultar GC através do OBS.
- Definir estados vazios e fallback quando uma matéria for removida.

## Modelo de dados

O estado de transmissão deve identificar, no mínimo, usuário, estação, cidade, matéria ativa, versão/revisão e data da alteração. A persistência deve respeitar RLS e separar conteúdo editorial público de comandos operacionais privados.

## Requisitos funcionais

1. O overlay deve carregar um snapshot inicial e depois assinar mudanças.
2. Eventos duplicados ou fora de ordem não podem restaurar dados antigos.
3. Trocar a cidade deve atualizar marca, personagem, posts e valores relacionados.
4. Excluir ou despublicar a matéria ativa deve acionar fallback seguro.
5. O painel deve indicar quando o overlay confirmou a nova revisão.
6. Assinaturas e canais devem ser removidos ao desmontar o overlay.

## Critérios de aceite

- Alterar título ou matéria ativa atualiza o overlay sem refresh manual.
- Posts novos ou atualizados aparecem no ticker e nos destaques.
- Mudar a cidade atualiza toda a identidade visual coerentemente.
- Reconexão ao Supabase recupera o snapshot mais recente.
- Uma mensagem antiga não sobrescreve uma revisão mais nova.
- Políticas RLS impedem que um usuário altere a transmissão de outro.

## Dependências e riscos

- Depende dos controles de fontes do PRD 04 e do modelo de estado operacional introduzido no PRD 05.
- Exige migrations para tabelas/publicações Realtime; `database.types.ts` deve ser regenerado, nunca editado manualmente.
- Atualizações visuais precisam evitar mudanças abruptas no meio de uma transição do OBS.

