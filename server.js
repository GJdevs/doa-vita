const express = require("express");
const path = require("path");
const { PrismaClient } = require("@prisma/client");
const session = require("express-session");
const multer = require("multer");
const fs = require("fs");
const { ObjectId } = require("mongodb");

const prisma = new PrismaClient();
const app = express();
const PORT = 3000;

// Sessões
app.use(session({
  secret: "seuSegredoAqui",
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 3600000 }
}));

// Middlewares
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Upload de imagens
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, "public/uploads");
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});
const upload = multer({ storage });

// Rota de status
app.get("/status", (req, res) => {
  res.json({ status: "Servidor rodando com Prisma e upload funcionando" });
});

// Cadastro de usuário
app.post("/cadastrar", async (req, res) => {
  const { nome, email, cpfcnpj, telefone, senha } = req.body;
  try {
    await prisma.usuario.create({
      data: { nome, email, cpfcnpj, telefone, senha },
    });
    res.redirect("/Login.html");
  } catch (error) {
    console.error("Erro ao cadastrar usuário:", error);
    res.status(500).send(`
      <h2>Erro ao cadastrar usuário</h2>
      <p>${error.message}</p>
      <a href="/cadastrar.html">Tentar novamente</a>
    `);
  }
});

// Login
app.post("/login", async (req, res) => {
  const { email, senha } = req.body;
  try {
    const usuario = await prisma.usuario.findUnique({ where: { email } });
    if (!usuario || usuario.senha !== senha) {
      return res.status(401).send("<h2>Login inválido.</h2><a href='/Login.html'>Voltar</a>");
    }
    req.session.user = {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email
    };
    res.redirect("/sua-campanha.html");
  } catch (error) {
    console.error("Erro no login:", error);
    res.status(500).send("<h2>Erro ao fazer login</h2><a href='/Login.html'>Tentar novamente</a>");
  }
});

// Verifica se o usuário está logado
app.get("/usuario-logado", (req, res) => {
  if (req.session.user) {
    res.json({ loggedIn: true, user: req.session.user });
  } else {
    res.json({ loggedIn: false });
  }
});

// Logout
app.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.sendStatus(200);
  });
});

// Cadastro de campanha
app.post("/cadastrar-campanha", upload.single("imagem"), async (req, res) => {
  const { nome, rua, num, telefone, tipo, descricao } = req.body;
  const imagem = req.file ? `/uploads/${req.file.filename}` : null;

  if (!req.session.user) {
    return res.status(401).send("Você precisa estar logado para cadastrar uma campanha.");
  }

  try {
    await prisma.campanha.create({
      data: {
        nome,
        rua,
        numero: num,
        telefone,
        tipoSanguineo: tipo,
        descricao,
        imagem,
        usuarioId: new ObjectId(req.session.user.id)
      }
    });
    res.redirect("/sua-campanha.html");
  } catch (error) {
    console.error("Erro ao cadastrar campanha:", error);
    res.status(500).send("Erro ao cadastrar campanha.");
  }
});

// Buscar todas as campanhas
app.get("/campanhas", async (req, res) => {
  try {
    const campanhas = await prisma.campanha.findMany();
    res.json(campanhas);
  } catch (err) {
    console.error("Erro ao buscar campanhas:", err);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// Buscar campanha por ID
app.get("/campanhas/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const campanha = await prisma.campanha.findUnique({
      where: { id }
    });
    if (!campanha) {
      return res.status(404).json({ error: "Campanha não encontrada" });
    }
    res.json(campanha);
  } catch (error) {
    console.error("Erro ao buscar campanha:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// 🔥 NOVA ROTA: Campanhas do usuário logado
app.get("/minhas-campanhas", async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: "Não autorizado" });
  }

  try {
    const campanhas = await prisma.campanha.findMany({
      where: {
        usuarioId: new ObjectId(req.session.user.id)
      }
    });
    res.json(campanhas);
  } catch (error) {
    console.error("Erro ao buscar campanhas do usuário:", error);
    res.status(500).json({ error: "Erro ao buscar campanhas" });
  }
});

// 🔥 NOVA ROTA: Excluir campanha
app.delete("/campanhas/:id", async (req, res) => {
  const { id } = req.params;

  if (!req.session.user) {
    return res.status(401).json({ error: "Não autorizado" });
  }

  try {
    const campanha = await prisma.campanha.findUnique({
      where: { id }
    });

    if (!campanha || campanha.usuarioId.toString() !== req.session.user.id) {
      return res.status(403).json({ error: "Você não tem permissão para excluir esta campanha." });
    }

    await prisma.campanha.delete({
      where: { id }
    });

    res.status(200).json({ message: "Campanha excluída com sucesso." });
  } catch (error) {
    console.error("Erro ao excluir campanha:", error);
    res.status(500).json({ error: "Erro ao excluir campanha." });
  }
});

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
