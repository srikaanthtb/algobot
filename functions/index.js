/* eslint-disable max-len */
import { config, runWith } from 'firebase-functions';

//// SDK Config ////

import OpenAI from 'openai';

const openai = new OpenAI({
  organization: config().openai.id, // REPLACE with your API credentials
  apiKey: config().openai.key // REPLACE with your API credentials
});

import Alpaca from '@alpacahq/alpaca-trade-api';
const alpaca = new Alpaca({
  keyId: config().alpaca.id, // REPLACE with your API credentials
  secretKey: config().alpaca.key, // REPLACE with your API credentials
  // paper: true,
});

//// PUPPETEER Scrape Data from Twitter for better AI context ////

import { launch } from 'puppeteer';

/* async function scrape() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.goto('https://twitter.com/jimcramer', {
    waitUntil: 'networkidle2',
  });

  await page.waitForTimeout(3000);

  // await page.screenshot({ path: 'example.png' });

  const tweets = await page.evaluate(async () => {
    return document.body.innerText;
  });

  await browser.close();

  return tweets;
} */

async function autoScroll(page){
  await page.evaluate(async () => {
      await new Promise((resolve, reject) => {
          var totalHeight = 0;
          var distance = 100;
          var timer = setInterval(() => {
              var scrollHeight = 10000; //document.body.scrollHeight;
              window.scrollBy(0, distance);
              totalHeight += distance;

              if(totalHeight >= scrollHeight - window.innerHeight){
                  clearInterval(timer);
                  resolve();
              }
          }, 100);
      });
  });
}
async function scrape() {
  const browser = await launch();
  const page = await browser.newPage();

  await page.goto('https://twitter.com/jimcramer', {
    waitUntil: 'networkidle2',
  });

  await page.setViewport({
    width: 1200,
    height: 800
});

  await page.waitForTimeout(3000);

  // await page.screenshot({ path: './puppeteerArtifacts/example.png' });


  let divs = await page.$$('div[data-testid="cellInnerDiv"]')

  console.log(divs.length)

  await autoScroll(page)

  let newDivs = await page.$$('div[data-testid="cellInnerDiv"]')

  newDivs.forEach( (div)  => divs.push(div))

  console.log(divs.length)

  const tweets = new Array();

  for (const div of divs) {
    const innerText = await div.evaluate((x) => x.innerText)
    if (!innerText.includes("Pinned Tweet")) {
      const innerTextArray = innerText.split("\n")
      const tweetText = innerTextArray.slice(4, -2).join(" ")
  
      console.log("\nTweet")
      console.log(tweetText)
      tweets.push(tweetText)
    }
  }

  await browser.close();

  return tweets;
}
export const getRichQuick = runWith({ memory: '4GB' })
  .pubsub.schedule('0 9 * * 1-5')
  .timeZone('America/New_York')
  .onRun(async (ctx) => {
    console.log('This will run M-F at 9:00 AM Eastern!');

    const tweets = await scrape();

    const gptCompletion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{"role": "system", "content": "You are a stock picker who looks at what jim cramer recommends selling and yourecommend buying those stocks"},
              {"role": "user", "content": `${tweets} Jim Cramer recommends selling the following stock tickers: `}],
    });

    const stocksToBuy = gptCompletion.choices[0].message.content.match(/\b[A-Z]+\b/g);
    console.log(`Thanks for the tips Jim! ${stocksToBuy}`);

    if (!stocksToBuy) {
      console.log('sitting this one out');
      return null;
    }

    //// ALPACA Make Trades ////

    // close all positions
    const cancel = await alpaca.cancelAllOrders();
    const liquidate = await alpaca.closeAllPositions();

    // get account
    const account = await alpaca.getAccount();
    console.log(`dry powder: ${account.buying_power}`);
    // get current info about stock
    const stock = await alpaca.getAsset(stocksToBuy[0])
    console.log(`this is the current info about the stock being bought ${stock}`);

    // place order
    const order = await alpaca.createOrder({
      symbol: stocksToBuy[0],
      // qty: 1,
      notional: account.buying_power * 0.9, // will buy fractional shares
      side: 'buy',
      type: 'market',
      time_in_force: 'day',
      extended_hours: true,
      stop_price: stock.price * 0.9, // sells stock if tanks by 10%
      limit_price: stock.price * 0.89 // limit should always be a little lower than stop price because of market ineffiences 
    });

    console.log(`look mom i bought stonks: ${order.id}`);

    return null;
  });