import open from 'open';
import { Client } from 'node-rest-client'
import express from 'express';
import fs from 'fs';
import path from 'path';
import 'dotenv/config'

let access_token = process.env.ACCESS_TOKEN ? process.env.ACCESS_TOKEN : null;
let refresh_token = process.env.REFRESH_TOKEN ? process.env.REFRESH_TOKEN : null;
let token_type = null;
let latest_error_code = null;

const client = new Client();
const twitch_client_id = process.env.CLIENT_ID;
const app = express();
const env_file_path = path.join(process.cwd(), '.env');

function update_env_tokens() {
    try {
        let env_content = '';

        if (fs.existsSync(env_file_path)) {
            env_content = fs.readFileSync(env_file_path, 'utf8');
        }

        // Remove existing ACCESS_TOKEN and REFRESH_TOKEN lines
        let env_lines = env_content
            .split('\n')
            .filter(line => !line.startsWith('ACCESS_TOKEN=') && !line.startsWith('REFRESH_TOKEN='));

        // Add updated tokens
        if (access_token) {
            env_lines.push(`ACCESS_TOKEN=${access_token}`);
        }
        if (refresh_token) {
            env_lines.push(`REFRESH_TOKEN=${refresh_token}`);
        }

        // Join lines and ensure single trailing newline
        env_content = env_lines.join('\n');
        if (env_content && !env_content.endsWith('\n')) {
            env_content += '\n';
        }

        fs.writeFileSync(env_file_path, env_content);
        console.log("tokens updated in .env file");
    } catch (error) {
        console.error("failed to update tokens in .env file:", error);
    }
}

import readline from 'readline';

export async function getTwitchCredentials() {
    const authUrl = `https://id.twitch.tv/oauth2/authorize?response_type=code&client_id=${twitch_client_id}&redirect_uri=${encodeURIComponent("http://localhost:3001/")}&scope=${encodeURIComponent("user:bot user:read:chat user:write:chat")}`;

    let code = null;

    try {

        open(authUrl);
        console.log("acquiring authorization code");
        code = await new Promise((resolve, reject) => {
            app.get('/', (req, res) => {
                code = req.query.code;

                if (code) {
                    res.send('<p>Authorization successful. You can close this page.</p>');
                    server.close(() => {
                        resolve(code);
                    });
                } else {
                    res.status(400).send('<h1>No code received</h1>');
                }
            });

            const server = app.listen(3001, () => {
                console.log('Temporary auth server running on port 3001');
            });

            setTimeout(() => {
                server.close();
                reject(new Error('Authorization timeout'));
            }, 300000);
        });

    } catch (error) {
        console.log("Failed to open browser automatically.");
        console.log("Please copy and paste this URL into your browser:");
        console.log(authUrl);
        console.log("After authorization, paste the full redirect URL here and press Enter:");

        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        const redirectUrl = await new Promise((resolve) => {
            rl.question('', (answer) => {
                rl.close();
                resolve(answer.trim());
            });
        });

        try {
            const url = new URL(redirectUrl);
            code = url.searchParams.get('code');
            if (!code) {
                console.error("No code found in the provided URL");
                return;
            }
        } catch (urlError) {
            console.error("Invalid URL provided");
            return;
        }
    }

    if (code) {
        console.log("token acquired");
    } else {
        console.error("code acquisition failed.");
        return;
    }

    try {
        console.log("acquiring authorization token");
        const tokenResponse = await new Promise((resolve, reject) => {
            client.post(
                `https://id.twitch.tv/oauth2/token?client_id=${process.env.CLIENT_ID}&client_secret=${process.env.TWITCH_SECRET}&code=${code}&grant_type=authorization_code&redirect_uri=http://localhost:3001/`,
                (data, response) => {
                    if (data.access_token) {
                        resolve(data);
                    } else {
                        reject(new Error('Failed to get tokens'));
                    }
                }
            );
        });

        access_token = tokenResponse.access_token;
        refresh_token = tokenResponse.refresh_token;
        token_type = tokenResponse.token_type;

        // Save the new tokens to .env file
        update_env_tokens();

        console.log(`access_token: ${access_token}, refresh_token: ${refresh_token}, token_type: ${token_type}`);
    } catch (e) {
        console.error(e);
    }
}

export async function oauthDataRefresh() {
    if (refresh_token === null) {
        throw new Error("attempted to refresh token but refreshToken was null");
    }

    return await new Promise((resolve, reject) => {
        client.post(
            "https://id.twitch.tv/oauth2/token",
            {
                data: {
                    grant_type: "refresh_token",
                    refresh_token: refresh_token,
                    client_id: process.env.CLIENT_ID,
                    client_secret: process.env.TWITCH_SECRET
                },
                headers: { "Content-Type": "application/x-www-form-urlencoded" }
            },
            (data, response) => {
                if (response.statusCode === 200) {
                    access_token = data.access_token;
                    refresh_token = data.refresh_token;

                    // Save the refreshed tokens to .env file
                    update_env_tokens();

                    resolve({ newOauthToken: data.access_token, newRefreshToken: data.refresh_token });
                } else {
                    latest_error_code = response.statusCode;
                    reject({ status: response.statusCode, data });
                }
            }
        );
    });
}

export async function getAccess_token(error_code) {
    if (error_code) {
        latest_error_code = error_code;
    }
    if (access_token === null || latest_error_code === 400) {
        await getTwitchCredentials()
        return access_token;
    }
    if (latest_error_code == 401) {
        console.log("refreshing token");

        try {
            await oauthDataRefresh();
            latest_error_code = null;
            return await getAccess_token();
        } catch (error) {
            console.error("Token refresh failed:", error);
            throw error;
        }
    }

    return access_token;
}

export async function getChannelID(channelLoginUserName) {
    // // for error handling in case the authentication wasn't done yet.
    // await getAccess_token()

    let targetChannel = channelLoginUserName ? channelLoginUserName : process.env.TARGET_CHANNEL
    const response = await fetch(`https://api.twitch.tv/helix/users?login=${targetChannel}`, {
        headers: {
            "Authorization": `Bearer ${await getAccess_token()}`,
            "Client-Id": process.env.CLIENT_ID
        }
    });

    if (!response.ok) {
        await getAccess_token(`${response.status}`)
        return await getChannelID(channelLoginUserName)
        // throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.data[0]?.id;
}


export async function getBotUserID() {

    return await getChannelID(process.env.BOT_USERNAME)

}

function getBotKeyword() {

    return process.env.BOT_KEYWORD
}

function getClientID() {

    return process.env.CLIENT_ID
}
export { getBotKeyword, getClientID }


export function setLatestErrorCode(error_code) {
    latest_error_code = error_code;
}

export function getLatestErrorCode() {
    return latest_error_code;
}
