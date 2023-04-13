import "dotenv/config";
import { LoopringAPI } from "./loopring";

import { Cache, memoryCache } from "./cache";

import { NFT_ACCOUNT } from "./auth";

import CID from "cids";
import { ethers } from "ethers";

import { AxiosResponse } from "axios";
import TimeAgo from "javascript-time-ago";
import en from "javascript-time-ago/locale/en";
import axios from "./axios";

TimeAgo.addDefaultLocale(en);
const timeAgo = new TimeAgo("en-US");

// const log = console.log.bind(console, "utils:");

interface INFTTransfer {
  status: string;
  nftData: string;
  amount: string;
  feeTokenSymbol: string;
  feeAmount: number;
  createdAt: string | [string, (number | undefined)?];
  payeeId: number;
  payeeAddress: string;
  blockIdInfo: { blockId: number; indexInBlock: number };
}

export class utils {
  @Cache(memoryCache, { ttl: 60 })
  public static async getUserNFTTransferCount(): Promise<number> {
    const { accountId, apiKey } = await NFT_ACCOUNT;

    const { totalNum } = await LoopringAPI.userAPI.getUserNFTTransferHistory(
      { accountId },
      apiKey
    );

    return totalNum;
  }

  public static async getLRCSpotPrice(): Promise<number> {
    const priceString: string = await axios(
      "https://api.coinbase.com/v2/prices/LRC-USD/spot"
    ).then((res: AxiosResponse) => res.data.data.amount);

    const price = parseFloat(priceString);

    if (price < 1) {
      return parseFloat(price.toFixed(4));
    } else if (price < 2) {
      return parseFloat(price.toFixed(3));
    } else if (price < 10) {
      return parseFloat(price.toFixed(2));
    } else if (price < 100) {
      return parseFloat(price.toFixed(1));
    } else {
      return parseFloat(price.toFixed(0));
    }
  }

  @Cache(memoryCache, { ttl: 60 })
  public static async getUserNFTTransferHistory(): Promise<INFTTransfer[]> {
    const { accountId, apiKey } = await NFT_ACCOUNT;

    const { userNFTTransfers } =
      await LoopringAPI.userAPI.getUserNFTTransferHistory(
        { accountId, limit: 24 },
        apiKey
      );

    // log("userNFTTransfers", userNFTTransfers);

    return userNFTTransfers.map((t) => {
      return {
        status: t.status, // 'processed',
        nftData: t.nftData, // '0x1c04738b747e939a6fe35ec663f991c0337dc3c77d85abf44b2723056548d4df',
        amount: t.amount, // '1',
        feeTokenSymbol: t.feeTokenSymbol, // 'ETH',
        feeAmount: parseFloat(t.feeAmount) / 1e18, // '1466000000000',
        createdAt: timeAgo.format(t.createdAt), // 1654446215954,
        payeeId: t.payeeId, // 12808
        payeeAddress: t.payeeAddress, // '0x38d31a5c839fdcf1202fbb3a1347b4fea35c694d',
        blockIdInfo: t.blockIdInfo, // { blockId: 4923, indexInBlock: 4 },
      };
    });
  }

  public static hexifyNftId(nftId: string): string {
    // log("getCidFromNftId", nftId);
    const hashBN = ethers.BigNumber.from(nftId);
    return `0x${hashBN.toHexString().replace(/^0x/i, "").padStart(64, "0")}`;
  }

  public static getCidFromNftId(nftId: string): string {
    // log("getCidFromNftId", nftId);
    const hex = utils.hexifyNftId(nftId).replace(/^0x/i, "");
    // console.log("hex", hex.length);
    const buf = Buffer.from("1220" + hex, "hex");
    // console.log(buf.toString());
    const cid = new CID(buf);
    return cid.toString();
  }
}
