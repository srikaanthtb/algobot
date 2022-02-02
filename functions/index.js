const functions = require("firebase-functions");

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
// exports.helloWorld = functions.https.onRequest((request, response) => {
//   functions.logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

const {Configuration, OpenAIApi} = require("openai");
const configuration = new Configuration({
  organization: functions.config.openai.id, // set as environment variables in firebase
  apikey: functions.config.openai.key,
});

const Alpaca = require('@alpacahq/alpaca-trade-api');
const alpaca = new Alpaca({
  keyId: functions.config().alpaca.id,  // set as environment variables in firebase
  secretKey: functions.config().alpaca.key, 
  // paper: true, to use the paper account for testing uncomment this line
});

// cron job to automate trades
exports.getRichQuick = functions
  .runWith({ memory: '4GB' })
  .pubsub.schedule('0 10 * * 1-5')
  .timeZone('America/New_York')
  .onRun(async (ctx) => {
    console.log('This will run M-F at 10:00 AM Eastern!');

const puppeteer = require('puppeteer');

async function scrape() {
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
}

const openai = new OpenAIApi(configuration);

exports.helloworld = functions.https.onRequest(async (request, response) => {
  const gptCompletion = await openai.createCompletion('text-davinci-001', {
    prompt: `${tweets} Jim Cramer recommends selling the following stock tickers: `,
    temperature: 0.7,
    max_tokens: 32,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
  });

  response.send(gptCompletion.data);
});

//// ALPACA Make Trades ////

    // close all positions
    const cancel = await alpaca.cancelAllOrders();
    const liquidate = await alpaca.closeAllPositions();

    // get account
    const account = await alpaca.getAccount();
    console.log(`buying power: ${account.buying_power}`);

    // place order
    const order = await alpaca.createOrder({
      symbol: stocksToBuy[0],
      // qty: 1,
      notional: account.buying_power * 0.9, // will buy fractional shares
      side: 'buy',
      type: 'market',
      time_in_force: 'day', // trade only lasts for day
    });

    console.log(`stocks bought: ${order.id}`);

    return null;