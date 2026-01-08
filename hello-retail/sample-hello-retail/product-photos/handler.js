"use strict"

const request = require('request-promise')

const constants = { 

      URL_ASSIGN: process.env.URL_ASSIGN,
      URL_MESSAGE: process.env.URL_MESSAGE,
      URL_RECORD: process.env.URL_RECORD,
      URL_RECEIVE: process.env.URL_RECEIVE,
      URL_SUCCESS: process.env.URL_SUCCESS,
      URL_REPORT: process.env.URL_REPORT,

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
    
    receiveRequest: (event, context, callback) => {
       var accessControlId = event.headers['x-accesscontrolid']
       console.log(constants.URL_ASSIGN);
        console.log("\u001b[93mCalling " + constants.URL_ASSIGN + " " + new Date().toISOString() + "\u001b[0m");
        request(functions.getRequestObject(event.body, constants.URL_ASSIGN, accessControlId), constants.URL_ASSIGN)
            .then(res => {
                console.log("\u001b[93mDone " + new Date().toISOString() + "\u001b[0m");
                console.log('Assign result:');
                console.log(res);
		if(res.assigned!='true')
		{
		    callback("Couldn't assign photographer")
		}
		else
		{
                    /*request(functions.getRequestObject(res, constants.URL_MESSAGE, accessControlId), constants.URL_MESSAGE)
                        .then(res => */
                    console.log("\u001b[93mCalling " + constants.URL_RECORD + " " + new Date().toISOString() + "\u001b[0m");
                    request(functions.getRequestObject(res, constants.URL_RECORD, accessControlId), constants.URL_RECORD)/*)*/
                        .then(res => {
                            console.log("\u001b[93mDone " + new Date().toISOString() + "\u001b[0m");
                            console.log('Final res')
                            console.log(res);
                            callback(null, res);
                        })
                        .catch(err =>{
                            console.log('err' + err)
                            callback(null, err)
                        });
                }
                    
                
                
                    
            //         .then( res => {
            //             request(functions.getRequestObject(res, constants.))
            //                 .then(res => request(functions.getRequestObject(res, constants.URL_PUBLISH)))
            //                     .then(res => callback (null, res))
            //     }
            // )
            
            }
        )
    },

    receivePhoto: (event, context, callback) => {
        var accessControlId = event.headers['x-accesscontrolid']
        console.log('photoFunction')
        console.log(event.body)
        request(functions.getRequestObject(event.body, constants.URL_RECEIVE, accessControlId), constants.URL_RECEIVE)
            .then(res => {
                console.log('Result: ')
                console.log( res);
                request(functions.getRequestObject(res, constants.URL_SUCCESS, accessControlId), constants.URL_SUCCESS)
                .then(res => {
                    request(functions.getRequestObject(res, constants.URL_REPORT, accessControlId), constants.URL_REPORT)
                        .then(res => {
                            console.log('res');
                            console.log(res);
                            callback(null, res);
                        })
                        .catch(err =>{
                            console.log('err' + err)
                            callback(err)
                        });
                })
                .catch(err =>{
                    console.log('err' + err)
                    callback(err)
                });
            })
            .catch(err =>{
                console.log('err' + err)
                callback(err)
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
   if (event.path == '/request') {
      api.receiveRequest (event, context, callback);
    } else if (event.path == '/photos') {
      api.receivePhoto (event, context, callback);
    }
  
}
