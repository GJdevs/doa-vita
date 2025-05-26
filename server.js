const express = require("express");
const path = require("path");
const { PrismaClient } = require("@prisma/client");
const session = require('express-session');

const prisma = new PrismaClient();
const app = express();
const PORT = 3000;

// Middleware para sessão (tem que estar antes das rotas que usam sessão)
app.use(session({
  secret: 'seuSegredoAqui', // troque por uma string forte
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 3600000 } // 1 hora
}));

// Servir arquivos estáticos (HTML, CSS, imagens, etc.)
app.use(express.static(path.join(__dirname, "public")));

// Permitir leitura dos dados enviados via formulário (POST)
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Rota básica de teste
app.get("/status", (req, res) => {
  res.json({ status: "Servidor rodando com MongoDB + Prisma" });
});

// Rota para receber formulário de cadastro
app.post("/cadastrar", async (req, res) => {
  const { nome, email, cpfcnpj, telefone, senha } = req.body;

  try {
    const novoUsuario = await prisma.usuario.create({
      data: { nome, email, cpfcnpj, telefone, senha },
    });

    res.redirect('/Login.html');
  } catch (error) {
    console.error("Erro ao cadastrar usuário:", error);
    res.status(500).send(`
      <h2>Erro ao cadastrar usuário</h2>
      <p>${error.message}</p>
      <a href="/cadastrar.html">Tentar novamente</a>
    `);
  }
});

// Rota de login
app.post("/login", async (req, res) => {
  const { email, senha } = req.body;

  try {
    const usuario = await prisma.usuario.findUnique({
      where: { email },
    });

    if (!usuario) {
      return res.status(401).send("<h2>Email não encontrado.</h2><a href='/Login.html'>Tentar novamente</a>");
    }

    if (usuario.senha !== senha) {
      return res.status(401).send("<h2>Senha incorreta.</h2><a href='/Login.html'>Tentar novamente</a>");
    }

    // **Aqui você salva o usuário na sessão**
    req.session.user = {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email
    };

    res.redirect('/sua-campanha.html');

  } catch (error) {
    console.error("Erro no login:", error);
    res.status(500).send("<h2>Erro ao fazer login</h2><a href='/Login.html'>Tentar novamente</a>");
  }
});

// Rota para verificar se o usuário está logado
app.get('/usuario-logado', (req, res) => {
  if (req.session.user) {
    res.json({ loggedIn: true, user: req.session.user });
  } else {
    res.json({ loggedIn: false });
  }
});

// Rota para logout
app.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.sendStatus(200);
  });
});

// Iniciar o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
