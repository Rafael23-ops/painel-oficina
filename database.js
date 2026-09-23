const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./oficina.db', (err) => {
    if (err) {
        console.error('Erro ao conectar ao banco:', err.message);
    } else {
        console.log('Banco de dados conectado!');
    }
});
// ==========================================
// CRIA A TABELA DE ORDENS
// ==========================================
db.run(`
    CREATE TABLE IF NOT EXISTS ordens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    om TEXT NOT NULL,
    equipamento TEXT NOT NULL,
    responsavel TEXT,
    status TEXT DEFAULT 'Pendente',
    data TEXT,
    modelo_relatorio TEXT
)
`, function(err) {
    if (err) {
        console.error('Erro ao criar tabela ordens:', err.message);
        return;
    }
    // ==========================================
    // ADICIONA A COLUNA DESCRICAO
    // ==========================================
    db.run(`
        ALTER TABLE ordens ADD COLUMN descricao TEXT
    `, function(err) {
        if (err) {
            // A coluna já existe
            if (!err.message.includes('duplicate column name')) {
                console.error(
                    'Erro ao adicionar descricao:',
                    err.message
                );
            }
        } else {
            console.log('Coluna descricao adicionada!');
        }
    });
});
// ==========================================
// ADICIONA A COLUNA MOTIVO_PENDENCIA
// ==========================================
db.run(`
    ALTER TABLE ordens ADD COLUMN motivo_pendencia TEXT
`, function(err) {
    if (err) {
        // A coluna já existe
        if (!err.message.includes('duplicate column name')) {
            console.error(
                'Erro ao adicionar motivo_pendencia:',
                err.message
            );
        }
    } else {
        console.log('Coluna motivo_pendencia adicionada!');
    }
});
// ==========================================
// ADICIONA OS HORÁRIOS DA OM
// ==========================================

db.run(`
    ALTER TABLE ordens ADD COLUMN horario_inicial TEXT
`, function(err) {

    if (err) {

        if (!err.message.includes('duplicate column name')) {
            console.error(
                'Erro ao adicionar horario_inicial:',
                err.message
            );
        }

    } else {

        console.log(
            'Coluna horario_inicial adicionada!'
        );

    }

});


db.run(`
    ALTER TABLE ordens ADD COLUMN horario_final TEXT
`, function(err) {

    if (err) {

        if (!err.message.includes('duplicate column name')) {
            console.error(
                'Erro ao adicionar horario_final:',
                err.message
            );
        }

    } else {

        console.log(
            'Coluna horario_final adicionada!'
        );

    }

});
// ==========================================
// ADICIONA A COLUNA MODELO DE RELATÓRIO
// ==========================================
db.run(`
    ALTER TABLE ordens ADD COLUMN modelo_relatorio TEXT
`, function(err) {
    if (err) {
        // A coluna já existe
        if (!err.message.includes('duplicate column name')) {
            console.error(
                'Erro ao adicionar modelo_relatorio:',
                err.message
            );
        }
    } else {
        console.log('Coluna modelo_relatorio adicionada!');
    }
});
// ==========================================
// CRIA A TABELA DE PESSOAS
// ==========================================
db.run(`
    CREATE TABLE IF NOT EXISTS pessoas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL UNIQUE
    )
`, function(err) {
    if (err) {
        console.error(
            'Erro ao criar tabela pessoas:',
            err.message
        );
        return;
    }
    console.log('Tabela de pessoas pronta!');
    // ==========================================
    // CADASTRA A EQUIPE
    // ==========================================
    const pessoas = [
        'Rafael',
        'João Leno',
        'João Araújo',
        'Lucas Braga'
    ];
    pessoas.forEach(function(nome) {
        db.run(
            'INSERT OR IGNORE INTO pessoas (nome) VALUES (?)',
            [nome],
            function(err) {
                if (err) {
                    console.error(
                        'Erro ao cadastrar pessoa ' + nome + ':',
                        err.message
                    );
                }
            }
        );
    });
});// ==========================================
// CRIA A TABELA DE DUPLAS
// ==========================================
db.run(`
    CREATE TABLE IF NOT EXISTS duplas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pessoa1_id INTEGER NOT NULL,
        pessoa2_id INTEGER NOT NULL,
        UNIQUE(pessoa1_id, pessoa2_id)
    )
`, function(err) {
    if (err) {
        console.error(
            'Erro ao criar tabela duplas:',
            err.message
        );
    } else {
        console.log('Tabela de duplas pronta!');
    }
});
// ==========================================
// CRIA A TABELA DE ATRIBUIÇÕES
// ==========================================
db.run(`
    CREATE TABLE IF NOT EXISTS atribuicoes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        om_id INTEGER NOT NULL,
        pessoa_id INTEGER,
        dupla_id INTEGER,
        data TEXT,
        UNIQUE(om_id)
    )
`, function(err) {
    if (err) {
        console.error(
            'Erro ao criar tabela atribuicoes:',
            err.message
        );
    } else {
        console.log('Tabela de atribuicoes pronta!');
    }
});
// ==========================================
// CRIA A TABELA DE EQUIPAMENTOS
// ==========================================
db.run(`
    CREATE TABLE IF NOT EXISTS equipamentos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        equipamento TEXT NOT NULL UNIQUE,
        modelo_relatorio TEXT
    )
`, function(err) {

    if (err) {
        console.error(
            'Erro ao criar tabela equipamentos:',
            err.message
        );
        return;
    }

    console.log('Tabela de equipamentos pronta!');

    // ==========================================
    // CADASTRA OS EQUIPAMENTOS
    // ==========================================
    const equipamentos = [
        'BM03',
        'BM01',
        'BM02',
        'CA100',
        'CA101',
        'CA102',
        'CA103',
        'CA104',
        'CA51',
        'CA52',
        'CA53',
        'CA61',
        'CA62',
        'CA63',
        'CA71',
        'CA72',
        'CA73',
        'CA74',
        'CA75',
        'CA76',
        'CA77',
        'CA78',
        'CA79',
        'CA80',
        'CA81',
        'CA82',
        'EC51',
        'EC52',
        'EC53',
        'EC54',
        'EC61',
        'EC62',
        'EC63',
        'EC64',
        'EC65',
        'EC66',
        'EC67',
        'EE51',
        'EE52',
        'MA53',
        'MA54',
        'MA57',
        'MA58',
        'MA59',
        'MA60',
        'PC30',
        'PC31',
        'PC32',
        'PC33',
        'PC51',
        'PC52',
        'PC53',
        'PC54',
        'PC61',
        'PC62',
        'PC71',
        'PC72',
        'PC90',
        'PC91',
        'PC92',
        'PC93',
        'PZ51',
        'PZ52',
        'PZ54',
        'PZ55',
        'PZ56',
        'PZ57',
        'PZ58',
        'PZ59',
        'PZ60',
        'PZ61',
        'PZ62',
        'PZ63',
        'PZ71',
        'PZ72',
        'PZ73',
        'PZ74',
        'RP51',
        'RP52',
        'RP53',
        'RP54',
        'RP55',
        'TT51',
        'TT52',
        'TT53',
        'TT54',
        'TT55',
        'TT56',
        'TT58',
        'TT59',
        'TT60',
        'TT61',
        'TT62',
        'TT63',
        'TT64',
        'TT65',
        'TT71',
        'TT72',
        'TT73',
        'TT74',
        'TT75',
        'TT77',
        'TT78',
        'TT79',
        'TT80',
        'TT81',
        'TT82',
        'TT83',
        'TU51',
        'TU52',
        'CA110',
        'CA111',
        'CA112',
        'CA113',
        'CA114',
        'CA115',
        'CA116',
        'CA117',
        'CA118',
        'CA119',
        'CA120',
        'CA121',
        'CA122',
        'CA123',
        'CA124',
        'CA125',
        'CA126',
        'CA127',
        'CA128',
        'CA129',
        'CA130',
        'CA131',
        'CA132',
        'CA133',
        'CA134',
        'CA135',
        'CA136',
        'CA137',
        'CA138',
        'CA139'
    ];

    equipamentos.forEach(function(nome) {

    let modelo = null;

    // MINESTAR FLEET
    if (
        nome === 'CA100' ||
        nome === 'CA101' ||
        nome === 'CA102' ||
        nome === 'CA103' ||
        nome === 'CA104' ||
        nome === 'CA51' ||
        nome === 'CA52' ||
        nome === 'CA53' ||
        nome === 'CA61' ||
        nome === 'CA62' ||
        nome === 'CA63' ||
        nome === 'CA71' ||
        nome === 'CA72' ||
        nome === 'CA73' ||
        nome === 'CA74' ||
        nome === 'CA75' ||
        nome === 'CA76' ||
        nome === 'CA77' ||
        nome === 'CA78' ||
        nome === 'CA79' ||
        nome === 'CA80' ||
        nome === 'CA81' ||
        nome === 'CA82' ||
        nome === 'EC61' ||
        nome === 'EC62' ||
        nome === 'EC63' ||
        nome === 'EC64' ||
        nome === 'EC65' ||
        nome === 'EC66' ||
        nome === 'EC67' ||
        nome === 'MA53' ||
        nome === 'MA54' ||
        nome === 'MA57' ||
        nome === 'MA58' ||
        nome === 'MA59' ||
        nome === 'MA60' ||
        nome === 'CA110' ||
        nome === 'CA111' ||
        nome === 'CA112' ||
        nome === 'CA113' ||
        nome === 'CA114' ||
        nome === 'CA115' ||
        nome === 'CA116' ||
        nome === 'CA117' ||
        nome === 'CA118' ||
        nome === 'CA119' ||
        nome === 'CA120' ||
        nome === 'CA121' ||
        nome === 'CA122' ||
        nome === 'CA123' ||
        nome === 'CA124' ||
        nome === 'CA125' ||
        nome === 'CA126' ||
        nome === 'CA127' ||
        nome === 'CA128' ||
        nome === 'CA129' ||
        nome === 'CA130' ||
        nome === 'CA131' ||
        nome === 'CA132' ||
        nome === 'CA133' ||
        nome === 'CA134' ||
        nome === 'CA135' ||
        nome === 'CA136' ||
        nome === 'CA137' ||
        nome === 'CA138' ||
        nome === 'CA139'
    ) {
        modelo = 'MP MINESTAR FLEET';
    }

    // MINESTAR TERRAIN
    if (
        nome === 'BM03' ||
        nome === 'BM01' ||
        nome === 'BM02' ||
        nome === 'EC51' ||
        nome === 'EC52' ||
        nome === 'EC53' ||
        nome === 'EC54' ||
        nome === 'PC30' ||
        nome === 'PC31' ||
        nome === 'PC32' ||
        nome === 'PC33' ||
        nome === 'PC51' ||
        nome === 'PC52' ||
        nome === 'PC53' ||
        nome === 'PC54' ||
        nome === 'PC61' ||
        nome === 'PC62' ||
        nome === 'PC71' ||
        nome === 'PC72' ||
        nome === 'PC90' ||
        nome === 'PC91' ||
        nome === 'PC92' ||
        nome === 'PC93' ||
        nome === 'PZ51' ||
        nome === 'PZ52' ||
        nome === 'PZ54' ||
        nome === 'PZ55' ||
        nome === 'PZ56' ||
        nome === 'PZ57' ||
        nome === 'PZ58' ||
        nome === 'PZ59' ||
        nome === 'PZ60' ||
        nome === 'PZ61' ||
        nome === 'PZ62' ||
        nome === 'PZ63' ||
        nome === 'PZ71' ||
        nome === 'PZ72' ||
        nome === 'PZ73' ||
        nome === 'PZ74' ||
        nome === 'RP51' ||
        nome === 'RP52' ||
        nome === 'RP53' ||
        nome === 'RP54' ||
        nome === 'RP55' ||
        nome === 'TT51' ||
        nome === 'TT52' ||
        nome === 'TT53' ||
        nome === 'TT54' ||
        nome === 'TT55' ||
        nome === 'TT56' ||
        nome === 'TT58' ||
        nome === 'TT59' ||
        nome === 'TT60' ||
        nome === 'TT61' ||
        nome === 'TT62' ||
        nome === 'TT63' ||
        nome === 'TT64' ||
        nome === 'TT65' ||
        nome === 'TT71' ||
        nome === 'TT72' ||
        nome === 'TT73' ||
        nome === 'TT74' ||
        nome === 'TT75' ||
        nome === 'TT77' ||
        nome === 'TT78' ||
        nome === 'TT79' ||
        nome === 'TT80' ||
        nome === 'TT81' ||
        nome === 'TT82' ||
        nome === 'TT83' ||
        nome === 'TU51' ||
        nome === 'TU52'
    ) {
        modelo = 'MP MINESTAR TERRAIN';
    }

    db.run(
    `
    INSERT OR IGNORE INTO equipamentos
    (
        equipamento,
        modelo_relatorio
    )
    VALUES (?, ?)
    `,
    [nome, modelo],
    function(err) {

        if (err) {

            console.error(
                'Erro ao cadastrar equipamento ' +
                nome + ':',
                err.message
            );

        }

    }
);

db.run(
    `
    UPDATE equipamentos
    SET modelo_relatorio = ?
    WHERE equipamento = ?
    `,
    [modelo, nome],
    function(err) {

        if (err) {

            console.error(
                'Erro ao atualizar equipamento ' +
                nome + ':',
                err.message
            );

        }

    }
);

    });

});
module.exports = db;