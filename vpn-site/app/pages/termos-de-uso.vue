<script setup lang="ts">
useSeoMeta({
  title: 'Termos de uso — VPN Roleplay',
  description: 'Termos de uso dos serviços e recursos da VPN Roleplay.',
  ogTitle: 'Termos de uso — VPN Roleplay',
  ogDescription: 'Condições de uso dos serviços da VPN Roleplay.'
})
</script>

<template>
  <LegalPage
    title="Termos de uso"
    description="Condições básicas para usar o site, a área privada e as integrações da VPN Roleplay."
    current="terms"
  >
    <section>
      <h2>1. Sobre o serviço</h2>
      <p>
        A VPN Roleplay oferece um portal público de notícias e ferramentas privadas para a
        comunidade de roleplay, incluindo acompanhamento autorizado de canais Twitch e registro de
        referências a clips enviados por usuários.
      </p>
      <p>
        Recursos e integrações podem ser liberados gradualmente. A vinculação de uma conta de
        terceiro não ativa, por si só, monitoramento ou notificações: essas funções dependem de uma
        ação e autorização separadas do usuário responsável.
      </p>
    </section>

    <section>
      <h2>2. Uso autorizado</h2>
      <p>
        Use a VPN somente com sua própria conta ou com autorização de quem controla a conta, o canal
        ou o conteúdo enviado. Você é responsável por ter permissão para compartilhar referências a
        clips e por respeitar os direitos de outras pessoas.
      </p>
      <p>
        Não tente acessar transmissões, contas ou dados sem autorização, interferir no serviço,
        contornar controles de segurança ou usar as integrações para violar leis, direitos de
        terceiros ou as regras da Twitch e do Discord.
      </p>
    </section>

    <section>
      <h2>3. Monitoramento e clips</h2>
      <p>
        O monitoramento é privado e depende da autorização do responsável pelo canal. A VPN registra
        metadados de sessões e referências de clips necessários ao serviço. No recurso atual de
        envio manual, a VPN não mantém uma cópia do vídeo do clip, das captions ou de uma
        transcrição.
      </p>
      <p>
        Metadados e referências não garantem que a Twitch continuará disponibilizando o conteúdo de
        origem. Quando forem oferecidos recursos automatizados de análise ou notificações, seus
        resultados serão informativos e poderão exigir revisão humana; não devem ser tratados como
        diagnóstico ou decisão definitiva.
      </p>
    </section>

    <section>
      <h2>4. Contas e serviços de terceiros</h2>
      <p>
        Você deve manter suas credenciais protegidas e informar a equipe da VPN se suspeitar de uso
        não autorizado. As contas Twitch e Discord permanecem sujeitas aos termos e controles de
        cada plataforma; a VPN não é operada por essas empresas.
      </p>
      <p>
        A integração OAuth com Discord está em implantação. Quando disponibilizada, servirá para
        vincular uma identidade Discord à conta VPN e, se você optar por isso, configurar o
        recebimento de notificações relacionadas ao serviço.
      </p>
      <p>
        As integrações também seguem os
        <a
          href="https://support-dev.discord.com/hc/en-us/articles/8562894815383-Discord-Developer-Terms-of-Service"
          target="_blank"
          rel="noreferrer"
        >
          Termos para Desenvolvedores do Discord
        </a>
        e a
        <a
          href="https://support-dev.discord.com/hc/en-us/articles/8563934450327-Discord-Developer-Policy"
          target="_blank"
          rel="noreferrer"
        >
          Política para Desenvolvedores do Discord
        </a>
        .
      </p>
    </section>

    <section>
      <h2>5. Disponibilidade e alterações</h2>
      <p>
        A VPN pode atualizar, suspender ou encerrar recursos para manutenção, segurança ou evolução
        do serviço. Também podemos atualizar estes termos; a data no início da página indica a
        revisão mais recente.
      </p>
    </section>

    <section>
      <h2>6. Contato</h2>
      <p>
        Para dúvidas, relatos de abuso ou pedidos relacionados à sua conta, entre em contato com a
        administração pelo servidor oficial da VPN no Discord.
      </p>
    </section>
  </LegalPage>
</template>
