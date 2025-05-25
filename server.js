const express = require("express");
const path = require("path");

const app = express();
const PORT = 3000;

// Servir os arquivos estáticos (html, css, imgs, js do front)
app.use(express.static(path.join(__dirname, "public")));

// Rota básica só pra testar
app.get("/api/status", (req, res) => {
  res.json({ status: "Servidor rodando" });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
