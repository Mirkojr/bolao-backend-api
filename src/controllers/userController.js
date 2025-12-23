

import User from '../models/User.js';

export default {

    async index(req, res) {
        try{
            const users = await User.findAll();
            return res.status(200).json(users);
        } catch(error){
            console.log("Erro ao buscar usuários. ")
            res.status(400).json({ message: error.message });
        }
    },

    async store(req, res) {
        try {
            const newUser = await User.create({
                nome: req.body.nome,
                email: req.body.email,
                senha_hash: req.body.senha
            });

            res.status(201).json(newUser.id);

        } catch (error) {
            console.log("Erro ao adicionar usuário.");
            res.status(400).json( { message: error.message });
        }
    },

    async show(req, res) {
        try {
            const user = await User.findByPk(req.params.id);
            if (!user) return res.status(404).json({ message: 'Usuário não encontrado' });
            return res.json(user);
        } catch (error) {
            return res.status(400).json(error.message);
        }
    },

    async delete(req, res) {
        try {
            const user = await User.findByPk(req.params.id);
            if (!user) return res.status(404).json({ message: 'Usuário não existe' });
            
            await user.destroy();
            return res.json({ message: 'Deletado com sucesso' });
        } catch (e) {
            return res.status(400).json({ message: e.message });
        }
    },
    
    async update(req, res)  { 
        try{
            await User.update(req.body,{ where: { id : req.params.id } });
            res.status(200).json("Sucesso ao alterar usuário.");
        } catch(error){
            res.status(400).json({message: "Alteração de usuário falhou: ", error});
        }
    }

}