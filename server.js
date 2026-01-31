const express = require("express");
const { Client, LocalAuth } = require("whatsapp-web.js");
const QRCode = require("qrcode");
const fs = require("fs");
const chromium = require("chromium");

const app = express();
app.use(express.json());

// Carrega lista de moradores
const moradores = JSON.parse(fs.readFileSync("moradores.json", "utf8"));

// Configura cliente WhatsApp usando chromium.path
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    executablePath: chromium.path,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  }
});

let currentQr = null;

// Evento para capturar QR Code
client.on("qr", (qr) => {
  currentQr = qr;
  console.log("QR Code recebido");
});

// Evento quando o WhatsApp estiver pronto
client.on("ready", () => {
  console.log("WhatsApp conectado!");
});

// Inicializa cliente
client.initialize().catch(err => {
  console.error("Erro ao iniciar WhatsApp:", err);
});

// Rota para exibir QR Code como imagem
app.get("/qrcode", async (req, res) => {
  if (!currentQr) {
    return res.status(404).send("QR Code não disponível");
  }

  try {
    const qrImage = await QRCode.toDataURL(currentQr);
    res.send(`
      <html>
        <body>
          <h2>Escaneie o QR Code abaixo com o WhatsApp</h2>
          <img src="${qrImage}" />
        </body>
      </html>
    `);
  } catch (err) {
    res.status(500).send("Erro ao gerar QR Code");
  }
});

// Rota para enviar mensagem
app.post("/send", async (req, res) => {
  const { number, message } = req.body;
  try {
    const chatId = number + "@c.us";
    await client.sendMessage(chatId, message);
    res.json({ status: "success", number, message });
  } catch (err) {
    console.error("Erro ao enviar mensagem:", err);
    res.status(500).json({ status: "error", error: err.message });
  }
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

// Rota de teste
app.get("/", (req, res) => {
  res.send("Interfone coletivo rodando!");
});

// Porta dinâmica para Render
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Servidor rodando na porta ${port}`));
