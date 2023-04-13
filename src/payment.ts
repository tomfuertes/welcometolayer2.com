import * as sdk from "@loopring-web/loopring-sdk";
import "dotenv/config";
import { NFT_ACCOUNT } from "./auth";
import { LoopringAPI } from "./loopring";

import { ethers } from "ethers";

import redis from "./redis";

const log = console.log.bind(console, "payment:");

let lastRun = new Date().getTime() - 1000 * 60 * 30;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async () => {
  const AuthInstance = await NFT_ACCOUNT;
  const { address, accountId, apiKey } = AuthInstance;

  // Old way of Deduping "already sent" transactions
  const getUserTxs = await LoopringAPI.userAPI.getUserTxs(
    {
      accountId: accountId,
      types: [sdk.UserTxTypes.TRANSFER],
      start: lastRun - 1000 * 60,
      tokenSymbol: "LRC",
    },
    apiKey
  );
  lastRun = new Date().getTime();

  const repayments = getUserTxs.userTxs
    .filter(({ txType }) => txType === "TRANSFER")
    .filter(({ symbol }) => symbol === "LRC")
    .filter(
      ({ receiverAddress }) =>
        receiverAddress &&
        receiverAddress.toLowerCase() === address.toLowerCase()
    );

  // log("repayments:", repayments.length);

  if (!repayments.length) return;

  // offer a way to pay for a random nft
  for (const transfer of repayments) {
    const { id: transactionId, amount, senderAddress } = transfer;

    const amountInLRC = ethers.BigNumber.from(amount).div(
      ethers.constants.WeiPerEther
    );

    // dedupe in redis jic
    const key = "repaid:" + transactionId;
    const pending = await redis.setNX(key, new Date().toISOString());
    log(key, pending, amountInLRC.toString());
    if (!pending) continue;
    await redis.expire(key, 60 * 60 * 48);

    if (amountInLRC.gte(10)) {
      await AuthInstance.simpleSend(senderAddress, "all");
    } else if (amountInLRC.gte(1)) {
      await AuthInstance.simpleSend(senderAddress, "random");
    }
  }
};
