import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';
import { SECRET } from '../config/auth.js';

export default {
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

