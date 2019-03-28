// See https://github.com/dialogflow/dialogflow-fulfillment-nodejs
// for Dialogflow fulfillment library docs, samples, and to report issues
'use strict';

//CUSTOM Code...
/********************************************************************************************/
//Some global var/const variables...
const DEFAULTRESPONSE = "Oops, there was an error retrieving your nugget, please try again.";

//Container-level data structures to locally store (cache) our AirTable data...
const quotes = [];
const principles = [];
const allrecords = [];

//AirTable Setup...
const airtableApiKey = "keysABC123EnterYourOwnKey"; //NOTE: This would/should go into a secrets/param store of some kind.
const airtableBaseID = "appABC123EnterYourOwnID";   //NOTE: This would/should go into a secrets/param store of some kind.
const Airtable = require('airtable');
const base = new Airtable({
  endpointUrl: 'https://api.airtable.com', 
  apiKey: airtableApiKey
}).base(airtableBaseID);

//Function to conditionally find our nugget either using local data or by querying AirTable...
function getNuggetByType(type) {
  //Check if we have data locally and only query AirTable when we DONT...
  if(allrecords && allrecords.length > 0) {
    return getNuggetByTypeInner(type);
  }
  else {
    console.log("CLEARING LOCAL ARRAYS");
    clearDataArrays();            //Clear our arrays before doing a fresh data load.
    console.log("FETCHING AIRTABLE DATA");
    base('HCInuggets').select({
        maxRecords: 100,
        view: "Grid view"
    }).eachPage(function page(records, fetchNextPage) {
        // This function (`page`) will get called for each page of records.
        records.forEach(function(record) {
            //console.log('Retrieved', record.get('ID'));
            var nugget = {
              id: record.get('ID'),
              type: record.get('Type'),
              content: record.get('Content'),
              source: record.get('Source'),
              approved: record.get('Approved')
            };
            if(nugget.approved) {
              allrecords.push(nugget);                                        //always add to this array.
              if(nugget.type === "quote") { quotes.push(nugget); }            //conditionally add QUOTES
              if(nugget.type === "principle") { principles.push(nugget); }    //conditionally add PRINCIPLES
            }
        });
  
        // To fetch the next page of records, call `fetchNextPage`.
        // If there are more records, `page` will get called again.
        // If there are no more records, `done` will get called.
        fetchNextPage();
  
    }, function done(err) {
        console.log("quotes.length: " + quotes.length);
        console.log("principles.length: " + principles.length);
        console.log("allrecords.length: " + allrecords.length);
        if (err) {
          console.error(err);
          return;
        }
        else {
          return getNuggetByTypeInner(type);
        }
    });
  }
}

//Loads data from AirTable as necessary and calls getNuggetFromArray to get a single nugget from the provided array...
function getNuggetByTypeInner(type) {
  var nugget;

  switch(type) {
    case "quote":
      nugget = getRandomArrayItem(quotes);
      break;
    case "principle":
      nugget = getRandomArrayItem(principles);
      break;
    default:
      nugget = getRandomArrayItem(allrecords);
  }

  console.log("nugget: " + JSON.stringify(nugget));
  return nugget;
}

//Function to clear our local data...
function clearDataArrays() {
  quotes.length = 0;
  principles.length = 0;
  allrecords.length = 0;
}

//Gets a single nugget from the provided array...
function getRandomArrayItem(array) {
  var item = array[Math.floor(Math.random()*array.length)];
  return item;
}
/********************************************************************************************/
//CUSTOM Code.



//Google Code... (customized to handle our intent and call our custom functions above)
/********************************************************************************************/
const functions = require('firebase-functions');
const {WebhookClient} = require('dialogflow-fulfillment');
const {Card, Suggestion} = require('dialogflow-fulfillment');
 
process.env.DEBUG = 'dialogflow:debug'; // enables lib debugging statements
 
exports.dialogflowFirebaseFulfillment = functions.https.onRequest((request, response) => {
  const agent = new WebhookClient({ request, response });
  console.log('Dialogflow Request headers: ' + JSON.stringify(request.headers));
  console.log('Dialogflow Request body: ' + JSON.stringify(request.body));
 
  function welcome(agent) {
    agent.add(`Welcome to my agent!`);
  }
 
  function fallback(agent) {
    agent.add(`I didn't understand`);
    agent.add(`I'm sorry, can you try again?`);
  }

  // Uncomment and edit to make your own intent handler
  // uncomment `intentMap.set('your intent name here', yourFunctionHandler);`
  // below to get this function to be run when a Dialogflow intent is matched
  function GetNuggetByTypeHandler(agent) {
    let response = DEFAULTRESPONSE;
    let nugget;
    if(agent && agent.parameters && agent.parameters.NuggetType) {
      nugget = getNuggetByType(agent.parameters.NuggetType);
      if(nugget) {
        response = nugget.content + " -" + nugget.source;
      }
    }
    agent.add(response);
  }

  // // Uncomment and edit to make your own Google Assistant intent handler
  // // uncomment `intentMap.set('your intent name here', googleAssistantHandler);`
  // // below to get this function to be run when a Dialogflow intent is matched
  // function GetNuggetByTypeActionHandlerGoogleAssistant(agent) {
  //   let conv = agent.conv(); // Get Actions on Google library conv instance
  //   conv.ask('Hello from the Actions on Google client library!') // Use Actions on Google library
  //   agent.add(conv); // Add Actions on Google library responses to your agent's response
  // }
  // // See https://github.com/dialogflow/dialogflow-fulfillment-nodejs/tree/master/samples/actions-on-google
  // // for a complete Dialogflow fulfillment library Actions on Google client library v2 integration sample

  // Run the proper function handler based on the matched Dialogflow intent name
  let intentMap = new Map();
  intentMap.set('Default Welcome Intent', welcome);
  intentMap.set('Default Fallback Intent', fallback);
  intentMap.set('GetNuggetByType', GetNuggetByTypeHandler);
  // intentMap.set('GetNuggetByTypeAction', GetNuggetByTypeActionHandlerGoogleAssistant);
  agent.handleRequest(intentMap);
});
/********************************************************************************************/
//END Google Code.