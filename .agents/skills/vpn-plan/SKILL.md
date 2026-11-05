---
name: vpn-plan
description: Usar ao planejar ou retomar trabalho no monorepo VPN quando requisitos do produto, decisões de arquitetura ou documentação oficial da stack precisarem orientar o plano.
---

# Planejamento VPN

Produza um plano curto e executável, baseado no produto VPN e no comportamento documentado da versão da stack em uso.

## Fontes do projeto

- Leia as instruções do repositório e `docs/workflows/entrega.md`.
- Consulte o ROADMAP para identificar se o pedido já pertence a uma fase prevista, a ordem planejada e dependências entre fases. Consulte o PRD do app afetado, as ADRs aceitas e `docs/architecture/foundation.md` para comportamento e decisões vigentes; leia `DESIGN.md` para mudanças visuais e `docs/operations/environments.md` quando houver ambientes ou serviços externos.
- Identifique o app afetado e as versões exatas do framework e das bibliotecas em `package.json` e `pnpm-lock.yaml`.

## Compatibilidade do pedido com produto e arquitetura

Interprete o PRD como escopo e comportamento definido para o produto/app no estado ou fase descritos, não como veto permanente a evoluções. O ROADMAP registra a evolução intencional e sua sequência. A ausência de uma funcionalidade no PRD ou na implementação atual, por si só, não é conflito nem mudança de escopo.

Compare o pedido semanticamente com o PRD geral e o ROADMAP; use PRDs por app para identificar o estado atual e ADRs/fundação para identificar decisões e guardrails vigentes. No plano, mostre somente o delta que afeta a execução: comportamento pedido, onde ele se encaixa, estado/sequência e consequência. Seja direto; não reexplique regras que não alteram a decisão.

- **Já previsto, mesmo que em palavras diferentes:** relacione o pedido ao item equivalente do PRD/ROADMAP e planeje sua entrega. Não o classifique como mudança de escopo.
- **Antecipação/reordenação do ROADMAP:** se o pedido trouxer para agora um item previsto em fase futura, nomeie a fase original e a dependência ou reordenação necessária. Isso é mudança de sequência, não mudança do objetivo do produto.
- **Detalhe em aberto:** quando o produto prevê a capacidade, recomende um padrão compatível. Peça decisão apenas quando faltar uma escolha material sobre público, acesso, consentimento, retenção ou canal, e essa escolha não puder ser inferida das fontes.
- **Mudança real de escopo:** reserve esta classificação para pedido que altera a visão, os públicos, os não objetivos ou os limites do produto, ou que introduz uma capacidade fora do objetivo/roadmap vigente. Nomeie o delta e inclua a atualização durável adequada. Se o usuário já pediu explicitamente a mudança, planeje-a sem pedir autorização outra vez.
- **Pré-requisito de política/arquitetura:** ADRs e fundação são decisões vigentes, mas evolutivas. Se o pedido claro requer mudar uma delas, não trate o PRD como veto: inclua a decisão/documentação e os controles necessários como pré-requisito de implementação. Se valores essenciais de segurança, consentimento ou retenção ainda estiverem indefinidos, mantenha somente essa decisão específica em aberto.
- **Limite mantido:** cite apenas limites que continuam afetando o trabalho; não amplie o pedido para outros dados, pessoas, canais ou superfícies.

Interprete exceções no menor escopo descrito pelo usuário: uma regra específica para um tipo de evento não altera os demais tipos ou o comportamento global. Não chame uma diferença em relação à implementação atual de conflito sem verificar o PRD geral e o ROADMAP. Não classifique como mudança de escopo uma funcionalidade já prevista nem sua antecipação de fase. Se o pedido já estiver no caminho do produto, diga isso numa frase e inclua a sequência/pré-requisitos necessários. Evite alertas genéricos, pedidos repetidos de confirmação e tabelas extensas; a comparação deve poupar o usuário de reler a documentação.

## Documentação oficial da stack

Antes de propor etapas que dependam do comportamento de framework, biblioteca, API ou configuração, consulte a documentação oficial correspondente à versão instalada. Use a documentação do framework ou fornecedor como fonte primária e inclua no plano os links que sustentam a proposta. Não substitua o contrato documentado por memória, detalhes da implementação do repositório, código interno do pacote, blogs ou exemplos de versões diferentes.

Relacione a API documentada à estrutura e aos requisitos reais do repositório. Inspecione o código do projeto para localizar a mudança e suas restrições locais, não para fazer engenharia reversa de comportamentos já descritos na documentação oficial.

Se a documentação oficial não definir um caminho viável, ou se esse caminho entrar em conflito com uma ADR aceita ou com um requisito do usuário, descreva a lacuna e peça uma decisão. Não planeje silenciosamente um workaround não documentado nem uma mudança de arquitetura.

## Estrutura do plano

Ajuste o nível de detalhe ao tamanho da mudança e informe:

1. Objetivo e apps/pacotes afetados.
2. Encaixe no produto/ROADMAP: item existente, antecipação de fase, mudança real de escopo ou pré-requisito específico — informe apenas o que afeta a execução.
3. Abordagem documentada, com fontes oficiais e relevância para as versões instaladas.
4. Etapas de implementação em ordem e critérios de aceite observáveis, incluindo atualizações duráveis exigidas por mudanças de escopo.
5. Verificações necessárias para o escopo alterado, incluindo pré-requisitos de ambiente.

Planos são apoios temporários de execução conforme `docs/workflows/entrega.md`; não os transforme em requisitos duráveis do produto. Preserve as autorizações do usuário para commits, PRs, deploys, mudanças no banco e outras ações externas.
