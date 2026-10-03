import { User } from '../models/index.js'

// Erros de validação/unicidade do Sequelize viram 4xx; o resto é 500.
const responderErro = (res, error, mensagemPadrao) => {
    if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({ message: "Este e-mail já está cadastrado." });
    }
    if (error.name === 'SequelizeForeignKeyConstraintError') {
        return res.status(409).json({ message: "O usuário ainda tem bolões ou participações vinculadas." });
    }
    if (error.name === 'SequelizeValidationError') {
        return res.status(400).json({ message: error.errors[0]?.message || "Dados inválidos." });
    }
    console.error(error);
    return res.status(500).json({ message: mensagemPadrao });
};

export default{

    async index(req, res){
        try {
            const users = await User.findAll();
            return res.status(200).json(users);
        } catch (error) {
            return responderErro(res, error, "Falha na busca dos usuários.");
        }
    },

    async show(req, res){
        try{
            const user = await User.findByPk(req.params.id);
            if (!user) return res.status(404).json({ message: "Usuário não encontrado." });
            return res.status(200).json(user);
        } catch(error){
            return responderErro(res, error, "Busca de usuário falhou.");
        }
    },

    async store(req, res){
        const { nome, email, senha } = req.body ?? {};

        if (!nome || !email || !senha) {
            return res.status(400).json({ message: "Nome, e-mail e senha são obrigatórios." });
        }

        try{
            const newUser = await User.create({
                nome,
                email,
                senha_hash: senha
            })

            return res.status(201).json(newUser);
        } catch(error){
            return responderErro(res, error, "Inserção de usuário falhou.");
        }
    },

    async update (req, res){
        try {
            const user = await User.findByPk(req.params.id);

            if(!user) return res.status(404).json({ message: "Usuário não encontrado." });

            const { nome, email, senha } = req.body ?? {};

            if (nome !== undefined) user.nome = nome;
            if (email !== undefined) user.email = email;
            if (senha !== undefined) user.senha_hash = senha;

            await user.save();

            return res.status(200).json(user);
        } catch (error) {
            return responderErro(res, error, "Não foi possível atualizar o usuário.");
        }
    },

    async delete (req, res) {
        try{
            const apagados = await User.destroy({ where: { id : req.params.id } });
            if (apagados === 0) return res.status(404).json({ message: "Usuário não encontrado." });
            return res.status(204).send();
        } catch(error){
            return responderErro(res, error, "Não foi possível apagar o usuário.");
        }
    }

}
