import { test } from "node:test";
import assert from "node:assert/strict";
import { parseArgs, validateAddress, weiToEth, rpc } from "./check-balance.mjs";

test("weiToEth converts wei to ETH", () => {
  assert.equal(weiToEth("1000000000000000000"), 1);
  assert.equal(weiToEth("0x0"), 0);
  assert.equal(weiToEth("500000000000000000"), 0.5);
});

test("weiToEth handles large hex values", () => {
  assert.equal(weiToEth("0x0de0b6b3a7640000"), 1);
});

test("validateAddress accepts checksummed and lowercase addresses", () => {
  assert.equal(validateAddress("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96047"), true);
  assert.equal(validateAddress("0xd8da6bf26964af9d7eed9e03e53415d37aa96047"), true);
});

test("validateAddress rejects bad values", () => {
  assert.equal(validateAddress("0x123"), false);
  assert.equal(validateAddress("d8dA6BF26964aF9D7eEd9e03E53415D37aA96047"), false);
  assert.equal(validateAddress(""), false);
  assert.equal(validateAddress(undefined), false);
});

test("parseArgs reads address flag and rpc flag", () => {
  const args = parseArgs([
    "--rpc",
    "https://eth-sepolia.g.alchemy.com/v2/key",
    "--address",
    "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96047",
  ]);
  assert.equal(args.rpcUrl, "https://eth-sepolia.g.alchemy.com/v2/key");
  assert.equal(args.address, "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96047");
});

test("rpc returns the result field", async () => {
  const result = await rpc(
    "https://ethereum-sepolia-rpc.publicnode.com",
    "eth_blockNumber",
    []
  );
  assert.equal(typeof result, "string");
  assert.ok(/^0x[0-9a-f]+$/.test(result));
});

test("rpc throws on RPC error", async () => {
  await assert.rejects(
    rpc("https://ethereum-sepolia-rpc.publicnode.com", "eth_getBalance", []),
    /eth_getBalance/
  );
});