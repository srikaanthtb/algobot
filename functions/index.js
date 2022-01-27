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

const openai = new OpenAIApi(configuration);