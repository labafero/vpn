---
name: vpn-release
description: Use para deploy Vercel do monorepo VPN, preview vinculado a PR, publicação em produção, acompanhamento de build/deployment, status de uma entrega ou validação da interface publicada no navegador.
---

# Publicar e acompanhar VPN

Seguir [publicação](../../../docs/workflows/publicacao.md), escolhendo apenas o modo solicitado: preview em PR, produção direcionada ou acompanhamento de um deployment existente. Recuperar destino, SHA e autorizações existentes; não recriar um deploy só para acompanhar seu status.

Pré-requisitos ausentes pertencem a `vpn-environment`. Conta/projetos vêm de [ambientes](../../../docs/operations/environments.md), revalidados na plataforma. As regras gerais de entrega continuam em [entrega](../../../docs/workflows/entrega.md).

Preview por Git: associar projeto, PR, branch, SHA completo e deployment. Produção direcionada: usar a raiz do monorepo e IDs confirmados; aprovação de produção não implica merge ou publicação dos outros aplicativos. Reutilizar autorizações compatíveis sem perguntar de novo. Não exigir outro preview quando o usuário aprovou a versão local e dispensou essa etapa.

Acompanhar estado real até READY ou falha, sem confiar em mensagens otimistas de `--no-wait`. O helper read-only [deployment_status.py](scripts/deployment_status.py) confere identidade, commit, target e alias; READY da plataforma ainda exige prova de UI. Consultar `python3 scripts/deployment_status.py --help` a partir desta skill, ou usar seu caminho completo.

Para abrir/validar a interface ou atender um pedido de ver o browser, ler [navegador](references/browser.md). Registrar evidências e limites por destino. Não apresentar produção como concluída antes de verificar o domínio oficial.
