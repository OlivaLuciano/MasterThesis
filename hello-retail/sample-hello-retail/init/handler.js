'use strict';
module.exports = (event, context, callback) => {
    console.log("\u001b[36mRequest at " + new Date().toISOString() + "\u001b[0m\n\u001b[36m" + JSON.stringify(event,null,2).split("\n").join("\u001b[0m\n\u001b[36m") + "\u001b[0m");
    const origCallback = callback;
    callback = function(err, data) {
      console.log("\u001b["+(err?"91":"36")+"mResponse at " + new Date().toISOString() + "\u001b[0m");
      origCallback(err, data);
    }
    callback(null,null)
};
