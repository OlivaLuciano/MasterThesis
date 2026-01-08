'use strict';

module.exports = (event, context, callback) => {
    console.log("\u001b[36mRequest at " + new Date().toISOString() + "\u001b[0m\n\u001b[36m" + JSON.stringify(event,null,2).split("\n").join("\u001b[0m\n\u001b[36m") + "\u001b[0m");
    const origCallback = callback;
    callback = function(err, data) {
      console.log("\u001b["+(err?"91":"36")+"mResponse at " + new Date().toISOString() + "\u001b[0m");
      origCallback(err, data);
    }

    var params = {};

    if (event.body.approved) {
      const purchaseEvent = {
        productId: event.body.id,
        productPrice: event.body.price,
        userId: event.body.user,
        authorization: event.body.authorization,
      };
      params.Data = purchaseEvent;

      
    } else {
      params.Data = `Failed to purchase product. Reason: ${event.failureReason}`
    }
    return callback(null, params);
  };

