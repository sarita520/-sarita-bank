import * as crypto from "crypto";
import * as fs from "fs";

// 🔴 CONFIGURAÇÃO OFICIAL SRT-BANK
export const TOKEN_CONFIG = {
  name: "SRT-BANK Token",
  symbol: "SRT",
  decimals: 18n, 
  totalSupply: 500_000_000n * 10n ** 18n, // 500 Milhões
  genesisAddress: "SRT-BANK-RESERVE",
  ledgerFile: "./srt_ledger.json"
};

interface TransactionData {
  id: string;
  type: "TRANSFER" | "DEPOSIT" | "GENESIS";
  from: string;
  to: string;
  amount: string;
  timestamp: number;
}

export class Block {
  public hash: string;
  constructor(public index: number, public timestamp: number, public prevHash: string, public data: TransactionData[]) {
    this.hash = this.calculateHash();
  }
  calculateHash(): string {
    return crypto.createHash("sha256").update(this.index + this.prevHash + JSON.stringify(this.data)).digest("hex");
  }
}

export class SaritaBlockchain {
  public chain: Block[] = [];
  private balances: Map<string, bigint> = new Map();

  constructor() {
    this.loadChain();
  }

  private loadChain() {
    if (fs.existsSync(TOKEN_CONFIG.ledgerFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(TOKEN_CONFIG.ledgerFile, "utf-8"));
        this.chain = data.map((b: any) => new Block(b.index, b.timestamp, b.prevHash, b.data));
        this.recalculateBalances();
      } catch (error) {
        this.createGenesisBlock();
      }
    } else {
      this.createGenesisBlock();
    }
  }

  private createGenesisBlock() {
    const tx: TransactionData = {
      id: crypto.randomUUID(), type: "GENESIS", from: "0000", to: TOKEN_CONFIG.genesisAddress,
      amount: TOKEN_CONFIG.totalSupply.toString(), timestamp: Date.now()
    };
    this.chain = [new Block(0, Date.now(), "0", [tx])];
    this.saveChain();
    this.recalculateBalances();
  }

  private saveChain() {
    fs.writeFileSync(TOKEN_CONFIG.ledgerFile, JSON.stringify(this.chain, null, 2));
  }

  private recalculateBalances() {
    this.balances.clear();
    for (const block of this.chain) {
      for (const tx of block.data) {
        const amount = BigInt(tx.amount);
        const toBal = this.balances.get(tx.to) || 0n;
        this.balances.set(tx.to, toBal + amount);
        if (tx.from !== "0000") {
          const fromBal = this.balances.get(tx.from) || 0n;
          this.balances.set(tx.from, fromBal - amount);
        }
      }
    }
  }

  public getBalance(address: string): string {
    return (this.balances.get(address) || 0n).toString();
  }

  public depositTo(userAddress: string, amountHuman: number) {
    const amount = BigInt(Math.floor(amountHuman * 1e18));
    const tx: TransactionData = {
      id: crypto.randomUUID(), type: "DEPOSIT", from: TOKEN_CONFIG.genesisAddress,
      to: userAddress, amount: amount.toString(), timestamp: Date.now()
    };
    this.addBlock([tx]);
  }

  public transfer(from: string, to: string, amountHuman: number) {
    const amount = BigInt(Math.floor(amountHuman * 1e18));
    const senderBal = this.balances.get(from) || 0n;
    if (senderBal < amount) throw new Error("Saldo insuficiente no SRT-BANK");

    const tx: TransactionData = {
      id: crypto.randomUUID(), type: "TRANSFER", from, to,
      amount: amount.toString(), timestamp: Date.now()
    };
    this.addBlock([tx]);
    return tx;
  }

  private addBlock(txs: TransactionData[]) {
    const prev = this.chain[this.chain.length - 1];
    const block = new Block(prev.index + 1, Date.now(), prev.hash, txs);
    this.chain.push(block);
    this.saveChain();
    this.recalculateBalances();
  }
  
  public audit() { return { blocks: this.chain.length, status: "SECURE - SRT LEDGER" }; }
}

export const SRT_BLOCKCHAIN = new SaritaBlockchain();
