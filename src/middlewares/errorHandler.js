import { AppError } from '../errors.js';

// Rota que nenhum router atendeu
export const rotaNaoEncontrada = (req, res) => {
    res.status(404).json({ message: 'Rota não encontrada.' });
};

// Ponto único de resposta de erro: todo erro sai como { message } com o status
// certo, e detalhes internos (stack, mensagens do banco) nunca vão ao cliente.
export const errorHandler = (err, req, res, next) => {
    if (res.headersSent) return next(err);

    if (err instanceof AppError) {
        return res.status(err.status).json({ message: err.message });
    }

    // JSON malformado no corpo (express.json)
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({ message: 'O corpo da requisição não é um JSON válido.' });
    }

    switch (err.name) {
        case 'SequelizeValidationError':
            return res.status(400).json({ message: err.errors?.[0]?.message || 'Dados inválidos.' });
        case 'SequelizeUniqueConstraintError':
            return res.status(409).json({ message: 'Já existe um registro com esses dados.' });
        case 'SequelizeForeignKeyConstraintError':
            return res.status(409).json({ message: 'O registro está vinculado a outros dados e não pode ser alterado assim.' });
        case 'SequelizeDatabaseError':
            // ex.: id não numérico na URL ("invalid input syntax for type integer")
            if (err.parent?.code === '22P02') {
                return res.status(400).json({ message: 'Parâmetro inválido.' });
            }
            break;
    }

    console.error(err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
};
