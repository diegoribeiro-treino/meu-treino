// Fichas de treino. Para cadastrar uma nova ficha, copie a estrutura do A1
// e troque os dados. Os "id" dos exercícios precisam ser únicos: são eles
// que ligam o histórico de cargas a cada exercício.
// "video" é o código do vídeo no YouTube (o que vem depois de watch?v= ou shorts/);
// use vertical: true para Shorts (vídeo em pé).

// Dia da semana (0 = domingo) -> ficha do dia
const PLANO_SEMANAL = { 1: 'A1', 2: 'B1', 3: 'A2', 4: 'B2', 5: 'A3', 6: 'B3', 0: null };

const FICHAS = ['A1', 'B1', 'A2', 'B2', 'A3', 'B3'];

const TIPO_FICHA = {
  A1: 'Superiores', A2: 'Superiores', A3: 'Superiores',
  B1: 'Inferiores', B2: 'Inferiores', B3: 'Inferiores',
};

const TREINOS = {
  A1: {
    titulo: 'Treino A1',
    tipo: 'Membros superiores',
    resumo: '3 peito · 3 costas · 2 ombros · 2 bíceps · 2 tríceps',
    instrucoes:
      '2 voltas por bloco = 2 séries por exercício. Faça os exercícios na ordem, descanse e repita o bloco antes de avançar. ' +
      'Carga: termine cada série podendo fazer mais 2-3 repetições com boa execução.',
    cardioInicial: {
      titulo: 'Cardio inicial · 15 min',
      texto: 'Esteira: 5 min leves + 10 min moderados (esforço 5-6/10). Mantenha intensidade que não prejudique o treino de força.',
    },
    preparacao: [
      'Deslizamento unilateral na parede: 1 × 8-10 por lado, sem arquear a lombar.',
      'Rotação externa com elástico: 1 × 12-15 por lado, carga leve e cotovelo junto ao corpo.',
      'Aproximação: 1-2 séries leves de supino e puxada antes do bloco 1 (não contam nas séries principais).',
    ],
    blocos: [
      {
        nome: 'Bloco 1', foco: 'Peito / costas', voltas: 2, descanso: [90, 120],
        exercicios: [
          { id: 'a1-supino-reto-halteres', grupo: 'Peito', nome: 'Supino reto com halteres', carga: 'halter', reps: [8, 10],
            video: 'jrT3xWa0U9M', vertical: true,
            dica: 'Pés apoiados; desça com controle e mantenha os ombros estáveis.' },
          { id: 'a1-puxada-frontal', grupo: 'Costas', nome: 'Puxada frontal na polia', carga: 'total', reps: [10, 12],
            video: 'gUfVYr5AaYE', vertical: true,
            dica: 'Puxe pela frente, conduzindo os cotovelos para baixo; não balance o tronco.' },
        ],
      },
      {
        nome: 'Bloco 2', foco: 'Peito / costas', voltas: 2, descanso: [75, 90],
        exercicios: [
          { id: 'a1-supino-inclinado-maquina', grupo: 'Peito', nome: 'Supino inclinado na máquina', carga: 'total', reps: [10, 12],
            video: 'o5sldArvmbw',
            dica: 'Ajuste o banco; mantenha as costas apoiadas e empurre sem impulso.' },
          { id: 'a1-remada-baixa-neutra', grupo: 'Costas', nome: 'Remada baixa na polia (pegada neutra)', carga: 'total', reps: [10, 12],
            video: 'Sfqn5IauoN8', vertical: true,
            dica: 'Tronco firme; traga o pegador ao abdome e retorne de forma controlada.' },
        ],
      },
      {
        nome: 'Bloco 3', foco: 'Peito / costas', voltas: 2, descanso: [60, 90],
        exercicios: [
          { id: 'a1-crucifixo-peck-deck', grupo: 'Peito', nome: 'Crucifixo na máquina (peck deck)', carga: 'total', reps: [12, 15],
            video: 'Slz8I1rybUY',
            dica: 'Ajuste os apoios; aproxime os braços sem levar os ombros para a frente.' },
          { id: 'a1-pullover-polia', grupo: 'Costas', nome: 'Pullover na polia alta', carga: 'total', reps: [12, 15],
            video: 'VOrBWx7bwyo', vertical: true,
            dica: 'Braços quase estendidos; leve o pegador às coxas, sem arquear a lombar.' },
        ],
      },
      {
        nome: 'Bloco 4', foco: 'Ombros / bíceps / tríceps', voltas: 2, descanso: [60, 90],
        exercicios: [
          { id: 'a1-desenvolvimento-halteres', grupo: 'Ombros', nome: 'Desenvolvimento sentado com halteres', carga: 'halter', reps: [10, 12],
            video: 'eufDL9MmF8A',
            dica: 'Costas apoiadas; eleve os halteres com controle, sem compensar com a lombar.' },
          { id: 'a1-rosca-inclinada', grupo: 'Bíceps', nome: 'Rosca inclinada com halteres', carga: 'halter', reps: [10, 12],
            video: 'tiWfdwgbrBQ',
            dica: 'Costas apoiadas, palmas à frente; flexione os cotovelos sem avançar os braços.' },
          { id: 'a1-triceps-corda', grupo: 'Tríceps', nome: 'Tríceps na corda', carga: 'total', reps: [10, 12],
            video: 'M-DTY40JG9M',
            dica: 'Cotovelos junto ao corpo; estenda os braços e controle o retorno.' },
        ],
      },
      {
        nome: 'Bloco 5', foco: 'Ombros / bíceps / tríceps', voltas: 2, descanso: [60, 90],
        exercicios: [
          { id: 'a1-elevacao-lateral', grupo: 'Ombros', nome: 'Elevação lateral com halteres', carga: 'halter', reps: [12, 15],
            video: 'XMMRx3qM_aA', vertical: true,
            dica: 'Eleve até a linha dos ombros, sem balanço ou encolhimento.' },
          { id: 'a1-rosca-martelo', grupo: 'Bíceps', nome: 'Rosca martelo com halteres', carga: 'halter', reps: [10, 12],
            video: 'ZiasEcCg0wg',
            dica: 'Palmas voltadas uma para a outra; mantenha os cotovelos próximos ao tronco.' },
          { id: 'a1-triceps-frances', grupo: 'Tríceps', nome: 'Tríceps francês bilateral com um halter', carga: 'unico', reps: [12, 15],
            video: 'gB-QMYMlHLs',
            dica: 'Segure com as duas mãos; flexione e estenda os cotovelos sem arquear as costas.' },
        ],
      },
    ],
    mobilidade: [
      'Livro aberto (rotação torácica deitado de lado): 1 × 8 por lado. Abra o braço e gire o tórax, mantendo os joelhos juntos.',
      'Alongamento de peitoral na parede: 1 × 30 s por lado, suave e sem dor.',
    ],
    cardioFinal: {
      titulo: 'Cardio final opcional · 15 min',
      texto: 'Bicicleta ou esteira: 12 min moderados + 3 min leves. Pode retirar este cardio quando o horário apertar.',
    },
    progressao:
      'Quando completar o topo da faixa nas duas séries, com boa técnica e cerca de 2 repetições de reserva, aumente a carga pelo menor incremento disponível. ' +
      'Evite a falha nesta fase; se surgir dor articular, interrompa o exercício e ajuste com o profissional.',
  },
  B1: null,
  A2: null,
  B2: null,
  A3: null,
  B3: null,
};
