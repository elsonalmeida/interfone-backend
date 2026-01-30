const express = require("express");
const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const fs = require("fs");

const app = express();
app.use(express.json());

const moradores = JSON.parse(fs.readFileSync("moradores.json", "utf8"));

const client = new Client({
  authStrategy: new LocalAuth()
});

client.on("qr", qr => {
  qrcode.generate(qr, { small: true });
});

client.on("ready", () => {
  console.log("WhatsApp conectado!");
});

// Rota chamada pelo HTML
app.post("/chamar/:apto", async (req, res) => {
  const apto = req.params.apto;
  const numeroMorador = moradores[apto];

  if (!numeroMorador) {
    return res.status(404).send("Apartamento não encontrado");
  }

  const mensagem = `Olá, tem alguém no portão para o apartamento ${apto}`;
  await client.sendMessage(numeroMorador, mensagem);

  res.send("Mensagem enviada");
});

app.listen(3000, () => console.log("Servidor rodando na porta 3000"));
client.initialize();