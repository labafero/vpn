# PRD 06 — Macros configuráveis

## Visão geral

Permitir que operadores executem sequências de ações do OBS e do VPN com um único comando, usando lotes ordenados e validação prévia.

## Objetivo

Padronizar operações repetitivas, diminuir erros durante transmissões e viabilizar fluxos como Entrar ao Vivo, Perda de Sinal e Encerrar Matéria.

## Escopo

- Modelo persistente de macro por usuário ou estação.
- Editor com ações inicialmente suportadas.
- Validação de cenas, fontes e inputs referenciados.
- Execução ordenada com opção de interromper na primeira falha.
- Suporte a espera entre ações quando necessário.
- Histórico de execução com resultado de cada etapa.
- Macros iniciais sugeridas, editáveis pelo operador.

## Ações iniciais

- Trocar cena em programa.
- Habilitar ou ocultar item de cena.
- Atualizar Browser Source.
- Mutar ou desmutar input.
- Ajustar volume.
- Iniciar ou parar gravação.
- Atualizar título, cidade ou matéria ativa no VPN.
- Aguardar um intervalo controlado.

## Requisitos funcionais

1. A macro deve ser validada antes da execução.
2. A interface deve mostrar progresso e etapa atual.
3. O resultado deve distinguir sucesso total, parcial e falha.
4. Ações críticas dentro de uma macro devem ser destacadas antes da confirmação.
5. Uma macro em andamento não deve ser iniciada novamente por duplo clique.
6. O histórico não deve guardar credenciais ou dados sensíveis.

## Critérios de aceite

- É possível criar, editar, duplicar e desativar uma macro.
- A ordem das ações é preservada.
- `haltOnFailure` interrompe as etapas seguintes após uma falha.
- Mapeamentos inválidos são detectados antes de colocar conteúdo no ar.
- O histórico mostra autor, estação, horários e resultados.
- A desconexão durante a macro termina em estado conhecido e não dispara ações silenciosamente após reconectar.

## Dependências e riscos

- Depende dos PRDs 03 a 05.
- Nem toda ação do VPN faz parte de um lote nativo do OBS; o orquestrador deve coordenar ações locais e remotas mantendo rastreabilidade.

