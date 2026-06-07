# Port Proxy WSL2 — Spotify OAuth

O Spotify aceita apenas `http://127.0.0.1:PORTA` para desenvolvimento local (HTTPS obrigatório para outros).  
Mas no WSL2, o servidor Nuxt precisa escutar em todas interfaces e o Windows precisa de um proxy.

## 1. Configurar Nuxt (já feito)

O `nuxt.config.ts` já foi ajustado para escutar em `0.0.0.0:3000`.

## 2. Descobrir o IP do WSL2

No **terminal WSL**, rode:

```bash
wsl hostname -I
```

Exemplo de saída: `172.18.0.2`

## 3. Adicionar proxy (PowerShell **Admin**)

Use o IP do passo anterior:

```powershell
netsh interface portproxy add v4tov4 `
  listenaddress=127.0.0.1 `
  listenport=3000 `
  connectaddress=172.18.0.2 `
  connectport=3000
```

## 4. Acessar o app

Abra **`http://127.0.0.1:3000`** no navegador Windows (não `localhost`).

**Importante:** faça login no Supabase já em `http://127.0.0.1:3000/login` — a sessão fica salva para esse domínio, e o callback do Spotify virá para o mesmo endereço.

## 5. Conectar Spotify

Vá em `http://127.0.0.1:3000/redacao/spotify` e clique em Conectar.

## Verificar proxy ativo

```powershell
netsh interface portproxy show v4tov4
```

## Remover proxy

```powershell
netsh interface portproxy delete v4tov4 `
  listenaddress=127.0.0.1 `
  listenport=3000
```
