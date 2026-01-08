'use strict';

const request = require('request-promise')
const { KV_Store } = require('kv-store');

const constants = {
  MODULE: 'register.js',
  URL_AUTHENTICATE: process.env.URL_AUTHENTICATE,
  TABLE_PHOTO_REGISTRATIONS_NAME: process.env.TABLE_PHOTO_REGISTRATIONS_NAME,
  HOST: process.env.HOST,
  USER: process.env.USER,
  PASS: process.env.PASS,
  DBNAME: process.env.DBNAME,
  ASSIGNMENTS_PER_REGISTRATION: parseInt(process.env.ASSIGNMENTS_PER_REGISTRATION, 10),
  TTL_DELTA_IN_SECONDS: 60 /* seconds per minute */ * 60 /* minutes per hour */ * 2 /* hours */,
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

const impl = {
  registerPhotographer: (event, complete) => {
    const name = event.body.data.name;
    const updated = Date.now();
    var phone = event.body.data.phone;
    if(phone.charAt(0) != "+")
    {
	  phone = "+1" + phone;
    }

    const kv = new KV_Store(constants.HOST, constants.USER, constants.PASS, constants.DBNAME, constants.TABLE_PHOTO_REGISTRATIONS_NAME);
    kv.init()
      .then(() => kv.get(event.body.data.id))
      .then((res) => {
        if (res.length !== 0) {
          const stored = JSON.parse(res);
          return kv.put(
            event.body.data.id,
            JSON.stringify({
              name,
              created: stored.created ? stored.created : updated,
              createdBy: stored.createdBy ? stored.createdBy : event.body.origin,
              updated,
              updatedBy: event.body.origin,
              phone,
              registrations: constants.ASSIGNMENTS_PER_REGISTRATION,
              assignments: stored.assignments ? stored.assignments : 0,
              timeToLive: Math.ceil(updated / 1000 /* milliseconds per second */) + constants.TTL_DELTA_IN_SECONDS,
            }))
        } else {
          return kv.put(
            event.body.data.id,
            JSON.stringify({
              name,
              created: updated,
              createdBy: event.body.origin,
              updated,
              updatedBy: event.body.origin,
              phone,
              registrations: constants.ASSIGNMENTS_PER_REGISTRATION,
              assignments: 0,
              timeToLive: Math.ceil(updated / 1000 /* milliseconds per second */) + constants.TTL_DELTA_IN_SECONDS,
            }))
        }
      })
      .then(() => kv.close())
      .then(() => complete())
      .catch(err => complete(err));
  },
};

  /**
   * Handle the given photographer registration message.  The impact of photographer registration is the immediate
   * allocation of a 3 image allowance (up to) with a TTL of roughly 2 hours (may vary).
   * @param event The event declaring the photographer registration action.  Example event:
   * {
   *   "schema": "com.nordstrom/retail-stream/1-0-0",
   *   "origin": "hello-retail/photographer-registration-automation",
   *   "timeOrigin": "2017-01-12T18:29:25.171Z",
   *   "data": {
   *     "schema": "com.nordstrom/user-info/update-phone/1-0-0",
   *     "id": "4579874",
   *     "phone": "1234567890"
   *   }
   * }
   * @param complete The callback with which to report any errors
   */
module.exports = (event, context, callback) => {
  console.log("\u001b[36mRequest at " + new Date().toISOString() + "\u001b[0m\n\u001b[36m" + JSON.stringify(event,null,2).split("\n").join("\u001b[0m\n\u001b[36m") + "\u001b[0m");
  const origCallback = callback;
  callback = function(err, data) {
    console.log("\u001b["+(err?"91":"36")+"mResponse at " + new Date().toISOString() + "\u001b[0m");
    origCallback(err, data);
  }
  var accessControlId = event.headers['x-accesscontrolid']
  request({
      method: 'POST',
      uri: constants.URL_AUTHENTICATE,
      json: true,
      headers: event.headers
    },
    constants.URL_AUTHENTICATE)
    .then(res => {
      event.body.data.name = res.user;
      impl.registerPhotographer(event, callback);
    })
    .catch(err => callback(err));
};