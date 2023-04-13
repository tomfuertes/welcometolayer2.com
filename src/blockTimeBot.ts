// import { getBlock } from "./blocks";
import { Cache, memoryCache } from "./cache";

import { ethers } from "ethers";

const blockProvider = new ethers.providers.EtherscanProvider(
  /1/.test(process.env.CHAIN_ID as string) ? "homestead" : "goerli",
  process.env.ETHERSCAN_API_KEY
);

blockProvider.polling = false;

let latest = 0;
blockProvider.on("block", async (blockNumber: number) => {
  // log(blockNumber);
  latest = blockNumber;
  // Emitted on every block change
});

const log = console.log.bind(console, "blockTimeBot:");

import { ActivityType, Client } from "discord.js";
const client = new Client({ intents: [] });

client.on("ready", () => {
  log(`Logged in as ${client.user?.tag}!`);
});
const discordLogin = process.env.DISCORD_BOT_TOKEN
  ? client.login(process.env.DISCORD_BOT_TOKEN as string)
  : Promise.reject("DISCORD_BOT_TOKEN is not set");

class _ {
  @Cache(memoryCache, { ttl: 60 })
  public static async getRecentBlocks(): Promise<
    { blockId: number; createdAt: number }[]
  > {
    const blocks: { blockId: number; createdAt: number }[] = [];

    if (latest === 0) return blocks;

    const history = await blockProvider.getHistory(
      "0x153cddd727e407cb951f728f24beb9a5faaa8512",
      // 269 blocks per hour
      latest - Math.floor(269 * 5)
    );

    log("history:", history.length);

    return history
      .reverse()
      .filter((block) => block.blockNumber && block.timestamp)
      .slice(0, 10)
      .map((block) => {
        return {
          blockId: block.blockNumber as number,
          createdAt: block.timestamp as number,
        };
      });

    // const { blockId, createdAt } = await getBlock("finalized");
    // blocks.push({ blockId, createdAt });

    // let lastBlockId = blockId - 1;
    // while (blocks.length < 10) {
    //   const block = await _.getBlockTime(lastBlockId--);
    //   blocks.push(block);
    // }

    // return blocks;
  }
}

let lastPrice = 0;

import { utils } from "./utils";

export default async function blockTimeBot() {
  if (!process.env.DISCORD_BOT_TOKEN) return;
  try {
    await discordLogin;
    // grab price from coinbase
    const spotPrice: number | string = await utils
      .getLRCSpotPrice()
      .catch((e) => {
        log("getLRCSpotPrice error", e);
        return "???";
      });

    // and l2
    const blocks = await _.getRecentBlocks();
    // log(blocks);
    if (!blocks.length) return log("no blocks");
    let blockTime = Date.now() / 1000;
    let avgTimeBetweenBlocks = 0;

    const latestBlock = Math.floor((blockTime - blocks[0].createdAt) / 60);

    // log(blocks.map((b) => b.createdAt));
    blocks.forEach((block) => {
      // log(
      //   block.blockId,
      //   blockTime,
      //   block.createdAt,
      //   blockTime - block.createdAt
      // );
      avgTimeBetweenBlocks += blockTime - block.createdAt;
      blockTime = block.createdAt;
    });
    const mins = Math.floor(avgTimeBetweenBlocks / (blocks.length * 60));

    // log(amount, mins, avgTimeBetweenBlocks, blocks.length);

    try {
      const newNickName = `LRC @ $${spotPrice}`;
      for (const guild of client.guilds.cache.values()) {
        // log("me", !!guild.me, guild.me);
        const me =
          guild.members.me ||
          (await guild.members
            .fetch(guild.client.user?.id || "1")
            .catch(() => null));
        const diff = newNickName !== me?.nickname;
        if (diff) {
          log("nickname:", "from", me?.nickname, "to", newNickName);
          await me?.setNickname(newNickName);
        }
      }
    } catch (e2) {
      if (e2 instanceof Error) {
        // if (
        //   /changing your username/i.test(e2.message) &&
        //   /too fast/i.test(e2.message)
        // ) {
        //   // log("ERROR", e2.name, e2.message);
        // } else {
        log("ERROR", e2.name, e2.message);
        // }
      }
    }

    const setAvatar = async (imagePath: string) => {
      return client.user
        ?.setAvatar(imagePath)
        .then(() => log(`New avatar set!`, imagePath))
        .catch((e) => log("Error", e.name, e.message));
    };

    // log(parseFloat(amount), lastPrice);

    if (typeof spotPrice === "number") {
      if (lastPrice === 0) {
        // initial price is 0
        lastPrice = spotPrice;
      } else if (spotPrice > lastPrice) {
        log("happy", spotPrice, lastPrice);
        setAvatar("./public/images/happy.png");
      } else if (spotPrice < lastPrice) {
        log("sad", spotPrice, lastPrice);
        setAvatar("./public/images/sad.png");
      }
      lastPrice = spotPrice;
    }

    const name = `Last: ${latestBlock} | Avg: ${mins} ⏱ L2 Block`;
    log("username:", !!client.user, name);
    client.user?.setPresence({
      status: "online",
      activities: [
        {
          name,
          type: ActivityType.Watching,
        },
      ],
    });
  } catch (error) {
    if (error instanceof Error) {
      log("ERROR", error.name, error.message);
    }
  }
}
