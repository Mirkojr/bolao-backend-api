import { Jogo, Time } from '../models/index.js';
import { calcularPontuacaoJogo } from '../services/rankingService.js';

export default {

    // LISTAR TODOS OS JOGOS GLOBAIS
    async index(req, res) {
        try {
            const jogos = await Jogo.findAll({
                include: [
                    { model: Time, as: 'timeA' },
                    { model: Time, as: 'timeB' }
                ],
                order: [['data_jogo', 'ASC']],
            });
            return res.json(jogos);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Erro ao buscar jogos"});
        }
    },

    // CRIAR UM NOVO JOGO GLOBAL (Admin)
    async store(req, res) {
        try {
            const { timeA, timeB, data_jogo } = req.body;

            // Função auxiliar para achar ou criar time
            const buscaOuCriaTime = async (nomeTime) => {
                if (!nomeTime) throw new Error("Nome do time obrigatório");
                let time = await Time.findOne({ where: { nome: nomeTime } });
                if (time) return time;
                
                // Gera sigla simples (ex: "FLA")
                let sigla = nomeTime.substring(0, 3).toUpperCase();
                return await Time.create({ nome: nomeTime, sigla });
            };

            const timeObjA = await buscaOuCriaTime(timeA);
            const timeObjB = await buscaOuCriaTime(timeB);

            const novoJogo = await Jogo.create({
                time_a_id: timeObjA.id,
                time_b_id: timeObjB.id,
                data_jogo: data_jogo || new Date(),
                status: 'AGENDADO'
            });

            return res.status(201).json(novoJogo);
        } catch (error) {
            return res.status(400).json({ message: "Erro ao criar jogo."});
        }
    },

    // ATUALIZAR PLACAR E FINALIZAR
    async update(req, res) {
        try {
            const { id } = req.params; // ID do Jogo
            const { gol_a_real, gol_b_real } = req.body;
            
            const jogo = await Jogo.findByPk(id);
            if (!jogo) return res.status(404).json({ message: "Jogo não encontrado." });

            jogo.gol_a_real = gol_a_real;
            jogo.gol_b_real = gol_b_real;
            jogo.status = 'FINALIZADO';

            await jogo.save();

            await calcularPontuacaoJogo(jogo.id, gol_a_real, gol_b_real);
            

            return res.status(200).json({ message: "Jogo atualizado.", jogo });
        } catch (error) {
            return res.status(400).json({ message: "Erro ao atualizar jogo."});
        }
    },

    // DELETAR JOGO GLOBAL
    async delete(req, res) {
        try {
            await Jogo.destroy({ where: { id: req.params.id } });
            res.status(204).send();
        } catch (error) {
            return res.status(500).json({ message: "Erro ao deletar jogo" });
        }
    }
};