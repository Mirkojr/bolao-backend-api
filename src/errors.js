// Erros de domínio: os controllers lançam, o errorHandler responde.
export class AppError extends Error {
    constructor(status, message) {
        super(message);
        this.name = 'AppError';
        this.status = status;
    }
}

export class BadRequestError extends AppError {
    constructor(message = 'Dados inválidos.') { super(400, message); }
}

export class ForbiddenError extends AppError {
    constructor(message = 'Você não tem permissão para esta operação.') { super(403, message); }
}

export class NotFoundError extends AppError {
    constructor(message = 'Recurso não encontrado.') { super(404, message); }
}

export class ConflictError extends AppError {
    constructor(message) { super(409, message); }
}
