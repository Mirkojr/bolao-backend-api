import { BadRequestError } from '../errors.js';

/**
 * Valida (e normaliza) partes da requisição com schemas zod.
 * Ex.: router.post('/', validate({ body: schemaCriarBolao }), controller.store)
 * Em caso de erro, responde 400 com a primeira mensagem do schema.
 */
export const validate = (schemas) => (req, res, next) => {
    for (const parte of ['params', 'query', 'body']) {
        const schema = schemas[parte];
        if (!schema) continue;

        const resultado = schema.safeParse(req[parte] ?? {});
        if (!resultado.success) {
            throw new BadRequestError(resultado.error.issues[0]?.message || 'Dados inválidos.');
        }

        // req.query é somente leitura no Express 5: guarda a versão validada à parte
        if (parte === 'query') req.validQuery = resultado.data;
        else req[parte] = resultado.data;
    }
    next();
};
