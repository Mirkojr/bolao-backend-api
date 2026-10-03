import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';
import { SECRET } from '../config/auth.js';
import { ConflictError } from '../errors.js';

// Corpo já validado e normalizado pelos schemas (src/schemas).
const usuarioPublico = (user) => ({
    id: String(user.id),
    nome: user.nome,
    pontuacao_total: user.pontuacao_total,
    role: user.role,
});

export default {
    async register(req, res) {
        const { nome, email, senha } = req.body;

        if (await User.findOne({ where: { email }, attributes: ['id'] })) {
            throw new ConflictError('Este e-mail já está cadastrado.');
        }

        const user = await User.create({
            nome,
            email,
            senha_hash: senha,
            role: 'USER',
            pontuacao_total: 0,
        });

        return res.status(201).json({ message: 'Conta criada com sucesso.', user: usuarioPublico(user) });
    },

    async login(req, res) {
        const { email, senha } = req.body;

        const user = await User.scope('comSenha').findOne({ where: { email } });

        if (!user || !(await user.validPassword(senha))) {
            return res.status(401).json({ message: 'Credenciais inválidas.' });
        }

        const token = jwt.sign({ id: user.id, role: user.role }, SECRET, { expiresIn: '1h' });

        return res.status(200).json({ user: usuarioPublico(user), token });
    },
};
