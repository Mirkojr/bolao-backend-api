import 'dotenv/config';
import cors from 'cors';

const allowedOrigins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

const corsOptions = {
    origin(origin, callback) {
        //Permitir ferramentas sem origim (postman, curls...)
        if(!origin) return callback(null, true);

        if( allowedOrigins.includes(origin)) return callback(null, true);

        return callback(new Error('Origem não permitida pelo CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
};

export default cors(corsOptions);
