/* eslint-disable @typescript-eslint/no-var-requires */
const ProviderEngine = require("web3-provider-engine");
const FiltersSubprovider = require("web3-provider-engine/subproviders/filters");
const WalletSubprovider = require("web3-provider-engine/subproviders/wallet");
const RpcSubprovider = require("web3-provider-engine/subproviders/rpc");
const Wallet = require("ethereumjs-wallet").default;
const NonceSubprovider = require("web3-provider-engine/subproviders/nonce-tracker");

class PrivateKeyProvider {
  wallet: typeof Wallet;
  address: string;
  engine: typeof ProviderEngine;

  constructor(privateKey: string, providerUrl: string) {
    if (!privateKey) {
      throw new Error(
        `Private Key missing, non-empty string expected, got "${privateKey}"`
      );
    }

    if (!providerUrl) {
      throw new Error(
        `Provider URL missing, non-empty string expected, got "${providerUrl}"`
      );
    }

    if (privateKey.startsWith("0x")) {
      privateKey = privateKey.substr(2, privateKey.length);
    }

    this.wallet = new Wallet(new Buffer(privateKey, "hex"));
    this.address = "0x" + this.wallet.getAddress().toString("hex");

    this.engine = new ProviderEngine();
    try {
      const before =
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        this.engine._blockTracker._pollingInterval;
      const after = 1800000;
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      this.engine._blockTracker._pollingInterval = after; // 30min
      console.log("throttled", before, after);
    } catch (e) {
      // log("throttle error");
    }

    this.engine.addProvider(new FiltersSubprovider());
    this.engine.addProvider(new NonceSubprovider());
    this.engine.addProvider(new WalletSubprovider(this.wallet, {}));
    this.engine.addProvider(new RpcSubprovider({ rpcUrl: providerUrl }));

    this.engine.start();
  }

  sendAsync() {
    // eslint-disable-next-line prefer-spread, prefer-rest-params
    return this.engine.sendAsync.apply(this.engine, arguments);
  }
  send() {
    // eslint-disable-next-line prefer-spread, prefer-rest-params
    return this.engine.send.apply(this.engine, arguments);
  }
}

export default PrivateKeyProvider;
