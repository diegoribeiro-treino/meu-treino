'use strict';

// Treinos registrados antes desta versão, vindos do backup de 13/11/2026.
// Entram uma única vez no perfil dono (o id evita duplicar se o treino já estiver no aparelho).
// Só os treinos são importados: a cópia antiga da ficha A1 que veio no backup não é usada.
const HISTORICO_IMPORTADO = [
  {
    "id": "mweupui464a4s",
    "treino": "B1",
    "data": "2026-11-13",
    "inicio": 1794566765740,
    "termino": 1794570491479,
    "duracaoMin": 62,
    "registroManual": false,
    "series": {
      "b-terra-romeno-barra": [
        {
          "kg": "60",
          "reps": "10",
          "ok": true
        },
        {
          "kg": "60",
          "reps": "12",
          "ok": true
        }
      ],
      "b1-leg-press-45": [
        {
          "kg": "80",
          "reps": "10",
          "ok": true
        },
        {
          "kg": "80",
          "reps": "10",
          "ok": true
        }
      ],
      "b1-agachamento-goblet": [
        {
          "kg": "20",
          "reps": "10",
          "ok": true
        },
        {
          "kg": "20",
          "reps": "10",
          "ok": true
        }
      ],
      "b1-extensora-bilateral": [
        {
          "kg": "25,4",
          "reps": "12",
          "ok": true
        },
        {
          "kg": "25,4",
          "reps": "12",
          "ok": true
        }
      ],
      "b1-cadeira-flexora": [
        {
          "kg": "32",
          "reps": "12",
          "ok": true
        },
        {
          "kg": "32",
          "reps": "12",
          "ok": true
        }
      ],
      "b1-mesa-flexora-bilateral": [
        {
          "kg": "25,4",
          "reps": "12",
          "ok": true
        },
        {
          "kg": "25,4",
          "reps": "12",
          "ok": true
        }
      ],
      "b1-hip-thrust": [
        {
          "kg": "25",
          "reps": "10",
          "ok": true
        },
        {
          "kg": "25",
          "reps": "12",
          "ok": true
        }
      ],
      "b1-cadeira-abdutora": [
        {
          "kg": "52,6",
          "reps": "12",
          "ok": true
        },
        {
          "kg": "66,2",
          "reps": "12",
          "ok": true
        }
      ],
      "b1-panturrilha-pe-maquina": [
        {
          "kg": "40",
          "reps": "15",
          "ok": true
        },
        {
          "kg": "40",
          "reps": "15",
          "ok": true
        }
      ],
      "b1-panturrilha-sentada-maquina": [
        {
          "kg": "20",
          "reps": "15",
          "ok": true
        },
        {
          "kg": "20",
          "reps": "15",
          "ok": true
        }
      ]
    },
    "checks": {
      "cardioIni": true,
      "prep": [
        true,
        true
      ],
      "core": [
        true,
        true
      ],
      "mob": [
        true,
        true
      ]
    },
    "extras": {},
    "cardioFinal": "dispensado",
    "esforco": 6,
    "notas": "Sem observações",
    "nomes": {
      "b-terra-romeno-barra": {
        "nome": "Levantamento terra romeno com barra",
        "grupo": "Posteriores",
        "carga": "total",
        "reps": [
          8,
          10
        ],
        "lado": ""
      },
      "b1-leg-press-45": {
        "nome": "Leg press 45°",
        "grupo": "Quadríceps",
        "carga": "total",
        "reps": [
          10,
          12
        ],
        "lado": ""
      },
      "b1-agachamento-goblet": {
        "nome": "Agachamento goblet",
        "grupo": "Quadríceps",
        "carga": "unico",
        "reps": [
          10,
          12
        ],
        "lado": ""
      },
      "b1-extensora-bilateral": {
        "nome": "Cadeira extensora bilateral",
        "grupo": "Quadríceps",
        "carga": "total",
        "reps": [
          12,
          15
        ],
        "lado": ""
      },
      "b1-cadeira-flexora": {
        "nome": "Cadeira flexora bilateral",
        "grupo": "Posteriores",
        "carga": "total",
        "reps": [
          10,
          12
        ],
        "lado": ""
      },
      "b1-mesa-flexora-bilateral": {
        "nome": "Mesa flexora bilateral",
        "grupo": "Posteriores",
        "carga": "total",
        "reps": [
          12,
          15
        ],
        "lado": ""
      },
      "b1-hip-thrust": {
        "nome": "Elevação pélvica com barra (hip thrust)",
        "grupo": "Glúteos",
        "carga": "total",
        "reps": [
          10,
          12
        ],
        "lado": ""
      },
      "b1-cadeira-abdutora": {
        "nome": "Cadeira abdutora",
        "grupo": "Glúteos",
        "carga": "total",
        "reps": [
          12,
          15
        ],
        "lado": ""
      },
      "b1-panturrilha-pe-maquina": {
        "nome": "Panturrilha em pé na máquina",
        "grupo": "Panturrilhas",
        "carga": "total",
        "reps": [
          12,
          15
        ],
        "lado": ""
      },
      "b1-panturrilha-sentada-maquina": {
        "nome": "Panturrilha sentada na máquina",
        "grupo": "Panturrilhas",
        "carga": "total",
        "reps": [
          15,
          20
        ],
        "lado": ""
      }
    },
    "planejadas": 20
  }
];

function importarHistorico() {
  db.config.importacoes ??= [];
  if (db.config.importacoes.includes('backup-2026-11-13')) return;
  for (const s of HISTORICO_IMPORTADO) {
    if (!db.sessoes.some((x) => x.id === s.id)) db.sessoes.push(structuredClone(s));
  }
  db.config.importacoes.push('backup-2026-11-13');
}
