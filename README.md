# Welcome to Layer 2 💙

**[www.welcometolayer2.com](https://www.welcometolayer2.com/)**

`welcometol2.eth` greeted every new Loopring L2 account with a gift: two copies of a random welcome NFT, sent automatically within seconds. Anyone who sent 10 LRC got all three designs back before the confirmation modal closed, and that LRC paid for the next round of welcomes.

**40,316 accounts welcomed** before Loopring wound down in 2024.

## The NFTs

- **Welcome to L2** by [@ThisBeTom](https://twitter.com/ThisBeTom)
- **Welcome To Layer 2** by [@0xLoopDaddy](https://twitter.com/0xLoopDaddy)
- **Loopring Tracer** by [@itsgboccia](https://twitter.com/itsgboccia)

## How it worked

A small Node bot sat on Loopring's websocket and watched every L2 block as it formed.

- **Welcome drops.** It spotted brand-new accounts in pending blocks and sent each one a random welcome NFT if their wallet was still empty. It held off when network fees spiked.
- **Pay it forward.** Sending 1 LRC to `welcometol2.eth` bought a random NFT, and 10 LRC bought the full set. Every payment topped up the wallet that funded the free drops.
- **Live dashboard.** The site showed the running send count, the wallet's remaining balance, and a feed of recent sends.
- **Discord bot.** It renamed itself to the live LRC price, swapped to a happy or sad avatar as the price moved, and showed how long it had been since the last L2 block.

The bot's source is preserved at the [`express-app`](https://github.com/tomfuertes/welcometolayer2.com/tree/express-app) tag.

## Archived

The wallet stopped sending in August 2024. The site still shows the final send log and all three NFTs as they were on that last day.

Built by [thisbetom.eth](https://twitter.com/ThisBeTom).
