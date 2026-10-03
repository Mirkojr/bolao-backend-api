import { User } from '../models/index.js'
import { ConflictError, NotFoundError } from '../errors.js';

async function buscarUsuario(id) {
    const user = await User.findByPk(id);
    if (!user) throw new NotFoundError('Usuário não encontrado.');
    return user;
}

async function garantirEmailLivre(email, idAtual) {
    const existente = await User.findOne({ where: { email }, attributes: ['id'] });
    if (existente && String(existente.id) !== String(idAtual)) {
        throw new ConflictError('Este e-mail já está cadastrado.');
    }
}

export default{

    async index(req, res){
        const users = await User.findAll();
        return res.status(200).json(users);
    },

    async show(req, res){
        return res.status(200).json(await buscarUsuario(req.params.id));
    },

    async store(req, res){
        const { nome, email, senha } = req.body;
        await garantirEmailLivre(email);

        const newUser = await User.create({ nome, email, senha_hash: senha });
        return res.status(201).json(newUser);
    },

    async update (req, res){ 
        const user = await buscarUsuario(req.params.id);
        const { nome, email, senha } = req.body;

        if (email !== undefined) await garantirEmailLivre(email, user.id);

        if (nome !== undefined) user.nome = nome;
        if (email !== undefined) user.email = email;
        if (senha !== undefined) user.senha_hash = senha;

        await user.save();
        return res.status(200).json(user);
    },

    async delete (req, res) { 
        try {
            const apagados = await User.destroy({ where: { id : req.params.id } });
            if (apagados === 0) throw new NotFoundError('Usuário não encontrado.');
            return res.status(204).send();
        } catch (error) {
            if (error.name === 'SequelizeForeignKeyConstraintError') {
                throw new ConflictError('O usuário ainda tem bolões ou participações vinculadas.');
            }
            throw error;
        }
    }

}
