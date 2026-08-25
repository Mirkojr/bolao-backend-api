import jwt from 'jsonwebtoken';
import { SECRET } from '../config/auth.js';
import { Bolao } from '../models/index.js';

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

export const bolaoOwner = async (req, res, next) => {
    if (req.userRole === 'ADMIN') return next();

    try {
        const bolao = await Bolao.findByPk(req.params.id, { attributes: ['criador_id'] });

        if (!bolao) {
            return res.status(404).json({ message: 'Bolão não encontrado.' });
        }

        if (String(bolao.criador_id) !== String(req.userId)) {
            return res.status(403).json({ message: 'Você só pode administrar seus próprios bolões.' });
        }

        return next();
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Não foi possível verificar a propriedade do bolão.' });
    }
};

export const isOwner = (req, res, next) => {
    if (req.userRole === 'ADMIN') return next();

    const requestedId = req.params.id;
    if (!requestedId) {
        return res.status(400).json({ message: "ID do recurso não informado na rota." });
    }

    if (String(req.userId) !== String(requestedId)){
        return res.status(403).json({ message: "Só pode solicitar informações de si mesmo." });
    }

     return next();
};

export default {authMiddleware, adminOnly, bolaoOwner, isOwner};