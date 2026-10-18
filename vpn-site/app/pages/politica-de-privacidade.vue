<script setup lang="ts">
useSeoMeta({
  title: 'Política de privacidade — VPN Roleplay',
  description: 'Como a VPN Roleplay usa e protege dados necessários aos seus serviços.',
  ogTitle: 'Política de privacidade — VPN Roleplay',
  ogDescription: 'Informações sobre dados, integrações, retenção e solicitações de privacidade.'
})
</script>

<template>
  <LegalPage
    title="Política de privacidade"
    description="Esta política resume os dados tratados pela VPN Roleplay e como pedir acesso, correção ou exclusão."
    current="privacy"
  >
    <section>
      <h2>1. Dados que tratamos</h2>
      <ul>
        <li>
          <strong class="text-white">Conta VPN:</strong>
          identificadores da conta e dados de cadastro fornecidos durante a autenticação.
        </li>
        <li>
          <strong class="text-white">Twitch:</strong>
          identificador e nome do canal, estado da conexão e do consentimento, metadados de sessões
          autorizadas e referências/metadados básicos dos clips enviados. O recurso atual de clips
          não persiste o arquivo de vídeo, captions ou transcrição.
        </li>
        <li>
          <strong class="text-white">Discord, quando a vinculação for ativada:</strong>
          identificador da conta e dados básicos de perfil retornados após sua autorização, como
          nome de usuário, nome de exibição e avatar, quando disponíveis. A vinculação não precisa
          do seu e-mail, mensagens ou lista de servidores.
        </li>
        <li>
          <strong class="text-white">Dados técnicos:</strong>
          registros básicos de acesso e segurança, como horário, endereço IP e informações da
          requisição processadas pela hospedagem.
        </li>
      </ul>
    </section>

    <section>
      <h2>2. Para que usamos os dados</h2>
      <p>
        Usamos esses dados para autenticar sua conta, vincular os serviços que você autorizar,
        respeitar o consentimento e as permissões do dono do canal, manter o histórico necessário
        das sessões e clips enviados, proteger o serviço e prestar suporte.
      </p>
      <p>
        Quando a integração Discord estiver disponível, a identificação básica será usada para
        associar o destinatário à conta VPN. Notificações só serão configuradas ou enviadas conforme
        as opções que você ou o responsável autorizado selecionar.
      </p>
    </section>

    <section>
      <h2>3. Compartilhamento</h2>
      <p>
        A VPN usa prestadores de hospedagem, autenticação e banco de dados, incluindo Vercel e
        Supabase. Twitch e Discord recebem ou fornecem dados quando você usa as respectivas
        integrações. Se você optar por receber uma notificação no Discord, os dados necessários para
        entregá-la serão enviados à plataforma.
      </p>
      <p>
        Não vendemos dados pessoais nem os compartilhamos com redes de publicidade. O acesso interno
        é limitado às pessoas autorizadas a operar o serviço e ao necessário para suporte, segurança
        e funcionamento.
      </p>
    </section>

    <section>
      <h2>4. Retenção e exclusão</h2>
      <p>
        Mantemos dados de conta enquanto ela estiver ativa e dados de integrações enquanto forem
        necessários para a função autorizada. Referências de clips pendentes não expiram
        automaticamente: permanecem até serem processadas ou removidas a pedido. A regra prevista
        para registros finalizados é conservar somente metadados mínimos por até 90 dias após a
        conclusão; a rotina automática de limpeza ainda não está agendada em produção, então você
        pode pedir a remoção a qualquer momento. Tokens Twitch são protegidos no servidor e deixam
        de ser usados após a desconexão; se a Twitch estiver indisponível, uma tentativa limitada de
        revogação pode ser necessária.
      </p>
      <p>
        Quando a vinculação Discord estiver disponível, a identidade vinculada será mantida enquanto
        a conexão estiver ativa e removida ao desvincular ou mediante pedido. Ao solicitar a
        exclusão da conta ou de outros dados, a VPN interrompe o uso correspondente e remove os
        dados que não precisem ser mantidos por obrigação legal ou segurança operacional. Dados
        mantidos por terceiros seguem as políticas dessas plataformas.
      </p>
    </section>

    <section>
      <h2>5. Seus pedidos e controles</h2>
      <p>
        Você pode desconectar a Twitch pela área privada da VPN e revogar autorizações Discord nas
        configurações da sua conta Discord. Para solicitar acesso, correção ou exclusão de dados da
        VPN, entre em contato com a administração pelo servidor oficial da VPN no Discord. Não envie
        senhas ou tokens de acesso no pedido.
      </p>
    </section>

    <section>
      <h2>6. Segurança</h2>
      <p>
        Aplicamos controles de acesso e medidas técnicas para proteger dados contra uso ou acesso
        não autorizado. Nenhum serviço conectado à internet pode garantir segurança absoluta; se
        identificarmos um incidente que afete seus dados, trataremos e comunicaremos conforme as
        regras aplicáveis.
      </p>
    </section>

    <section>
      <h2>7. Atualizações</h2>
      <p>
        Podemos atualizar esta política quando os recursos ou integrações mudarem. A data no início
        da página identifica a revisão mais recente. A versão vigente permanece disponível neste
        endereço público.
      </p>
      <p>
        Ao usar Twitch ou Discord, você também está sujeito às políticas próprias dessas
        plataformas:
        <a
          href="https://www.twitch.tv/p/legal/privacy-notice/"
          target="_blank"
          rel="noreferrer"
        >
          Privacidade da Twitch
        </a>
        e
        <a
          href="https://discord.com/privacy"
          target="_blank"
          rel="noreferrer"
        >
          Privacidade do Discord
        </a>
        .
      </p>
    </section>
  </LegalPage>
</template>
