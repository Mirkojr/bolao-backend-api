# DOCUMENTAÇÃO DE ROTAS - API BOLÃO

## PREFIXO BASE: /api

---

### 1. AUTENTICAÇÃO (/auth)
- POST /auth/login -> Realiza o login (Acesso: Público)

---

### 2. USUÁRIOS (/users)
- GET    /users     -> Listar todos os usuários (Acesso: Público)
- POST   /users     -> Criar novo usuário (Acesso: Público)
- GET    /users/:id -> Buscar usuário por ID (Acesso: Público)
- PUT    /users/:id -> Atualizar usuário (Acesso: Público)
- DELETE /users/:id -> Deletar usuário (Acesso: Público)

---

### 3. JOGOS (/jogos)
- GET    /jogos     -> Listar todos os jogos (Acesso: Logado)
- POST   /jogos     -> Criar novo jogo (Acesso: Admin)
- PUT    /jogos/:id -> Atualizar placar/status (Acesso: Admin)
- DELETE /jogos/:id -> Deletar jogo (Acesso: Admin)

---

### 4. BOLÕES (/boloes)

#### Gerenciamento de Bolão (CRUD)
- GET    /boloes     -> Listar bolões (Acesso: Logado)
- GET    /boloes/:id -> Detalhes do bolão (Acesso: Logado)
- POST   /boloes     -> Criar bolão (Acesso: Admin)
- PUT    /boloes/:id -> Atualizar bolão (Acesso: Admin)
- DELETE /boloes/:id -> Deletar bolão (Acesso: Admin)

#### Jogos no Bolão
- GET    /boloes/:id/jogos               -> Listar jogos do bolão (Acesso: Logado)
- POST   /boloes/:id/jogos/:jogoId       -> Adicionar jogo ao bolão (Acesso: Admin)
- DELETE /boloes/:id/jogos/:jogoId       -> Remover jogo do bolão (Acesso: Admin)

#### Participantes
- GET    /boloes/:id/participantes       -> Listar participantes (Acesso: Logado)
- POST   /boloes/:id/participantes       -> Adicionar participante (Acesso: Admin)
- DELETE /boloes/:id/participantes/:pId  -> Remover participante (Acesso: Admin)

#### Palpites
- GET    /boloes/:id/palpites            -> Listar palpites (Acesso: Logado)
- POST   /boloes/:id/palpites            -> Criar palpite (Acesso: Admin)
- DELETE /boloes/:id/palpites            -> Deletar palpite (Acesso: Admin)

---

### LEGENDA DE ACESSO:
- Público: Sem restrição.
- Logado: Requer authMiddleware.
- Admin: Requer authMiddleware + adminOnly.