import { User } from '../models/index.js'

export default{

    async index(req, res){
        try{
            const user = await User.findByPk(req.params.id);
            res.status(200).json(user);
        } catch(error){
            res.status(400).json({ message:"Busca de usuario falhou: ", error})
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
        try{
            await User.update(req.body,{ where: { id : req.params.id } });
            res.status(200).json("Sucesso ao alterar usuário.");
        } catch(error){
            res.status(400).json({message: "Alteração de usuário falhou: ", error});
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