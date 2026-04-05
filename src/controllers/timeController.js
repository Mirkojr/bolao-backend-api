import Time from "../models/Time.js"

export default {
    async index(req, res){
        try {
            const times = await Time.findAll();
            res.status(201).json(times);
        } catch (error) {
            res.status(400).json({message: "Busca de usuário falhou", error})
        }
    },

    async show(req, res){
        try {
            const time = await Time.findByPk(req.params.id);
            if(!time) return res.status(404).json({message: "Time não encontrado"});
            res.status(200).json(time);
        } catch (error) {
            res.status(400).json({message: "Busca de usuário falhou", error})
        }
    },

    async searchByName(req, res){
        try {
            const times = await Time.findAll({
                where: {
                    nome: req.params.nome
                }
            });
            res.status(200).json(times);
        } catch (error) {
            res.status(400).json({message: "Busca de usuário falhou", error})
        }
    },

    async store(req, res){
        try {
            const novoTime = await Time.create(req.body);
            res.status(201).json(novoTime);
        } catch (error) {
            res.status(400).json({message: "Criação de usuário falhou", error})
        }
    },

    async update(req, res){
        try {
            await Time.update(req.body, {where: {id: req.params.id}});
            res.status(200).json({message: "Time atualizado com sucesso"});
        } catch (error) {
            res.status(400).json({message: "Atualização de usuário falhou", error})
        }
    },

    async delete(req, res){
        try {
            await Time.destroy({where: {id: req.params.id}});
            res.status(204).send();
        } catch (error) {
            res.status(400).json({message: "Deleção de usuário falhou", error})
        }
    }

}