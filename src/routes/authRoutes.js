import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt'; 
import { User } from '../models/index.js';

const router = express.Router();

const SECRET = process.env.ACCESS_TOKEN_KEY || 'CHAVE_SECRETA_DEFAULT';

router.post('/login', async (req, res) => {
    const{ email, senha } = req.body;

    try{
        const user = await User.findOne( { where: { email }});

        if (!user) {
            return res.status(401).json({ message: 'Credenciais inválidas.'});
        }
        const isPasswordValid = await user.validPassword(senha);
        
        if(!isPasswordValid){
            return res.status(401).json({ message: 'Credenciais inválidas.'});
        }

        const token = jwt.sign(
            { id: user.id },
            SECRET,
            { expiresIn: '1h'}
        );
        
        return res.status(200).json({ token: token });
    } catch(error){
        console.error(error);
        return res.status(500).json({ message: 'Erro interno do servidor.'} );
    }
});

export default router;