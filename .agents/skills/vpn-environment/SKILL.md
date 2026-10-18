---
name: vpn-environment
description: Use quando uma máquina nova ou o ambiente local do monorepo VPN precisar de Node, pnpm, CLIs Vercel/Supabase, autenticação, vínculos, credenciais locais ou diagnóstico de WSL.
---

# Preparar o ambiente VPN

Ler [preparação do ambiente](../../../docs/workflows/preparar-ambiente.md) e executar apenas as etapas ainda pendentes. Recuperar evidências e autorizações existentes antes de reinstalar ferramentas ou pedir login.

O resultado esperado é desenvolvimento e checks locais com acesso verificado aos serviços hospedados. Subir aplicativos, instalar Docker ou iniciar uma stack Supabase local só quando o objetivo exigir; isso não é requisito automático do setup.

Descobrir versões em `.nvmrc`, `package.json`, CI e [registro de ambientes](../../../docs/operations/environments.md). Revalidar conta/projeto usando CLI/API/MCP e conferir caminhos Linux no WSL. Vínculo ou login histórico não prova o estado desta máquina.

Para Supabase, usar também a skill disponível `supabase`; não aplicar migrations para testar acesso. Segredos ficam fora do Git e do chat; login humano ocorre pelo fluxo oficial, com código inserido no terminal que o iniciou.

Entregar evidências por ferramenta/serviço, checks executados e pendências concretas. Atualizar o registro operacional, sem guardar tokens ou URLs OAuth. Para publicar ou acompanhar um deploy, usar `vpn-release`.
