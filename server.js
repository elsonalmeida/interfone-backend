const express = require("express");
const { Client, LocalAuth } = require("whatsapp-web.js");
const QRCode = require("qrcode");
const fs = require("fs");
const chromium = require("chromium");

const app = express();
app.use(express.json());

const moradores = JSON.parse(fs.readFileSync("moradores.json", "utf8"));

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    executablePath: chromium.path,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  }
});

let currentQr = null;

client.on("qr", (qr) => {
  currentQr = qr;
  console.log("QR Code recebido");
});

client.on("ready", () => {
  console.log("WhatsApp conectado!");
});

client.initialize().catch(err => {
  console.error("Erro ao iniciar WhatsApp:", err);
});

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

app.post("/send", async (req, res) => {
  const { number, message } = req.body;

  try {
    const state = await client.getState();
    if (state !== "CONNECTED") {
      return res.status(503).json({ status: "error", error: `WhatsApp não está conectado (estado: ${state})` });
    }

    const chatId = number + "@c.us";
    await client.sendMessage(chatId, message);
    res.json({ status: "success", number, message });
  } catch (err) {
    console.error("Erro ao enviar mensagem:", err);
    res.status(500).json({ status: "error", error: err.message });
  }
});

app.post("/chamar/:apto", async (req, res) => {
  const apto = req.params.apto;
  const numeroMorador = moradores[apto];

  if (!numeroMorador) {
    return res.status(404).send("Apartamento não encontrado");
  }

  try {
    const state = await client.getState();
    if (state !== "CONNECTED") {
      return res.status(503).send(`WhatsApp não está conectado (estado: ${state})`);
    }

    const mensagem = `Olá, tem alguém no portão para o apartamento ${apto}`;
    await client.sendMessage(numeroMorador, mensagem);

    res.send("Mensagem enviada");
  } catch (err) {
    res.status(500).send("Erro ao enviar mensagem");
  }
});

app.get("/status", async (req, res) => {
  try {
    const state = await client.getState();
    if (state === "CONNECTED") {
      res.send("✅ WhatsApp está conectado e pronto para enviar mensagens");
    } else {
      res.send(`❌ WhatsApp ainda não está conectado (estado: ${state || "desconhecido"})`);
    }
  } catch (err) {
    res.status(500).send("Erro ao verificar status do WhatsApp");
  }
});

app.get("/state", async (req, res) => {
  try {
    const state = await client.getState();
    res.send(`🧠 Estado atual do WhatsApp: ${state}`);
  } catch (err) {
    res.status(500).send("Erro ao obter estado do WhatsApp");
  }
});

// 🔄 Rota para reiniciar o cliente WhatsApp
app.get("/restart", async (req, res) => {
  try {
    await client.destroy();
    await client.initialize();
    res.send("🔁 Cliente WhatsApp reiniciado com sucesso");
  } catch (err) {
    res.status(500).send("Erro ao reiniciar cliente");
  }
});

app.get("/", (req, res) => {
  res.send("Interfone coletivo rodando!");
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Servidor rodando na porta ${port}`));
