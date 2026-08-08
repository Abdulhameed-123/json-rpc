#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const DEFAULT_SEPOLIA_CHAIN_ID = "0xaa36a7";

if (isMain()) {
  loadEnvFile();
  const config = parseArgs(process.argv.slice(2));

  if (!config.rpcUrl) {
    console.error(
      "Error: Sepolia RPC URL is required.\n" +
        "Set SEPOLIA_RPC_URL env var or pass --rpc <url> (e.g. your Alchemy/Infura Sepolia URL)."
    );
    process.exit(1);
  }

  if (!config.address) {
    console.error("Error: missing address.\nUsage: node check-balance.mjs --address 0x...");
    process.exit(1);
  }

  if (!validateAddress(config.address)) {
    process.exit(1);
  }

  try {
    const [chainId, blockNumber, balanceWei, nonce] = await Promise.all([
      rpc(config.rpcUrl, "eth_chainId", []),
      rpc(config.rpcUrl, "eth_blockNumber", []),
      rpc(config.rpcUrl, "eth_getBalance", [config.address, "latest"]),
      rpc(config.rpcUrl, "eth_getTransactionCount", [config.address, "pending"]),
    ]);

    if (chainId !== DEFAULT_SEPOLIA_CHAIN_ID) {
      console.warn(
        `Warning: endpoint chainId is ${chainId} (expected Sepolia ${DEFAULT_SEPOLIA_CHAIN_ID})`
      );
    } else {
      console.log(`Network: Ethereum Sepolia (chainId ${chainId})`);
    }

    console.log(`Latest block      : ${BigInt(blockNumber)}`);
    console.log(`Address           : ${config.address}`);
    console.log(`Balance           : ${weiToEth(balanceWei)} ETH (${BigInt(balanceWei)} wei)`);
    console.log(`Pending txn count : ${BigInt(nonce)}`);
  } catch (err) {
    console.error(`RPC check failed: ${err.message}`);
    process.exit(1);
  }
}

function isMain() {
  const entry = process.argv[1];
  if (!entry) return false;
  return import.meta.url === new URL(`file://${entry}`).href;
}

function loadEnvFile() {
  const envPath = fileURLToPath(new URL(".env", import.meta.url));
  let contents;
  try {
    contents = readFileSync(envPath, "utf8");
  } catch {
    return;
  }
  for (const line of contents.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    let key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (key.startsWith("export ")) key = key.slice(7).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

export function parseArgs(argv) {
  const args = { rpcUrl: process.env.SEPOLIA_RPC_URL, address: null };
  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case "--rpc":
        args.rpcUrl = argv[++i];
        break;
      case "--address":
        args.address = argv[++i];
        break;
      case "--help":
      case "-h":
        printUsage();
        process.exit(0);
        break;
      default:
        console.error(`Unknown argument: ${argv[i]}`);
        printUsage();
        process.exit(1);
    }
  }
  return args;
}

function printUsage() {
  console.log(`Usage:
  SEPOLIA_RPC_URL=<url> node check-balance.mjs --address 0x<addr>
  node check-balance.mjs --rpc <url> --address 0x<addr>

Options:
  --rpc <url>       Sepolia JSON-RPC endpoint
  --address <addr>  Ethereum address to check
  -h, --help        Show this help`);
}

export function validateAddress(address) {
  if (/^0x[0-9a-fA-F]{40}$/.test(address)) return true;
  console.error(`Error: invalid Ethereum address: ${address}`);
  return false;
}

export function weiToEth(wei) {
  return Number(BigInt(wei)) / 1e18;
}

export async function rpc(rpcUrl, method, params) {
  let res;
  try {
    res = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    });
  } catch (err) {
    throw new Error(`network error (${method}): ${err.message}`);
  }
  if (!res.ok) {
    throw new Error(`${method}: HTTP ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  if (data.error) {
    throw new Error(`${method}: ${data.error.code} ${data.error.message}`);
  }
  return data.result;
}