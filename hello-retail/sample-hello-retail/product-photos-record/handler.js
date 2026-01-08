'use strict';

const { KV_Store } = require('kv-store');
const fs = require('fs');



const constants = {
  MODULE: 'record.js',

  TABLE_PHOTO_ASSIGNMENTS_NAME: process.env.TABLE_PHOTO_ASSIGNMENTS_NAME,
  HOST: process.env.HOST,
  USER: process.env.USER,
  PASS: process.env.PASS,
  DBNAME: process.env.DBNAME
};

const impl = {
  
  failTask: (event, putErr, callback) => {
    const params = {
      taskToken: event.body.tasks.taskToken,
      cause: 'DynamoDb Failure',
      error: putErr,
    };
  },
  putAssignment: (event, callback) => {
    const updated = Date.now();
    console.log('Reached inside putAssignment');
    const kv = new KV_Store(constants.HOST, constants.USER, 
    constants.PASS, constants.DBNAME, constants.TABLE_PHOTO_ASSIGNMENTS_NAME);
    console.log('event: \n')
    console.log(event);
    
    var storedValues = JSON.stringify({
          updatedBy: event.body.origin,
          //taskToken: event.body.data.tasks.taskToken,
          taskEvent: event.body.photographer.id,
          status: 'pending'
    })
    
    kv.init()
      .then(() => kv.put(
        event.body.photographer.phone,
        storedValues
        ))
      .then(() => kv.close())
      .then(res => callback(null, res))
      .catch(err => callback(err))
  },
};

// Example event:
// {
//   schema: 'com.nordstrom/retail-stream/1-0-0',
//   origin: 'hello-retail/product-producer-automation',
//   timeOrigin: '2017-01-12T18:29:25.171Z',
//   data: {
//     schema: 'com.nordstrom/product/create/1-0-0',
//     id: 4579874,
//     brand: 'POLO RALPH LAUREN',
//     name: 'Polo Ralph Lauren 3-Pack Socks',
//     description: 'PAGE:/s/polo-ralph-lauren-3-pack-socks/4579874',
//     category: 'Socks for Men',
//   }
// }
module.exports = (event, context, callback) => {
      console.log("\u001b[36mRequest at " + new Date().toISOString() + "\u001b[0m\n\u001b[36m" + JSON.stringify(event,null,2).split("\n").join("\u001b[0m\n\u001b[36m") + "\u001b[0m");
      const origCallback = callback;
      callback = function(err, data) {
        console.log("\u001b["+(err?"91":"36")+"mResponse at " + new Date().toISOString() + "\u001b[0m");
        origCallback(err, data);
      }
    
      impl.putAssignment(event, (putErr) => {
        if (putErr) {
          impl.failTask(event.body, putErr, callback)
        } else {
          callback(null, event.body)
        }
      })
  
};
