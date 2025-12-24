import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';

const SECRET = process.env.ACCESS_TOKEN_KEY;

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

            return res.status(200).json({ user: user, token: token });

        } catch (error) {
            return res.status(500).json({ message: 'Erro interno do servidor.' });
        }
    },

};

