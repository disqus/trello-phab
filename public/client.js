/* global TrelloPowerUp */

var Promise = TrelloPowerUp.Promise;
var attachmentRegex = /\/D(\d+)/;
var descriptionRegex = /.*?\[D(\d+).*?\?trello_data=([^\)]*)/g;

TrelloPowerUp.initialize({
  'attachment-sections': function(t, options){
    return t.card('desc')
    .then(function(card) {
      // console.log(desc);
      var diffData = {};
      var match;
      while ((match = descriptionRegex.exec(card.desc)) !== null) {
        diffData[match[1]] = JSON.parse(decodeURIComponent(match[2]));
      }
      // we will just claim urls for Phab with the trello_data parameter
      var diffs = options.entries.filter(function (attachment) {
        var claimAttachment = attachment.url.match(attachmentRegex);
        return claimAttachment && diffData[claimAttachment[1]];
      });

      // you can have more than one attachment section on a card
      // you can group items together into one section, have a section
      // per attachment, or anything in between.
      if (diffs) {
        var attachments = [];
        diffs.forEach(diff => {
          var match = diff.url.match(attachmentRegex);
          var data = diffData[match[1]];
          attachments.push({
            claimed: diffs,
            icon: 'phabricator.png', // Must be a gray icon, colored icons not allowed.
            title: 'D' + data.id + ': ' + data.title,
            content: {
              type: 'iframe',
              url: t.signUrl('./section.html', {
                phabUrl: diff.url.substr(0, match.index + 1),
                phabData: data
              }),
              height: 50
            }
          });
        });
        return attachments;
      } else {
        return [];
      }
    });
  },
  'card-badges': function(t, options) {
    var numDiffs = 0;
    return t.card('desc','attachments')
    .then(function(card) {
      var diffData = {};
      var match;
      while ((match = descriptionRegex.exec(card.desc)) !== null) {
        diffData[match[1]] = JSON.parse(decodeURIComponent(match[2]));
      }
      card.attachments.forEach(function(attachment) {
        var isDiffAttachment = attachment.url.match(attachmentRegex);
        if (isDiffAttachment && diffData[isDiffAttachment[1]]) {
          numDiffs++;
        }
      });
      if (numDiffs > 0) {
        return [{
          text: '⚙️ ' + numDiffs,
        }];
      } else {
        return false;
      }
    });
  },
  'board-buttons': function (t, opts) {
    return t.get('board', 'shared', 'webhook')
    .then(webhook => {
      if (webhook && webhook.url) {
        return [{
          icon: 'https://' + window.location.hostname + 'phabricator.png',
          text: '✅',
          url: webhook.url,
        }];
      } else {
        return [{
          icon: 'https://' + window.location.hostname + 'phabricator.png',
          text: '⚠️',
          callback: (t, opts) => {
            return t.board('id')
            .then (board => {
              fetch('/r/',
                {
                  headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                  },
                  method: "POST",
                  body: JSON.stringify({board: board.id})
                }
              ).then(function(response) {
                return response.json()
                .then(webhook => {
                  console.log(webhook);
                  return t.set('board', 'shared', 'webhook', webhook);
                })
              });
            });
          }
        }];
      }
    })
  }
});
