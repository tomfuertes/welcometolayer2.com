import axios from "./axios";
import airbrake from "./airbrake";

const API_DOMAIN = /1/.test(process.env.CHAIN_ID as string)
  ? "https://api3.loopring.io"
  : "https://uat2.loopring.io";

export const getPendingTransactions = () => {
  return axios(`${API_DOMAIN}/api/v3/block/getPendingRequests`, {
    timeout: 7500,
  })
    .then((res) => res.data)
    .catch((e) => {
      airbrake.notify(e);
      return [];
    });
};

interface IToken {
  type: string;
  tokenId: number;
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  precision: number;
  precisionForOrder: number;
  orderAmounts: { minimum: string; maximum: string; dust: string };
  luckyTokenAmounts: { minimum: string; maximum: string; dust: string };
  fastWithdrawLimit: string;
  gasAmounts: { distribution: string; deposit: string };
  enabled: boolean;
}

export async function getTokenConfig(): Promise<IToken[]> {
  const res = await axios(`${API_DOMAIN}/api/v3/exchange/tokens`);
  return res.data;
}

// [{
//   "type": "ETH",
//   "tokenId": 0,
//   "symbol": "ETH",
//   "name": "Ethereum",
//   "address": "0x0000000000000000000000000000000000000000",
//   "decimals": 18,
//   "precision": 7,
//   "precisionForOrder": 3,
//   "orderAmounts": {
//     "minimum": "1700000000000000",
//     "maximum": "1000000000000000000000",
//     "dust": "200000000000000"
//   },
//   "luckyTokenAmounts": {
//     "minimum": "50000000000000",
//     "maximum": "1000000000000000000000",
//     "dust": "50000000000000"
//   },
//   "fastWithdrawLimit": "100000000000000000000",
//   "gasAmounts": {
//     "distribution": "85000",
//     "deposit": "110000"
//   },
//   "enabled": true
// },

interface IBlock {
  blockId: number;
  blockSize: number;
  exchange: string;
  txHash: string;
  status: string;
  createdAt: number;
  transactions: ITxn[];
}
export interface ITxn {
  txType: string;
  accountId?: number;
  minterAccountId?: number;
  orderA?: IOrder;
  orderB?: IOrder;
  nftType?: string;
  nftToken?: {
    amount: string;
  };
  token?: {
    tokenId: number;
    amount: string;
  };
  nonce?: number;
  toAccountId?: number;
}
interface IOrder {
  accountID: number;
  tokenS: number;
  amountS: string;
  tokenB: number;
  amountB: string;
}

const _getBlock = (id: string): Promise<IBlock> => {
  return axios(`${API_DOMAIN}/api/v3/block/getBlock?id=${id}`).then(
    (res) => res.data
  );
};
export const getBlock = async (
  blockNumber: number | "finalized" | "confirmed"
): Promise<IBlock> => {
  return _getBlock(blockNumber.toString());
};
export const getPostedBlock = async () => {
  return _getBlock("finalized");
};
export const getPendingBlock = async () => {
  return _getBlock("confirmed");
};

// export const getRecentAccountUpdates = async () => {
//   return [
//     ...(await getPostedBlock()).transactions,
//     ...(await getPendingBlock()).transactions,
//   ]
//     .filter((t) => t.txType === "AccountUpdate")
//     .filter((t) => /^0$/.test(t.nonce))
//     .map((t) => [t.accountId, t.owner]);
// };
