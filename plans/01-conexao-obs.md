# PRD 01 — Conexão com o OBS

## Visão geral

Criar a base client-side para que o painel da redação se conecte ao OBS Studio pelo protocolo obs-websocket 5.x. Esta etapa não introduz controles operacionais além dos necessários para validar a conexão; seu objetivo é fornecer uma abstração segura e reutilizável para as etapas seguintes.

## Objetivo

Disponibilizar um composable `useObsConnection` capaz de conectar, autenticar, desconectar e se recuperar de quedas, expondo um estado de conexão consistente para a interface.

## Escopo

- Adicionar um cliente compatível com obs-websocket 5.x.
- Executar a integração apenas no navegador (`client-side`).
- Configurar host, porta e senha do OBS no dispositivo do operador.
- Modelar os estados `desconectado`, `conectando`, `conectado`, `reconectando` e `erro`.
- Implementar reconexão com espera progressiva e limite de tentativas.
- Disponibilizar uma função genérica e tipada para chamadas ao OBS.
- Encerrar listeners e conexões quando o painel for desmontado ou a sessão terminar.

## Fora do escopo

- Controle remoto através da internet.
- Persistência da senha no Supabase.
- Troca de cenas, controle de áudio ou automações.
- Suporte ao protocolo obs-websocket 4.x.

## Requisitos funcionais

1. O operador deve poder informar endereço, porta e senha.
2. O sistema deve validar endereço e porta antes de tentar conectar.
3. O sistema deve confirmar a negociação do protocolo e a autenticação.
4. Uma falha deve produzir mensagem compreensível sem expor a senha.
5. A conexão deve poder ser encerrada manualmente.
6. Quedas inesperadas devem iniciar reconexão controlada.

## Segurança

- A senha nunca deve aparecer em URL, log, toast ou payload do Supabase.
- A senha não deve ser persistida no banco de dados.
- A implementação inicial pode mantê-la apenas em memória ou, mediante escolha explícita do operador, no armazenamento local do dispositivo.
- A autenticação do próprio OBS deve permanecer habilitada.

## Critérios de aceite

- O painel conecta a um OBS 5.x autenticado em `127.0.0.1:4455`.
- Senha incorreta e OBS indisponível resultam em estados e mensagens distintos.
- A página não tenta conectar durante SSR.
- Recarregar ou sair da página não deixa conexões ou listeners duplicados.
- Nenhum segredo aparece no console ou nas requisições ao backend.
- `pnpm lint` e `pnpm typecheck` passam.

## Dependências e riscos

- Não possui dependência de outro PRD desta série.
- Um painel servido por HTTPS pode enfrentar restrições ao abrir `ws://`; isso deve ser detectado e explicado ao operador.
- A conexão direta pressupõe que navegador e OBS estejam na mesma máquina ou em uma rede alcançável.

