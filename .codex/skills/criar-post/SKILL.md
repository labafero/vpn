---
name: criar-post
description: Redige e revisa matérias jornalísticas de GTA RP em pt-BR no estilo de NTV, BRN, RVN ou RNN, cria chamadas de até 500 caracteres e roteiros de narração, oferece gerar uma capa opcional e publica o post aprovado com a capa aprovada no Supabase. Use somente quando o usuário invocar `$criar-post` para criar e publicar um post, uma matéria, uma notícia ou uma manchete a partir de uma cidade e um briefing.
---

# Criar Post Jornalístico

Atuar como editor-chefe de um jornal de roleplay. Redigir eventos do mundo in-game no tom exato do veículo escolhido, incluindo crimes, operações policiais, confrontos de facções, denúncias, negócios, política e cotidiano.

## Executar o fluxo

1. Identificar a cidade ou o jornal no pedido e no contexto da conversa. Se estiver ausente, perguntar antes de carregar uma referência.
2. Ler por completo somente a referência correspondente:
   - Neon TV (NTV), cidade `neon`: [references/ntv.md](references/ntv.md)
   - Burn News (BRN), cidade `dallas`: [references/brn.md](references/brn.md)
   - Radar Vice News (RVN), cidade `vice`: [references/rvn.md](references/rvn.md)
   - Radar Nordeste News (RNN), cidade `nordeste`: [references/rnn.md](references/rnn.md)
3. Identificar o briefing do evento no pedido e no contexto. Se estiver ausente ou insuficiente para uma matéria fiel, pedir somente os fatos que faltam.
4. Redigir seguindo o tom, o título e a estrutura da referência carregada. Não inventar nomes, locais, horários, fontes ou desfechos apresentados como fatos.
5. Entregar todos os campos abaixo, acompanhados da chamada para o perfil in-game definida em **Gerar textos complementares**, e pedir que o usuário revise os textos. Não gerar imagem nesta etapa.
6. Aplicar os ajustes solicitados, manter a chamada coerente com a matéria e repetir a revisão até o usuário aprovar o texto ou informar que não deseja alterações.
7. Somente depois da aprovação, oferecer a geração opcional de capa conforme o fluxo abaixo.

## Entregar o post

| Campo | Conteúdo |
|---|---|
| `title` | Manchete conforme o padrão do jornal |
| `cidade` | `neon`, `dallas`, `nordeste` ou `vice` |
| `body` | Matéria completa em pt-BR |
| `published_at` | Data e hora do evento in-game em ISO 8601, por exemplo `2026-06-14T22:00:00`; solicitar o valor se não puder ser determinado sem inventar |
| `destaque` | `true` somente para fatos de grande impacto; caso contrário, `false` |

## Gerar textos complementares

### Chamada para o perfil in-game

- Gerar junto com a matéria uma chamada autônoma e natural de até 500 caracteres, incluindo espaços e quebras de linha, sempre que o briefing permitir uma síntese fiel.
- Contar os caracteres antes de entregar e informar a contagem. Nunca exceder o limite por descuido nem cortar palavras ou frases para caber.
- Preservar o ritmo editorial do jornal e priorizar a manchete, os fatos centrais e a pergunta ou provocação que desperta interesse pela reportagem completa. Não reduzir a chamada a frases desconectadas nem inventar informações.
- Quando o usuário fornecer ou editar uma chamada, preservar sua construção e fazer somente os ajustes pedidos. Não substituir automaticamente uma versão aprovada.
- O limite de 500 caracteres vale somente para essa chamada, salvo se o usuário pedir explicitamente outro limite.

### Roteiro do narrador

- Gerar quando o usuário pedir uma versão para locução, matéria em vídeo ou reportagem narrada.
- Não aplicar o limite de 500 caracteres ao roteiro. Desenvolver os fatos com transições naturais, ritmo de voz e duração compatível com a solicitação do usuário; se ele não definir duração, usar a extensão necessária para uma reportagem clara, sem repetição artificial.
- Manter o mesmo rigor factual da matéria aprovada e não transformar perguntas editoriais em fatos confirmados.

## Oferecer uma capa opcional

Após a aprovação do texto, perguntar exatamente uma vez:

> Texto aprovado. Deseja que eu gere também uma imagem de capa baseada nesta versão? O padrão é `1:1`; se preferir, informe `16:9`, outra proporção ou uma resolução específica.

Não gerar a imagem sem resposta afirmativa. Se o usuário recusar, encerrar com a orientação de publicação.

Se o usuário aceitar:

1. Carregar e seguir a skill instalada `$imagegen`.
2. Usar por padrão a ferramenta integrada `image_gen`, inclusive no Codex CLI. Não exigir `OPENAI_API_KEY` para esse caminho.
3. Se a ferramenta integrada estiver indisponível, explicar que o fallback via `scripts/image_gen.py` exige `OPENAI_API_KEY` configurada localmente e perguntar se o usuário deseja prosseguir por esse caminho. Não executar o fallback sem confirmação.
4. Derivar o prompt somente dos fatos presentes na versão aprovada e da identidade visual descrita na referência do jornal. Aceitar restrições visuais adicionais do usuário antes de gerar.
5. Usar `1:1` como proporção padrão quando o usuário aceitar a capa sem indicar formato. Se ele informar `16:9`, outra proporção ou uma resolução específica, respeitar essa escolha.
6. Não mudar para o fallback CLI apenas para controlar tamanho ou proporção. Se a ferramenta integrada não produzir os pixels exatos solicitados, preservar a composição pedida e criar uma cópia final recortada ou redimensionada localmente, sem distorção. Se isso não puder ser feito com segurança, informar a limitação e pedir aceitação da resolução compatível mais próxima antes de gerar.
7. Gerar uma capa raster jornalística na proporção escolhida, sem manchete incorporada, texto, logotipo ou marca-d'água. Não inventar pessoas identificáveis, locais específicos ou detalhes factuais ausentes do texto aprovado.
8. Inspecionar o resultado seguindo `$imagegen` e mostrá-lo ao usuário. Perguntar se a capa está aprovada, se precisa de ajustes ou se deve ser descartada.
9. Não enviar uma capa ao Supabase antes da aprovação explícita. Aplicar ajustes e repetir a inspeção até a aprovação, ou seguir sem capa se o usuário a descartar.
10. Para uma capa aprovada, copiar a imagem selecionada para um caminho descritivo e não sobrescrito dentro do workspace e manter esse caminho para a publicação.

## Publicar no Supabase

Depois que o texto estiver aprovado e a capa estiver aprovada ou descartada, perguntar:

> Conteúdo pronto. Deseja publicar agora o post no Supabase com a capa aprovada?

Adaptar o final para "sem capa" quando nenhuma capa tiver sido aprovada. A aprovação do texto ou da imagem não substitui esta confirmação final de publicação. Não alterar o Supabase sem resposta afirmativa.

Se o usuário confirmar:

1. Usar [scripts/publish-post.mjs](scripts/publish-post.mjs). Não reimplementar chamadas ao Supabase em comandos avulsos.
2. Criar um arquivo JSON temporário com somente `title`, `cidade`, `body`, `published_at` e `destaque` da versão aprovada. Não incluir a chamada para perfil nem o roteiro do narrador.
3. Executar `node .codex/skills/criar-post/scripts/publish-post.mjs --check-connection` e ler o resultado. Essa checagem é somente leitura e valida credenciais e autoria sem publicar dados.
4. Executar o publicador com `--dry-run` e ler o resultado. Passar `--cover <caminho>` somente quando houver uma capa aprovada.
5. Se as validações passarem, executar novamente sem `--dry-run`. Essa execução é uma mutação externa autorizada pela confirmação final do usuário.
6. O script deve ler `NUXT_PUBLIC_SUPABASE_URL` e `NUXT_SUPABASE_SECRET_KEY` do ambiente ou de `.env`; nunca exibir, copiar ou pedir que o usuário cole a chave secreta na conversa.
7. Quando houver apenas um usuário no projeto, permitir que o script resolva a autoria automaticamente. Quando houver mais de um, solicitar que `SUPABASE_POST_AUTHOR_ID` seja configurado localmente ou passar `--author-id` apenas depois de o usuário identificar o autor correto.
8. Tratar a publicação como concluída somente quando o script retornar `post_id`. Se o upload da capa ocorrer e a inserção falhar, confirmar no erro se o rollback automático da capa também falhou antes de orientar qualquer recuperação.
9. Remover o JSON temporário após a execução e informar `post_id` e `cover_url` retornados. Se não houver capa, informar que o post foi publicado sem capa.

Se o usuário recusar a publicação, não enviar o post nem a capa e apenas informar que nenhum dado foi alterado no Supabase.
