# Autenticação central da VPN e sessão única entre apps

Data: 18 de outubro de 2026

Status: especificação e plano de implementação aprovados pelo usuário em 18 de outubro de 2026; implementação nativa em andamento

## Contexto

O monorepo tem três aplicações web sob `labafero.com`: o site institucional em `vpn.labafero.com`, o Monitor em `vpn-monitor.labafero.com` e o portal News em `vpn-news.labafero.com`. Monitor e News já usam o mesmo projeto Supabase por meio de `@nuxtjs/supabase`, mas cada app mantém uma sessão restrita ao próprio subdomínio. O Site ainda não usa Supabase Auth.

O Monitor oferece login por e-mail e senha. O News tem login próprio e protege a redação por meio da associação `editorial_members`. A Twitch já é usada como conexão operacional do streamer no Monitor, com OAuth e consentimentos separados.

## Objetivo

Centralizar a entrada e o cadastro em `vpn.labafero.com`, com Discord, Twitch e e-mail/senha, e permitir que uma sessão Supabase autenticada seja reconhecida pelo Monitor, News e futuros apps VPN.

O usuário deve voltar ao app e à rota que iniciaram a autenticação. Entradas diretas no portal sem destino devem permanecer no Site.

## Decisões de arquitetura

1. O `vpn-site` existente será o portal central. Ele terá as rotas `/entrar` e `/cadastro`, com formulários de e-mail/senha e ações OAuth para Discord e Twitch, todas usando Supabase Auth no projeto VPN existente.

2. Os apps compartilharão a sessão Supabase por cookie de SSR com o domínio `.labafero.com` em produção. Site, Monitor e News usarão o mesmo projeto Supabase, o mesmo prefixo de cookie e opções compatíveis de sessão. Em desenvolvimento local, não será definido atributo `Domain`; a validação entre apps usará hosts locais sob um domínio de teste comum.

3. Os middlewares de autenticação do Monitor e das áreas protegidas do News redirecionarão ao portal central com um parâmetro `return_to` contendo a rota de destino. O portal validará o destino contra uma lista explícita de origens de apps VPN antes de iniciar OAuth ou cadastro e antes do redirecionamento final. URLs externas, destinos com autoridade embutida, esquemas diferentes e origens desconhecidas serão recusados. A lista de futuros apps deverá ser atualizada junto com a configuração de retorno do Supabase.

4. O retorno OAuth e a confirmação de e-mail serão processados pelo cliente Supabase do app destinatário, que poderá ler o cookie de verificação PKCE compartilhado. Os tokens ficarão no armazenamento de sessão do Supabase; não serão enviados manualmente em parâmetros de URL entre apps nem registrados em logs.

5. O cadastro criará um usuário comum do Supabase. Ausência de registro em `public.user_roles` continuará significando membro. O cadastro não cria `vpn_admin`, não cria associação editorial e não usa `user_metadata` para autorizar ações. O News continuará exigindo `editorial_members` para a redação.

6. OAuth da Twitch para autenticar a conta VPN será distinto da conexão Twitch operacional do Monitor. A implementação não compartilhará tokens entre os fluxos, não alterará scopes, consentimentos ou callbacks do Sentry e não fará login conceder monitoramento.

7. Logout realizado em qualquer app deverá invalidar a sessão compartilhada, e os demais apps deverão passar a tratar a pessoa como não autenticada.

## Experiência e erros

- Entrar e cadastrar mostrarão mensagens em pt-BR, estado de carregamento e erros genéricos, sem expor detalhes internos do provedor.
- O cadastro tratará tanto sessão imediata quanto confirmação de e-mail pendente, conforme a configuração vigente do Supabase.
- Recusa ou falha OAuth devolverá a pessoa ao portal e preservará apenas um destino previamente validado.
- A rota legada `/login` de cada app poderá encaminhar ao portal, preservando rota de retorno e mantendo compatibilidade com links salvos.
- O Site continuará público; a autenticação não será exigida para navegar por suas páginas atuais.

## Segurança e limites

O cookie de domínio compartilhado será enviado a todos os subdomínios de `labafero.com`, incluindo o Sentry e futuros subdomínios. Esta é a contrapartida aceita para SSO por cookie entre domínios irmãos: todo subdomínio que o navegador acessa precisa estar sob controle confiável da VPN. Não hospedar conteúdo ou código de terceiros não confiáveis nesses subdomínios. As aplicações manterão HTTPS, `Secure` e `SameSite=Lax` em produção, e não compartilharão chaves administrativas do Supabase.

A autenticação central não altera autorização de dados. Cada backend e policy continuará verificando o usuário e o papel atuais. Não serão criadas migrations ou endpoints de promoção de papel para esta funcionalidade.

Os destinos de retorno serão validados no portal, sem confiar em valores fornecidos pelo cliente. O código OAuth, access token, refresh token e respostas brutas dos provedores não serão registrados. Segredos e credenciais OAuth dos provedores permanecerão na configuração Supabase; o browser receberá somente configuração publicável do projeto.

## Configuração externa

Antes da validação publicada, conferir no projeto Supabase atual:

- provedores Discord e Twitch habilitados e associados às aplicações OAuth existentes;
- URL principal do Site e lista de Redirect URLs cobrindo os caminhos de retorno autorizados do Site, Monitor e News;
- cadastro por e-mail habilitado e estado de confirmação de e-mail;
- valores públicos de URL e chave Supabase consistentes nos três projetos Vercel, sem imprimir valores secretos.

Alterações na lista de Redirect URLs deverão ser limitadas às origens e caminhos necessários. Não trocar Client IDs, Client Secrets ou callbacks dos provedores sem evidência de configuração incorreta e autorização apropriada.

## Validação necessária

- Testes automatizados rejeitam destinos externos, protocolos inesperados, caminhos de autoridade `//...` e origens não cadastradas, e aceitam rotas relativas válidas dos apps autorizados.
- Testes cobrem início OAuth de cada provedor, erros de início, cadastro com confirmação pendente e cadastro com sessão imediata.
- Uma prova de navegador entre subdomínios demonstra: entrar no portal, acessar Monitor e News sem novo login, manter proteção editorial para membro sem associação e encerrar a sessão global ao sair.
- Provar ao menos um callback OAuth real de cada provedor e o fluxo real de confirmação de e-mail no ambiente escolhido. Um mock ou apenas verificar a URL do provedor não fecha o critério.
- Vercel Preview em hosts `vercel.app` separados não prova o cookie `.labafero.com`; a prova completa deve usar hosts locais irmãos configurados para o mesmo navegador ou hosts controlados sob `labafero.com`. Se a prova local não cobrir o callback real, usar o destino Vercel autorizado que o permita e registrar URL, commit e resultado.
- Executar lint, typecheck e build dos workspaces Site, Monitor e News, além dos testes pertinentes e das verificações CI exigidas pelo repositório.

## Alternativas consideradas

- Manter sessões próprias por app e apenas compartilhar a aparência da tela: mais simples e mantém isolamento por origem, mas não entrega sessão única.
- Usar um intermediário OAuth com sessões independentes por app: reduz o alcance do cookie, mas cria um novo protocolo de autenticação e mais superfície de código sensível.
- Cookie Supabase compartilhado entre subdomínios confiáveis: escolhido por corresponder aos domínios atuais e à integração SSR já usada por Monitor e News, com a exposição a todos os subdomínios documentada acima.
