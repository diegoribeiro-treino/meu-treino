// Fichas de treino. Para cadastrar uma nova ficha, copie a estrutura do A1
// e troque os dados. Os "id" dos exercícios precisam ser únicos: são eles
// que ligam o histórico de cargas a cada exercício.
// "video" é o código do vídeo no YouTube (o que vem depois de watch?v= ou shorts/);
// use vertical: true para Shorts (vídeo em pé).
// "carga": halter (kg por halter) · total (kg da máquina/barra) · unico (um halter)
//          assist (kg de assistência: menos é progresso) · corporal (sem carga) · elastico (cor/nível do elástico)
// "lado": texto ao lado das repetições (ex.: 'por perna'). "extra": campo livre a anotar (ex.: altura do degrau).
// Blocos com modo: 'series' são séries tradicionais (descanso após cada série);
// sem modo, o bloco é feito em voltas (descanso após cada volta).

// Ordem da sequência. Não há dia fixo: o app sugere a ficha seguinte à última feita,
// e qualquer ficha pode ser escolhida em qualquer dia (inclusive domingo).
const FICHAS = ['A1', 'B1', 'A2', 'B2', 'A3', 'B3'];

const TIPO_FICHA = {
  A1: 'Superiores', A2: 'Superiores', A3: 'Superiores',
  B1: 'Inferiores', B2: 'Inferiores', B3: 'Inferiores',
};

// Trechos comuns às fichas
const CARDIO_FINAL = {
  titulo: 'Cardio final opcional · 15 min',
  texto: 'Bicicleta ou esteira: 12 min moderados + 3 min leves. Pode retirar este cardio quando o horário apertar.',
};
const PROGRESSAO =
  'Quando completar o topo da faixa nas duas séries, com técnica estável e cerca de 2 repetições de reserva, ' +
  'aumente a carga pelo menor incremento disponível. Evite a falha nesta fase.';

const BASE_A = {
  tipo: 'Membros superiores',
  resumo: '3 peito · 3 costas · 2 ombros · 2 bíceps · 2 tríceps',
  instrucoes:
    '2 voltas por bloco = 2 séries por exercício. Faça os exercícios na ordem, descanse e repita o bloco antes de avançar. ' +
    'Troque de exercício com calma; pause mais se precisar recuperar a técnica. ' +
    'Carga: termine cada série podendo fazer mais 2-3 repetições com boa execução.',
  cardioInicial: {
    titulo: 'Cardio inicial · 15 min',
    texto: 'Esteira: 5 min leves + 10 min moderados (esforço 5-6/10). Mantenha intensidade que não prejudique o treino de força.',
  },
  cardioFinal: CARDIO_FINAL,
  progressao: PROGRESSAO,
};
const APROXIMACAO_A = 'Aproximação: 1-2 séries leves do primeiro supino e da primeira puxada/remada (não contam nas 24 séries principais).';

const BASE_B = {
  tipo: 'Membros inferiores',
  resumo: '3 quadríceps · 3 posteriores · 2 glúteos · 2 panturrilhas',
  instrucoes:
    '2 séries por exercício, em séries tradicionais: complete as duas séries de um exercício antes de passar ao próximo. ' +
    'Use 2-3 repetições de reserva. No terra, deixe 3 repetições de reserva; sem circuito rápido. ' +
    'Unilaterais: faça os dois lados para completar uma série.',
  cardioInicial: {
    titulo: 'Cardio inicial · 15 min',
    texto: 'Bicicleta: 5 min leves + 10 min moderados (esforço 4-5/10). Ajuste o banco e a resistência para pedalar sem dor.',
  },
  tituloPreparacao: 'Preparação e joelho',
  preparacao: [
    'Aproximação: 2-3 séries leves do terra e 1-2 do primeiro exercício de quadríceps (não contam nas 20 séries principais).',
    'Joelho: use amplitude confortável. Se doer, reduza carga/amplitude; se persistir ou piorar depois, interrompa e ajuste com o profissional.',
  ],
  tituloMobilidade: 'Mobilidade e equilíbrio',
  cardioFinal: CARDIO_FINAL,
  progressao: PROGRESSAO,
};

// O terra romeno se repete nas três fichas B com o mesmo id: o histórico de carga é compartilhado.
const terraRomeno = (dica) => ({
  nome: 'Terra', foco: 'Posteriores', modo: 'series', voltas: 2, descanso: [120, 180],
  exercicios: [
    { id: 'b-terra-romeno-barra', grupo: 'Posteriores', nome: 'Levantamento terra romeno com barra', carga: 'total', reps: [8, 10],
      video: 'QdNf6K1fbaQ', dica },
  ],
});

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

  B1: {
    ...BASE_B,
    titulo: 'Treino B1',
    blocos: [
      terraRomeno('Joelhos levemente flexionados; leve o quadril para trás, barra junto às pernas. Pare antes de perder a coluna estável.'),
      {
        nome: 'Quadríceps', foco: '2 séries por exercício', modo: 'series', voltas: 2, descanso: [90, 120],
        exercicios: [
          { id: 'b1-leg-press-45', grupo: 'Quadríceps', nome: 'Leg press 45°', carga: 'total', reps: [10, 12],
            video: 'waAxlYvtCcI',
            dica: 'Quadril e costas apoiados; desça na amplitude confortável e não trave os joelhos.' },
          { id: 'b1-agachamento-goblet', grupo: 'Quadríceps', nome: 'Agachamento goblet', carga: 'unico', reps: [10, 12],
            video: 'jaglUwcC1zE', vertical: true,
            dica: 'Halter diante do peito; pés apoiados e joelhos acompanhando a direção dos pés.' },
          { id: 'b1-extensora-bilateral', grupo: 'Quadríceps', nome: 'Cadeira extensora bilateral', carga: 'total', reps: [12, 15],
            video: '--p0Ff7R-Io',
            dica: 'Alinhe o eixo ao joelho; estenda com controle, na amplitude tolerada, sem chutar.' },
        ],
      },
      {
        nome: 'Posteriores', foco: '2 séries por exercício', modo: 'series', voltas: 2, descanso: [60, 90],
        exercicios: [
          { id: 'b1-cadeira-flexora', grupo: 'Posteriores', nome: 'Cadeira flexora bilateral', carga: 'total', reps: [10, 12],
            video: 'rdZS_kgnjZs',
            dica: 'Ajuste os apoios; flexione os joelhos sem tirar o quadril do assento.' },
          { id: 'b1-mesa-flexora-bilateral', grupo: 'Posteriores', nome: 'Mesa flexora bilateral', carga: 'total', reps: [12, 15],
            video: 'wUobhTUtvn4',
            dica: 'Quadril apoiado; aproxime os calcanhares sem arquear a lombar.' },
        ],
      },
      {
        nome: 'Glúteos', foco: '2 séries por exercício', modo: 'series', voltas: 2, descanso: [60, 90],
        exercicios: [
          { id: 'b1-hip-thrust', grupo: 'Glúteos', nome: 'Elevação pélvica com barra (hip thrust)', carga: 'total', reps: [10, 12],
            video: 'vvIc6wdDyTc',
            dica: 'Apoie as escápulas no banco; eleve o quadril sem hiperestender a lombar.' },
          { id: 'b1-cadeira-abdutora', grupo: 'Glúteos', nome: 'Cadeira abdutora', carga: 'total', reps: [12, 15],
            video: 'fY25005DmLs',
            dica: 'Abra os joelhos com controle, sem impulso e com o tronco estável.' },
        ],
      },
      {
        nome: 'Panturrilhas', foco: '2 séries por exercício', modo: 'series', voltas: 2, descanso: [45, 60],
        exercicios: [
          { id: 'b1-panturrilha-pe-maquina', grupo: 'Panturrilhas', nome: 'Panturrilha em pé na máquina', carga: 'total', reps: [12, 15],
            video: '4_bpk2pfB8A',
            dica: 'Joelhos estendidos sem travar; eleve e desça os calcanhares sem quicar.' },
          { id: 'b1-panturrilha-sentada-maquina', grupo: 'Panturrilhas', nome: 'Panturrilha sentada na máquina', carga: 'total', reps: [15, 20],
            video: 'VMF0WZZ_BTU', vertical: true,
            dica: 'Joelhos flexionados; suba na ponta dos pés e controle a descida.' },
        ],
      },
    ],
    core: [
      'Prancha frontal: 2 × 20-30 s, tronco alinhado e respirando.',
      'Dead bug: 2 × 8 por lado; estenda braço e perna opostos sem arquear a lombar. Descanse 30-45 s entre séries.',
    ],
    mobilidade: [
      'Mobilidade de tornozelo na parede: 1 × 10 por lado, calcanhar apoiado.',
      'Flexores do quadril em meio-ajoelhado: 1 × 30 s por lado; use acolchoamento. Se apoiar o joelho incomodar, faça em pé, em passada.',
    ],
  },

  A2: {
    ...BASE_A,
    titulo: 'Treino A2',
    preparacao: [
      'Flexão escapular na parede: 1 × 10; braços estendidos, aproxime e afaste o peito movendo as escápulas, sem dobrar os cotovelos.',
      APROXIMACAO_A,
    ],
    blocos: [
      {
        nome: 'Bloco 1', foco: 'Peito / costas', voltas: 2, descanso: [90, 120],
        exercicios: [
          { id: 'a2-supino-reto-barra', grupo: 'Peito', nome: 'Supino reto com barra', carga: 'total', reps: [8, 10],
            video: 'ZN7SuDQpNMk',
            dica: 'Pés apoiados; desça a barra com controle e use suporte de segurança ou auxílio.' },
          { id: 'a2-barra-fixa-assistida', grupo: 'Costas', nome: 'Barra fixa assistida com pegada neutra', carga: 'assist', reps: [8, 10],
            video: '6gRu22HoUsk', vertical: true,
            dica: 'Ajuste a assistência; puxe o corpo sem balanço e controle a descida.' },
        ],
      },
      {
        nome: 'Bloco 2', foco: 'Peito / costas', voltas: 2, descanso: [75, 90],
        exercicios: [
          { id: 'a2-supino-inclinado-halteres', grupo: 'Peito', nome: 'Supino inclinado com halteres', carga: 'halter', reps: [10, 12],
            video: 'o08b-jTMePQ',
            dica: 'Banco levemente inclinado; escápulas apoiadas e punhos alinhados.' },
          { id: 'a2-remada-peito-apoiado', grupo: 'Costas', nome: 'Remada com halteres e peito apoiado', carga: 'halter', reps: [10, 12],
            video: 'B0XfdJh_kJg',
            dica: 'De bruços no banco inclinado; puxe os cotovelos sem levantar o peito.' },
        ],
      },
      {
        nome: 'Bloco 3', foco: 'Peito / costas', voltas: 2, descanso: [60, 90],
        exercicios: [
          { id: 'a2-crossover-polia-alta', grupo: 'Peito', nome: 'Crucifixo na polia alta (crossover)', carga: 'total', reps: [12, 15],
            video: 'Ixx_nBb1yqo',
            dica: 'Cotovelos levemente flexionados; aproxime as mãos à frente e abaixo do peito.' },
          { id: 'a2-remada-unilateral-maquina', grupo: 'Costas', nome: 'Remada unilateral na máquina', carga: 'total', reps: [10, 12], lado: 'por lado',
            video: 'Ln7L7OU6lGY',
            dica: 'Tronco apoiado e imóvel; puxe um braço por vez, sem girar o corpo.' },
        ],
      },
      {
        nome: 'Bloco 4', foco: 'Ombros / bíceps / tríceps', voltas: 2, descanso: [60, 90],
        exercicios: [
          { id: 'a2-desenvolvimento-maquina', grupo: 'Ombros', nome: 'Desenvolvimento na máquina', carga: 'total', reps: [10, 12],
            video: 'xxr4_cPZfF0',
            dica: 'Ajuste o banco; empurre sem elevar os ombros nem arquear a lombar.' },
          { id: 'a2-rosca-direta-barra', grupo: 'Bíceps', nome: 'Rosca direta com barra', carga: 'total', reps: [10, 12],
            video: '85f7ODu2ztA',
            dica: 'Mantenha os cotovelos próximos ao tronco; suba sem embalar o corpo.' },
          { id: 'a2-triceps-barra-reta', grupo: 'Tríceps', nome: 'Tríceps na polia com barra reta', carga: 'total', reps: [10, 12],
            video: '0YMP0o15oT0', vertical: true,
            dica: 'Cotovelos estáveis junto ao corpo; estenda os braços e retorne devagar.' },
        ],
      },
      {
        nome: 'Bloco 5', foco: 'Ombros / bíceps / tríceps', voltas: 2, descanso: [60, 90],
        exercicios: [
          { id: 'a2-elevacao-lateral-polia', grupo: 'Ombros', nome: 'Elevação lateral unilateral na polia', carga: 'total', reps: [12, 15], lado: 'por lado',
            video: 'lKY3r_a5XcQ',
            dica: 'Eleve o braço até a linha do ombro, sem inclinar o tronco.' },
          { id: 'a2-rosca-scott-maquina', grupo: 'Bíceps', nome: 'Rosca Scott na máquina', carga: 'total', reps: [10, 12],
            video: '90sG3CFTz4E',
            dica: 'Braços apoiados; flexione os cotovelos e controle a descida sem forçar o fim da extensão.' },
          { id: 'a2-triceps-acima-cabeca-polia', grupo: 'Tríceps', nome: 'Tríceps acima da cabeça unilateral na polia', carga: 'total', reps: [12, 15], lado: 'por lado',
            video: 'KTRjCnWnzOU',
            dica: 'Cotovelo apontado para cima; estenda sem mover o ombro ou arquear as costas.' },
        ],
      },
    ],
    mobilidade: [
      'Rotação torácica em quatro apoios: 1 × 8 por lado; mão na nuca, gire o peito sem deslocar o quadril.',
      'Alongamento de dorsais no banco: 1 × 30 s; mãos apoiadas, leve o quadril para trás sem forçar os ombros.',
    ],
  },

  B2: {
    ...BASE_B,
    titulo: 'Treino B2',
    blocos: [
      terraRomeno('Joelhos levemente flexionados; leve o quadril para trás e mantenha a barra perto das pernas.'),
      {
        nome: 'Quadríceps', foco: '2 séries por exercício', modo: 'series', voltas: 2, descanso: [90, 120],
        exercicios: [
          { id: 'b2-agachamento-hack', grupo: 'Quadríceps', nome: 'Agachamento hack na máquina', carga: 'total', reps: [10, 12],
            video: 'Whp712OHPl8',
            dica: 'Costas apoiadas; pés firmes e amplitude tolerada pelo joelho, sem perder o apoio do quadril.' },
          { id: 'b2-afundo-reverso', grupo: 'Quadríceps', nome: 'Afundo reverso com halteres', carga: 'halter', reps: [8, 10], lado: 'por perna',
            video: 'KFZJtZsk-xE',
            dica: 'Dê o passo para trás; mantenha o joelho da frente alinhado e use apoio se necessário.' },
          { id: 'b2-extensora-unilateral', grupo: 'Quadríceps', nome: 'Cadeira extensora unilateral', carga: 'total', reps: [12, 15], lado: 'por perna',
            video: 'SFydjG-LOPA',
            dica: 'Uma perna por vez, com carga leve; eixo alinhado ao joelho e movimento sem dor.' },
        ],
      },
      {
        nome: 'Posteriores', foco: '2 séries por exercício', modo: 'series', voltas: 2, descanso: [60, 90],
        exercicios: [
          { id: 'b2-flexao-joelho-pe-polia', grupo: 'Posteriores', nome: 'Flexão de joelho em pé na polia baixa', carga: 'total', reps: [12, 15], lado: 'por perna',
            video: 'B3LADRGJ0i0',
            dica: 'Use tornozeleira e apoio; leve o calcanhar para trás sem mover a coxa.' },
          { id: 'b2-flexao-joelhos-bola', grupo: 'Posteriores', nome: 'Flexão de joelhos na bola suíça', carga: 'corporal', reps: [10, 12],
            video: 'enrG6xvk_F4',
            dica: 'Deitado, calcanhares na bola; eleve o quadril e puxe a bola sem arquear a lombar.' },
        ],
      },
      {
        nome: 'Glúteos', foco: '2 séries por exercício', modo: 'series', voltas: 2, descanso: [60, 90],
        exercicios: [
          { id: 'b2-extensao-quadril-polia', grupo: 'Glúteos', nome: 'Extensão de quadril na polia baixa', carga: 'total', reps: [12, 15], lado: 'por lado',
            video: 'WUaqJWJT1_0',
            dica: 'Leve a perna para trás com o tronco estável; não arqueie a lombar.' },
          { id: 'b2-caminhada-lateral-miniband', grupo: 'Glúteos', nome: 'Caminhada lateral com miniband', carga: 'elastico', reps: [10, 12], lado: 'passos por direção',
            video: 'CCKC1jC2cQg',
            dica: 'Elástico acima dos joelhos; dê passos curtos sem deixar os joelhos caírem para dentro.' },
        ],
      },
      {
        nome: 'Panturrilhas', foco: '2 séries por exercício', modo: 'series', voltas: 2, descanso: [45, 60],
        exercicios: [
          { id: 'b2-panturrilha-leg-press', grupo: 'Panturrilhas', nome: 'Panturrilha no leg press 45°', carga: 'total', reps: [12, 15],
            video: 'F7_8z_7Kwks',
            dica: 'Apoie bem a parte anterior dos pés; mova os tornozelos, com joelhos estáveis, sem travar.' },
          { id: 'b2-panturrilha-unilateral-halter', grupo: 'Panturrilhas', nome: 'Panturrilha unilateral em pé com halter', carga: 'unico', reps: [12, 15], lado: 'por perna',
            video: 'eKM9BEkK9o4',
            dica: 'Segure um apoio fixo; suba e desça o calcanhar sem impulso.' },
        ],
      },
    ],
    core: [
      'Pallof press na polia: 2 × 10 por lado; estenda os braços sem girar o tronco.',
      'Bird dog: 2 × 8 por lado, em quatro apoios; estenda braço e perna opostos com o quadril nivelado. Descanso: 30-45 s.',
    ],
    mobilidade: [
      'Equilíbrio unilateral: 2 × 20-30 s por perna, perto de apoio fixo, sem fechar os olhos.',
      'Alongamento de posteriores deitado com faixa: 1 × 30 s por lado, joelho suavemente estendido, sem puxar até sentir dor.',
    ],
  },

  A3: {
    ...BASE_A,
    titulo: 'Treino A3',
    preparacao: [
      'Retração escapular com elástico: 1 × 12; braços à frente, abra suavemente o elástico sem elevar os ombros. Use resistência leve.',
      APROXIMACAO_A,
    ],
    blocos: [
      {
        nome: 'Bloco 1', foco: 'Peito / costas', voltas: 2, descanso: [90, 120],
        exercicios: [
          { id: 'a3-supino-inclinado-smith', grupo: 'Peito', nome: 'Supino inclinado no Smith', carga: 'total', reps: [8, 10],
            video: 'HdI6iAqZC1I',
            dica: 'Ajuste o banco e as travas; desça com controle, mantendo os ombros apoiados.' },
          { id: 'a3-puxada-supinada', grupo: 'Costas', nome: 'Puxada frontal com pegada supinada', carga: 'total', reps: [10, 12],
            video: 'SRh5HbCouE0',
            dica: 'Palmas para você; conduza os cotovelos para baixo sem balançar o tronco.' },
        ],
      },
      {
        nome: 'Bloco 2', foco: 'Peito / costas', voltas: 2, descanso: [75, 90],
        exercicios: [
          { id: 'a3-supino-horizontal-maquina', grupo: 'Peito', nome: 'Supino horizontal na máquina', carga: 'total', reps: [10, 12],
            video: '97BGDU2NtzU',
            dica: 'Pegadores na linha do peito; empurre com costas apoiadas e sem travar os cotovelos.' },
          { id: 'a3-remada-cavalinho', grupo: 'Costas', nome: 'Remada cavalinho com apoio peitoral', carga: 'total', reps: [10, 12],
            video: 'LY8CB4tRll4', vertical: true,
            dica: 'Mantenha o peito no apoio e puxe em direção ao tronco, sem dar impulso.' },
        ],
      },
      {
        nome: 'Bloco 3', foco: 'Peito / costas', voltas: 2, descanso: [60, 90],
        exercicios: [
          { id: 'a3-crucifixo-polia-baixo-cima', grupo: 'Peito', nome: 'Crucifixo na polia de baixo para cima', carga: 'total', reps: [12, 15],
            video: 'DFQPzkGfJ_A',
            dica: 'Eleve as mãos à frente até a altura do peito; mantenha os cotovelos semiflexionados.' },
          { id: 'a3-remada-alta-maquina-aberta', grupo: 'Costas', nome: 'Remada alta na máquina com pegada aberta', carga: 'total', reps: [10, 12],
            video: 'xpkNxVSN2ec',
            dica: 'Puxe ao tórax com o peito apoiado, cotovelos abertos e ombros longe das orelhas.' },
        ],
      },
      {
        nome: 'Bloco 4', foco: 'Ombros / bíceps / tríceps', voltas: 2, descanso: [60, 90],
        exercicios: [
          { id: 'a3-crucifixo-inverso-maquina', grupo: 'Ombros', nome: 'Crucifixo inverso na máquina', carga: 'total', reps: [12, 15],
            video: '5-HhI9yCuUo',
            dica: 'Peito apoiado; abra os braços com controle, sem encolher os ombros.' },
          { id: 'a3-rosca-polia-braco-atras', grupo: 'Bíceps', nome: 'Rosca unilateral na polia com braço atrás do corpo', carga: 'total', reps: [10, 12], lado: 'por lado',
            video: 'QwBfcFHCHds',
            dica: 'Braço ligeiramente atrás do tronco; flexione o cotovelo sem avançar o ombro.' },
          { id: 'a3-triceps-testa-ez', grupo: 'Tríceps', nome: 'Tríceps testa com barra EZ', carga: 'total', reps: [10, 12],
            video: 'LLpDSU-28FE',
            dica: 'Deitado, flexione os cotovelos com controle; use carga leve e mantenha os braços estáveis.' },
        ],
      },
      {
        nome: 'Bloco 5', foco: 'Ombros / bíceps / tríceps', voltas: 2, descanso: [60, 90],
        exercicios: [
          { id: 'a3-face-pull', grupo: 'Ombros', nome: 'Face pull com corda', carga: 'total', reps: [12, 15],
            video: 'z4cDN2oTVxQ',
            dica: 'Puxe a corda à altura dos olhos, afastando as mãos e sem inclinar o corpo para trás.' },
          { id: 'a3-rosca-concentrada', grupo: 'Bíceps', nome: 'Rosca concentrada com halter', carga: 'unico', reps: [10, 12], lado: 'por lado',
            video: 'kZhR6K5oVys',
            dica: 'Sentado, apoie o braço na parte interna da coxa e suba sem mover o ombro.' },
          { id: 'a3-triceps-coice-polia', grupo: 'Tríceps', nome: 'Tríceps coice unilateral na polia', carga: 'total', reps: [12, 15], lado: 'por lado',
            video: 'PMrFgbalUGU',
            dica: 'Incline o tronco com apoio; braço junto ao corpo, estenda apenas o cotovelo.' },
        ],
      },
    ],
    mobilidade: [
      'Extensão torácica sobre o encosto: 1 × 8, sentado; apoie o meio das costas e estenda suavemente sem forçar a lombar.',
      'Alongamento posterior do ombro: 1 × 30 s por lado; traga o braço à frente do peito, sem puxar com força.',
    ],
  },

  B3: {
    ...BASE_B,
    titulo: 'Treino B3',
    blocos: [
      terraRomeno('Leve o quadril para trás; barra próxima às pernas e coluna estável, sem buscar o chão.'),
      {
        nome: 'Quadríceps', foco: '2 séries por exercício', modo: 'series', voltas: 2, descanso: [90, 120],
        exercicios: [
          { id: 'b3-agachamento-smith', grupo: 'Quadríceps', nome: 'Agachamento no Smith', carga: 'total', reps: [10, 12],
            video: '4vA727LveHQ',
            dica: 'Ajuste pés e travas com o professor; desça apenas até a amplitude confortável.' },
          { id: 'b3-subida-degrau', grupo: 'Quadríceps', nome: 'Subida em degrau baixo com halteres', carga: 'halter', reps: [8, 10], lado: 'por perna', extra: 'Degrau (cm)',
            video: 'OXvpztvY2Sc',
            dica: 'Pé inteiro no degrau; suba pela perna apoiada, sem impulso da perna de baixo.' },
          { id: 'b3-leg-press-horizontal', grupo: 'Quadríceps', nome: 'Leg press horizontal', carga: 'total', reps: [10, 12],
            video: 'gTo0HfVcLxo',
            dica: 'Costas e quadril apoiados; controle a flexão do joelho e não trave na extensão.' },
        ],
      },
      {
        nome: 'Posteriores', foco: '2 séries por exercício', modo: 'series', voltas: 2, descanso: [60, 90],
        exercicios: [
          { id: 'b3-mesa-flexora-unilateral', grupo: 'Posteriores', nome: 'Mesa flexora unilateral', carga: 'total', reps: [10, 12], lado: 'por perna',
            video: 'AxhqsWRQfKc',
            dica: 'Trabalhe uma perna por vez; mantenha o quadril apoiado e não arqueie a lombar.' },
          { id: 'b3-flexao-joelhos-discos', grupo: 'Posteriores', nome: 'Flexão de joelhos com discos deslizantes', carga: 'corporal', reps: [8, 12],
            video: 'vbrSFN-UWYU',
            dica: 'Deitado, calcanhares nos discos; eleve o quadril e deslize os pés para perto com controle.' },
        ],
      },
      {
        nome: 'Glúteos', foco: '2 séries por exercício', modo: 'series', voltas: 2, descanso: [60, 90],
        exercicios: [
          { id: 'b3-ponte-unilateral', grupo: 'Glúteos', nome: 'Ponte de glúteo unilateral no solo', carga: 'corporal', reps: [10, 12], lado: 'por perna',
            video: 'qAYFKJsnqEM',
            dica: 'Um pé apoiado; eleve o quadril sem girar a pelve nem arquear a lombar.' },
          { id: 'b3-abducao-polia', grupo: 'Glúteos', nome: 'Abdução de quadril na polia baixa', carga: 'total', reps: [12, 15], lado: 'por lado',
            video: 'r_-tKXR2AIA',
            dica: 'Use apoio fixo; leve a perna para o lado sem inclinar o tronco.' },
        ],
      },
      {
        nome: 'Panturrilhas', foco: '2 séries por exercício', modo: 'series', voltas: 2, descanso: [45, 60],
        exercicios: [
          { id: 'b3-panturrilha-pe-smith', grupo: 'Panturrilhas', nome: 'Panturrilha em pé no Smith', carga: 'total', reps: [12, 15],
            video: 'ybjCv9Zek6I',
            dica: 'Barra sobre o trapézio, travas ajustadas; eleve os calcanhares sem balançar.' },
          { id: 'b3-panturrilha-sentada-halteres', grupo: 'Panturrilhas', nome: 'Panturrilha sentada com halteres', carga: 'halter', reps: [15, 20],
            video: 'EwO5YRwvv1c',
            dica: 'Halteres apoiados e protegidos sobre as coxas; mova os tornozelos sem quicar.' },
        ],
      },
    ],
    core: [
      'Prancha lateral com joelhos apoiados: 2 × 20-30 s por lado; quadril alinhado, sem prender a respiração.',
      'Abdominal reverso: 2 × 10; aproxime os joelhos elevando levemente a pelve, sem embalo. Descanso: 30-45 s.',
    ],
    mobilidade: [
      'Mobilidade de quadril sentado (90/90): 1 × 6 alternâncias lentas, com mãos apoiadas; não force os joelhos.',
      'Alongamento de panturrilha na parede: 1 × 30 s por lado, calcanhar apoiado e pé apontado para a frente.',
    ],
  },
};
