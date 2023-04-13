import "dotenv/config";

import * as sdk from "@loopring-web/loopring-sdk";

export class LoopringAPI {
  public static userAPI: sdk.UserAPI;
  public static exchangeAPI: sdk.ExchangeAPI;
  public static ammpoolAPI: sdk.AmmpoolAPI;
  public static walletAPI: sdk.WalletAPI;
  public static wsAPI: sdk.WsAPI;
  public static nftAPI: sdk.NFTAPI;
  public static delegate: sdk.DelegateAPI;
  public static globalAPI: sdk.GlobalAPI;
  public static baseApi: sdk.BaseAPI;
  // public static contractAPI: sdk.ContractAPI;
  public static __chainId__: sdk.ChainId;
  public static InitApi = (chainId: sdk.ChainId) => {
    LoopringAPI.userAPI = new sdk.UserAPI({ chainId });
    LoopringAPI.exchangeAPI = new sdk.ExchangeAPI({ chainId });
    LoopringAPI.globalAPI = new sdk.GlobalAPI({ chainId });
    LoopringAPI.ammpoolAPI = new sdk.AmmpoolAPI({ chainId });
    LoopringAPI.walletAPI = new sdk.WalletAPI({ chainId });
    LoopringAPI.wsAPI = new sdk.WsAPI({ chainId });
    LoopringAPI.nftAPI = new sdk.NFTAPI({ chainId });
    LoopringAPI.baseApi = new sdk.BaseAPI({ chainId });
    LoopringAPI.delegate = new sdk.DelegateAPI({ chainId });
    LoopringAPI.__chainId__ = chainId;
    // LoopringAPI.contractAPI = new sdk.ContractAPI;
  };
}

/* env:
 * test:  sdk.ChainId.GOERLI
 * eth:  sdk.ChainId.MAINNET
 */
const CHAIN_ID: sdk.ChainId = parseInt(process.env.CHAIN_ID as string, 10);
console.log("loopring: CHAIN_ID", process.env.CHAIN_ID as string, CHAIN_ID);
LoopringAPI.InitApi(CHAIN_ID);
