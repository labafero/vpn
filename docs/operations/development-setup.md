# Ambiente e publicação com Codex

Os procedimentos operacionais vivem nas skills e workflows versionados do projeto. Este arquivo é apenas o índice para uso humano.

| Objetivo | Skill | Procedimento |
| --- | --- | --- |
| Preparar máquina, ferramentas, autenticação e vínculos | [vpn-environment](../../.agents/skills/vpn-environment/SKILL.md) | [Preparar ambiente](../workflows/preparar-ambiente.md) |
| Preview em PR, produção ou acompanhamento de um deployment | [vpn-release](../../.agents/skills/vpn-release/SKILL.md) | [Publicação](../workflows/publicacao.md) |
| Validar interface ou abrir janela visível | [vpn-release](../../.agents/skills/vpn-release/SKILL.md) | [Navegador](../../.agents/skills/vpn-release/references/browser.md) |

Exemplos de pedidos ao Codex:

- “Use `$vpn-environment` para preparar esta máquina e verificar os acessos.”
- “Use `$vpn-release` para publicar o preview desta PR e validar a alteração.”
- “Use `$vpn-release` para acompanhar este deployment até conferir a interface.”
- “Use `$vpn-release` para publicar somente o Site em produção; a versão local já está aprovada.”

As skills ficam em `.agents/skills`, dentro do repositório. O [AGENTS.md](../../AGENTS.md) também orienta seu uso. Se a lista de skills da sessão não refletir os arquivos novos, reiniciar o Codex ou seguir os links diretamente; não é necessário copiar os procedimentos para cada conversa. Referência oficial: [skills no Codex](https://learn.chatgpt.com/docs/build-skills).

Fatos de contas/projetos/versões estão em [ambientes](environments.md), sujeitos a revalidação. As evidências da publicação que originou estes procedimentos estão em [splash do Site](../validation/site-splash.md); IDs de uma entrega passada não são parâmetros da próxima.
