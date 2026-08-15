# PRD 05 — Estado real de transmissão e gravação

## Visão geral

Substituir indicadores simulados por informações reais do OBS e disponibilizar controles básicos de transmissão e gravação.

## Objetivo

Dar ao operador uma visão confiável da saúde da produção e reduzir o risco de acreditar que a transmissão ou gravação está ativa quando não está.

## Escopo

- Consultar e observar o estado da transmissão.
- Consultar e observar o estado da gravação.
- Exibir duração, reconexão, bytes enviados e demais métricas disponíveis.
- Exibir estatísticas globais relevantes: FPS, frames perdidos, CPU e tempo de renderização.
- Iniciar e parar transmissão e gravação com confirmação adequada.
- Disponibilizar o estado real para componentes de overlay que exibem `REC` ou conectividade.

## Requisitos funcionais

1. Eventos do OBS devem ser a fonte primária após a carga inicial.
2. Parar transmissão ou gravação deve exigir confirmação explícita.
3. O painel deve diferenciar `inativo`, `iniciando`, `ativo`, `reconectando`, `parando` e `erro`.
4. Métricas devem informar horário da última atualização.
5. Estado desconhecido após perda de conexão não deve continuar aparecendo como ativo.
6. Os overlays não devem receber credenciais do OBS.

## Integração com overlays

O navegador do painel observa o OBS e publica apenas um estado operacional sanitizado no canal de dados da aplicação. Browser Sources consomem esse estado pelo Supabase Realtime; eles não se conectam diretamente ao servidor WebSocket do OBS.

## Critérios de aceite

- Estado e duração de transmissão e gravação correspondem ao OBS.
- Reconexões do output são visíveis.
- O indicador `REC` só aparece quando a gravação está efetivamente ativa.
- Queda da conexão marca os dados como indisponíveis ou desatualizados.
- Ações críticas possuem confirmação e feedback de sucesso ou falha.
- Atualizações frequentes não degradam os overlays nem sobrecarregam o Supabase.

## Dependências e riscos

- Depende dos PRDs 01 e 02; a publicação em overlays depende do modelo Realtime definido nesta etapa.
- Telemetria de alta frequência deve ser agregada ou limitada antes de ser enviada ao backend.

