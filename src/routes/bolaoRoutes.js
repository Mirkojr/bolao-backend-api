import express from 'express';
import { Bolao, Palpite, Jogo, Participante, Time, User} from '../models/index.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/', authMiddleware, async (req, res) => {
    try {
        const novoBolao = await Bolao.create({
            nome: req.body.nome,
            criador_id: req.userId
        });
        res.status(201).json(novoBolao);
    } catch (error) {
        res.status(400).json({ message: "Falha ao criar Bolão.", error: error.message });
    }
});


router.get('/', authMiddleware, async (req, res) => {
    try{
        const criador_id = req.userId;
        const boloes_do_usuario = await Bolao.findAll({
        where: {
            criador_id : criador_id
        }
        });
        res.status(200).json(boloes_do_usuario);
    } catch(error){
        console.error(error);
        res.status(500).json({ message: 'Erro ao buscar os bolões do usuário.' });    }
});

// Specific routes MUST come before generic /:id routes
router.get('/:id/jogos', authMiddleware, async (req, res) => {
    try {
        const bolao = await Bolao.findByPk(req.params.id, {
            include: [{
                model: Jogo,
                through: { attributes: [] } 
            }]
        });
        
        if (!bolao) return res.status(404).json({ message: "Bolão não encontrado" });
        
        res.status(200).json(bolao.Jogos); 
    } catch (error) {
        res.status(500).json({ message: "Erro ao buscar jogos.", error: error.message });
    }
});

router.post('/:id/jogos', authMiddleware, async (req, res) => {
    try {
        const bolao = await Bolao.findByPk(req.params.id);
        if (!bolao) return res.status(404).json({ message: "Bolão não encontrado" });

        const { timeA, timeB, data_jogo } = req.body;

        // Validação dos parâmetros
        if (!timeA || !timeB) {
            return res.status(400).json({ message: "timeA e timeB são obrigatórios" });
        }

        const buscaOuCriaTime = async (nomeTime) => {
            if (!nomeTime || typeof nomeTime !== 'string') {
                throw new Error('Nome do time inválido');
            }
            
            const siglaGerada = nomeTime.substring(0, 3).toUpperCase();
            
            const [time, created] = await Time.findOrCreate({
                where: { nome: nomeTime },
                defaults: {
                    sigla: siglaGerada, 
                    escudo_url: null
                }
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

        res.status(201).json(novoJogo);
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: "Erro ao adicionar jogo.", error: error.message });
    }
});

router.get('/:id/participantes', authMiddleware, async (req, res) => {
    try {
        const participantes = await Participante.findAll({
            where: { bolao_id: req.params.id },
            include: [{
                model: User,
                attributes: ['id', 'nome', 'email']
            }]
        });
        res.status(200).json(participantes);
    } catch (error) {
        res.status(500).json({ message: "Erro ao buscar participantes.", error: error.message });
    }
});

router.post('/:id/participantes', authMiddleware, async (req, res) => {
    try {
        const { nome } = req.body; // O frontend manda o nome
        const bolaoId = req.params.id;

        // 1. Verificar se o Bolão existe
        const bolao = await Bolao.findByPk(bolaoId);
        if (!bolao) return res.status(404).json({ message: "Bolão não encontrado" });

        // 2. Achar o Usuário pelo nome (Já que o banco exige user_id)
        // OBS: O nome digitado tem que ser EXATAMENTE igual ao cadastro do usuário
        const usuarioEncontrado = await User.findOne({ where: { nome: nome } });

        if (!usuarioEncontrado) {
            return res.status(404).json({ 
                message: "Usuário não encontrado. Certifique-se de que ele já tem cadastro no sistema." 
            });
        }

        // 3. Verificar se ele já não está no bolão
        const jaParticipa = await Participante.findOne({
            where: {
                bolao_id: bolaoId,
                user_id: usuarioEncontrado.id
            }
        });

        if (jaParticipa) {
            return res.status(400).json({ message: "Esse usuário já está no bolão!" });
        }

        // 4. Criar o vínculo
        const novoParticipante = await Participante.create({
            bolao_id: bolaoId,
            user_id: usuarioEncontrado.id,
            pontuacao_no_bolao: 0
        });

        res.status(201).json(novoParticipante);

    } catch (error) {
        console.error(error);
        res.status(400).json({ message: "Erro ao adicionar participante.", error: error.message });
    }
});

router.get('/:id/palpites', authMiddleware, async (req, res) => {
    try {
        const palpites = await Palpite.findAll({
            where: { bolao_id: req.params.id } 
        });
        res.status(200).json(palpites);
    } catch (error) {
        res.status(500).json({ message: "Erro ao buscar palpites.", error: error.message });
    }
});
router.post('/:id/palpites', authMiddleware, async (req, res) => {
    try {
        const { jogo_id, gol_a_palpite, gol_b_palpite } = req.body;
        const bolao_id = req.params.id;
        const user_id = req.userId; // Vem do authMiddleware

        // Validação básica
        if (gol_a_palpite === undefined || gol_b_palpite === undefined) {
            return res.status(400).json({ message: "Os placares são obrigatórios." });
        }

        // 1. Tenta achar um palpite existente desse usuário para esse jogo neste bolão
        const palpiteExistente = await Palpite.findOne({
            where: {
                bolao_id: bolao_id,
                user_id: user_id,
                jogo_id: jogo_id
            }
        });

        if (palpiteExistente) {
            // --- CENÁRIO: ATUALIZAÇÃO (UPDATE) ---
            palpiteExistente.gol_a_palpite = gol_a_palpite;
            palpiteExistente.gol_b_palpite = gol_b_palpite;
            await palpiteExistente.save();
            
            return res.status(200).json(palpiteExistente);
        } else {
            // --- CENÁRIO: CRIAÇÃO (CREATE) ---
            const novoPalpite = await Palpite.create({
                bolao_id: bolao_id,
                user_id: user_id,
                jogo_id: jogo_id,
                gol_a_palpite: gol_a_palpite,
                gol_b_palpite: gol_b_palpite,
                pontos_ganhos: 0
            });
            
            return res.status(201).json(novoPalpite);
        }

    } catch (error) {
        console.error(error);
        res.status(400).json({ message: "Erro ao processar palpite.", error: error.message });
    }
});

// Generic routes MUST come AFTER specific routes to avoid conflicts
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