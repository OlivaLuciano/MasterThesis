'use strict';

const { KV_Store } = require('kv-store');
const fs = require('fs');


const constants = { 
  TABLE_PRODUCT_PRICE_NAME: process.env.TABLE_PRODUCT_PRICE_NAME,
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
  const kv = new KV_Store(constants.HOST, constants.USER,
    constants.PASS, constants.DBNAME, constants.TABLE_PRODUCT_PRICE_NAME);

  const result = event.body;

  kv.init()
    .then(() => kv.keys())
    .then(res => console.log(res))
    .then(() => kv.get(event.body.id))
    .then(res => kv.close().then(() => res))
    .then((res) => {
        console.log('res' + res);
      if (res) {
        // const price = JSON.parse(res).price;
        console.log('res ' + res);
        if (res) {
          result.gotPrice = 'true';
          result.price = res;
        } else {
          result.gotPrice = 'false';
          result.failureReason = 'No price in the catalog';
        }
      } else {
        result.gotPrice = 'false';
        result.failureReason = 'Product not in catalog';
      }
      callback(null, result)
    })
    .catch(err => callback(err))
};
