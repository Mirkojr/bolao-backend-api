import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';
import { SECRET } from '../config/auth.js';

export default {
    async register(req, res) {
        const nome = typeof req.body?.nome === 'string' ? req.body.nome.trim() : '';
        const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
        const senha = req.body?.senha;

        if (!nome || !email || typeof senha !== 'string' || !senha) {
            return res.status(400).json({ message: 'Nome, e-mail e senha são obrigatórios.' });
        }

        if (senha.length < 6) {
            return res.status(400).json({ message: 'A senha deve ter pelo menos 6 caracteres.' });
        }

        try {
            const user = await User.create({
                nome,
                email,
                senha_hash: senha,
                role: 'USER',
                pontuacao_total: 0,
            });

            return res.status(201).json({
                message: 'Conta criada com sucesso.',
                user: {
                    id: String(user.id),
                    nome: user.nome,
                    pontuacao_total: user.pontuacao_total,
                    role: user.role,
                },
            });
        } catch (error) {
            if (error.name === 'SequelizeUniqueConstraintError') {
                return res.status(409).json({ message: 'Este e-mail já está cadastrado.' });
            }

            if (error.name === 'SequelizeValidationError') {
                return res.status(400).json({ message: error.errors[0]?.message || 'Dados inválidos.' });
            }

            console.error(error);
            return res.status(500).json({ message: 'Erro interno do servidor.' });
        }
    },

    async login(req, res) {
        const { email, senha } = req.body;

        try {
            const user = await User.findOne({ where: { email } });

            if (!user) {
                return res.status(401).json({ message: 'Credenciais inválidas.' });
            }

            const isPasswordValid = await user.validPassword(senha);

            if (!isPasswordValid) {
                return res.status(401).json({ message: 'Credenciais inválidas.' });
            }

            const token = jwt.sign(
                { 
                    id: user.id,
                    role: user.role
                },
                SECRET,
                { expiresIn: '1h' }
            );

            const userToSave = {
                id: String(user.id),
                nome: user.nome,
                pontuacao_total: user.pontuacao_total,
                role: user.role,
            };

            return res.status(200).json({ user: userToSave, token: token });

        } catch (error) {
            console.error(error);
            return res.status(500).json({ message: 'Erro interno do servidor.' });
        }
    },

};

