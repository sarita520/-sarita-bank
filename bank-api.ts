import express from "express";
import * as crypto from "crypto";
import * as fs from "fs";
import { SRT_BLOCKCHAIN } from "./blockchain";

const app = express();
app.use(express.json());

const DB_FILE = "./bank_db.json";
let db = { users: {} as any, accounts: {} as any };

if (fs.existsSync(DB_FILE)) {
  try { db = JSON.parse(fs.readFileSync(DB_FILE, "utf-8")); } catch (e) {}
}
const saveDB = () => fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));

app.get("/", (req, res) => {
  res.send("Bem-vindo ao Banco Sarita (API Online) 🚀");
});

app.post("/register", (req, res) => {
  const { name, email, password } = req.body;
  if (db.users[email]) return res.status(400).json({ error: "Email ja existe" });

  const address = "SRT-" + crypto.randomUUID().slice(0, 8).toUpperCase();
  db.users[email] = { name, email, password };
  db.accounts[email] = { address, balanceBRL: 0 };
  saveDB();
  res.json({ msg: "Conta Criada com Sucesso", address });
});

app.get("/balance/:email", (req, res) => {
  const acc = db.accounts[req.params.email];
  if (!acc) return res.status(404).json({ error: "Conta nao existe" });
  const rawSrt = SRT_BLOCKCHAIN.getBalance(acc.address);
  const humanSrt = Number(BigInt(rawSrt) / 10n ** 18n);
  res.json({ email: req.params.email, address: acc.address, saldo_reais: acc.balanceBRL, saldo_srt: humanSrt });
});

app.post("/deposit", (req, res) => {
  const { email, amount } = req.body;
  const acc = db.accounts[email];
  if (!acc) return res.status(404).json({ error: "Conta nao existe" });
  acc.balanceBRL += amount;
  saveDB();
  const tokens = amount * 1; 
  SRT_BLOCKCHAIN.depositTo(acc.address, tokens);
  res.json({ msg: "Deposito Confirmado", novo_saldo_reais: acc.balanceBRL, tokens_recebidos: tokens });
});

app.post("/transfer-srt", (req, res) => {
  const { email, toAddress, amount } = req.body;
  const acc = db.accounts[email];
  try {
    const tx = SRT_BLOCKCHAIN.transfer(acc.address, toAddress, amount);
    res.json({ msg: "Transferencia Realizada!", txId: tx.id });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

app.get("/audit", (req, res) => { res.json(SRT_BLOCKCHAIN.audit()); });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Banco Sarita Online na porta ${PORT}`));
