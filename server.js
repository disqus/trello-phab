// server.js
// where your node app starts
// init project
var express = require('express');
var bodyParser = require('body-parser');
var rp = require('request-promise');
var Bluebird = require('bluebird');
var app = express();

var trello = path => {return `https://api.trello.com/1/${path}?key=${process.env.TRELLO_KEY}&token=${process.env.TRELLO_TOKEN}`;}

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  next();
});

app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// register webhook
app.post('/r/', (req, res) => {
  console.log(req.body);
  var boardId = req.body.board;
  // check and see if we've already created a webhook for this model
  // if we havent, create one
  // if we have, return the current webhook id
  rp(trello(`tokens/${process.env.TRELLO_TOKEN}/webhooks`))
  .then(response => {
    var existingHook = false;
    response = JSON.parse(response);
    if (response.length > 0) {
      response.forEach(webhook => {
        if (webhook.idModel === boardId) {
          existingHook = webhook;
        }
      })
    }
    if (existingHook) {
      res.json({
        url: process.env.PHAB_URL,
        id: existingHook.id
      });
    } else {
      var options = {
        method: 'POST',
        uri: trello(`webhooks`),
        body: {
          description: 'Phabricator Inbound Webhook',
          callbackURL: process.env.WEBHOOK_URL,
          idModel: boardId,
          active: true
        },
        json: true
      }
      rp(options)
      .then(webhookResponse => {
        res.json({
          url: process.env.PHAB_URL,
          id: webhookResponse[0].id
        })
      })
    }
  });
})

// listen for requests :)
var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});