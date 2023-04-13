// eslint-disable-next-line @typescript-eslint/no-var-requires
import * as sdk from "@loopring-web/loopring-sdk";
import Web3 from "web3";
import airbrake from "./airbrake";
import { LoopringAPI } from "./loopring";
import PrivateKeyProvider from "./truffle";

const log = console.log.bind(console, "auth:");

const exchangeAddressCache = LoopringAPI.exchangeAPI
  .getExchangeInfo()
  .then((resp) => resp.exchangeInfo.exchangeAddress);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

class Auth {
  address!: string;
  accountId!: number;
  exchangeAddress!: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  eddsaKey!: any;
  apiKey!: string;
  web3!: Web3;

  constructor(address: string) {
    this.address = address;
  }

  async getWelcomeNFTChoices() {
    // Find which NFTs to send based on process.env mapping
    // eslint-disable-next-line @typescript-eslint/no-explicit-any

    const all = /5/.test(process.env.CHAIN_ID as string)
      ? [32769, 32768]
      : [32771, 32769, 32768];

    const safeListedNftTokenIds: Array<number> = Array.from(new Set(all));

    const { totalNum, userNFTBalances } =
      await LoopringAPI.userAPI.getUserNFTBalances(
        {
          accountId: this.accountId,
          tokenIds: safeListedNftTokenIds.join(","),
        },
        this.apiKey
      );

    log("userNFTBalances", userNFTBalances.length, "of", totalNum);
    const safeListedNfts = userNFTBalances.filter((nft) =>
      safeListedNftTokenIds.includes(nft.tokenId)
    );

    log(
      "safeListedNfts",
      safeListedNfts.map((slt) => slt.tokenId)
    );

    if (safeListedNfts.length === 0) {
      console.error("Need at least 1 NFT to send");
    }
    return safeListedNfts;
  }

  async simpleSend(sendToAddress: string, chosenNft: "all" | "random") {
    log("sendTo", sendToAddress, chosenNft);

    const choices = await this.getWelcomeNFTChoices();

    if (chosenNft === "all") {
      for (const nft of choices) {
        await this.sendto(sendToAddress, nft);
      }
    } else {
      await this.sendto(
        sendToAddress,
        choices[Math.floor(Math.random() * choices.length)]
      );
    }
  }

  async sendto(sendToAddress: string, chosenNft: sdk.UserNFTBalanceInfo) {
    try {
      // grab a random token from list of available
      const { tokenId, nftData } = chosenNft;

      // get fees to make sure we can afford this
      const { fees } = await LoopringAPI.userAPI.getNFTOffchainFeeAmt(
        {
          accountId: this.accountId,
          requestType: sdk.OffchainNFTFeeReqType.NFT_TRANSFER,
        },
        this.apiKey
      );

      // get storage id for sending
      const { offchainId } = await LoopringAPI.userAPI.getNextStorageId(
        { accountId: this.accountId, sellTokenId: tokenId },
        this.apiKey
      );

      // Might want to grab fees again jic but hasn't error for me yet AFAIK
      const opts = {
        request: {
          exchange: this.exchangeAddress,
          fromAccountId: this.accountId,
          fromAddress: this.address,
          toAccountId: 0, // toAccountId is not required, input 0 as default
          toAddress: sendToAddress,
          token: {
            tokenId,
            nftData: nftData as string,
            amount: "1",
          },
          maxFee: {
            tokenId: 1,
            amount: fees["LRC"].fee,
          },
          storageId: offchainId,
          memo: "Sent w/ <3 by thisbetom.eth",
          validUntil: Math.round(Date.now() / 1000) + 30 * 86400,
        },
        web3: this.web3,
        chainId: parseInt(process.env.CHAIN_ID as string, 10) as sdk.ChainId,
        walletType: sdk.ConnectorNames.Unknown,
        eddsaKey: this.eddsaKey.sk,
        apiKey: this.apiKey,
      };

      // log("opts:", opts.request);

      if (/staging|production/.test(process.env.NODE_ENV as string)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const transferResult: any =
          await LoopringAPI.userAPI.submitNFTInTransfer(opts);
        log(
          "submitNFTInTransfer:",
          sendToAddress,
          transferResult.status,
          transferResult.code,
          transferResult.message
        );
      } else {
        log("!staging|production", "nft", sendToAddress);
      }
    } catch (err) {
      airbrake.notify(err);
    }
  }

  static async init(address: string, secret: string): Promise<Auth> {
    return (async () => {
      try {
        const auth = new Auth(address);
        // Do async stuff
        const exchangeAddress = (auth.exchangeAddress =
          await exchangeAddressCache);

        log("address", address);
        log("exchangeAddress", exchangeAddress);

        const { accInfo } = await LoopringAPI.exchangeAPI.getAccount({
          owner: address,
        });
        const { accountId } = accInfo;
        auth.accountId = accountId;

        // log("INFO", accInfo, accountId);

        const API_DOMAIN = /1/.test(process.env.CHAIN_ID as string)
          ? "https://mainnet.infura.io"
          : "https://goerli.infura.io";

        // log(
        //   "process.env.INFURA_PROJECT_ID",
        //   process.env.INFURA_PROJECT_ID
        // );

        const web3 = (auth.web3 = new Web3(
          new PrivateKeyProvider(
            secret,
            `${API_DOMAIN}/v3/${process.env.INFURA_PROJECT_ID}`
          )
        ));

        const keySeed =
          accInfo.keySeed ||
          sdk.GlobalAPI.KEY_MESSAGE.replace(
            "${exchangeAddress}",
            exchangeAddress
          ).replace("${nonce}", (accInfo.nonce - 1).toString());
        // log("exchangeAddress", exchangeAddress);
        // log("accInfo.keySeed", accInfo.keySeed);
        log("keySeed", keySeed);
        // log("sdk.GlobalAPI.KEY_MESSAGE", sdk.GlobalAPI.KEY_MESSAGE);
        const eddsaKey = (auth.eddsaKey = await sdk.generateKeyPair({
          web3,
          address: accInfo.owner,
          keySeed,
          walletType: sdk.ConnectorNames.Unknown,
          chainId: parseInt(process.env.CHAIN_ID as string, 10) as sdk.ChainId,
        }));
        log("eddsaKey", !!eddsaKey);
        log("eddsaKey.sk", !!eddsaKey.sk);

        const { apiKey } = await LoopringAPI.userAPI.getUserApiKey(
          { accountId },
          eddsaKey.sk
        );
        log("apiKey", !!apiKey);

        auth.apiKey = apiKey;

        try {
          const before =
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            web3.currentProvider.engine._blockTracker._pollingInterval;
          const after = 1800000;
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          web3.currentProvider.engine._blockTracker._pollingInterval = after; // 30min
          log("auth throttled", before, after);
        } catch (e) {
          log("auth throttle error");
        }

        return auth;
      } catch (e) {
        console.log("AUTH ERROR");
        if (e instanceof Error) {
          console.log("auth error", e.name, e.message);
        }
        await sleep(1000 * 60 * 5);
        return Auth.init(address, secret);
      }
    })();
  }
}

export const NFT_ACCOUNT = Auth.init(
  process.env.ETH_ACCOUNT_ADDRESS as string,
  process.env.ETH_ACCOUNT_PK as string
);

// export const SWAP_ACCOUNT = Auth.init(
//   process.env.SWAP_ETH_ACCOUNT_ADDRESS as string,
//   process.env.SWAP_ETH_ACCOUNT_PK as string
// );
