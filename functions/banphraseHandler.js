//this module is for specific channels that use the banphrase api. it's not directly affected by what's  the target channel in the .env. 

import { Client } from 'node-rest-client';
import escapeStringRegexp from 'escape-string-regexp';

const client = new Client();
let streamerID = 62300805

async function checkIfBanPhrase1SaysSafe(inputMessage) {
    const args = {
        data: {
            message: inputMessage

        },
        headers: {
            "Content-Type": "application/json"
        }
    };
    return new Promise((resolve, reject) => {
        client.post("https://nymn.pajbot.com/api/v1/banphrases/test", args, function (data, response) {
            if (response.statusCode === 200) {
                if (data.banned === false)
                    resolve(true);
                else if (data.banned === true) {
                    resolve(false)
                }
            } else {
                console.error("Error:", response.statusCode);
            }
        });
    });




}


async function checkIfBanPhrase2SaysSafe(inputMessage) {


    inputMessage = escapeStringRegexp(inputMessage);

    inputMessage = new RegExp(inputMessage);
    inputMessage = encodeURIComponent(inputMessage);


    return new Promise((resolve, reject) => {
        client.get(`https://paj.pajbot.com/api/channel/${streamerID}/moderation/check_message?message=${inputMessage}`, function (data, response) {
            if (data.banned === false) {
                resolve(true);
            } else if (data.banned === true) {
                resolve(false);
            }
            reject(response);
        });
    });
}

export async function doubleCheckIsSafe(input) {


    const checkOne = await checkIfBanPhrase1SaysSafe(input)
    const checkTwo = await checkIfBanPhrase2SaysSafe(input)
    if (checkOne === true && checkTwo === true) {
        return true
    }
    else {
        return false
    }
}
