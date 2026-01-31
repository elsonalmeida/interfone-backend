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
let logs = [];

function addLog(message) {
  const timestamp = new Date().toISOString();
  const entry = `[${timestamp}] ${message}`;
  logs.push(entry);
  console.log(entry);
  if (logs.length > 50) logs.shift();
}

client.on("qr", (qr) => {
  currentQr = qr;
  addLog("QR Code recebido - acesse /qrcode para escanear");
});

client.on("ready", () => {
  addLog("WhatsApp conectado e pronto!");
});

client.on("disconnected", (reason) => {
  addLog(`WhatsApp desconectado: ${reason}`);
});

client.initialize().catch(err => {
  addLog("Erro ao iniciar WhatsApp: " + err.message);
});

// Log periódico do estado
setInterval(async () => {
  try {
    const state = await client.getState();
    addLog(`Estado periódico: ${state}`);
  } catch (err) {
    addLog("Erro ao obter estado periódico: " + err.message);
  }
}, 15000);

// Rotas
app.get("/qrcode", async (req, res) => {
  if (!currentQr) return res.status(404).send("QR Code não disponível");
  try {
    const qrImage = await QRCode.toDataURL(currentQr);
    res.send(`<html><body><h2>Escaneie o QR Code abaixo com o WhatsApp</h2><img src="${qrImage}" /></body></html>`);
  } catch (err) {
    res.status(500).send("Erro ao gerar QR Code");
  }
});

app.post("/send", async (req, res) => {
  const { number, message } = req.body;
  try {
    const state = await client.getState();
    addLog(`Verificando estado para envio: ${state}`);
    if (state !== "CONNECTED") return res.status(503).json({ status: "error", error: `WhatsApp não está conectado (estado: ${state})` });
    const chatId = number + "@c.us";
    await client.sendMessage(chatId, message);
    addLog(`Mensagem enviada para ${number}: ${message}`);
    res.json({ status: "success", number, message });
  } catch (err) {
    addLog("Erro ao enviar mensagem: " + err.message);
    res.status(500).json({ status: "error", error: err.message });
  }
});

app.post("/chamar/:apto", async (req, res) => {
  const apto = req.params.apto;
  const numeroMorador = moradores[apto];
  if (!numeroMorador) return res.status(404).send("Apartamento não encontrado");
  try {
    const state = await client.getState();
    addLog(`Verificando estado para chamar apto ${apto}: ${state}`);
    if (state !== "CONNECTED") return res.status(503).send(`WhatsApp não está conectado (estado: ${state})`);
    const mensagem = `Olá, tem alguém no portão para o apartamento ${apto}`;
    await client.sendMessage(numeroMorador, mensagem);
    addLog(`Mensagem enviada para apto ${apto}: ${mensagem}`);
    res.send("Mensagem enviada");
  } catch (err) {
    addLog("Erro ao enviar mensagem: " + err.message);
    res.status(500).send("Erro ao enviar mensagem");
  }
});

app.get("/status", async (req, res) => {
  try {
    const state = await client.getState();
    addLog(`Verificando status: ${state}`);
    if (state === "CONNECTED") {
      res.send("✅ WhatsApp está conectado e pronto para enviar mensagens");
    } else {
      res.send(`❌ WhatsApp ainda não está conectado (estado: ${state || "desconhecido"})`);
    }
  } catch (err) {
    addLog("Erro ao verificar status: " + err.message);
    res.status(500).send("Erro ao verificar status do WhatsApp");
  }
});

app.get("/state", async (req, res) => {
  try {
    const state = await client.getState();
    addLog(`Estado atual consultado: ${state}`);
    res.send(`🧠 Estado atual do WhatsApp: ${state}`);
  } catch (err) {
    addLog("Erro ao obter estado: " + err.message);
    res.status(500).send("Erro ao obter estado do WhatsApp");
  }
});

// 🔄 Rota para reiniciar o cliente
app.get("/restart", async (req, res) => {
  try {
    addLog("🔄 Iniciando reinicialização do cliente WhatsApp...");
    await client.destroy();
    addLog("✅ Cliente destruído");
    await client.initialize();
    addLog("🚀 Cliente reinicializado");
    res.send("🔁 Cliente WhatsApp reiniciado com sucesso");
  } catch (err) {
    addLog("❌ Erro ao reiniciar cliente: " + err.message);
    res.status(500).send("Erro ao reiniciar cliente");
  }
});

// 🔎 Rota para visualizar logs
app.get("/logs", (req, res) => {
  res.send(`<html><body><h2>Logs do WhatsApp</h2><pre>${logs.join("\n")}</pre></body></html>`);
});

app.get("/", (req, res) => {
  res.send("Interfone coletivo rodando!");
});

const port = process.env.PORT || 3000;
app.listen(port, () => addLog(`Servidor rodando na porta ${port}`));
