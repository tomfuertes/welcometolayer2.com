import "dotenv/config";
import Emittery from "emittery";
import WebSocket from "ws";
import { NFT_ACCOUNT } from "./auth";
import {
  getPendingBlock,
  getPendingTransactions,
  getPostedBlock,
} from "./blocks";
import { LoopringAPI } from "./loopring";
import redis from "./redis";

const log = console.log.bind(console, "ws:");

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const emitter =
  new Emittery<// Pass `{[eventName]: undefined | <eventArg>}` as the first type argument for events that pass data to their listeners.
  // A value of `undefined` in this map means the event listeners should expect no data, and a type other than `undefined` means the listeners will receive one argument of that type.
  {
    block: number;
    payment: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    transactions: any[];
  }>();

export default emitter;

const WS_DOMAIN = /1/.test(process.env.CHAIN_ID as string)
  ? "wss://ws.api3.loopring.io"
  : "wss://ws.uat2.loopring.io";

openConnect();

// hoisted
async function openConnect() {
  log("openConnect");
  const { accountId, apiKey } = await NFT_ACCOUNT;

  // log("address", address, accountId);

  // if (/development/i.test(process.env.NODE_ENV as string))
  //   return log("disabled for theme dev");

  let wsKey;
  do {
    try {
      const { wsKey: _wsKey } = await LoopringAPI.wsAPI.getWsKey();
      wsKey = _wsKey;
    } catch (e) {
      if (e instanceof Error) {
        log("wsKey error:", e.name, e.message);
        wsKey = null;
        await sleep(5000);
      }
    }
  } while (!wsKey);

  // log({ wsKey });

  const { userBalances } = await LoopringAPI.userAPI
    .getUserBalances(
      {
        accountId,
        tokens: "1",
      },
      apiKey
    )
    .catch(() => {
      return { userBalances: { "1": { total: "0" } } };
    });

  let lastBalance = parseFloat(userBalances["1"].total) / 1e18;

  const ws = new WebSocket(`${WS_DOMAIN}/v3/ws?wsApiKey=${wsKey}`);

  ws.on("open", function open() {
    log("open");
    ws.send(
      JSON.stringify({
        op: "sub",
        sequence: new Date().getTime(),
        unsubscribeAll: true,
        apiKey,
        topics: [
          {
            topic: "account",
          },
          {
            topic: "blockgen",
            verbose: true,
          },
        ],
      })
    );
  });

  ws.on("close", function close() {
    log("close");
    setTimeout(async function recurse() {
      try {
        await openConnect();
      } catch (e) {
        if (e instanceof Error) {
          log("openConnect error", e);
        }
        setTimeout(recurse, 5000);
      }
    }, 5000);
  });

  ws.on("message", function message(message: Buffer) {
    // typeof message === buffer
    // typeof data === string
    // typeof JSON.parse(data) === object
    const msgStr = message.toString();

    // heartbeat queues check pending transactions
    if (msgStr === "ping") {
      // log("PING");
      ws.send("pong");
      getPendingTransactions().then((transactions) =>
        emitter.emit("transactions", transactions)
      );
      return;
    }

    // other topics follow
    const { op, topics, topic, data } = JSON.parse(msgStr);
    if (op === "sub") {
      // initial connection
      log(`subscribed to ${JSON.stringify(topics)}`);

      // on startup check transactions and pending blocks
      getPendingTransactions()
        .then((transactions) => emitter.emit("transactions", transactions))
        .then(() => {
          getPendingBlock()
            .catch(() => getPostedBlock())
            .then((block) => block.blockId)
            .then(async (blockId) => {
              log("startup block", blockId);
              if (/development/.test(process.env.NODE_ENV as string)) {
                const keys = await redis.keys(`dedupe:*:${blockId}`);
                log("keys", keys);
                if (keys.length) {
                  await redis.del(keys);
                }
              }
              // await ws.emit("account", 1);
              emitter.emit("block", blockId);
            });
        });

      return;
    } else if (topic.topic === "account") {
      // NFT Balance Changed:
      // t: { topic: 'account', accountId: 125049 },
      // d: {
      //   "accountId" : 125049,
      //   "tokenId" : 0,
      //   "totalAmount" : "61280579000000000",
      //   "amountLocked" : "0",
      // }
      // Likely an Xfer in:
      const { tokenId, totalAmount } = data;
      if (tokenId === 1) {
        const newBalance = parseFloat(totalAmount) / 1e18;
        const diff = newBalance - lastBalance;
        log("msg(account)", tokenId, newBalance, lastBalance, diff);
        lastBalance = newBalance;
        redis.set("balance", newBalance);
        // something weird with balance notifs
        if (diff >= 0.5) {
          emitter.emit("payment", tokenId);
        }
      }
    } else if (topic.topic === "blockgen") {
      // t: { topic: 'blockgen', verbose: true },
      // d: [
      //   {
      //     blockId: 22463,
      //     blockSize: 384,
      //     exchange: '0x0baba1ad5be3a5c0a66e7ac838a129bf948f1ea4',
      //     txHash: '0x31bdba2b0b6fe905c267a24f655ee61ca29e10aaae74a363f7f3a1ee67176d97',
      //     status: 'COMPLETED',
      //     createdAt: 1654722612428,
      //     transactions: [Array]
      //   }
      // ]
      // log("data", data);
      for (const block of data) {
        log("block", block.blockId, block.status);
        // if (/development/.test(process.env.NODE_ENV as string)) {
        //   log("block", block);
        // }
        if (block && block.blockId && block.status !== "COMPLETED") {
          emitter.emit("block", block.blockId);
        }
      }
      // const {
      //   blockId,
      //   blockSize,
      //   exchange,
      //   txHash,
      //   status,
      //   createdAt,
      //   transactions,
      // } = data[0];
    } else {
      log("data", {
        msgStr,
        t: topic,
        d: data,
        // k: Object.keys(data),
      });
    }
  });
}
