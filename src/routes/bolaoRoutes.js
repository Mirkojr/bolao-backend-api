import express from 'express';
import { Bolao } from '../models/index.js';

const router = express.Router();

router.post('/', async (req, res) => {
    try {
        const novoBolao = await Bolao.create(req.body);
        res.status(201).json(novoBolao);
    } catch (error) {
        res.status(400).json({ message: "Falha ao criar Bolão.", error: error.message });
    }
});


router.get('/', async (req, res) => {
    const boloes = await Bolao.findAll();
    res.json(boloes);
});


router.get('/:id', async (req, res) => {
    try {
        const bolao = await Bolao.findByPk(req.params.id);
        if (bolao) {
            res.status(200).json(bolao);
        } else {
            res.status(404).json({ message: "Bolão não encontrado." });
        }
    } catch (error) {
        res.status(400).json({ message: "Busca de Bolão falhou.", error: error.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        await Bolao.update(req.body, { where: { id: req.params.id } });
        res.status(200).json("Bolão atualizado com sucesso.");
    } catch (error) {
        res.status(400).json({ message: "Alteração do Bolão falhou.", error: error.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        await Bolao.destroy({ where: { id: req.params.id } });
        res.status(204).send(); 
    } catch (error) {
        res.status(400).json({ message: "Falha ao apagar Bolão.", error: error.message });
    }
});

export default router;