import { Client } from 'node-rest-client';
let client = new Client();

export async function getAdvice() {
    return new Promise((resolve, reject) => {
        client.get("https://api.adviceslip.com/advice", (data, response) => {
            if (response.statusCode !== 200) {
                reject("couldn't access advice API");
                return;
            }
            resolve(JSON.parse(data).slip.advice);
        }).on("error", (err) => reject(err));
    });
}