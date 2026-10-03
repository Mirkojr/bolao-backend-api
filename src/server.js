import './config/env.js';
import app from './app.js';
import sequelize from './config/database.js';
import User from './models/User.js';

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try{
    await sequelize.authenticate();

    // Verifica se o usuário admin já existe, se não, cria um novo
    const adminExists = await User.findOne({ where: { role: 'ADMIN' } });
    
    if (!adminExists) {
      const adminName = process.env.ADMIN_NAME;
      const adminEmail = process.env.ADMIN_EMAIL;
      const adminPassword = process.env.ADMIN_PASS;

      if (!adminName || !adminEmail || !adminPassword) {
        throw new Error('Nenhum administrador no banco: defina ADMIN_NAME, ADMIN_EMAIL e ADMIN_PASS para criar o primeiro.');
      }

      await User.create({
        nome: adminName,
        email: adminEmail,
        senha_hash: adminPassword,
        role: 'ADMIN'
      });
      console.log('Usuário Admin padrão criado com sucesso!');
    }

    console.log('Conexão com o banco de dados foi um sucesso');
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Servidor rodando na porta ${PORT}`);
    });
  } catch(error){
    console.error('Falha ao iniciar a API: ', error);
    process.exit(1);
  }
}

startServer();
