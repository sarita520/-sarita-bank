import express from "express";
import cors from "cors";
import * as crypto from "crypto";
import * as fs from "fs";
import OpenAI from "openai"; 
import { SRT_BLOCKCHAIN } from "./blockchain";

const app = express();
app.use(express.json());
app.use(cors()); // Libera conexao para o site

// ==================================================
// ⚡ CÉREBRO DA IA (GROQ) - SRT-BANK
// ==================================================
const groq = new OpenAI({
  baseURL: "https://api.groq.com/openai/v1",
  apiKey: process.env.GROQ_API_KEY || "chave-faltando"
});

const DB_FILE = "./srt_bank_db.json";
let db = { users: {} as any, accounts: {} as any };

if (fs.existsSync(DB_FILE)) {
  try { db = JSON.parse(fs.readFileSync(DB_FILE, "utf-8")); } catch (e) { console.log("Iniciando novo DB SRT"); }
}
const saveDB = () => fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));

// Rota Inicial
app.get("/", (req, res) => {
  res.send("✅ SRT-BANK Financial System is Online (Powered by Sarita AI).");
});

// 🤖 ROTA DA SARITA (IA)
app.post("/sarita-ia", async (req, res) => {
  const { message } = req.body;
  try {
    const completion = await groq.chat.completions.create({
      messages: [
        { 
            role: "system", 
            content: "Você é a Sarita, a Inteligência Artificial oficial do SRT-BANK. O SRT é um token da rede Polygon com 500 Milhões de supply. Você é educada, rápida e especialista em cripto. Responda em Português." 
        },
        { role: "user", content: message }
      ],
      model: "llama-3.3-70b-versatile", // Modelo Ultra Rápido
    });
    res.json({ resposta: completion.choices[0].message.content });
  } catch (error) {
    console.error("Erro Groq:", error);
    res.json({ resposta: "A Sarita está reiniciando os sistemas. Tente novamente!" });
  }
});

// --- OPERAÇÕES BANCÁRIAS ---

app.post("/register", (req, res) => {
  const { name, email, password } = req.body;
  if (db.users[email]) return res.status(400).json({ error: "Email já cadastrado no SRT-BANK." });

  const address = "SRT-" + crypto.randomUUID().slice(0, 8).toUpperCase();
  db.users[email] = { name, email, password };
  db.accounts[email] = { address, balanceBRL: 0 };
  saveDB();
  res.json({ msg: "Bem-vindo ao SRT-BANK!", address });
});

app.get("/balance/:email", (req, res) => {
  const acc = db.accounts[req.params.email];
  if (!acc) return res.status(404).json({ error: "Cliente não encontrado" });
  
  const rawSrt = SRT_BLOCKCHAIN.getBalance(acc.address);
  const humanSrt = Number(BigInt(rawSrt) / 10n ** 18n);
  
  res.json({ address: acc.address, saldo_reais: acc.balanceBRL, saldo_srt: humanSrt });
});

app.post("/deposit", (req, res) => {
  const { email, amount } = req.body;
  const acc = db.accounts[email];
  if (!acc) return res.status(404).json({ error: "Conta inválida" });
  
  acc.balanceBRL += Number(amount);
  saveDB();
  SRT_BLOCKCHAIN.depositTo(acc.address, Number(amount)); 
  res.json({ msg: "Depósito no SRT-BANK Confirmado", novo_saldo: acc.balanceBRL });
});

app.post("/transfer", (req, res) => {
  const { email, toAddress, amount } = req.body;
  const acc = db.accounts[email];
  try {
    const tx = SRT_BLOCKCHAIN.transfer(acc.address, toAddress, Number(amount));
    res.json({ msg: "Transferência SRT realizada!", txId: tx.id });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`SRT-BANK System running on port ${PORT}`));
