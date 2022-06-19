/* eslint-disable max-len */
const functions = require('firebase-functions');

//// SDK Config ////

const { Configuration, OpenAIApi } = require('openai');
const configuration = new Configuration({
  organization: functions.config().openai.id, // REPLACE with your API credentials
  apiKey: functions.config().openai.key, // REPLACE with your API credentials
});
const openai = new OpenAIApi(configuration);

const Alpaca = require('@alpacahq/alpaca-trade-api');
const alpaca = new Alpaca({
  keyId: functions.config().alpaca.id, // REPLACE with your API credentials
  secretKey: functions.config().alpaca.key, // REPLACE with your API credentials
  paper: true,
});

//// PUPPETEER Scrape Data from Twitter for better AI context ////

const puppeteer = require('puppeteer');

// async function getChildren(element) {
//   try {
//     const handle = await element.evaluateHandle((node) => node.children)
//     const handleProp = await handle.getProperties()
//     // const childs = []
//     for (const prop of handleProp.values()) {
//       const ele = prop.asElement()
//       if (ele) {
//         // children.push(ele)
//         console.log("\n\n\n\nelement");
//         console.log(await element.evaluate((x) => x.innerHTML))
//         await getChildren(ele)
//       }
//     }
//   }
//   catch {
//     console.log('could not get children')
//   }
  

// }

async function scrape() {
  const browser = await puppeteer.launch({headless: false});
  const page = await browser.newPage();

  await page.goto('https://twitter.com/jimcramer', {
    waitUntil: 'networkidle2',
  });

  await page.waitForTimeout(3000);

  await page.screenshot({ path: './puppeteerArtifacts/example.png' });

  // const tweets = await page.evaluate(async () => {
  //   return document.body.innerText;
  // });

  //console.log(tweets)

  const divs = await page.$$('div[data-testid="cellInnerDiv"]')

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

  // const listHandle = await page.evaluateHandle(() => document.body.children);
  // const properties = await listHandle.getProperties();
  // const children = [];
  // for (const property of properties.values()) {
  //   const element = property.asElement();
    
  //   if (element) {

  //     await getChildren(element)

  //     console.log("\n\n\n\nelement");
  //     console.log(await element.evaluate((x) => x.innerHTML))
  //     children.push(element);
  //   }
  // }
  // children;



  // const listHandle = await page.evaluateHandle(() => document.body.children);
  //     const properties = await listHandle.getProperties();
  //     const children = [];
  //     for (const property of properties.values()) {
  //       console.log(await property.jsonValue())
  //       const element = property.asElement();
  //       if (element) children.push(element);
  //     }
  //     children; 
  // // const text = await header.()

  // console.log("Test log start")
  // console.log(await header[0].evaluate(node => node.innerText))
  // console.log("Test log finish")

//   console.log("Test log start")
//   // console.log(await header[0].evaluate(node => node.))
  
//   // let divProperties = new Array()

//   // divs.forEach( async uniqueDiv => {
//   //   try {
//   //     const properties = await uniqueDiv.getProperties()
//   //     // divProperties.push(properties)
//   //     // const listHandle = await page.evaluateHandle(() => document.body.children);
//   //     // const properties = await listHandle.getProperties();
//   //     const children = [];
//   //     for (const property of properties.values()) {
//   //       console.log(await property.jsonValue())
//   //       const element = property.asElement();
//   //       if (element) children.push(element);
//   //     }
//   //     children;

//   //     // console.log(children)
//   //   }
//   //   catch {
//   //     console.log("errored out")
//   //   }
//   // })


//  // divProperties.forEach( y => y.forEach(z => console.log(z)))


//     // const proper = await header[0]
//     // proper.forEach((value, key)=> console.log(key + value))// + ' : ' + key))
//     // const filteredDivs = header.filter( (elementhandle) => elementhandle. )
//   console.log("Test log finish")


  // const innerDivs = header.map(async elementHand => await elementHand.evaluate(node => node.innerText))
  // innerDivs.forEach(x => console.log(x))
  // console.log(tweetsTwo.length)
  // const tweetsTrimmed = tweetsTwo//.filter(x => x.$('[data-testid="cellInnerDiv"]'))
  // // console.log(tweetsTrimmed.length)

  // const text = tweetsTrimmed.map((node) => node.jsonValue())
  
  // text.forEach( (x) => console.log(x))

  // console.log(text)

  // tweetsTrimmed.forEach(async x => {
  //   console.log("\nDiv:")  
  //   console.log(await x.evaluate(x => x.innerText))
  //   }
  //   )

  await browser.close();

  return tweets;
}

exports.helloWorld = functions.https.onRequest(async (request, response) => {
  // test logic here

  response.send('test');
});

exports.getRichQuick = functions
  .runWith({ memory: '4GB' })
  .pubsub.schedule('0 10 * * 1-5')
  .timeZone('America/New_York')
  .onRun(async (ctx) => {
    console.log('This will run M-F at 10:00 AM Eastern!');

    const tweets = await scrape();

    const gptCompletion = await openai.createCompletion('text-davinci-001', {
      prompt: `${tweets} Jim Cramer recommends selling the following stock tickers: `,
      temperature: 0.7,
      max_tokens: 32,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
    });

    const stocksToBuy = gptCompletion.data.choices[0].text.match(/\b[A-Z]+\b/g);
    console.log(`Thanks for the tips Jim! ${stocksToBuy}`);

    if (!stocksToBuy) {
      // sell logic if cramer recommends buying a stock you hold
      // console.log('sitting this one out');
      // return null;
      const gptCompletion = await openai.createCompletion('text-davinci-001', {
        prompt: `${tweets} Jim Cramer recommends buying the following stock tickers: `,
        temperature: 0.7,
        max_tokens: 32,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
      });
      const stocksToSell = gptCompletion.data.choices[0].text.match(/\b[A-Z]+\b/g);
      console.log(`Thanks for the tips Jim! ${stocksToSell}`);
      // if a match is found sell it (assuming 1 position is held)
      const currentPosition = await alpaca.getPositions()
      if (currentPosition.includes(stocksToSell)) {
        console.log(`this is being sold: ${stocksToSell}`)
        const yeet = await alpaca.closeAllPositions();
      }
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
    });

    console.log(`look mom i bought stonks: ${order.id}`);

    return null;
});


exports.getRichQuickManual = functions.https.onRequest(async (request, response) => {
  console.log('This will run manually');

  const tweets = await scrape();

  tweets.push("finally the seller of AMD is done.. amen")
  tweets.push("I wonder what rabbit Michael Saylor can pull out of a hat with his Microstrategy  gameplan. I wonder when he first raised money if he had this in mind...")

  console.log("\n\nArray of Tweets")
  console.log(tweets);
  // response.send(tweets);
  // return null; 
  
  // console.log(tweets)

  // const prompt = `${tweets} Jim Cramer recommends selling the following stock tickers: `
  const prompt = `What stock should be sold from the following tweets? ${tweets.join("\n")}`
  const prompt2 = `Stock ticker: ${tweets}`
  
  console.log('\n\nPrompt to OpenAI')
  console.log(prompt)

  const gptCompletion = await openai.createCompletion(
    {
    model: 'text-davinci-001', 
    prompt: prompt,
    temperature: 0.7,
    max_tokens: 320,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
  });

  let stocksToBuy;
  try {
    stocksToBuy = gptCompletion.data.choices[0].text.match(/\b[A-Z]+\b/g);
    // response.send(gptCompletion.data.choices)
    console.log('\n\nResponse from OpenAI')
    console.log(gptCompletion.data.choices[0].text)
    
    console.log('\n\n Array of stocks')
    console.log(stocksToBuy)

  }
  catch {
    console.log("gptCompletion did not go well")
  }

  // if (!stocksToBuy) {
  //   console.log('sitting this one out');
  //   response.send('sitting this one out - no tips - not helpful JIM!')
  // }
  // else {
  //   console.log(`Thanks for the tips Jim! ${stocksToBuy}`);
  //   response.send(`Thanks for the tips Jim! ${stocksToBuy}`)
  // }

  if (!stocksToBuy) {
    // sell logic if cramer recommends buying a stock you hold
    console.log('\n\nJim Cramer is trying to buy stocks, sell everything!');
    // return null;
    const gptCompletion = await openai.createCompletion({
      model: 'text-davinci-001', 
      prompt: `${tweets} Jim Cramer recommends buying the following stock tickers: `,
      temperature: 0.7,
      max_tokens: 320,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
    });
    let stocksToSell
    try {
      stocksToSell = gptCompletion.data.choices[0].text.match(/\b[A-Z]+\b/g);
    }
    catch {
      console.log("gptCompletion did not go well")
    }
    console.log(`Thanks for the tips Jim! ${stocksToSell}`);
    // if a match is found sell it (assuming 1 position is held)
    const currentPosition = await alpaca.getPositions()
    if (currentPosition.includes(stocksToSell)) {
      console.log(`this is being sold: ${stocksToSell}`)
      const yeet = await alpaca.closeAllPositions();
    }
    
    console.log(`look mom i sold all my stonks`)
    response.send(`look mom i sold stonks: ${stocksToSell}`)
    return
  }
  // else {
    // // //// ALPACA Make Trades ////

    // // // close all positions
    // const cancel = await alpaca.cancelAllOrders();
    // const liquidate = await alpaca.closeAllPositions();

    // get account

    try {
      const account = await alpaca.getAccount();
      console.log(`dry powder: ${account.buying_power}`);
      // get current info about stock
      
      const stock = await alpaca.getAsset(stocksToBuy[0])
      console.log(`this is the current info about the stock being bought ${stock}`);
  
      // place order
      const order = await alpaca.createOrder({
        symbol: stocksToBuy[0],
        // qty: 1,
        notional: account.buying_power * 0.001, // will buy fractional shares
        side: 'buy',
        type: 'market',
        time_in_force: 'day',
        // stop_loss: {
        //   stop_price: stock.price * 0.9, // sells stock if tanks by 10%
        //   limit_price: stock.price * 0.89 // limit should always be a little lower than stop price because of market ineffiences 
        // }
      });
  
      console.log(`look mom i bought stonks: ${order.symbol} qty: ${order.notional} @ ${order.filled_avg_price}. OrderID = ${order.id}`);
  
      // console.log(JSON.stringify(order))
  
      response.send(`look mom i bought stonks: ${order.symbol} qty: ${order.notional} @ ${order.filled_avg_price}. OrderID = ${order.id}`);
  
    }
    catch 
    {
      console.log("Could not process the buy order")
      console.log(`look man i can't code in javascript to save my life`)
      response.send(`Could not process the buy order\nlook man i can't code in javascript to save my life`)

    }

  // }
});