'use strict';

const url = require('url');
const got = require('got');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

process.env.OAUTH_SERVER = 'accounts.google.com';

const constants = {
    MODULE: 'authenticate.js',
    OAUTH_SERVER: process.env.OAUTH_SERVER
};

const jwksFile = "jwks.dat";
const jwksInfoFile = "jwks_info.dat";

let signingAlgos, expires;
let reloadJwks = true;

async function reloadJwksData() {
    console.log("Reloading jwks");
    try {
        const response = await got(`https://${constants.OAUTH_SERVER}/.well-known/openid-configuration`);
        let oidcConfig = JSON.parse(response.body);
        signingAlgos = oidcConfig.id_token_signing_alg_values_supported;
        const jwksResponse = await got(oidcConfig.jwks_uri);
        expires = new Date(jwksResponse.headers.expires).getTime() / 1000;
        fs.writeFileSync(jwksFile, jwksResponse.body);
        fs.writeFileSync(jwksInfoFile, JSON.stringify([signingAlgos, expires]));
    } catch (error) {
        console.error("Error reloading jwks:", error.message);
    }
}

let client;
(async () => {
    try {
        [signingAlgos, expires] = JSON.parse(fs.readFileSync(jwksInfoFile, 'utf8'));
        if (expires > Math.floor(Date.now() / 1000)) {
            reloadJwks = false;
        }
    } catch (err) {
        // Reload jwks
    }

    if (reloadJwks) {
        await reloadJwksData();
    }

    client = jwksClient({
        jwksUri: "/error/", //The keys should always be loaded from the local file
        getKeysInterceptor: () => {
            return JSON.parse(fs.readFileSync(jwksFile, 'utf8')).keys;
        }
    });
})();

function getKey(header, callback) {
    client.getSigningKey(header.kid, function (err, key) {
        const signingKey = key.publicKey || key.rsaPublicKey;
        callback(err, signingKey);
    });
}

const impl = {
    getEmail: (event, callback) => {
        if ("authorization" in event.headers) {
            if (client) {
                const idToken = event.headers.authorization.split(' ')[1];
                const options = {
                    algorithms: signingAlgos,
                    issuer: "https://accounts.google.com",
                    ignoreExpiration: false
                };

                jwt.verify(idToken, getKey, options, (err, decoded) => {
                    if (err) {
                        console.log(err);
                        callback("Unauthorized");
                    } else {
                        callback(null, {user: decoded.email});
                    }
                });
            } else {
                callback("Initializing");
            }
        } else {
            callback("Unauthorized")
        }
    },
};

module.exports = (event, context, callback) => {
    console.log("\u001b[36mRequest at " + new Date().toISOString() + "\u001b[0m\n\u001b[36m" + JSON.stringify(event,null,2).split("\n").join("\u001b[0m\n\u001b[36m") + "\u001b[0m");
    const origCallback = callback;
    callback = function(err, data) {
      console.log("\u001b["+(err?"91":"36")+"mResponse at " + new Date().toISOString() + "\u001b[0m");
      origCallback(err, data);
    }
    impl.getEmail(event, callback);
};
