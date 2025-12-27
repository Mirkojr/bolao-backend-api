import jwt from 'jsonwebtoken';
import { SECRET } from '../config/auth.js';

export const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if(!authHeader || !authHeader.startsWith('Bearer ')){
        return res.status(401).json({ message: 'Acesso negado: Token não fornecido ou formato inválido. '});
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, SECRET);
        req.userId = decoded.id;
        req.userRole = decoded.role;
        next();
    } catch(error){
        return res.status(401).json({ message: 'Acesso negado: Token inválido ou expirado.'});
    }
}

export const adminOnly = (req, res, next) => {
    if (req.userRole !== 'ADMIN') {
        return res.status(403).json({ 
            message: 'Acesso negado: Esta operação é exclusiva para administradores.' 
        });
    }
    next();
};

export default {authMiddleware, adminOnly};