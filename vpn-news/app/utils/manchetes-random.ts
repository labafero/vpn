const manchetes = [
  // Bastidores, Perrengues e Erros da Equipe
  "IMAGENS EXCLUSIVAS: Repórter esqueceu de ligar o microfone e está apenas gesticulando há 5 minutos",
  "URGENTE: Cinegrafista afirma que está gravando tudo, mas a lente está com o protetor",
  "ESTAMOS AO VIVO: Nossa equipe está cobrindo o evento de dentro de um arbusto por segurança",
  "ALERTA: Produtor avisa que se a equipe for assaltada de novo, o prejuízo será descontado do salário",
  "AO VIVO: Câmera 2 está correndo de um pitbull neste exato momento",

  // Caos Urbano e Cotidiano Absurdo
  "TRÂNSITO: Motorista tenta passar por cima de cinco carros na contramão e alega 'pressão baixa'",
  "EXCLUSIVO: Cidadão afirma que bateu o carro a 200 km/h porque 'o asfalto renderizou depois'",
  "POLICIAL: Suspeito foge da polícia a pé por falta de combustível e para no meio da perseguição para comer um hot dog",
  "INVESTIGAÇÃO: Homem afirma que caiu no limbo e voltou sem as calças; psicólogos analisam o caso",
  "CIDADE: População reclama de indivíduos que conversam olhando fixamente para a parede",

  // Jornalismo de Alta Qualidade
  "REPORTAGEM ESPECIAL: Descobrimos quem é o homem que fica parado na praça socando o vento",
  "DENÚNCIA: Cidadãos exigem que a prefeitura proíba o uso de buzinas de palhaço em carros esportivos",
  "ENTREVISTA: Falamos com o homem que sobreviveu a uma queda do Mount Chiliad apenas usando um energético",
  "ECONOMIA: Preço do conserto de lataria sobe após 99% da cidade esquecer onde fica o freio",

  // Facções, Polícia e Confusões Locais
  "POLÍCIA: Oficial confunde caixa eletrônico com suspeito armado e efetua disparos",
  "ENTRETENIMENTO: Facção local faz pausa em tiroteio para decidir quem vai pagar a pizza",
  "URGENTE: Assaltante pede desculpas ao refém por não ter espaço no porta-malas e promete levá-lo no banco da frente",
  "CRIME: Ladrão de carros é preso após tentar roubar uma viatura com dois policiais dentro",
];

export default function getRandomManchete(): string {
  return (
    manchetes[Math.floor(Math.random() * manchetes.length)] ?? manchetes[0]!
  );
}
