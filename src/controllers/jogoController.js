import { Bolao, Jogo, Time } from '../models/index.js';

export default {
    
    // GET /:id/jogos
    async index(req, res) {
        try {
            const { id } = req.params;

            const bolao = await Bolao.findByPk(id, {
                include: [{
                    model: Jogo,
                    as: 'jogos', 
                    include: [
                        { model: Time, as: 'timeA' }, 
                        { model: Time, as: 'timeB' }
                    ]
                }]
            });

            if (!bolao) {
                return res.status(404).json({ message: "Bolão não encontrado" });
            }

            return res.json(bolao.jogos || []);

        } catch (error) {
            console.error(error);
            return res.status(500).json({ 
                message: "Erro ao buscar jogos.", 
                error: error.message 
            });
        }
    },

    // POST /:id/jogos
    async store(req, res) {
        try {
            const bolao = await Bolao.findByPk(req.params.id);
            if (!bolao) return res.status(404).json({ message: "Bolão não encontrado" });

            const { timeA, timeB, data_jogo } = req.body;

            if (!timeA || !timeB) {
                return res.status(400).json({ 
                    message: "Os nomes dos times A e B são obrigatórios." 
                });
            }

            const buscaOuCriaTime = async (nomeTime) => {
                // Tenta achar o time pelo NOME exato
                if (!nomeTime) throw new Error("Nome do time não fornecido");

                let time = await Time.findOne({ where: { nome: nomeTime } });
                
                // Se achou, retorna ele e acabou.
                if (time) return time;

                // Se não achou, vamos criar. Primeiro geramos a sigla padrão.
                let siglaGerada = nomeTime.substring(0, 3).toUpperCase();
                
                // Verificação: A sigla já existe?
                // Enquanto existir um time com essa sigla, a gente muda a sigla.
                let count = 0;
                while (await Time.findOne({ where: { sigla: siglaGerada } })) {
                    count++;
                    // Estratégia: Pega as 2 primeiras letras e poe um numero. Ex: "SAO" -> "SA1", "SA2"
                    siglaGerada = nomeTime.substring(0, 2).toUpperCase() + count;
                }

                time = await Time.create({
                    nome: nomeTime,
                    sigla: siglaGerada,
                    escudo_url: null
                });
                
                return time;
            };

            const timeObjA = await buscaOuCriaTime(timeA);
            const timeObjB = await buscaOuCriaTime(timeB);

            const novoJogo = await Jogo.create({
                time_a_id: timeObjA.id,
                time_b_id: timeObjB.id,
                data_jogo: data_jogo || new Date(),
                status: 'AGENDADO'
            });

            await bolao.addJogo(novoJogo);

            return res.status(201).json(novoJogo);
        } catch (error) {
            console.error(error);
            return res.status(400).json({ message: "Erro ao adicionar jogo.", error: error.message });
        }
    },

// PUT /:id/jogos/:jogoId
    async update(req, res) {
        try {
            const { jogoId } = req.params;
            const { gol_a_real, gol_b_real } = req.body;
            const jogo = await Jogo.findByPk(jogoId);

            if (!jogo) {
                return res.status(404).json({ message: "Jogo não encontrado." });
            }

            jogo.gol_a_real = gol_a_real;
            jogo.gol_b_real = gol_b_real;
            jogo.status = 'FINALIZADO';
            await jogo.save();
            return res.status(200).json(jogo);
        } catch (error) {
            return res.status(400).json({ message: "Erro ao atualizar jogo.", error: error.message });
        }   
    }
};