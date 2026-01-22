import Time from "../models/Time.js"

export default {
    async index(req, res){
        try {
            const times = await Time.findAll();
            res.status(201).json(times);
        } catch (error) {
            res.status(400).json({message: "Busca de usuário falhou", error})
        }
    }
}