'use strict';

const { KV_Store } = require('kv-store');
const fs = require('fs');


const constants = {
  TABLE_CREDIT_CARDS_NAME: process.env.TABLE_CREDIT_CARDS_NAME,
  HOST: process.env.HOST,
  USER: process.env.USER,
  PASS: process.env.PASS,
  DBNAME: process.env.DBNAME
};

module.exports = (event, context, callback) => {
  console.log("\u001b[36mRequest at " + new Date().toISOString() + "\u001b[0m\n\u001b[36m" + JSON.stringify(event,null,2).split("\n").join("\u001b[0m\n\u001b[36m") + "\u001b[0m");
  const origCallback = callback;
  callback = function(err, data) {
    console.log("\u001b["+(err?"91":"36")+"mResponse at " + new Date().toISOString() + "\u001b[0m");
    origCallback(err, data);
  }
  const result = event.body;
  if (event.body.creditCard) {
    if (Math.random() < 0.01) { // Simulate failure in 1% of purchases (expected).
      result.approved = 'false';
      result.failureReason = 'Credit card authorization failed';
    } else {
      result.approved = 'true';
      result.authorization = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
    }
    return callback(null, result);
  } else {
    const kv = new KV_Store(constants.HOST, constants.USER, 
        constants.PASS, constants.DBNAME, constants.TABLE_CREDIT_CARDS_NAME);

    return kv.init()
      .then(() => kv.get(event.body.user))
      .then(cc => kv.close().then(() => cc))
      .then((cc) => {
        if (cc) {
          if (Math.random() < 0.01) { // Simulate failure in 1% of purchases (expected).
            result.approved = 'false';
            result.failureReason = 'Credit card authorization failed';
          } else {
            result.approved = 'true';
            result.authorization = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
          }
        } else {
          result.approved = 'false';
          result.failureReason = 'No credit card supplied and no credit card stored in DB';
        }
        return result;
      })
      .then(res => callback(null, res))
      .catch(err => callback(err))

  }
};
