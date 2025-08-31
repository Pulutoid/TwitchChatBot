import WebSocket from 'ws';
import fetch from 'node-fetch';
import { finalOutputString } from './functions/finalOutputString.js';
import { cooldownCheck } from './functions/cooldownHandler.js';
import 'dotenv/config';
import { getAccess_token, getChannelID, getBotUserID, getBotKeyword, getClientID } from './authorizationFlowHandler.js';

const CLIENT_ID = getClientID();
const BOT_KEYWORD = getBotKeyword();
const BOT_USER_ID = await getBotUserID();
const CHAT_CHANNEL_USER_ID = await getChannelID();

const EVENTSUB_WEBSOCKET_URL = 'wss://eventsub.wss.twitch.tv/ws';
let websocketSessionID;
let websocketClient;
let liveStatus = false;

// Message queue to prevent rate limiting
let messageQueue = [];
let isProcessingQueue = false;
const MESSAGE_PROCESSING_DELAY = 1500;

function queueChatMessage(chatMessage) {
    messageQueue.push(chatMessage);
    if (!isProcessingQueue) {
        processMessageQueue();
    }
}

async function processMessageQueue() {
    if (messageQueue.length === 0) {
        isProcessingQueue = false;
        return;
    }

    isProcessingQueue = true;
    const message = messageQueue.shift();

    try {
        await sendChatMessage(message);
    } catch (error) {
        console.error('Error sending message from queue:', error);
    }

    setTimeout(processMessageQueue, MESSAGE_PROCESSING_DELAY);
}

(async () => {
    try {
        await getAuth();
        liveStatus = await isChannelLive(CHAT_CHANNEL_USER_ID);
        console.log(`Initial live status: ${liveStatus ? 'LIVE' : 'OFFLINE'}`);
        websocketClient = startWebSocketClient();
        setupLiveStatusPolling();
    } catch (error) {
        console.error('Failed to initialize bot:', error);
        process.exit(1);
    }
})();

function setupLiveStatusPolling() {
    setInterval(async () => {
        try {
            const output = await isChannelLive(CHAT_CHANNEL_USER_ID);
            if (liveStatus !== output) {
                console.log(`Live status changed: ${output ? 'LIVE' : 'OFFLINE'}`);
            }
            liveStatus = output;
        } catch (err) {
            console.error('Error checking live status:', err);
        }
    }, 60 * 1000);
}

async function getAuth() {
    const response = await fetch('https://id.twitch.tv/oauth2/validate', {
        method: 'GET',
        headers: {
            'Authorization': `OAuth ${await getAccess_token()}`
        }
    });

    if (response.status !== 200) {
        const data = await response.json();
        console.error(`Token validation failed with status: ${response.status}`);
        console.error(data);
        throw new Error('Token validation failed');
    }

    const data = await response.json();
    console.log(`Bot authenticated as: ${data.login}`);
}

function startWebSocketClient() {
    const client = new WebSocket(EVENTSUB_WEBSOCKET_URL);

    client.on('error', error => {
        console.error('WebSocket error:', error);
        setTimeout(() => {
            console.log('Reconnecting WebSocket...');
            websocketClient = startWebSocketClient();
        }, 5000);
    });

    client.on('close', (code, reason) => {
        console.log(`WebSocket closed with code ${code}: ${reason || 'No reason provided'}`);
        if (code !== 1000) {
            setTimeout(() => {
                console.log('Reconnecting WebSocket...');
                websocketClient = startWebSocketClient();
            }, 5000);
        }
    });

    client.on('open', () => {
        console.log('WebSocket connection opened to ' + EVENTSUB_WEBSOCKET_URL);
    });

    client.on('message', (data) => {
        try {
            handleWebSocketMessage(JSON.parse(data.toString()));
        } catch (error) {
            console.error('Error processing WebSocket message:', error);
        }
    });

    return client;
}

async function handleWebSocketMessage(data) {
    switch (data.metadata.message_type) {
        case 'session_welcome':
            websocketSessionID = data.payload.session.id;
            await registerEventSubListeners();
            break;

        case 'session_reconnect':
            console.log('Received reconnect request from Twitch');
            const newUrl = data.payload.session.reconnect_url;

            if (websocketClient && websocketClient.readyState === WebSocket.OPEN) {
                websocketClient.close(1000, 'Reconnecting as requested by Twitch');
            }

            websocketClient = new WebSocket(newUrl);
            websocketClient.on('open', () => console.log('Reconnected to new WebSocket URL'));
            websocketClient.on('message', (data) => handleWebSocketMessage(JSON.parse(data.toString())));
            websocketClient.on('close', (code, reason) => {
                if (code !== 1000) {
                    setTimeout(() => {
                        websocketClient = startWebSocketClient();
                    }, 5000);
                }
            });
            break;

        case 'notification': {
            if (data.metadata.subscription_type !== 'channel.chat.message') break;

            const { text: fullText } = data.payload.event.message;
            const chatterName = data.payload.event.chatter_user_login;
            const broadcaster = data.payload.event.broadcaster_user_login;
            const messageLower = fullText.toLowerCase().trim();
            const isPrefixed = messageLower.startsWith(BOT_KEYWORD);

            console.log(`MSG #${broadcaster} <${chatterName}> ${fullText}`);

            if (isPrefixed) {
                const messageAfterPrefix = fullText.substring(messageLower.indexOf(BOT_KEYWORD) + BOT_KEYWORD.length + 1).trim();

                if (messageAfterPrefix.startsWith("ask")) {
                    const cooldownInfo = cooldownCheck(chatterName, "ask");
                    if (!cooldownInfo.cooldownFinished) {
                        queueChatMessage(`@${chatterName}, [cooldown]`);
                        return;
                    }

                    try {
                        const output = await finalOutputString(messageAfterPrefix, chatterName);
                        queueChatMessage(output);
                    } catch (err) {
                        console.error("Error processing ask message:", err);
                        queueChatMessage(`@${chatterName}, Sorry, I encountered an error processing your request.`);
                    }
                } else {
                    try {
                        if (liveStatus == false) {
                            const output = await finalOutputString(messageAfterPrefix, chatterName);
                            queueChatMessage(output);
                        } else {
                            const output = await finalOutputString('streameronline', chatterName);
                            queueChatMessage(output);
                        }
                    } catch (err) {
                        console.error("Error processing message:", err);
                        queueChatMessage(`@${chatterName}, Sorry, I encountered an error processing your request.`);
                    }
                }
            }
            break;
        }
    }
}

function truncateMessage(message, maxLength) {
    if (message.length <= maxLength) {
        return message;
    }

    const truncated = message.substring(0, maxLength);
    const lastSpaceIndex = truncated.lastIndexOf(' ');

    if (lastSpaceIndex > maxLength * 0.7) {
        return truncated.substring(0, lastSpaceIndex) + '...';
    } else {
        return truncated + '...';
    }
}

async function sendChatMessage(chatMessage) {
    if (chatMessage.length > 250) {
        console.log(`Message too long (${chatMessage.length} chars), truncating to 250`);
        chatMessage = truncateMessage(chatMessage, 250);
    }

    const response = await fetch('https://api.twitch.tv/helix/chat/messages', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${await getAccess_token()}`,
            'Client-Id': CLIENT_ID,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            broadcaster_id: CHAT_CHANNEL_USER_ID,
            sender_id: BOT_USER_ID,
            message: chatMessage
        })
    });

    if (response.status === 401) {
        await getAccess_token(401);
        return await sendChatMessage(chatMessage);
    }

    if (!response.ok) {
        const data = await response.json().catch(() => ({ message: 'Failed to parse response' }));
        console.error(`Failed to send chat message(${response.status}): `, data);
        return;
    }

    console.log("Sent chat message:", chatMessage);
}

async function registerEventSubListeners() {
    const response = await fetch('https://api.twitch.tv/helix/eventsub/subscriptions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${await getAccess_token()}`,
            'Client-Id': CLIENT_ID,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            type: 'channel.chat.message',
            version: '1',
            condition: {
                broadcaster_user_id: CHAT_CHANNEL_USER_ID,
                user_id: BOT_USER_ID
            },
            transport: {
                method: 'websocket',
                session_id: websocketSessionID
            }
        })
    });

    if (response.status === 401) {
        await getAccess_token(401);
        return await registerEventSubListeners();
    }

    if (response.status !== 202) {
        const data = await response.json().catch(() => ({ message: 'Failed to parse response' }));
        console.error("Failed to subscribe to channel.chat.message. API call returned status code " + response.status);
        console.error(data);
        throw new Error(`EventSub subscription failed: ${data.message || 'Unknown error'}`);
    }

    const data = await response.json();
    console.log(`Subscribed to channel.chat.message[${data.data[0].id}]`);
}

async function isChannelLive(username) {
    const response = await fetch(`https://api.twitch.tv/helix/streams?user_id=${username}`, {
        headers: {
            'Authorization': `Bearer ${await getAccess_token()}`,
            'Client-Id': CLIENT_ID
        }
    });

    if (response.status === 401) {
        await getAccess_token(401);
        return await isChannelLive(username);
    }

    if (!response.ok) {
        console.error(`Twitch API error checking live status: ${response.status}`);
        return false;
    }

    const data = await response.json();
    return data.data.length > 0;
}