# Preparação do ambiente de desenvolvimento

Verificado em 17/10/2026, branch `main`, commit base `b47ee83`.

## Objetivo e autorizações

Desenvolvimento, lint e testes locais; publicação na Vercel e Supabase hospedado. O usuário solicitou Node 24 via NVM, pnpm e CLIs, continuidade da preparação até sua confirmação e documentação reutilizável. Nenhum deploy ou alteração remota de banco foi realizado. Guia em `docs/operations/development-setup.md`.

## Evidências

- NVM já existia e estava carregado pelo `.zshrc`; Node 24.22.0 instalado e definido como padrão.
- pnpm Linux 11.1.3 instalado, substituindo no shell com NVM o executável Windows que falhava.
- Vercel CLI 64.5.0 instalada. A versão histórica 62.7.0 foi substituída após aviso do instalador sobre defeito de autoatualização.
- Supabase CLI 2.119.0 instalada em `~/.local/bin`, na versão da CI. Login confirmado; projeto `VPN_RP` (`zxzigoaddoslkokbzmyc`) acessível e vinculado.
- `pnpm install --frozen-lockfile` passou e gerou os tipos Nuxt. Avisos de URL/chave pública Supabase ausentes são esperados enquanto os ambientes não forem preparados.
- `pnpm lint` passou nos quatro aplicativos.
- Primeira execução de `pnpm test:foundation`: 69 testes passaram; 5 suítes HTTP falharam porque o sandbox bloqueou `listen` em loopback (EPERM). Reexecução fora do sandbox passou: 21 suítes, 92 testes.
- `~/.config/vpn` criada e permissão `700` confirmada. Ainda sem arquivos de credenciais criados pelo agente. Permissão proposta para arquivos: `600`.
- APIs Vercel/Supabase alcançáveis fora do sandbox; respostas sem credenciais não comprovam saúde nem acesso às contas.
- Docker não está integrado ao WSL; é opcional para o fluxo habitual solicitado.

## Verificação autenticada

- Vercel autenticada como `quila`, equipe `anilson-lopes-projects`. Os quatro aplicativos foram vinculados aos projetos existentes; nomes, root directories e Node 24.x conferidos.
- `supabase migration list --linked` confirmou 25 migrations alinhadas entre local e remoto; nenhuma migration aplicada.
- Typecheck, contratos OpenAPI e formatação passaram. `pnpm format` executado; fontes permaneceram sem alterações.
- A vinculação Vercel gerou `.env.local` por aplicativo com `VERCEL_OIDC_TOKEN` temporário. Permissões ajustadas para `600`; arquivos ignorados pelo Git. Os ignores redundantes gerados pela CLI foram removidos, mantendo as regras da raiz.
- Variáveis remotas listadas: News tem quatro nomes configurados em Preview/Production; Monitor tem cinco em ambos; Sentry tem dez em Preview e doze em Production. EventSub callback/secret aparecem somente em Production. Site não tem variáveis remotas. Nenhuma variável Development foi encontrada. Presença de nome não comprova conteúdo ou integração funcional.

## Pendências

- Preparar arquivos privados por aplicativo/destino e definir como serão carregados explicitamente. Não é necessário copiar segredos de produção para executar os checks já validados.
- Fluxo Git/Vercel comprovado com PR #21, commit `a064a16` e preview READY do Site. CI passou; Chromium validou desktop/mobile, refresh, teclado, movimento reduzido e ausência de JavaScript. Detalhes em `site-splash.md`. O usuário aprovou o visual final e autorizou produção; Site publicado e validado no domínio oficial a partir do commit `f15a8e9`. Documentação complementar consolidada na branch da PR #21.

A CI ainda utiliza Node 22. Não foi alterada para Node 24 por esta preparação. Segredos, códigos de login e URLs OAuth não devem ser armazenados neste registro.
