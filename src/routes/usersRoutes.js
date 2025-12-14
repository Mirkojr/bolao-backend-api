import express from 'express';
import { User } from '../models/index.js';

const router = express.Router();

// retornar todos os usuários
router.get('/', async (req, res) => {
    const users = await User.findAll();
    res.json(users);
});

// criar um novo usuário
router.post('/', async (req, res) => {
    try{
        const newUser = await User.create({
            nome : req.body.nome,
            email : req.body.email,
            senha_hash : req.body.senha
        });
        res.status(201).json(newUser.id)
    } catch(error){
         res.status(400).json({message : "Inserção de usuário falhou."})
    }

});

// retornar um usuário pelo id
router.get('/:id', async (req, res) => {
    try{
        const user = await User.findByPk(req.params.id);
        res.status(200).json(user);
    } catch(error){
        res.status(400).json({ message:"Busca de usuario falhou: ", error})
    }
});

// atualizar um usuário pelo id
router.put('/:id', async (req, res) => { 
    try{
        await User.update(req.body,{ where: { id : req.params.id } });
        res.status(200).json("Sucesso ao alterar usuário.");
    } catch(error){
        res.status(400).json({message: "Alteração de usuário falhou: ", error});
    }
});

// apagar um usuário pelo id
router.delete('/:id', async (req, res) => { 
    try{
        await User.destroy({ where: { id : req.params.id } });
        res.status(200).json("Sucesso ao apagar usuário.");
    } catch(error){
        res.status(204).send();
    }
});

export default router;