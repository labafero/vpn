---
name: vpn-plan
description: Usar ao planejar ou retomar trabalho no monorepo VPN quando requisitos do produto, decisões de arquitetura ou documentação oficial da stack precisarem orientar o plano.
---

# Planejamento VPN

Produza um plano curto e executável, baseado no produto VPN e no comportamento documentado da versão da stack em uso.

## Fontes do projeto

- Leia as instruções do repositório e `docs/workflows/entrega.md`.
- Consulte o PRD do app afetado, as ADRs aceitas e `DESIGN.md` para mudanças visuais. Leia `docs/operations/environments.md` quando o trabalho envolver ambientes ou serviços externos.
- Identifique o app afetado e as versões exatas do framework e das bibliotecas em `package.json` e `pnpm-lock.yaml`.

## Documentação oficial da stack

Antes de propor etapas que dependam do comportamento de framework, biblioteca, API ou configuração, consulte a documentação oficial correspondente à versão instalada. Use a documentação do framework ou fornecedor como fonte primária e inclua no plano os links que sustentam a proposta. Não substitua o contrato documentado por memória, detalhes da implementação do repositório, código interno do pacote, blogs ou exemplos de versões diferentes.

Relacione a API documentada à estrutura e aos requisitos reais do repositório. Inspecione o código do projeto para localizar a mudança e suas restrições locais, não para fazer engenharia reversa de comportamentos já descritos na documentação oficial.

Se a documentação oficial não definir um caminho viável, ou se esse caminho entrar em conflito com uma ADR aceita ou com um requisito do usuário, descreva a lacuna e peça uma decisão. Não planeje silenciosamente um workaround não documentado nem uma mudança de arquitetura.

## Estrutura do plano

Ajuste o nível de detalhe ao tamanho da mudança e informe:

1. Objetivo e apps/pacotes afetados.
2. Abordagem documentada, com fontes oficiais e relevância para as versões instaladas.
3. Etapas de implementação em ordem e critérios de aceite observáveis.
4. Verificações necessárias para o escopo alterado, incluindo pré-requisitos de ambiente.

Planos são apoios temporários de execução conforme `docs/workflows/entrega.md`; não os transforme em requisitos duráveis do produto. Preserve as autorizações do usuário para commits, PRs, deploys, mudanças no banco e outras ações externas.
