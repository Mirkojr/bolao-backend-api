import jwt from 'jsonwebtoken';

const SECRET = process.env.ACCESS_TOKEN_KEY || 'CHAVE_SECRETA_DEFAULT';

const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if(!authHeader || !authHeader.startsWith('Bearer ')){
        return res.status(401).json({ message: 'Acesso negado: Token não fornecido ou formato inválido. '});
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, SECRET);
        req.userId = decoded.id;

        next();
    } catch(error){
        return res.status(401).json({ message: 'Acesso negado: Token inválido ou expirado.'});
    }
}

export default authMiddleware;