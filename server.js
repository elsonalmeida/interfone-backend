// Forçando redeploy no Render

const express = require("express");
const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const fs = require("fs");
const puppeteer = require("puppeteer");

const app = express();
app.use(express.json());

// Carrega lista de moradores
const moradores = JSON.parse(fs.readFileSync("moradores.json", "utf8"));

// Configura cliente WhatsApp
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
     headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  }
});

// Eventos do WhatsApp
client.on("qr", qr => {
  qrcode.generate(qr, { small: true });
});

client.on("ready", () => {
  console.log("WhatsApp conectado!");
});

// Rota chamada pelo HTML
app.post("/chamar/:apto", async (req, res) => {
  const apto = req.params.apto;

  console.log("Moradores disponíveis:", moradores);
  console.log("Apartamento solicitado:", apto);

  const numeroMorador = moradores[apto];
  console.log("Número encontrado:", numeroMorador);

  if (!numeroMorador) {
    return res.status(404).send("Apartamento não encontrado");
  }

  const mensagem = `Olá, tem alguém no portão para o apartamento ${apto}`;
  await client.sendMessage(numeroMorador, mensagem);

  res.send("Mensagem enviada");
});

// Rota de teste
app.get("/", (req, res) => {
  res.send("Interfone coletivo rodando!");
});

// Porta dinâmica para Render
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Servidor rodando na porta ${port}`));

// Inicializa WhatsApp
client.initialize().catch(err => {
  console.error("Erro ao iniciar WhatsApp:", err);
});



