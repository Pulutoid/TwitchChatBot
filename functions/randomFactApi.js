import { Client } from 'node-rest-client'

let client = new Client();
export async function getFact() {
    return new Promise((resolve, reject) => {
        client.get("https://uselessfacts.jsph.pl/random.json", (data, response) => {
            if (response.statusCode !== 200) {
                reject("couldn't access app api");
                return;
            }
            resolve(data.text);
        }).on("error", (err) => reject(err));
    });
}
