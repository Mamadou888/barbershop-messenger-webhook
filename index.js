'use strict';

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const request = require('request');

// Create an array of barber objects representing barbers in our network
var barbers_in_network = [
  {
    "firstname": "mekhi",
    "lastname": "jones",
    "barber_id": "1",
    "phone_number": "1234567890"
  },
  {
    "firstname": "surendra",
    "lastname": "persaud",
    "barber_id": "2",
    "phone_number": "1234567890"
  },
  {
    "firstname": "garry",
    "lastname": "archbold",
    "barber_id": "3",
    "phone_number": "1234567890"
  }
];

// Imports dependencies and set up http server
const
express = require('express'),
bodyParser = require('body-parser'),
app = express().use(bodyParser.json()); // creates express http server

// Sets server port and logs message on success
app.listen(process.env.PORT || 1337, () => console.log('webhook is listening'));


// Make a request to set up Messenger Profile for Get Started button
// Call function to handle request
request({
  "uri": "https://graph.facebook.com/v2.6/me/messenger_profile",
  "qs": { "access_token": "EAACaZCEgAM9YBAGjUf58NQuZBw7xCrvSNC2IQKF6NFZB5sudSTTlG4uZAc162d2h05vTuta0D1OiwxJdM9W84DZCMum05puVxwtjuWcDVJPZA8L236yfHDnCRbihkOP4QTfvkZB5v0gVil4MhSgSwZAnvdh2ouv81gsRch0eo8awxQZDZD" },
  "method": "POST",
  "json": {
    "get_started": {
      "payload":"get_started_clicked"
    },
    "greeting":[
        {
          "locale":"default",
          "text":"Hello. Welcome to Clips Barbers!"
        },
        {
          "locale": "en_US",
          "text":"Barbers for All."
        }
    ]
  }
}, (err, res, body) => {
  if (!err) {
    console.log('Sent messenger profile request!')
  } else {
    console.error("Unable to send messenger profile request message:" + err);
  }
});







// Creates the endpoint for our webhook
app.post('/webhook', (req, res) => {

  let body = req.body;

  // Checks this is an event from a page subscription
  if (body.object === 'page') {

    // Iterates over each entry - there may be multiple if batched
    body.entry.forEach(function(entry) {

      // Gets the body of the webhook event
      let webhook_event = entry.messaging[0];
      console.log(webhook_event);


      // Get the sender PSID
      let sender_psid = webhook_event.sender.id;
      console.log('Sender PSID: ' + sender_psid);

      // Check if the event is a message or postback and
      // pass the event to the appropriate handler function
      if (webhook_event.message) {
        handleMessage(sender_psid, webhook_event.message);
      } else if (webhook_event.postback) {
        handlePostback(sender_psid, webhook_event.postback);
      }

    });

    // Returns a '200 OK' response to all requests
    res.status(200).send('EVENT_RECEIVED');
  } else {
    // Returns a '404 Not Found' if event is not from a page subscription
    res.sendStatus(404);
  }

});

// Adds support for GET requests to our webhook
app.get('/webhook', (req, res) => {

  // Your verify token. Should be a random string.
  let VERIFY_TOKEN = "barbershop"

  // Parse the query params
  let mode = req.query['hub.mode'];
  let token = req.query['hub.verify_token'];
  let challenge = req.query['hub.challenge'];

  // Checks if a token and mode is in the query string of the request
  if (mode && token) {

    // Checks the mode and token sent is correct
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {

      // Responds with the challenge token from the request
      console.log('WEBHOOK_VERIFIED');
      res.status(200).send(challenge);

    } else {
      // Responds with '403 Forbidden' if verify tokens do not match
      res.sendStatus(403);
    }
  }
});

function confirmBarber(barber_id) {
  for (var i = 0; i < barbers_in_network.length; i++) {
    if (barbers_in_network[i].barber_id == barber_id) {
      console.log("Found barber!");
      return i;
    }
  }
}

// Handles messages events
function handleMessage(sender_psid, received_message) {
  let response;

  // Checks if the message contains text
  if (received_message.text) {
    // Create the payload for a basic text message, which
    // will be added to the body of our request to the Send API

    // First response should be the barbers ID, confirm Barber exists
    let barber_id = received_message.text;
    let i = confirmBarber(barber_id);
    // Display the times that this barber is free
    response = {
      "text": "Found your barber " + barbers_in_network[i].firstname + "!"
    }

    // response = {
    //   "text": `You sent the message: "${received_message.text}". Now send me an attachment!`
    // }
  } else if (received_message.attachments) {
    // Get the URL of the message attachment
    let attachment_url = received_message.attachments[0].payload.url;
    response = {
      "attachment": {
        "type": "template",
        "payload": {
          "template_type": "generic",
          "elements": [{
            "title": "Is this the right picture?",
            "subtitle": "Tap a button to answer.",
            "image_url": attachment_url,
            "buttons": [
              {
                "type": "postback",
                "title": "Yes!",
                "payload": "yes",
              },
              {
                "type": "postback",
                "title": "No!",
                "payload": "no",
              }
            ],
          }]
        }
      }
    }
  }

  // Send the response message
  callSendAPI(sender_psid, response);
}

// Handles messaging_postbacks events
function handlePostback(sender_psid, received_postback) {
  let response;

  // Get the payload for the postback
  let payload = received_postback.payload;

  // check if payload is get_started_clicked payload
  // Set the response based on the postback payload
  if (payload == 'get_started_clicked') {
    response = {"text": "Welcome to Clips Barbers. To help you book an appointment, tell us your barbers identification code."}
  } else if (payload === 'yes') {
    response = { "text": "Thanks!" }
  } else if (payload === 'no') {
    response = { "text": "Oops, try sending another image." }
  }
  // Send the message to acknowledge the postback
  callSendAPI(sender_psid, response);
}

// Sends response messages via the Send API
function callSendAPI(sender_psid, response) {
  // Construct the message body
  let request_body = {
    "recipient": {
      "id": sender_psid
    },
    "message": response
  }

  // Send the HTTP request to the Messenger Platform
  request({
    "uri": "https://graph.facebook.com/v2.6/me/messages",
    "qs": { "access_token": "EAACaZCEgAM9YBAGjUf58NQuZBw7xCrvSNC2IQKF6NFZB5sudSTTlG4uZAc162d2h05vTuta0D1OiwxJdM9W84DZCMum05puVxwtjuWcDVJPZA8L236yfHDnCRbihkOP4QTfvkZB5v0gVil4MhSgSwZAnvdh2ouv81gsRch0eo8awxQZDZD" },
    "method": "POST",
    "json": request_body
  }, (err, res, body) => {
    if (!err) {
      console.log('message sent!')
    } else {
      console.error("Unable to send message:" + err);
    }
  });
}
