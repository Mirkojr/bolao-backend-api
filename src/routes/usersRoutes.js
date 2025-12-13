import express from 'express';
import { User } from '../models/index.js';

const router = express.Router();


router.get('/', async (req, res) => {
    const users = await User.findAll();
    res.json(users);
});

router.post('/', async (req, res) => {
    try{
        const newUser = await User.create(req.body);
        res.status(201).json(newUser.id)
    } catch(error){
         res.status(400).json("Inserção de usuário falhou.")
    }

});

router.get('/:id', async (req, res) => {
    try{
        const user = await User.findByPk(req.params.id);
        res.status(200).json(user);
    } catch(error){
        res.status(400).json({ message:"Busca de usuario falhou: ", error})
    }
});

router.put('/:id', async (req, res) => { 
    try{
        await User.update(req.body,{ where: { id : req.params.id } });
        res.status(200).json("Sucesso ao alterar usuário.");
    } catch(error){
        res.status(400).json({message: "Alteração de usuário falhou: ", error});
    }
});

router.delete('/:id', async (req, res) => { 
    try{
        await User.destroy({ where: { id : req.params.id } });
        res.status(200).json("Sucesso ao apagar usuário.");
    } catch(error){
        res.status(204).send();
    }
});

export default router;