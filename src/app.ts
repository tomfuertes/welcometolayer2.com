import "dotenv/config";

import express, { Application, Request, Response } from "express";

import basicAuth from "express-basic-auth";

const app: Application = express();

const port = process.env.PORT || 8080;

const authUsers = {
  users: {
    [process.env.AUTH_USER as string]: process.env.AUTH_PASS as string,
  },
  challenge: true,
};
const lockdown = basicAuth(authUsers);

if (/staging|development/.test(process.env.NODE_ENV as string)) {
  app.use(lockdown);
}

app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use("/static", express.static("public"));

const log = console.log.bind(console, "app:");

log("Server Running on port " + port);

import redis from "./redis";

import ws from "./ws";

import { getBlock } from "./blocks";
import gift from "./gift";

import airbrake from "./airbrake";

ws.on("block", async (id: number) => {
  const { transactions, status /*, createdAt*/ } = await getBlock(id);
  log("ws.on(block)", id, status, transactions.length);

  // replay the old stuff jic we missed it
  const replay = id - 10;
  log("ws.on(block) replaying from", replay);

  log("ws.off(block)", id, status, transactions.length);
});

import blockTimeBot from "./blockTimeBot";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
ws.on("transactions", async (transactions: any[]) => {
  log("ws.on(transactions)", transactions.length);
  await gift(transactions);
  await blockTimeBot();
});

import payment from "./payment";
ws.on("payment", async (tokenId: number) => {
  log("ws.on(payment)", tokenId);
  await payment();
  log("ws.off(payment)", tokenId);
});

app.set("view engine", "pug");
app.set("views", "./views");

import { utils } from "./utils";
const getData = async () => {
  // const logs = [];
  const balance = await redis.get("balance");

  const gifts = [
    {
      href: "https://explorer.loopring.io/nft/0xb6a1df588d2cb521030a5269d42a9c34f1ecaeab-0-0x92f7c57650b6dae91b8a8d73b1fb90f70b39358e-0x32f006a901505c8c015714cc4390f7f5447c1b07983b050c9cd92da90777584c-10",
      title: "Welcome to L2",
      src: "https://cloudflare-ipfs.com/ipfs/QmTfNgyzsH6KhbFbawhNks1Xwm1pkh6ofMiXTfFYrupCXL",
      author: "@ThisBeTom",
    },
    {
      href: "https://explorer.loopring.io/nft/0xcc954a62b34c284a93ffeae837e4e1717f026126-0-0xe47f82c110a12166a0c714f782227c1bfbfe1c44-0x77f3e47c1a2f92bfca6a1c351a22aceda60f700834191e16ee3be110579aff4c-10",
      title: "Welcome To Layer 2",
      src: "https://cloudflare-ipfs.com/ipfs/QmUsz8HfqKvfDN3pX9byYftJQbgtL586Z5CChTnvsUgB4E",
      author: "@0xLoopDaddy",
    },
    {
      href: "https://explorer.loopring.io/nft/0x8d0b24f4c4eb9b0b450cfce37e1b842d3005c1d8-0-0x9d226054324360d8eeb024f66731d6c5e44e8c6f-0xb8791b6b22347bada9ea62cd8a94ce073a9ef57702f12c343f2c3a003b472465-10",
      title: "Loopring Tracer",
      src: "https://cloudflare-ipfs.com/ipfs/QmYcokxgqztYfq1hQ3GoQ89grEJq46z2Mr6Trw4F8XB4d6",
      author: "@itsgboccia",
    },
  ];

  const sends = await utils.getUserNFTTransferHistory();

  const count = await utils.getUserNFTTransferCount();

  return { count, /*cost,*/ balance, gifts, sends };
};

app.all(/.*/, function (req, res, next) {
  const host = req.header("host") || "";
  if (
    host.includes("herokuapp") &&
    /production/.test(process.env.NODE_ENV as string)
  ) {
    log("req.url redirected", req.url);
    res.redirect(301, "https://www.welcometolayer2.com" + req.url);
  } else {
    next();
  }
});

app.get("/", async (req: Request, res: Response) => {
  const data = await getData();
  res.render("home", data);
});

app.use(async (req, res) => {
  const data = await getData();
  res.status(404).render("404", data);
});

import { makeErrorHandler } from "@airbrake/node/dist/instrumentation/express";
if (airbrake) {
  // Error handler middleware should be the last one.
  // See http://expressjs.com/en/guide/error-handling.html
  app.use(makeErrorHandler(airbrake));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
app.use((err: any, req: any, res: any, next: any) => {
  !!next; // ignore
  console.error("EXPRESS ERROR:", err.code, err.message, err.stack);
  res.status(500).send("Something broke!");
});

app.listen(port, function () {
  // log(`App is listening on port ${port} !`);
});

process.on("unhandledRejection", (error: Error, p) => {
  console.log("Unhandled Rejection at: Promise", p, "error:", error);
  // application specific logging, throwing an error, or other logic here
  console.log("=== UNHANDLED REJECTION ===");
  console.dir(error?.stack);
  if (airbrake && error) airbrake.notify(error);
});
