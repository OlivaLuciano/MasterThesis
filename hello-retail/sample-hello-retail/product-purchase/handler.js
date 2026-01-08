"use strict"

const request = require('request-promise')

const constants = {
    URL_GETPRICE: process.env.URL_GETPRICE,
    URL_AUTHORIZECC: process.env.URL_AUTHORIZECC,
    URL_PUBLISH: process.env.URL_PUBLISH,
};

const functions = {
    getRequestObject: (requestVals, url, accessControlId) => {
        return {
            method: 'POST',
            uri: url,
            body: requestVals,
            json: true,
            headers: {
                'X-AccessControlId': accessControlId
            }
        }
    }
}

const api = {
    purchaseProduct: (event, context, callback) => {
        var accessControlId = event.headers['x-accesscontrolid'];

        console.log("Incoming event:");
        console.log(event);

        var getPriceData = {
            "id": event.body["id"]
        };
        var authorizeCCData = {
            "user": event.body["user"],
            "creditCard": event.body["creditCard"]
        };

        var reqs = [
            request(functions.getRequestObject(getPriceData, constants.URL_GETPRICE, accessControlId), constants.URL_GETPRICE),
            request(functions.getRequestObject(authorizeCCData, constants.URL_AUTHORIZECC, accessControlId), constants.URL_AUTHORIZECC)
        ];

        Promise.all(reqs).then(res => {
            console.log("get-price and authorize-cc responses:")
            console.log(res);

            var publishData = {...res[0], ...res[1]};

            request(functions.getRequestObject(publishData, constants.URL_PUBLISH, accessControlId), constants.URL_PUBLISH)
                .then(res => {
                    console.log('publish response:');
                    console.log(res);

                    var respData = {
                        "chargedAmount": res.Data["productPrice"],
                        "authorization": res.Data["authorization"]
                    };

                    console.log("Outgoing response:");
                    console.log(respData);

                    callback(null, respData);
                })
        });
    }
}

module.exports = (event, context, callback) => {
    console.log("\u001b[36mRequest at " + new Date().toISOString() + "\u001b[0m\n\u001b[36m" + JSON.stringify(event,null,2).split("\n").join("\u001b[0m\n\u001b[36m") + "\u001b[0m");
    const origCallback = callback;
    callback = function(err, data) {
      console.log("\u001b["+(err?"91":"36")+"mResponse at " + new Date().toISOString() + "\u001b[0m");
      origCallback(err, data);
    }
    api.purchaseProduct(event, context, callback);
}
