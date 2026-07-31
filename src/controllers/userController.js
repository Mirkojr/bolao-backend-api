import { User } from '../models/index.js'

export default{

    async index(req, res){
        try {
            const users = await User.findAll({ attributes: { exclude : 'senha_hash'} });
            res.status(200).json(users);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Falha na busca dos usuarios."})
        }
    },

    async show(req, res){
        try{
            const user = await User.findByPk(req.params.id, {
                attributes: { exclude : 'senha_hash'}
            });
            res.status(200).json(user);
        } catch(error){
            res.status(400).json({ message:"Busca de usuario falhou "})
        }
    },

    async store(req, res){
        try{
            const newUser = await User.create({
                nome: req.body.nome,
                email: req.body.email,
                senha_hash: req.body.senha
            })

            res.status(201).json(newUser);
        } catch(error){
             res.status(400).json({message : "Inserção de usuário falhou."});
        }
    },

    async update (req, res){ 
        try {
            const user = await User.findByPk(req.params.id);

            if(!user) return res.json({ message: "Esser user não existe. "});

            const { nome, email, senha } = req.body;

            if (nome !== undefined) user.nome = nome;
            if (email !== undefined) user.email = email;
            if (senha !== undefined) user.senha_hash = senha;

            await user.save();

            const { senha_hash, ...userSafe} = user.toJSON();
            
            return res.status(200).json(userSafe);
        } catch (error) {
            return res.status(500).send({ message: "Não foi possível atualizar o user. "});
        }
    },

    async delete (req, res) { 
        try{
            await User.destroy({ where: { id : req.params.id } });
            res.status(200).json("Sucesso ao apagar usuário.");
        } catch(error){
            res.status(204).send();
        }
    }

}