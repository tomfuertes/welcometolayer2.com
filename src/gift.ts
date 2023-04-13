import "dotenv/config";

import * as sdk from "@loopring-web/loopring-sdk";
import { NFT_ACCOUNT } from "./auth";
import { LoopringAPI } from "./loopring";

const MAX_FEE = parseFloat(process.env.MAX_FEE || "0.07");

const log = console.log.bind(console, "gift:");

const seen = new Set<string>();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async (transactions: any[]) => {
  const AuthInstance = await NFT_ACCOUNT;
  const { accountId, apiKey } = AuthInstance;

  // get fees to make sure we can afford this
  const { fees } = await LoopringAPI.userAPI.getNFTOffchainFeeAmt(
    {
      accountId,
      requestType: sdk.OffchainNFTFeeReqType.NFT_TRANSFER,
    },
    apiKey
  );
  // log("fees", fees);

  const costInCents = parseFloat((fees["USDC"] || fees["USDT"]).fee) / 1e6;

  // log("Fee:", costInCents, "/", MAX_FEE);

  if (costInCents > MAX_FEE || isNaN(costInCents)) {
    return "returning b/c fee";
  }

  const newAccounts = transactions
    .filter((t) => t.txType === "AccountUpdate")
    .filter((t) => /^0$/.test(t.nonce))
    .filter((t) => !seen.has(t.accountId) && seen.add(t.accountId))
    .map((t) => [t.accountId, t.owner]);

  // log("newAccounts:", newAccounts.length);

  // eslint-disable-next-line prefer-const
  for (let [id, addr] of newAccounts) {
    if (!addr.startsWith("0x")) {
      addr = "0x" + addr;
    }

    const { totalNum } = await LoopringAPI.userAPI.getUserNFTBalances(
      { accountId: id },
      apiKey
    );

    log("getUserNFTBalances", id, addr, totalNum);

    // only send if "0" NFT balance
    if (totalNum === 0) {
      AuthInstance.simpleSend(addr, "random");
    }
  }

  // log("foo");
  return "fin";
};
