'use strict';

/* ********************************************************************
 *                 Hello Retail Minimization:
 *  - Removed all twilio code, in particular all code in charge of
 *    sdk, key decryption, and message send.
 *  - Removed all aws.kms code, which was used for managing keys.
 *  - Removed all aws code, which was only used for kms.
 * ******************************************************************** */

const BbPromise = require('bluebird');
const nodemailer = require('nodemailer');

/**
 * Constants
 */
const constants = {
  // internal
  ERROR_SERVER: 'Server Error',
  // module and method names
  MODULE: 'message.js',
  METHOD_HANDLER: 'handler',
  METHOD_SEND_MESSAGE: 'sendMessage',
};

/**
 * Errors
 */
class ServerError extends Error {
  constructor(message) {
    super(message);
    this.name = constants.ERROR_SERVER
  }
}

/**
 * Utility Methods (Internal)
 */
const util = {
  serverError: (method, err) => {
    console.log(`${constants.MODULE} ${method} - ${constants.ERROR_SERVER}: ${err}`);
    return util.response(500, constants.ERROR_SERVER)
  },
};

/**
 * Implementation (Internal)
 */
const impl = {
  sendMessage: (event) => {
    function createTransporter() {
      // create reusable transporter object using the default SMTP transport
      const transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
          user: 'vqx6tnt2bar5fhcu@ethereal.email',
          pass: 'PsFzkYR7nXpcJZEF7s',
        },
      });
      return Promise.resolve(transporter);
    }

    const messageText =
      `
Hello ${event.body.data.photographer.name}!
Please snap a pic of:
    ${event.body.data.name}

Created by:
    ${event.body.data.merchantName}`;

    const mailOptions = {
      from: '"The Store" <boss@store.com>',
      to: `${event.body.data.photographer.phone}@photogs.com`,
      subject: 'New Photography Assignment From The Store',
      text: messageText,
      html: `<p>${messageText}</p>`,
    };

    createTransporter()
      .then(trans => trans.sendMail(mailOptions))
      .then(
        (info) => {
          console.log('Message sent: %s', info.messageId);
          // Preview only available when sending through an Ethereal account
          console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));

          return Promise.resolve(info);
        })
      .catch(
        err => BbPromise.reject(new ServerError(`${constants.METHOD_SEND_MESSAGE} - Error sending message to photographer: ${JSON.stringify(err, null, 2)}`)) // eslint-disable-line comma-dangle
      );
  },
};


module.exports = (event, context, callback) => {

    console.log("\u001b[36mRequest at " + new Date().toISOString() + "\u001b[0m\n\u001b[36m" + JSON.stringify(event,null,2).split("\n").join("\u001b[0m\n\u001b[36m") + "\u001b[0m");
    const origCallback = callback;
    callback = function(err, data) {
      console.log("\u001b["+(err?"91":"36")+"mResponse at " + new Date().toISOString() + "\u001b[0m");
      origCallback(err, data);
    }
    BbPromise.resolve(event)
      .then(impl.sendMessage)
      .then((messageInfo) => {
        console.log(`Success: ${JSON.stringify(messageInfo, null, 2)}`);
        callback(null, event)
      })
      .catch((ex) => {
        console.log(JSON.stringify(ex, null, 2));
        callback(`${constants.MODULE} ${ex.message}:\n${ex.stack}`)
      })
  };

