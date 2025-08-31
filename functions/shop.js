import Database from 'better-sqlite3';
import { ITEMS, giveItem, removeItem } from './items.js';

const db = new Database('rpg.db');
db.pragma('journal_mode = WAL');

// Create shop purchase tracking table (if it doesn't exist)
db.prepare(`
  CREATE TABLE IF NOT EXISTS shop_purchases (
    userId TEXT,
    itemId TEXT,
    purchaseDate DATETIME,
    PRIMARY KEY (userId, itemId)
  )`).run();

// Shop interface function
function shopItems(userId, itemToBuy, checkGoldWallet, ensureCharacterExists) {
    ensureCharacterExists(userId);

    if (!itemToBuy) {
        return 'check the shop: https://pastebin.com/vKx1ZPUV';
    }

    if (itemToBuy.toLowerCase().startsWith('sell ')) {
        return sellItem(userId, itemToBuy.substring(5), checkGoldWallet);
    }

    let itemId = null;
    let itemInfo = null;
    for (const [id, item] of Object.entries(ITEMS)) {
        // Skip items with 'treasure' in their ID
        if (id.toLowerCase().includes('treasure')) {
            continue;
        }
        if (item.name.toLowerCase().includes(itemToBuy.toLowerCase()) ||
            id.toLowerCase().includes(itemToBuy.toLowerCase())) {
            itemId = id;
            itemInfo = item;
            break;
        }
    }

    if (!itemId) {
        return `Item "${itemToBuy}" not found in shop. Try 'shop' to see available items.`;
    }

    // --- Enhancement Stone Purchase Limit Check ---
    if (itemId === 'enhancement stone') {
        const charStatus = db.prepare('SELECT has_used_enhancement_stone FROM characters WHERE userId = ?').get(userId);
        if (charStatus && charStatus.has_used_enhancement_stone) {
            return `You have already absorbed the power of an Enhancement Stone and cannot benefit from another.`;
        }
    }
    // --- End Enhancement Stone Check ---

    // Time Scroll purchase cooldown check
    if (itemId === 'time scroll') {
        const purchaseCheck = db.prepare(`
      SELECT purchaseDate
      FROM shop_purchases
      WHERE userId = ? AND itemId = ?
    `).get(userId, itemId);

        const now = new Date();
        const canBuy = !purchaseCheck || (new Date(purchaseCheck.purchaseDate) < new Date(now.setDate(now.getDate() - 1)));

        if (!canBuy) {
            const lastPurchase = new Date(purchaseCheck.purchaseDate);
            const nowAgain = new Date();
            const hoursSinceLast = (nowAgain - lastPurchase) / (1000 * 60 * 60);
            const remaining = Math.ceil(24 - hoursSinceLast);
            return `You can only buy Time Scrolls once per day. Come back in ${remaining} hours.`;
        }
    }

    // Check if user has enough gold
    const currentGold = checkGoldWallet(userId);
    if (currentGold < itemInfo.value) {
        return `You need ${itemInfo.value} gold to buy ${itemInfo.name} (you have ${currentGold}).`;
    }

    // Deduct gold
    const updateWallet = db.prepare('UPDATE wallets SET coinWallet = coinWallet - ? WHERE userId = ?');
    updateWallet.run(itemInfo.value, userId);

    // Add item to inventory
    giveItem(userId, itemId, 1);

    // Record purchase date for Time Scrolls
    if (itemId === 'time scroll') {
        db.prepare(`
      INSERT INTO shop_purchases (userId, itemId, purchaseDate)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(userId, itemId)
      DO UPDATE SET purchaseDate = datetime('now')
    `).run(userId, itemId);
    }

    return `You bought ${itemInfo.name} for ${itemInfo.value} gold! Use 'use ${itemId}' to use it.`;
}

// Function to sell items back to the shop
function sellItem(userId, itemToSell, checkGoldWallet) {
    if (!itemToSell) {
        return "Please specify what item you want to sell. Use 'shop sell [item name]'.";
    }

    // Find the item in inventory
    let itemId = null;

    for (const id of Object.keys(ITEMS)) {
        if (id.toLowerCase().includes(itemToSell.toLowerCase()) ||
            ITEMS[id].name.toLowerCase().includes(itemToSell.toLowerCase())) {
            // Check if user has this item
            const checkStmt = db.prepare('SELECT quantity FROM inventory WHERE userId = ? AND itemId = ?');
            const hasItem = checkStmt.get(userId, id);

            if (hasItem && hasItem.quantity > 0) {
                itemId = id;
                break;
            }
        }
    }

    if (!itemId) {
        return `You don't have an item matching "${itemToSell}" to sell. Type 'inv' to see your inventory.`;
    }

    const item = ITEMS[itemId];
    let sellValue;

    // Calculate sell value based on item type
    if (itemId.includes('treasure')) {
        sellValue = item.value; // Base shop value
    } else {
        // Regular items sell for 25% of purchase price
        sellValue = Math.floor(item.value * 0.25);
    }

    // Remove item from inventory
    removeItem(userId, itemId, 1);

    // Add gold to wallet
    const updateWallet = db.prepare('UPDATE wallets SET coinWallet = coinWallet + ? WHERE userId = ?');
    updateWallet.run(sellValue, userId);

    // Get updated gold amount
    const currentGold = checkGoldWallet(userId);

    let message = `You sold ${item.name} for ${sellValue} gold. (You now have ${currentGold} gold)`;

    return message;
}

export { shopItems };
