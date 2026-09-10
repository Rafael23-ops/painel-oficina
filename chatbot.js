const express = require("express");
const app = express();
const dados = require("./dados");
const db = require("./database");

app.use(express.json());


// ===============================
// AUTENTICAÇÃO DO PAINEL
// ===============================

const USUARIO_PAINEL = "oficina";
const SENHA_PAINEL = "Oficina@2026";

const sessoes = new Set();


// ===============================
// GERAR TOKEN
// ===============================

function gerarToken() {
    return require("crypto")
        .randomBytes(32)
        .toString("hex");
}


// ===============================
// LOGIN
// ===============================

app.post("/login", function(req, res) {

    const usuario = String(req.body.usuario || "").trim();
    const senha = String(req.body.senha || "");

    if (
        usuario !== USUARIO_PAINEL ||
        senha !== SENHA_PAINEL
    ) {
        return res.status(401).json({
            sucesso: false,
            erro: "Usuário ou senha incorretos."
        });
    }

    const token = gerarToken();

    sessoes.add(token);

    res.setHeader(
    "Set-Cookie",
    "tokenPainel=" + token + "; HttpOnly; Path=/; SameSite=Strict"
);

return res.json({
    sucesso: true
});
});


// ===============================
// PROTEÇÃO DO PAINEL
// ===============================

function autenticarPainel(req, res, next) {

    const cookies = req.headers.cookie || "";

    const encontrado = cookies
        .split(";")
        .map(function(item) {
            return item.trim();
        })
        .find(function(item) {
            return item.startsWith("tokenPainel=");
        });

    const token = encontrado
        ? encontrado.substring("tokenPainel=".length)
        : null;

    if (!token || !sessoes.has(token)) {

        return res.status(401).json({
            erro: "Não autenticado."
        });
    }

    next();
}

// ===============================
// ARQUIVOS PÚBLICOS
// ===============================

app.use(function(req, res, next) {

    // Permite a tela de login
    if (req.path === "/login.html") {
        return express.static("public")(req, res, next);
    }

    // Permite os arquivos do login
    if (
        req.path === "/login.css" ||
        req.path === "/login.js"
    ) {
        return express.static("public")(req, res, next);
    }

    // Todo o restante fica protegido
    autenticarPainel(req, res, next);
});


// ===============================
// ARQUIVOS DO PAINEL
// ===============================

app.use(express.static("public"));
// ===============================
// ROTA PRINCIPAL
// ===============================
app.get("/", function(req, res) {
    res.send("🤖 Bot da Oficina está funcionando!");
});
// ===============================
// LISTA OS EQUIPAMENTOS
// ===============================
app.get("/equipamentos", function(req, res) {

    db.all(
        `
        SELECT id, equipamento, modelo_relatorio
        FROM equipamentos
        ORDER BY equipamento
        `,
        [],
        function(err, rows) {

            if (err) {
                console.error(
                    "Erro ao consultar equipamentos:",
                    err.message
                );

                return res.status(500).json({
                    erro: "Erro ao consultar equipamentos."
                });
            }

            res.json(rows);
        }
    );
});
// ===============================
// LISTA AS PESSOAS DA EQUIPE
// ===============================
app.get("/pessoas", function(req, res) {
    db.all(
        "SELECT * FROM pessoas ORDER BY id ASC",
        [],
        function(err, rows) {
            if (err) {
                console.error(
                    "Erro ao consultar pessoas:",
                    err.message
                );
                return res.status(500).json({
                    erro: "Erro ao consultar pessoas."
                });
            }
            res.json(rows);
        }
    );
});
// ===============================
// LISTA AS DUPLAS
// ===============================
app.get("/duplas", function(req, res) {
    const sql = `
        SELECT
            duplas.id,
            p1.nome AS pessoa1,
            p2.nome AS pessoa2
        FROM duplas
        INNER JOIN pessoas p1
            ON duplas.pessoa1_id = p1.id
        INNER JOIN pessoas p2
            ON duplas.pessoa2_id = p2.id
        ORDER BY duplas.id ASC
    `;
    db.all(
        sql,
        [],
        function(err, rows) {
            if (err) {
                console.error(
                    "Erro ao consultar duplas:",
                    err.message
                );
                return res.status(500).json({
                    erro: "Erro ao consultar duplas."
                });
            }
            res.json(rows);
        }
    );
});
// ===============================
// LISTA AS OMs DA OFICINA
// ===============================
app.get("/oficina", function(req, res) {
    const sql = `
        SELECT *
        FROM ordens
        ORDER BY id DESC
    `;
    db.all(
        sql,
        [],
        function(err, rows) {
            if (err) {
                console.error(
                    "Erro ao consultar oficina:",
                    err.message
                );
                return res.status(500).json({
                    erro: "Erro ao consultar as OMs da oficina."
                });
            }
            res.json(rows);
        }
    );
});
// ===============================
// CADASTRA UMA NOVA OM
// COM PESSOA OU DUPLA OPCIONAL
// ===============================
app.post("/om", function(req, res) {

    const novaOM = req.body;

    if (
        !novaOM.numero ||
        !novaOM.equipamento ||
        !novaOM.descricao
    ) {
        return res.status(400).json({
            erro: "Informe numero, equipamento e descricao."
        });
    }

    const pessoaId = novaOM.pessoa_id || null;
    const duplaId = novaOM.dupla_id || null;

    // =====================================
    // NÃO PODE INFORMAR PESSOA E DUPLA
    // AO MESMO TEMPO
    // =====================================

    if (pessoaId && duplaId) {

        return res.status(400).json({
            erro: "Informe apenas pessoa_id OU dupla_id."
        });

    }

    // =====================================
    // VERIFICA SE A OM JÁ EXISTE
    // =====================================

    db.get(
        "SELECT id FROM ordens WHERE om = ?",
        [novaOM.numero],
        function(err, omExistente) {

            if (err) {

                console.error(
                    "Erro ao verificar OM:",
                    err.message
                );

                return res.status(500).json({
                    erro:
                        "Erro ao verificar se a OM já existe."
                });

            }

            // =====================================
            // OM JÁ CADASTRADA
            // =====================================

            if (omExistente) {

                return res.status(409).json({
                    erro:
                        "⚠️ Esta OM já está cadastrada."
                });

            }

            // =====================================
            // SQL DO CADASTRO
            // =====================================

            const sql = `
                INSERT INTO ordens
                (
                    om,
                    equipamento,
                    descricao,
                    motivo_pendencia,
                    responsavel,
                    status,
                    data,
                    modelo_relatorio
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const dataAtual =
                new Date().toLocaleString("pt-BR");

            // =====================================
            // CADASTRA A OM
            // =====================================

            db.run(
                sql,
                [
                    novaOM.numero,
                    novaOM.equipamento,
                    novaOM.descricao,
                    novaOM.motivo_pendencia || null,
                    novaOM.responsavel || null,
                    "Pendente",
                    dataAtual,
                    novaOM.modelo_relatorio
                ],
                function(err) {

                    if (err) {

                        console.error(
                            "Erro ao cadastrar OM:",
                            err.message
                        );

                        return res.status(500).json({
                            erro:
                                "Erro ao cadastrar OM no banco."
                        });

                    }

                    const omId = this.lastID;

                    // =====================================
                    // SEM RESPONSÁVEL
                    // =====================================

                    if (!pessoaId && !duplaId) {

                        return res.json({

                            mensagem:
                                "OM cadastrada com sucesso!",

                            id:
                                omId,

                            om:
                                novaOM.numero,

                            equipamento:
                                novaOM.equipamento,

                            descricao:
                                novaOM.descricao,

                            responsavel:
                                null,

                            status:
                                "Pendente",

                            data:
                                dataAtual

                        });

                    }

                    // =====================================
                    // ATRIBUI PARA UMA PESSOA
                    // =====================================

                    if (pessoaId) {

                        db.get(
                            "SELECT id, nome FROM pessoas WHERE id = ?",
                            [pessoaId],
                            function(err, pessoa) {

                                if (err) {

                                    return res.status(500).json({
                                        erro:
                                            "Erro ao consultar pessoa."
                                    });

                                }

                                if (!pessoa) {

                                    return res.status(404).json({
                                        erro:
                                            "Pessoa não encontrada."
                                    });

                                }

                                db.run(
                                    `
                                    INSERT INTO atribuicoes
                                    (om_id, pessoa_id, dupla_id, data)
                                    VALUES (?, ?, ?, ?)
                                    `,
                                    [
                                        omId,
                                        pessoaId,
                                        null,
                                        dataAtual
                                    ],
                                    function(err) {

                                        if (err) {

                                            console.error(
                                                "Erro ao atribuir OM:",
                                                err.message
                                            );

                                            return res.status(500).json({
                                                erro:
                                                    "OM cadastrada, mas não foi possível atribuir."
                                            });

                                        }

                                        res.json({

                                            mensagem:
                                                "OM cadastrada e atribuída com sucesso!",

                                            id:
                                                omId,

                                            om:
                                                novaOM.numero,

                                            equipamento:
                                                novaOM.equipamento,

                                            descricao:
                                                novaOM.descricao,

                                            responsavel:
                                                pessoa.nome,

                                            tipo:
                                                "Pessoa",

                                            status:
                                                "Pendente",

                                            data:
                                                dataAtual

                                        });

                                    }
                                );

                            }
                        );

                        return;

                    }

                    // =====================================
                    // ATRIBUI PARA UMA DUPLA
                    // =====================================

                    db.get(
                        `
                        SELECT
                            duplas.id,
                            p1.nome AS pessoa1,
                            p2.nome AS pessoa2
                        FROM duplas
                        INNER JOIN pessoas p1
                            ON duplas.pessoa1_id = p1.id
                        INNER JOIN pessoas p2
                            ON duplas.pessoa2_id = p2.id
                        WHERE duplas.id = ?
                        `,
                        [duplaId],
                        function(err, dupla) {

                            if (err) {

                                return res.status(500).json({
                                    erro:
                                        "Erro ao consultar dupla."
                                });

                            }

                            if (!dupla) {

                                return res.status(404).json({
                                    erro:
                                        "Dupla não encontrada."
                                });

                            }

                            db.run(
                                `
                                INSERT INTO atribuicoes
                                (om_id, pessoa_id, dupla_id, data)
                                VALUES (?, ?, ?, ?)
                                `,
                                [
                                    omId,
                                    null,
                                    duplaId,
                                    dataAtual
                                ],
                                function(err) {

                                    if (err) {

                                        console.error(
                                            "Erro ao atribuir OM:",
                                            err.message
                                        );

                                        return res.status(500).json({
                                            erro:
                                                "OM cadastrada, mas não foi possível atribuir."
                                        });

                                    }

                                    res.json({

                                        mensagem:
                                            "OM cadastrada e atribuída com sucesso!",

                                        id:
                                            omId,

                                        om:
                                            novaOM.numero,

                                        equipamento:
                                            novaOM.equipamento,

                                        descricao:
                                            novaOM.descricao,

                                        responsaveis:
                                            dupla.pessoa1 +
                                            " + " +
                                            dupla.pessoa2,

                                        tipo:
                                            "Dupla",

                                        status:
                                            "Pendente",

                                        data:
                                            dataAtual

                                    });

                                }
                            );

                        }
                    );

                }
            );

        }
    );

});
// =====================================
// CADASTRA OMs CRUZADAS COM A OFICINA
// SOMENTE EQUIPAMENTOS PRESENTES
// =====================================

app.post("/om/importar-pendencias", function(req, res) {

    const lista = req.body.lista;

    if (!Array.isArray(lista) || lista.length === 0) {
        return res.status(400).json({
            erro: "Nenhuma OM para importar."
        });
    }

    const cadastradas = [];
    const existentes = [];
    const erros = [];

    let processadas = 0;

    function finalizar() {

        res.json({
            mensagem: "Importação concluída.",
            cadastradas: cadastradas,
            existentes: existentes,
            erros: erros
        });

    }

    lista.forEach(function(item) {

        if (
            !item ||
            !item.om ||
            !item.equipamento ||
            !item.descricao
        ) {

            processadas++;

            erros.push({
                om: item && item.om
                    ? item.om
                    : "Não identificada",
                erro: "Dados incompletos."
            });

            if (processadas === lista.length) {
                finalizar();
            }

            return;
        }

        // =====================================
        // VERIFICAR SE A OM JÁ EXISTE
        // =====================================

        db.get(
            "SELECT id, om, equipamento, status FROM ordens WHERE om = ?",
            [item.om],
            function(err, existente) {

                if (err) {

                    console.error(
                        "Erro ao verificar OM:",
                        err.message
                    );

                    erros.push({
                        om: item.om,
                        erro: "Erro ao consultar banco."
                    });

                    processadas++;

                    if (processadas === lista.length) {
                        finalizar();
                    }

                    return;
                }

                // =================================
                // OM JÁ EXISTE
                // =================================

                if (existente) {

                    existentes.push({
                        om: item.om,
                        equipamento:
                            existente.equipamento,
                        status:
                            existente.status
                    });

                    processadas++;

                    if (processadas === lista.length) {
                        finalizar();
                    }

                    return;
                }

                // =================================
                // CADASTRAR NOVA OM
                // =================================

                const sql = `
                    INSERT INTO ordens
                    (
                        om,
                        equipamento,
                        descricao,
                        responsavel,
                        status,
                        data,
                        modelo_relatorio
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `;

                const dataAtual =
                    new Date().toLocaleString("pt-BR");

                db.run(
                    sql,
                    [
                        item.om,
                        item.equipamento,
                        item.descricao,
                        null,
                        "Pendente",
                        dataAtual,
                        item.modelo_relatorio || null
                    ],
                    function(err) {

                        if (err) {

                            console.error(
                                "Erro ao cadastrar OM importada:",
                                err.message
                            );

                            erros.push({
                                om: item.om,
                                erro:
                                    "Erro ao cadastrar no banco."
                            });

                        } else {

                            cadastradas.push({
                                id: this.lastID,
                                om: item.om,
                                equipamento:
                                    item.equipamento,
                                descricao:
                                    item.descricao
                            });

                        }

                        processadas++;

                        if (
                            processadas ===
                            lista.length
                        ) {
                            finalizar();
                        }

                    }
                );

            }
        );

    });

});
// ==========================================
// ALTERAR MOTIVO DA PENDÊNCIA
// ==========================================

app.put("/om/:id/motivo-pendencia", function(req, res) {

    const id = req.params.id;
    const motivo = req.body.motivo_pendencia;

    if (!motivo || !motivo.trim()) {
        return res.status(400).json({
            erro: "Informe o motivo da pendência."
        });
    }

    db.run(
        `
        UPDATE ordens
        SET motivo_pendencia = ?
        WHERE id = ?
        `,
        [
            motivo.trim(),
            id
        ],
        function(err) {

            if (err) {

                console.error(
                    "Erro ao salvar motivo da pendência:",
                    err.message
                );

                return res.status(500).json({
                    erro:
                        "Erro ao salvar o motivo da pendência."
                });
            }

            if (this.changes === 0) {

                return res.status(404).json({
                    erro: "OM não encontrada."
                });
            }

            res.json({
                mensagem:
                    "Motivo da pendência salvo com sucesso!"
            });

        }
    );

});
// ===============================
// ALTERA O STATUS DE UMA OM
// ===============================
app.put("/om/:id/status", function(req, res) {
    const id = req.params.id;
    const novoStatus = req.body.status;
    if (!novoStatus) {
        return res.status(400).json({
            erro: "Informe o novo status."
        });
    }
    const statusPermitidos = [
        "Pendente",
        "Em execução",
        "Concluída"
    ];
    if (!statusPermitidos.includes(novoStatus)) {
        return res.status(400).json({
            erro:
                "Status inválido. Use: Pendente, Em execução ou Concluída."
        });
    }
   const sql = `
    UPDATE ordens
    SET
        status = ?,
        data = CASE
            WHEN ? = 'Concluída'
            THEN ?
            ELSE data
        END
    WHERE id = ?
`;

const dataAtual =
    new Date().toLocaleString("pt-BR");

    db.run(
        sql,
        [novoStatus, novoStatus, dataAtual, id],
        function(err) {
            if (err) {
                console.error(
                    "Erro ao atualizar status:",
                    err.message
                );
                return res.status(500).json({
                    erro: "Erro ao atualizar status da OM."
                });
            }
            if (this.changes === 0) {
                return res.status(404).json({
                    erro: "OM não encontrada."
                });
            }
            res.json({
                mensagem:
                    "Status atualizado com sucesso!",
                id:
                    id,
                status:
                    novoStatus
            });
        }
    );
});
// ===============================
// ALTERA O MODELO DE RELATÓRIO
// DE UM EQUIPAMENTO
// ===============================
app.put("/equipamentos/:id/modelo", function(req, res) {

    const id = req.params.id;
    const modelo = req.body.modelo_relatorio;

    if (!modelo) {
        return res.status(400).json({
            erro: "Informe o modelo de relatório."
        });
    }

    const sql = `
        UPDATE equipamentos
        SET modelo_relatorio = ?
        WHERE id = ?
    `;

    db.run(
        sql,
        [modelo, id],
        function(err) {

            if (err) {
                console.error(
                    "Erro ao atualizar modelo de relatório:",
                    err.message
                );

                return res.status(500).json({
                    erro: "Erro ao atualizar modelo de relatório."
                });
            }

            if (this.changes === 0) {
                return res.status(404).json({
                    erro: "Equipamento não encontrado."
                });
            }

            res.json({
                mensagem:
                    "Modelo de relatório atualizado com sucesso!"
            });

        }
    );

});
// ===============================
// CONSULTA AS OMs
// COM FILTRO OPCIONAL DE STATUS
// ===============================
app.get("/oms", function(req, res) {
    const status = req.query.status;
    let sql = "SELECT * FROM ordens";
    let parametros = [];
    if (status) {
        const statusPermitidos = [
            "Pendente",
            "Em execução",
            "Concluída"
        ];
        if (!statusPermitidos.includes(status)) {
            return res.status(400).json({
                erro:
                    "Status inválido. Use: Pendente, Em execução ou Concluída."
            });
        }
        sql += " WHERE status = ?";
        parametros.push(status);
    }
    sql += " ORDER BY id DESC";
    db.all(
        sql,
        parametros,
        function(err, rows) {
            if (err) {
                console.error(
                    "Erro ao consultar OMs:",
                    err.message
                );
                return res.status(500).json({
                    erro: "Erro ao consultar OMs."
                });
            }
            res.json(rows);
        }
    );
});
// ===============================
// EDITAR UMA OM
// ===============================
app.put("/om/:id", function(req, res) {

    const id = req.params.id;

    const equipamento =
        req.body.equipamento;

    const descricao =
        req.body.descricao;

    const horarioInicial =
        req.body.horario_inicial || null;

    const horarioFinal =
        req.body.horario_final || null;

    const sql = `
        UPDATE ordens
        SET
            equipamento = ?,
            descricao = ?,
            horario_inicial = ?,
            horario_final = ?
        WHERE id = ?
    `;

    db.run(
        sql,
        [
            equipamento,
            descricao,
            horarioInicial,
            horarioFinal,
            id
        ],
        function(err) {

            if (err) {

                console.error(
                    "Erro ao editar OM:",
                    err.message
                );

                return res.status(500).json({
                    erro:
                        "Erro ao editar OM."
                });

            }

            if (this.changes === 0) {

                return res.status(404).json({
                    erro:
                        "OM não encontrada."
                });

            }

            res.json({
                mensagem:
                    "OM editada com sucesso."
            });

        }
    );

});
// =====================================================
// HISTÓRICO DE OMS EXCLUÍDAS
// Mantém as OMs excluídas por 7 dias
// =====================================================

db.run(`
    CREATE TABLE IF NOT EXISTS historico_oms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        om_id_original INTEGER,
        om TEXT,
        equipamento TEXT,
        modelo_relatorio TEXT,
        descricao TEXT,
        horario_inicial TEXT,
        horario_final TEXT,
        motivo_pendencia TEXT,
        status TEXT,
        responsaveis TEXT,
        tipo TEXT,
        data TEXT,
        data_exclusao TEXT
    )
`, function(err) {

    if (err) {
        console.error(
            "❌ Erro ao criar tabela historico_oms:",
            err.message
        );
    } else {
        console.log(
            "✅ Tabela historico_oms pronta."
        );
    }

});


// =====================================================
// SALVAR UMA OM NO HISTÓRICO ANTES DE EXCLUIR
// =====================================================

function arquivarOM(id, callback) {

    const sql = `
        SELECT
            ordens.id AS id,
            ordens.om,
            ordens.equipamento,
            ordens.modelo_relatorio,
            ordens.descricao,
            ordens.horario_inicial,
            ordens.horario_final,
            ordens.motivo_pendencia,
            ordens.status,

            CASE
                WHEN atribuicoes.pessoa_id IS NOT NULL
                THEN pessoas.nome

                WHEN atribuicoes.dupla_id IS NOT NULL
                THEN p1.nome || ' + ' || p2.nome

                ELSE NULL
            END AS responsaveis,

            CASE
                WHEN atribuicoes.pessoa_id IS NOT NULL
                THEN 'Pessoa'

                WHEN atribuicoes.dupla_id IS NOT NULL
                THEN 'Dupla'

                ELSE NULL
            END AS tipo,

            ordens.data

        FROM ordens

        LEFT JOIN atribuicoes
            ON atribuicoes.om_id = ordens.id

        LEFT JOIN pessoas
            ON atribuicoes.pessoa_id = pessoas.id

        LEFT JOIN duplas
            ON atribuicoes.dupla_id = duplas.id

        LEFT JOIN pessoas p1
            ON duplas.pessoa1_id = p1.id

        LEFT JOIN pessoas p2
            ON duplas.pessoa2_id = p2.id

        WHERE ordens.id = ?
    `;

    db.get(sql, [id], function(err, om) {

        if (err) {
            return callback(err);
        }

        if (!om) {
            return callback(null, null);
        }

        const dataExclusao =
            new Date().toLocaleString("pt-BR");

        const insert = `
            INSERT INTO historico_oms (
                om_id_original,
                om,
                equipamento,
                modelo_relatorio,
                descricao,
                horario_inicial,
                horario_final,
                motivo_pendencia,
                status,
                responsaveis,
                tipo,
                data,
                data_exclusao
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        db.run(
            insert,
            [
                om.id,
                om.om,
                om.equipamento,
                om.modelo_relatorio,
                om.descricao,
                om.horario_inicial,
                om.horario_final,
                om.motivo_pendencia,
                om.status,
                om.responsaveis,
                om.tipo,
                om.data,
                dataExclusao
            ],
            function(err) {

                if (err) {
                    return callback(err);
                }

                callback(null, om);
            }
        );
    });
}


// =====================================================
// EXCLUIR TODAS AS OMS
// Primeiro arquiva, depois exclui
// =====================================================

app.delete("/oms", function(req, res) {

    db.all(
        "SELECT id FROM ordens",
        [],
        function(err, rows) {

            if (err) {

                console.error(
                    "Erro ao buscar OMs:",
                    err.message
                );

                return res.status(500).json({
                    erro:
                        "Erro ao buscar OMs."
                });
            }

            if (!rows.length) {

                return res.json({
                    mensagem:
                        "Nenhuma OM para excluir."
                });
            }

            let processadas = 0;
            let erros = [];

            rows.forEach(function(row) {

                arquivarOM(
                    row.id,
                    function(err) {

                        if (err) {
                            erros.push(err.message);
                        }

                        processadas++;

                        if (
                            processadas ===
                            rows.length
                        ) {

                            if (erros.length) {

                                console.error(
                                    "Erros ao arquivar OMs:",
                                    erros
                                );

                                return res.status(500).json({
                                    erro:
                                        "Erro ao arquivar OMs."
                                });
                            }

                            db.run(
                                "DELETE FROM atribuicoes",
                                [],
                                function(err) {

                                    if (err) {

                                        return res.status(500).json({
                                            erro:
                                                "Erro ao excluir atribuições."
                                        });
                                    }

                                    db.run(
                                        "DELETE FROM ordens",
                                        [],
                                        function(err) {

                                            if (err) {

                                                return res.status(500).json({
                                                    erro:
                                                        "Erro ao excluir OMs."
                                                });
                                            }

                                            res.json({
                                                mensagem:
                                                    this.changes +
                                                    " OM(s) excluída(s) e arquivada(s) no histórico."
                                            });

                                        }
                                    );

                                }
                            );

                        }

                    }
                );

            });

        }
    );

});


// =====================================================
// EXCLUIR UMA OM
// Primeiro arquiva, depois exclui
// =====================================================

app.delete("/om/:id", function(req, res) {

    const id = req.params.id;

    arquivarOM(
        id,
        function(err, om) {

            if (err) {

                console.error(
                    "Erro ao arquivar OM:",
                    err.message
                );

                return res.status(500).json({
                    erro:
                        "Erro ao arquivar OM."
                });
            }

            if (!om) {

                return res.status(404).json({
                    erro:
                        "OM não encontrada."
                });
            }

            db.run(
                "DELETE FROM atribuicoes WHERE om_id = ?",
                [id],
                function(err) {

                    if (err) {

                        console.error(
                            "Erro ao excluir atribuição:",
                            err.message
                        );

                        return res.status(500).json({
                            erro:
                                "Erro ao excluir atribuição."
                        });
                    }

                    db.run(
                        "DELETE FROM ordens WHERE id = ?",
                        [id],
                        function(err) {

                            if (err) {

                                console.error(
                                    "Erro ao excluir OM:",
                                    err.message
                                );

                                return res.status(500).json({
                                    erro:
                                        "Erro ao excluir OM."
                                });
                            }

                            res.json({
                                mensagem:
                                    "OM excluída com sucesso e mantida no histórico por 7 dias."
                            });

                        }
                    );

                }
            );

        }
    );

});


// =====================================================
// LISTAR HISTÓRICO
// =====================================================

app.get("/historico-oms", function(req, res) {

    db.all(
        `
        SELECT
            id,
            om_id_original,
            om,
            equipamento,
            modelo_relatorio,
            descricao,
            horario_inicial,
            horario_final,
            motivo_pendencia,
            status,
            responsaveis,
            tipo,
            data,
            data_exclusao
        FROM historico_oms
        ORDER BY id DESC
        `,
        [],
        function(err, rows) {

            if (err) {

                console.error(
                    "Erro ao consultar histórico:",
                    err.message
                );

                return res.status(500).json({
                    erro:
                        "Erro ao consultar histórico."
                });
            }

            res.json(rows);
        }
    );

});


// =====================================================
// LIMPAR HISTÓRICO COM MAIS DE 7 DIAS
// =====================================================

function limparHistoricoAntigo() {

    db.run(
        `
        DELETE FROM historico_oms
        WHERE datetime(
            substr(data_exclusao, 7, 4) || '-' ||
            substr(data_exclusao, 4, 2) || '-' ||
            substr(data_exclusao, 1, 2) || ' ' ||
            substr(data_exclusao, 12)
        )
        < datetime('now', '-7 days', 'localtime')
        `,
        [],
        function(err) {

            if (err) {

                console.error(
                    "Erro ao limpar histórico antigo:",
                    err.message
                );

                return;
            }

            if (this.changes > 0) {

                console.log(
                    "🧹 Histórico removido:",
                    this.changes,
                    "registro(s) com mais de 7 dias."
                );
            }

        }
    );

}

// Executa ao iniciar
limparHistoricoAntigo();

// Executa uma vez por dia
setInterval(
    limparHistoricoAntigo,
    24 * 60 * 60 * 1000
);
// ===============================
// EXCLUIR UMA OM
// ===============================
app.delete("/om/:id", function(req, res) {

    const id = req.params.id;

    db.run(
        "DELETE FROM atribuicoes WHERE om_id = ?",
        [id],
        function(err) {

            if (err) {
                console.error(
                    "Erro ao excluir atribuição:",
                    err.message
                );

                return res.status(500).json({
                    erro:
                        "Erro ao excluir atribuição."
                });
            }

            db.run(
                "DELETE FROM ordens WHERE id = ?",
                [id],
                function(err) {

                    if (err) {
                        console.error(
                            "Erro ao excluir OM:",
                            err.message
                        );

                        return res.status(500).json({
                            erro:
                                "Erro ao excluir OM."
                        });
                    }

                    if (this.changes === 0) {
                        return res.status(404).json({
                            erro:
                                "OM não encontrada."
                        });
                    }

                    res.json({
                        mensagem:
                            "OM excluída com sucesso."
                    });
                }
            );
        }
    );
});
// ===============================
// CONSULTA UMA OM ESPECÍFICA
// ===============================
app.get("/om/:id", function(req, res) {
    const id = req.params.id;
    const sql = `
        SELECT
            ordens.id,
            ordens.om,
            ordens.equipamento,
            ordens.descricao,
            ordens.horario_inicial,
            ordens.horario_final,
            ordens.status,
            ordens.data,
            ordens.modelo_relatorio,
            CASE
                WHEN atribuicoes.pessoa_id IS NOT NULL
                THEN pessoas.nome
                WHEN atribuicoes.dupla_id IS NOT NULL
                THEN p1.nome || ' + ' || p2.nome
                ELSE 'Sem responsável'
            END AS responsavel
        FROM ordens
        LEFT JOIN atribuicoes
            ON atribuicoes.om_id = ordens.id
        LEFT JOIN pessoas
            ON atribuicoes.pessoa_id = pessoas.id
        LEFT JOIN duplas
            ON atribuicoes.dupla_id = duplas.id
        LEFT JOIN pessoas p1
            ON duplas.pessoa1_id = p1.id
        LEFT JOIN pessoas p2
            ON duplas.pessoa2_id = p2.id
        WHERE ordens.id = ?
    `;
    db.get(
        sql,
        [id],
        function(err, row) {
            if (err) {
                console.error(
                    "Erro ao consultar OM:",
                    err.message
                );
                return res.status(500).json({
                    erro:
                        "Erro ao consultar OM."
                });
            }
            if (!row) {
                return res.status(404).json({
                    erro:
                        "OM não encontrada."
                });
            }
            res.json(row);
        }
    );
});
// ===============================
// CADASTRA UMA NOVA DUPLA
// ===============================
app.post("/dupla", function(req, res) {
    const pessoa1 = req.body.pessoa1_id;
    const pessoa2 = req.body.pessoa2_id;
    if (!pessoa1 || !pessoa2) {
        return res.status(400).json({
            erro: "Informe pessoa1_id e pessoa2_id."
        });
    }
    if (pessoa1 === pessoa2) {
        return res.status(400).json({
            erro:
                "Uma pessoa não pode formar dupla consigo mesma."
        });
    }
    db.get(
        "SELECT id, nome FROM pessoas WHERE id = ?",
        [pessoa1],
        function(err, pessoa1Encontrada) {
            if (err) {
                return res.status(500).json({
                    erro: "Erro ao consultar pessoa."
                });
            }
            if (!pessoa1Encontrada) {
                return res.status(404).json({
                    erro: "Pessoa 1 não encontrada."
                });
            }
            db.get(
                "SELECT id, nome FROM pessoas WHERE id = ?",
                [pessoa2],
                function(err, pessoa2Encontrada) {
                    if (err) {
                        return res.status(500).json({
                            erro: "Erro ao consultar pessoa."
                        });
                    }
                    if (!pessoa2Encontrada) {
                        return res.status(404).json({
                            erro: "Pessoa 2 não encontrada."
                        });
                    }
                    const sql = `
                        INSERT INTO duplas
                        (pessoa1_id, pessoa2_id)
                        VALUES (?, ?)
                    `;
                    db.run(
                        sql,
                        [pessoa1, pessoa2],
                        function(err) {
                            if (err) {
                                if (
                                    err.message.includes("UNIQUE")
                                ) {
                                    return res.status(400).json({
                                        erro:
                                            "Essa dupla já existe."
                                    });
                                }
                                console.error(
                                    "Erro ao cadastrar dupla:",
                                    err.message
                                );
                                return res.status(500).json({
                                    erro:
                                        "Erro ao cadastrar dupla."
                                });
                            }
                            res.json({
                                mensagem:
                                    "Dupla cadastrada com sucesso!",
                                id:
                                    this.lastID,
                                pessoa1:
                                    pessoa1Encontrada.nome,
                                pessoa2:
                                    pessoa2Encontrada.nome
                            });
                        }
                    );
                }
            );
        }
    );
});
// =====================================
// EXCLUIR DUPLA
// =====================================

app.delete("/dupla/:id", function(req, res) {

    const duplaId = Number(req.params.id);

    if (!duplaId) {
        return res.status(400).json({
            erro: "ID da dupla inválido."
        });
    }

    // Verifica se a dupla está sendo usada em alguma OM
    db.get(
        "SELECT COUNT(*) AS total FROM atribuicoes WHERE dupla_id = ?",
        [duplaId],
        function(err, resultado) {

            if (err) {
                console.error(
                    "Erro ao verificar dupla:",
                    err.message
                );

                return res.status(500).json({
                    erro: "Erro ao verificar a dupla."
                });
            }

            if (resultado.total > 0) {

                return res.status(400).json({
                    erro:
                        "Não é possível excluir esta dupla porque ela está vinculada a uma ou mais OMs."
                });

            }

            // Se não estiver sendo usada, pode excluir
            db.run(
                "DELETE FROM duplas WHERE id = ?",
                [duplaId],
                function(err) {

                    if (err) {

                        console.error(
                            "Erro ao excluir dupla:",
                            err.message
                        );

                        return res.status(500).json({
                            erro: "Erro ao excluir a dupla."
                        });

                    }

                    if (this.changes === 0) {

                        return res.status(404).json({
                            erro: "Dupla não encontrada."
                        });

                    }

                    res.json({
                        mensagem: "Dupla excluída com sucesso!"
                    });

                }
            );

        }
    );

});
// ===============================
// ATRIBUI UMA OM PARA UMA PESSOA
// OU DUPLA
// ===============================
app.post("/om/:id/atribuir", function(req, res) {
    const omId = req.params.id;
    const pessoaId =
        req.body.pessoa_id || null;
    const duplaId =
        req.body.dupla_id || null;
    if (!pessoaId && !duplaId) {
        return res.status(400).json({
            erro: "Informe pessoa_id ou dupla_id."
        });
    }
    if (pessoaId && duplaId) {
        return res.status(400).json({
            erro:
                "Informe apenas pessoa_id OU dupla_id."
        });
    }
    db.get(
        "SELECT * FROM ordens WHERE id = ?",
        [omId],
        function(err, om) {
            if (err) {
                console.error(
                    "Erro ao consultar OM:",
                    err.message
                );
                return res.status(500).json({
                    erro: "Erro ao consultar OM."
                });
            }
            if (!om) {
                return res.status(404).json({
                    erro: "OM não encontrada."
                });
            }
            db.get(
                "SELECT * FROM atribuicoes WHERE om_id = ?",
                [omId],
                function(err, atribuicaoExistente) {
                    if (err) {
                        return res.status(500).json({
                            erro:
                                "Erro ao consultar atribuição."
                        });
                    }
                    if (atribuicaoExistente) {
                        return res.status(400).json({
                            erro:
                                "Essa OM já está atribuída."
                        });
                    }
                    // =====================================
                    // ATRIBUI PARA UMA PESSOA
                    // =====================================
                    if (pessoaId) {
                        db.get(
                            "SELECT id, nome FROM pessoas WHERE id = ?",
                            [pessoaId],
                            function(err, pessoa) {
                                if (err) {
                                    return res.status(500).json({
                                        erro:
                                            "Erro ao consultar pessoa."
                                    });
                                }
                                if (!pessoa) {
                                    return res.status(404).json({
                                        erro:
                                            "Pessoa não encontrada."
                                    });
                                }
                                const dataAtual =
                                    new Date().toLocaleString("pt-BR");
                                db.run(
                                    `
                                    INSERT INTO atribuicoes
                                    (om_id, pessoa_id, dupla_id, data)
                                    VALUES (?, ?, ?, ?)
                                    `,
                                    [
                                        omId,
                                        pessoaId,
                                        null,
                                        dataAtual
                                    ],
                                    function(err) {
                                        if (err) {
                                            console.error(
                                                "Erro ao atribuir OM:",
                                                err.message
                                            );
                                            return res.status(500).json({
                                                erro:
                                                    "Erro ao atribuir OM."
                                            });
                                        }
                                        res.json({
                                            mensagem:
                                                "OM atribuída com sucesso!",
                                            om:
                                                om.om,
                                            equipamento:
                                                om.equipamento,
                                            responsavel:
                                                pessoa.nome,
                                            tipo:
                                                "Pessoa",
                                            data:
                                                dataAtual
                                        });
                                    }
                                );
                            }
                        );
                    }
                    // =====================================
                    // ATRIBUI PARA UMA DUPLA
                    // =====================================
                    if (duplaId) {
                        const sql = `
                            SELECT
                                duplas.id,
                                p1.nome AS pessoa1,
                                p2.nome AS pessoa2
                            FROM duplas
                            INNER JOIN pessoas p1
                                ON duplas.pessoa1_id = p1.id
                            INNER JOIN pessoas p2
                                ON duplas.pessoa2_id = p2.id
                            WHERE duplas.id = ?
                        `;
                        db.get(
                            sql,
                            [duplaId],
                            function(err, dupla) {
                                if (err) {
                                    return res.status(500).json({
                                        erro:
                                            "Erro ao consultar dupla."
                                    });
                                }
                                if (!dupla) {
                                    return res.status(404).json({
                                        erro:
                                            "Dupla não encontrada."
                                    });
                                }
                                const dataAtual =
                                    new Date().toLocaleString("pt-BR");
                                db.run(
                                    `
                                    INSERT INTO atribuicoes
                                    (om_id, pessoa_id, dupla_id, data)
                                    VALUES (?, ?, ?, ?)
                                    `,
                                    [
                                        omId,
                                        null,
                                        duplaId,
                                        dataAtual
                                    ],
                                    function(err) {
                                        if (err) {
                                            console.error(
                                                "Erro ao atribuir OM:",
                                                err.message
                                            );
                                            return res.status(500).json({
                                                erro:
                                                    "Erro ao atribuir OM."
                                            });
                                        }
                                        res.json({
                                            mensagem:
                                                "OM atribuída com sucesso!",
                                            om:
                                                om.om,
                                            equipamento:
                                                om.equipamento,
                                            responsaveis:
                                                dupla.pessoa1 +
                                                " + " +
                                                dupla.pessoa2,
                                            tipo:
                                                "Dupla",
                                            data:
                                                dataAtual
                                        });
                                    }
                                );
                            }
                        );
                    }
                }
            );
        }
    );
});
// ===============================
// LISTA TODAS AS ATRIBUIÇÕES
// INCLUI OMs SEM RESPONSÁVEL
// HORÁRIO CORRIGIDO PARA BRASÍLIA
// ===============================

app.get("/atribuicoes", function(req, res) {

    const sql = `
        SELECT
            ordens.id AS id,
            ordens.om,
            ordens.equipamento,
            ordens.modelo_relatorio,
            ordens.descricao,
            ordens.horario_inicial,
            ordens.horario_final,
            ordens.motivo_pendencia,
            ordens.status,

            CASE
                WHEN atribuicoes.pessoa_id IS NOT NULL
                THEN pessoas.nome

                WHEN atribuicoes.dupla_id IS NOT NULL
                THEN p1.nome || ' + ' || p2.nome

                ELSE NULL
            END AS responsaveis,

            CASE
                WHEN atribuicoes.pessoa_id IS NOT NULL
                THEN 'Pessoa'

                WHEN atribuicoes.dupla_id IS NOT NULL
                THEN 'Dupla'

                ELSE NULL
            END AS tipo,

            CASE
                WHEN ordens.data LIKE '__/__/____, __:__:__'
                THEN
                    strftime(
                        '%d/%m/%Y, %H:%M:%S',
                        datetime(
                            substr(ordens.data, 7, 4) || '-' ||
                            substr(ordens.data, 4, 2) || '-' ||
                            substr(ordens.data, 1, 2) || ' ' ||
                            substr(ordens.data, 13, 8),
                            '-3 hours'
                        )
                    )

                ELSE ordens.data
            END AS data

        FROM ordens

        LEFT JOIN atribuicoes
            ON atribuicoes.om_id = ordens.id

        LEFT JOIN pessoas
            ON atribuicoes.pessoa_id = pessoas.id

        LEFT JOIN duplas
            ON atribuicoes.dupla_id = duplas.id

        LEFT JOIN pessoas p1
            ON duplas.pessoa1_id = p1.id

        LEFT JOIN pessoas p2
            ON duplas.pessoa2_id = p2.id

        ORDER BY ordens.id DESC
    `;

    db.all(
        sql,
        [],
        function(err, rows) {

            if (err) {

                console.error(
                    "Erro ao consultar atribuições:",
                    err.message
                );

                return res.status(500).json({
                    erro:
                        "Erro ao consultar atribuições."
                });
            }

            console.log(
                "📋 Atribuições carregadas:",
                rows.length
            );

            res.json(rows);

        }
    );

});
// ===============================
// LISTA AS OMs DE UMA PESSOA
// INCLUI OMs DA PESSOA E DAS DUPLAS
// ===============================
app.get("/atribuicoes/pessoa/:id", function(req, res) {
    const pessoaId = req.params.id;
    db.get(
        "SELECT id, nome FROM pessoas WHERE id = ?",
        [pessoaId],
        function(err, pessoa) {
            if (err) {
                console.error(
                    "Erro ao consultar pessoa:",
                    err.message
                );
                return res.status(500).json({
                    erro:
                        "Erro ao consultar pessoa."
                });
            }
            if (!pessoa) {
                return res.status(404).json({
                    erro:
                        "Pessoa não encontrada."
                });
            }
            const sql = `
                SELECT
                    atribuicoes.id,
                    ordens.id AS om_id,
                    ordens.om,
                    ordens.equipamento,
                    ordens.descricao,
                    ordens.status,
                    atribuicoes.data,
                    CASE
                        WHEN atribuicoes.pessoa_id IS NOT NULL
                        THEN 'Pessoa'
                        WHEN atribuicoes.dupla_id IS NOT NULL
                        THEN 'Dupla'
                    END AS tipo,
                    CASE
                        WHEN atribuicoes.pessoa_id IS NOT NULL
                        THEN pessoas.nome
                        WHEN atribuicoes.dupla_id IS NOT NULL
                        THEN p1.nome || ' + ' || p2.nome
                    END AS responsaveis
                FROM atribuicoes
                INNER JOIN ordens
                    ON atribuicoes.om_id = ordens.id
                LEFT JOIN pessoas
                    ON atribuicoes.pessoa_id = pessoas.id
                LEFT JOIN duplas
                    ON atribuicoes.dupla_id = duplas.id
                LEFT JOIN pessoas p1
                    ON duplas.pessoa1_id = p1.id
                LEFT JOIN pessoas p2
                    ON duplas.pessoa2_id = p2.id
                WHERE
                    atribuicoes.pessoa_id = ?
                    OR
                    atribuicoes.dupla_id IN (
                        SELECT id
                        FROM duplas
                        WHERE pessoa1_id = ?
                        OR pessoa2_id = ?
                    )
                ORDER BY atribuicoes.id DESC
            `;
            db.all(
                sql,
                [
                    pessoaId,
                    pessoaId,
                    pessoaId
                ],
                function(err, rows) {
                    if (err) {
                        console.error(
                            "Erro ao consultar atribuições da pessoa:",
                            err.message
                        );
                        return res.status(500).json({
                            erro:
                                "Erro ao consultar as OMs da pessoa."
                        });
                    }
                    res.json({
                        pessoa:
                            pessoa.nome,
                        quantidade:
                            rows.length,
                        ordens:
                            rows
                    });
                }
            );
        }
    );
});
// ===============================
// LISTA AS OMs DE UMA DUPLA
// ===============================
app.get("/atribuicoes/dupla/:id", function(req, res) {
    const duplaId = req.params.id;
    const sqlDupla = `
        SELECT
            duplas.id,
            p1.nome AS pessoa1,
            p2.nome AS pessoa2
        FROM duplas
        INNER JOIN pessoas p1
            ON duplas.pessoa1_id = p1.id
        INNER JOIN pessoas p2
            ON duplas.pessoa2_id = p2.id
        WHERE duplas.id = ?
    `;
    db.get(
        sqlDupla,
        [duplaId],
        function(err, dupla) {
            if (err) {
                console.error(
                    "Erro ao consultar dupla:",
                    err.message
                );
                return res.status(500).json({
                    erro:
                        "Erro ao consultar dupla."
                });
            }
            if (!dupla) {
                return res.status(404).json({
                    erro:
                        "Dupla não encontrada."
                });
            }
            const sqlOMs = `
                SELECT
                    atribuicoes.id,
                    ordens.id AS om_id,
                    ordens.om,
                    ordens.equipamento,
                    ordens.descricao,
                    ordens.status,
                    atribuicoes.data
                FROM atribuicoes
                INNER JOIN ordens
                    ON atribuicoes.om_id = ordens.id
                WHERE atribuicoes.dupla_id = ?
                ORDER BY atribuicoes.id DESC
            `;
            db.all(
                sqlOMs,
                [duplaId],
                function(err, rows) {
                    if (err) {
                        console.error(
                            "Erro ao consultar OMs da dupla:",
                            err.message
                        );
                        return res.status(500).json({
                            erro:
                                "Erro ao consultar OMs da dupla."
                        });
                    }
                    res.json({
                        dupla:
                            dupla.pessoa1 +
                            " + " +
                            dupla.pessoa2,
                        quantidade:
                            rows.length,
                        ordens:
                            rows
                    });
                }
            );
        }
    );
});// ===============================
// RESUMO DAS OMs DE UMA PESSOA
// ===============================
app.get("/resumo/pessoa/:id", function(req, res) {

    const pessoaId = req.params.id;

    // Verifica se a pessoa existe
    db.get(
        "SELECT id, nome FROM pessoas WHERE id = ?",
        [pessoaId],
        function(err, pessoa) {

            if (err) {
                console.error(
                    "Erro ao consultar pessoa:",
                    err.message
                );

                return res.status(500).json({
                    erro: "Erro ao consultar pessoa."
                });
            }

            if (!pessoa) {
                return res.status(404).json({
                    erro: "Pessoa não encontrada."
                });
            }

            // Consulta as OMs da pessoa,
            // incluindo as OMs das duplas dela
            const sql = `
                SELECT ordens.status

                FROM atribuicoes

                INNER JOIN ordens
                    ON atribuicoes.om_id = ordens.id

                WHERE
                    atribuicoes.pessoa_id = ?

                    OR

                    atribuicoes.dupla_id IN (
                        SELECT id
                        FROM duplas
                        WHERE pessoa1_id = ?
                        OR pessoa2_id = ?
                    )
            `;

            db.all(
                sql,
                [
                    pessoaId,
                    pessoaId,
                    pessoaId
                ],
                function(err, rows) {

                    if (err) {
                        console.error(
                            "Erro ao consultar resumo:",
                            err.message
                        );

                        return res.status(500).json({
                            erro: "Erro ao consultar resumo."
                        });
                    }

                    let pendentes = 0;
                    let emExecucao = 0;
                    let concluidas = 0;

                    rows.forEach(function(om) {

                        if (om.status === "Pendente") {
                            pendentes++;
                        }

                        if (om.status === "Em execução") {
                            emExecucao++;
                        }

                        if (om.status === "Concluída") {
                            concluidas++;
                        }

                    });

                    res.json({
                        pessoa: pessoa.nome,
                        total: rows.length,
                        pendentes: pendentes,
                        em_execucao: emExecucao,
                        concluidas: concluidas
                    });

                }
            );

        }
    );

});// ===============================
// RESUMO DAS OMs DE UMA DUPLA
// ===============================
app.get("/resumo/dupla/:id", function(req, res) {

    const duplaId = req.params.id;

    // Verifica se a dupla existe
    const sqlDupla = `
        SELECT
            duplas.id,
            p1.nome AS pessoa1,
            p2.nome AS pessoa2
        FROM duplas
        INNER JOIN pessoas p1
            ON duplas.pessoa1_id = p1.id
        INNER JOIN pessoas p2
            ON duplas.pessoa2_id = p2.id
        WHERE duplas.id = ?
    `;

    db.get(
        sqlDupla,
        [duplaId],
        function(err, dupla) {

            if (err) {
                console.error(
                    "Erro ao consultar dupla:",
                    err.message
                );

                return res.status(500).json({
                    erro: "Erro ao consultar dupla."
                });
            }

            if (!dupla) {
                return res.status(404).json({
                    erro: "Dupla não encontrada."
                });
            }

            // Consulta as OMs da dupla
            const sql = `
                SELECT status
                FROM atribuicoes
                INNER JOIN ordens
                    ON atribuicoes.om_id = ordens.id
                WHERE atribuicoes.dupla_id = ?
            `;

            db.all(
                sql,
                [duplaId],
                function(err, rows) {

                    if (err) {
                        console.error(
                            "Erro ao consultar OMs da dupla:",
                            err.message
                        );

                        return res.status(500).json({
                            erro: "Erro ao consultar OMs da dupla."
                        });
                    }

                    let pendentes = 0;
                    let emExecucao = 0;
                    let concluidas = 0;

                    rows.forEach(function(om) {

                        if (om.status === "Pendente") {
                            pendentes++;
                        }

                        if (om.status === "Em execução") {
                            emExecucao++;
                        }

                        if (om.status === "Concluída") {
                            concluidas++;
                        }

                    });

                    res.json({
                        dupla:
                            dupla.pessoa1 +
                            " + " +
                            dupla.pessoa2,

                        total: rows.length,

                        pendentes: pendentes,

                        em_execucao: emExecucao,

                        concluidas: concluidas
                    });

                }
            );

        }
    );

});// ===============================
// RESUMO GERAL DA EQUIPE
// ===============================
app.get("/resumo/equipe", function(req, res) {

    const sql = `
        SELECT
            pessoas.id,
            pessoas.nome,

            COUNT(DISTINCT atribuicoes.id) AS total,

            SUM(
                CASE
                    WHEN ordens.status = 'Pendente'
                    THEN 1
                    ELSE 0
                END
            ) AS pendentes,

            SUM(
                CASE
                    WHEN ordens.status = 'Em execução'
                    THEN 1
                    ELSE 0
                END
            ) AS em_execucao,

            SUM(
                CASE
                    WHEN ordens.status = 'Concluída'
                    THEN 1
                    ELSE 0
                END
            ) AS concluidas

        FROM pessoas

        LEFT JOIN atribuicoes
            ON (
                atribuicoes.pessoa_id = pessoas.id

                OR

                atribuicoes.dupla_id IN (
                    SELECT id
                    FROM duplas
                    WHERE pessoa1_id = pessoas.id
                    OR pessoa2_id = pessoas.id
                )
            )

        LEFT JOIN ordens
            ON atribuicoes.om_id = ordens.id

        GROUP BY
            pessoas.id,
            pessoas.nome

        ORDER BY
            pessoas.id ASC
    `;

    db.all(
        sql,
        [],
        function(err, rows) {

            if (err) {

                console.error(
                    "Erro ao consultar resumo da equipe:",
                    err.message
                );

                return res.status(500).json({
                    erro: "Erro ao consultar resumo da equipe."
                });

            }

            res.json(rows);

        }
    );

});// ===============================
// TROCA O RESPONSÁVEL DE UMA OM
// ===============================
app.put("/om/:id/responsavel", function(req, res) {

    const omId = req.params.id;
    const pessoaId = req.body.pessoa_id || null;
    const duplaId = req.body.dupla_id || null;

    // Precisa informar pessoa OU dupla
    if (!pessoaId && !duplaId) {
        return res.status(400).json({
            erro: "Informe pessoa_id ou dupla_id."
        });
    }

    // Não pode informar os dois
    if (pessoaId && duplaId) {
        return res.status(400).json({
            erro: "Informe apenas pessoa_id OU dupla_id."
        });
    }

    // Verifica se a OM existe
    db.get(
        "SELECT * FROM ordens WHERE id = ?",
        [omId],
        function(err, om) {

            if (err) {
                console.error(
                    "Erro ao consultar OM:",
                    err.message
                );

                return res.status(500).json({
                    erro: "Erro ao consultar OM."
                });
            }

            if (!om) {
                return res.status(404).json({
                    erro: "OM não encontrada."
                });
            }

            // Remove a atribuição atual
            db.run(
                "DELETE FROM atribuicoes WHERE om_id = ?",
                [omId],
                function(err) {

                    if (err) {
                        console.error(
                            "Erro ao remover atribuição:",
                            err.message
                        );

                        return res.status(500).json({
                            erro: "Erro ao remover responsável atual."
                        });
                    }

                    const dataAtual =
                        new Date().toLocaleString("pt-BR");

                    // =====================================
                    // NOVO RESPONSÁVEL: PESSOA
                    // =====================================
                    if (pessoaId) {

                        db.get(
                            "SELECT id, nome FROM pessoas WHERE id = ?",
                            [pessoaId],
                            function(err, pessoa) {

                                if (err) {
                                    return res.status(500).json({
                                        erro: "Erro ao consultar pessoa."
                                    });
                                }

                                if (!pessoa) {
                                    return res.status(404).json({
                                        erro: "Pessoa não encontrada."
                                    });
                                }

                                db.run(
                                    `
                                    INSERT INTO atribuicoes
                                    (om_id, pessoa_id, dupla_id, data)
                                    VALUES (?, ?, ?, ?)
                                    `,
                                    [
                                        omId,
                                        pessoaId,
                                        null,
                                        dataAtual
                                    ],
                                    function(err) {

                                        if (err) {
                                            console.error(
                                                "Erro ao criar nova atribuição:",
                                                err.message
                                            );

                                            return res.status(500).json({
                                                erro:
                                                    "Erro ao atribuir nova pessoa."
                                            });
                                        }

                                        res.json({
                                            mensagem:
                                                "Responsável alterado com sucesso!",
                                            om: om.om,
                                            equipamento:
                                                om.equipamento,
                                            descricao:
                                                om.descricao,
                                            responsavel:
                                                pessoa.nome,
                                            tipo:
                                                "Pessoa",
                                            status:
                                                om.status,
                                            data:
                                                dataAtual
                                        });

                                    }
                                );

                            }
                        );

                        return;
                    }

                    // =====================================
                    // NOVO RESPONSÁVEL: DUPLA
                    // =====================================
                    const sqlDupla = `
                        SELECT
                            duplas.id,
                            p1.nome AS pessoa1,
                            p2.nome AS pessoa2
                        FROM duplas
                        INNER JOIN pessoas p1
                            ON duplas.pessoa1_id = p1.id
                        INNER JOIN pessoas p2
                            ON duplas.pessoa2_id = p2.id
                        WHERE duplas.id = ?
                    `;

                    db.get(
                        sqlDupla,
                        [duplaId],
                        function(err, dupla) {

                            if (err) {
                                return res.status(500).json({
                                    erro: "Erro ao consultar dupla."
                                });
                            }

                            if (!dupla) {
                                return res.status(404).json({
                                    erro: "Dupla não encontrada."
                                });
                            }

                            db.run(
                                `
                                INSERT INTO atribuicoes
                                (om_id, pessoa_id, dupla_id, data)
                                VALUES (?, ?, ?, ?)
                                `,
                                [
                                    omId,
                                    null,
                                    duplaId,
                                    dataAtual
                                ],
                                function(err) {

                                    if (err) {
                                        console.error(
                                            "Erro ao criar nova atribuição:",
                                            err.message
                                        );

                                        return res.status(500).json({
                                            erro:
                                                "Erro ao atribuir nova dupla."
                                        });
                                    }

                                    res.json({
                                        mensagem:
                                            "Responsável alterado com sucesso!",
                                        om: om.om,
                                        equipamento:
                                            om.equipamento,
                                        descricao:
                                            om.descricao,
                                        responsaveis:
                                            dupla.pessoa1 +
                                            " + " +
                                            dupla.pessoa2,
                                        tipo:
                                            "Dupla",
                                        status:
                                            om.status,
                                        data:
                                            dataAtual
                                    });

                                }
                            );

                        }
                    );

                }
            );

        }
    );

});// ===============================
// PAINEL GERAL DA EQUIPE
// INCLUI OMs INDIVIDUAIS E DUPLAS
// ===============================
app.get("/painel", function(req, res) {
    const sql = `
        SELECT
            pessoas.id,
            pessoas.nome,
            COUNT(atribuicoes.id) AS total,
            COALESCE(
                SUM(
                    CASE
                        WHEN ordens.status = 'Pendente'
                        THEN 1
                        ELSE 0
                    END
                ),
                0
            ) AS pendentes,
            COALESCE(
                SUM(
                    CASE
                        WHEN ordens.status = 'Em execução'
                        THEN 1
                        ELSE 0
                    END
                ),
                0
            ) AS em_execucao,
            COALESCE(
                SUM(
                    CASE
                        WHEN ordens.status = 'Concluída'
                        THEN 1
                        ELSE 0
                    END
                ),
                0
            ) AS concluidas
        FROM pessoas
        LEFT JOIN atribuicoes
            ON (
                atribuicoes.pessoa_id = pessoas.id
                OR
                atribuicoes.dupla_id IN (
                    SELECT duplas.id
                    FROM duplas
                    WHERE
                        duplas.pessoa1_id = pessoas.id
                        OR
                        duplas.pessoa2_id = pessoas.id
                )
            )
        LEFT JOIN ordens
            ON atribuicoes.om_id = ordens.id
        GROUP BY
            pessoas.id,
            pessoas.nome
        ORDER BY
            pessoas.id ASC
    `;
    db.all(
        sql,
        [],
        function(err, rows) {
            if (err) {
                console.error(
                    "Erro ao gerar painel:",
                    err.message
                );
                return res.status(500).json({
                    erro: "Erro ao gerar painel da equipe."
                });
            }
            res.json(rows);
        }
    );
});
// ===============================
// INICIA O SERVIDOR
// ===============================
const PORT = process.env.PORT || 3000;
app.listen(
    PORT,
    "0.0.0.0",
    function() {
        console.log(
            "Bot rodando na porta " + PORT
        );
    }
);