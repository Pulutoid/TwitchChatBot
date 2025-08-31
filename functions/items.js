import Database from 'better-sqlite3';
import { checkLevelUp, calculateExpForLevel, deleteCharacterCompletely } from './RPG.js'
const db = new Database('rpg.db');
db.pragma('journal_mode = WAL');

// Define equipment slots
const EQUIPMENT_SLOTS = {
    WEAPON: 'weapon',
    ARMOR: 'armor',
    ACCESSORY: 'accessory'
};

// Enhanced item definitions with type and slot information
const ITEMS = {
    'sword': {
        name: 'Sword',
        effect: '+2 attack',
        value: 10,
        type: 'equipment',
        slot: EQUIPMENT_SLOTS.WEAPON,
        equipEffect: (userId) => ({ attack: 2, defense: 0 })
    },
    'shield': {
        name: 'Shield',
        effect: '+2 defense',
        value: 10,
        type: 'equipment',
        slot: EQUIPMENT_SLOTS.ARMOR,
        equipEffect: (userId) => ({ attack: 0, defense: 2 })
    },
    'iron sword': {
        name: 'Iron Sword',
        effect: '+3 attack',
        value: 20,
        type: 'equipment',
        slot: EQUIPMENT_SLOTS.WEAPON,
        equipEffect: (userId) => ({ attack: 3, defense: 0 })
    },
    'steel armor': {
        name: 'Steel Armor',
        effect: '+3 defense',
        value: 20,
        type: 'equipment',
        slot: EQUIPMENT_SLOTS.ARMOR,
        equipEffect: (userId) => ({ attack: 0, defense: 3 })
    },
    'potion': {
        name: 'Health Potion',
        effect: 'Heal 5 HP',
        value: 5,
        type: 'consumable',
        useEffect: (userId) => {
            const charInfo = db.prepare('SELECT currentHp, maxHp, restUntil FROM characters WHERE userId = ?').get(userId);
            if (!charInfo) return "Character not found.";

            const healAmount = 5;
            let finalHp;
            let message;

            if (charInfo.restUntil) {
                finalHp = Math.min(charInfo.maxHp, 1 + healAmount); // Revive to 1 HP then add potion effect, capped by maxHp
                db.prepare('UPDATE characters SET currentHp = ?, restUntil = NULL WHERE userId = ?').run(finalHp, userId);
                message = `You used a Health Potion while resting and recovered from unconsciousness! Your HP is now ${finalHp}/${charInfo.maxHp}.`;
            } else {
                finalHp = Math.min(charInfo.maxHp, charInfo.currentHp + healAmount);
                db.prepare('UPDATE characters SET currentHp = ? WHERE userId = ?').run(finalHp, userId);
                message = `You used a Health Potion and recovered ${healAmount} HP! (HP: ${finalHp}/${charInfo.maxHp})`;
            }
            return message;
        }
    },
    'treasure': {
        name: 'Treasure',
        effect: 'Sell for gold',
        value: 3, // This is the base gold value if sold directly, not via useEffect
        type: 'consumable',
        useEffect: (userId) => {
            const goldValue = 3; // Actual gold gained when "used"
            db.prepare('UPDATE wallets SET coinWallet = coinWallet + ? WHERE userId = ?').run(goldValue, userId);
            return `You found ${goldValue} gold in the Treasure!`;
        }
    },
    'rare treasure': {
        name: 'Rare Treasure',
        effect: 'Sell for extra gold',
        value: 8, // Base shop value
        type: 'consumable',
        useEffect: (userId) => {
            const baseGoldValue = 8;
            const char = db.prepare('SELECT level FROM characters WHERE userId = ?').get(userId);
            if (!char) return "Character not found.";
            const levelBonus = Math.floor(char.level * 0.5);
            const totalGold = baseGoldValue + levelBonus;
            db.prepare('UPDATE wallets SET coinWallet = coinWallet + ? WHERE userId = ?').run(totalGold, userId);
            return `You opened the Rare Treasure and found ${totalGold} gold! (Base: ${baseGoldValue} + Level Bonus: ${levelBonus})`;
        }
    },
    'amulet': {
        name: 'Lucky Amulet',
        effect: '+10% quest success chance',
        value: 15,
        type: 'equipment',
        slot: EQUIPMENT_SLOTS.ACCESSORY,
        equipEffect: (userId) => ({ attack: 0, defense: 0, successChanceBonus: 0.10 })
    },
    'bandage': {
        name: 'Bandage',
        effect: 'Quick heal 2 HP',
        useDuringQuest: true, // Note: useEffect doesn't distinct for this, implies quest logic handles it
        value: 3,
        type: 'consumable',
        useEffect: (userId) => {
            const charInfo = db.prepare('SELECT currentHp, maxHp FROM characters WHERE userId = ?').get(userId);
            if (!charInfo) return "Character not found.";
            const healAmount = 2;
            const finalHp = Math.min(charInfo.maxHp, charInfo.currentHp + healAmount);
            db.prepare('UPDATE characters SET currentHp = ? WHERE userId = ?').run(finalHp, userId);
            return `Bandage healed ${healAmount} HP! (Now: ${finalHp}/${charInfo.maxHp})`;
        }
    },
    'time scroll': {
        name: 'Time Scroll',
        effect: 'Resets quest cooldown',
        value: 15,
        type: 'consumable',
        useEffect: (userId) => {
            db.prepare('UPDATE characters SET lastQuestTime = NULL WHERE userId = ?').run(userId);
            return 'The sands of time reverse! Quest cooldown reset - you can adventure again immediately!';
        }
    },
    'enchanted blade': {
        name: 'Enchanted Blade',
        effect: '+4 attack',
        value: 35,
        type: 'equipment',
        slot: EQUIPMENT_SLOTS.WEAPON,
        equipEffect: (userId) => ({ attack: 4, defense: 0 })
    },
    'dragon slayer': {
        name: 'Dragon Slayer',
        effect: '+6 attack',
        value: 60,
        type: 'equipment',
        slot: EQUIPMENT_SLOTS.WEAPON,
        equipEffect: (userId) => ({ attack: 6, defense: 0 })
    },
    'balanced dagger': {
        name: 'Balanced Dagger',
        effect: '+2 attack, +1 defense',
        value: 25,
        type: 'equipment',
        slot: EQUIPMENT_SLOTS.WEAPON,
        equipEffect: (userId) => ({ attack: 2, defense: 1 })
    },
    'staff of wisdom': {
        name: 'Staff of Wisdom',
        effect: '+3 attack, +5% quest success',
        value: 40,
        type: 'equipment',
        slot: EQUIPMENT_SLOTS.WEAPON,
        equipEffect: (userId) => ({ attack: 3, defense: 0, successChanceBonus: 0.05 })
    },
    'mythril armor': {
        name: 'Mythril Armor',
        effect: '+4 defense',
        value: 35,
        type: 'equipment',
        slot: EQUIPMENT_SLOTS.ARMOR,
        equipEffect: (userId) => ({ attack: 0, defense: 4 })
    },
    'dragon scale': {
        name: 'Dragon Scale Armor',
        effect: '+6 defense',
        value: 60,
        type: 'equipment',
        slot: EQUIPMENT_SLOTS.ARMOR,
        equipEffect: (userId) => ({ attack: 0, defense: 6 })
    },
    'agility garb': {
        name: 'Agility Garb',
        effect: '+2 defense, +5% quest success',
        value: 30,
        type: 'equipment',
        slot: EQUIPMENT_SLOTS.ARMOR,
        equipEffect: (userId) => ({ attack: 0, defense: 2, successChanceBonus: 0.05 })
    },
    'battle plating': {
        name: 'Battle Plating',
        effect: '+3 defense, +1 attack',
        value: 28,
        type: 'equipment',
        slot: EQUIPMENT_SLOTS.ARMOR,
        equipEffect: (userId) => ({ attack: 1, defense: 3 })
    },
    'hero medallion': {
        name: 'Hero Medallion',
        effect: '+15% quest success chance',
        value: 30,
        type: 'equipment',
        slot: EQUIPMENT_SLOTS.ACCESSORY,
        equipEffect: (userId) => ({ attack: 0, defense: 0, successChanceBonus: 0.15 })
    },
    'warriors band': {
        name: 'Warrior\'s Band',
        effect: '+1 attack, +1 defense',
        value: 25,
        type: 'equipment',
        slot: EQUIPMENT_SLOTS.ACCESSORY,
        equipEffect: (userId) => ({ attack: 1, defense: 1 })
    },
    'dragons eye': {
        name: 'Dragon\'s Eye',
        effect: '+20% quest success chance',
        value: 45,
        type: 'equipment',
        slot: EQUIPMENT_SLOTS.ACCESSORY,
        equipEffect: (userId) => ({ attack: 0, defense: 0, successChanceBonus: 0.20 })
    },
    'charm of balance': {
        name: 'Charm of Balance',
        effect: '+2 attack, +2 defense',
        value: 40,
        type: 'equipment',
        slot: EQUIPMENT_SLOTS.ACCESSORY,
        equipEffect: (userId) => ({ attack: 2, defense: 2 })
    },
    'greater potion': {
        name: 'Greater Health Potion',
        effect: 'Heal 10 HP', // Value used in logic
        value: 8,
        type: 'consumable',
        useEffect: (userId) => {
            const charInfo = db.prepare('SELECT currentHp, maxHp, restUntil FROM characters WHERE userId = ?').get(userId);
            if (!charInfo) return "Character not found.";
            const healAmount = 10;
            let finalHp;
            let message;

            if (charInfo.restUntil) {
                finalHp = Math.min(charInfo.maxHp, 1 + healAmount);
                db.prepare('UPDATE characters SET currentHp = ?, restUntil = NULL WHERE userId = ?').run(finalHp, userId);
                message = `You used a Greater Health Potion while resting and fully recovered! Your HP is now ${finalHp}/${charInfo.maxHp}.`;
            } else {
                finalHp = Math.min(charInfo.maxHp, charInfo.currentHp + healAmount);
                db.prepare('UPDATE characters SET currentHp = ? WHERE userId = ?').run(finalHp, userId);
                message = `You used a Greater Health Potion and recovered ${healAmount} HP! (HP: ${finalHp}/${charInfo.maxHp})`;
            }
            return message;
        }
    },
    'elixir': {
        name: 'Elixir of Restoration',
        effect: 'Full heal',
        value: 25,
        type: 'consumable',
        useEffect: (userId) => {
            const charInfo = db.prepare('SELECT maxHp, restUntil FROM characters WHERE userId = ?').get(userId);
            if (!charInfo) return "Character not found.";

            db.prepare('UPDATE characters SET currentHp = maxHp, restUntil = NULL WHERE userId = ?').run(userId);
            if (charInfo.restUntil) {
                return `You used an Elixir while resting and fully recovered from unconsciousness! Your HP is now ${charInfo.maxHp}/${charInfo.maxHp}!`;
            } else {
                return `You used an Elixir of Restoration and fully recovered! (HP: ${charInfo.maxHp}/${charInfo.maxHp})`;
            }
        }
    },
    'combat scroll': {
        name: 'Combat Scroll',
        effect: 'Temp +2 attack next quest',
        value: 10,
        type: 'consumable',
        useDuringQuest: false, // Means it's used before a quest starts
        useEffect: (userId) => {
            // Stacks if multiple are used before a quest. If it should not stack, use `SET temp_attack_buff = 2`
            db.prepare('UPDATE characters SET temp_attack_buff = temp_attack_buff + 2 WHERE userId = ?').run(userId);
            return `You activate the Combat Scroll! Your next quest's attack will be empowered.`;
        }
    },
    'damage charm': {
        name: 'Damage Charm',
        effect: 'Deal 3 damage to enemies', // Actual effect needs to be handled in quest logic
        value: 8,
        type: 'consumable',
        useDuringQuest: true,
        useEffect: (userId) => {
            return `You crush the Damage Charm, ready to unleash its energy! (Effect applies in combat if supported)`;
        }
    },
    'legendary treasure': {
        name: 'Legendary Treasure',
        effect: 'Sell for massive gold',
        value: 20, // Base shop value
        type: 'consumable',
        useEffect: (userId) => {
            const baseGoldValue = 20;
            const char = db.prepare('SELECT level FROM characters WHERE userId = ?').get(userId);
            if (!char) return "Character not found.";

            const levelBonus = Math.floor(char.level * 1.5);
            const totalGold = baseGoldValue + levelBonus;
            db.prepare('UPDATE wallets SET coinWallet = coinWallet + ? WHERE userId = ?').run(totalGold, userId);
            return `You unveiled the Legendary Treasure, gaining ${totalGold} gold! (Base: ${baseGoldValue} + Level Bonus: ${levelBonus})`;
        }
    },
    'enhancement stone': {
        name: 'Enhancement Stone',
        effect: '+5% perm quest success (one time use)',
        value: 40,
        type: 'consumable',
        useEffect: (userId) => {
            const charStatus = db.prepare('SELECT has_used_enhancement_stone FROM characters WHERE userId = ?').get(userId);
            if (!charStatus) return "Character not found.";

            if (charStatus.has_used_enhancement_stone) {
                return 'You have already absorbed an Enhancement Stone. Its power cannot be stacked.';
            } else {
                db.prepare('UPDATE characters SET questSuccessChance = questSuccessChance + 5, has_used_enhancement_stone = 1 WHERE userId = ?').run(userId);
                return `You crush the Enhancement Stone, absorbing its power! You permanently gain +5% quest success chance! This power is now part of you.`;
            }
        }
    },
    'scholar ring': {
        name: "Scholar's Ring",
        effect: '+20% XP gain from quests',
        value: 40,
        type: 'equipment',
        slot: EQUIPMENT_SLOTS.ACCESSORY,
        equipEffect: (userId) => ({ xpBoost: 0.20 })
    },

    'tome of knowledge': {
        name: 'Tome of Knowledge',
        effect: 'Grants 500 XP',
        value: 50,
        type: 'consumable',
        useEffect: (userId) => {
            // Add the XP
            db.prepare('UPDATE characters SET exp = exp + 500 WHERE userId = ?').run(userId);

            // Check for level up (same as in questing)
            const upMsg = checkLevelUp(userId);
            let response = 'Studying the Tome grants 500 XP!';

            if (upMsg) {
                // If leveled up, add the level up message
                response += `\n${upMsg}`;
            } else {
                // Otherwise show progress to next level
                const updatedChar = db.prepare('SELECT level, exp FROM characters WHERE userId = ?').get(userId);
                const needed = calculateExpForLevel(updatedChar.level);
                const pct = Math.floor(updatedChar.exp / needed * 100);
                response += `\nLv ${updatedChar.level}: ${pct}% (${needed - updatedChar.exp} XP to next)`;
            }

            return response;
        }
    },

    // New high-tier weapons
    'celestial blade': {
        name: 'Celestial Blade',
        effect: '+8 attack, +5% quest success',
        value: 85,
        type: 'equipment',
        slot: EQUIPMENT_SLOTS.WEAPON,
        equipEffect: (userId) => ({ attack: 8, defense: 0, successChanceBonus: 0.05 })
    },
    'void reaver': {
        name: 'Void Reaver',
        effect: '+10 attack',
        value: 100,
        type: 'equipment',
        slot: EQUIPMENT_SLOTS.WEAPON,
        equipEffect: (userId) => ({ attack: 10, defense: 0 })
    },
    'equilibrium edge': {
        name: 'Equilibrium Edge',
        effect: '+6 attack, +3 defense',
        value: 95,
        type: 'equipment',
        slot: EQUIPMENT_SLOTS.WEAPON,
        equipEffect: (userId) => ({ attack: 6, defense: 3 })
    },

    // New high-tier armor
    'celestial plate': {
        name: 'Celestial Plate',
        effect: '+8 defense, +5% quest success',
        value: 85,
        type: 'equipment',
        slot: EQUIPMENT_SLOTS.ARMOR,
        equipEffect: (userId) => ({ attack: 0, defense: 8, successChanceBonus: 0.05 })
    },
    'void guardian': {
        name: 'Void Guardian',
        effect: '+10 defense',
        value: 100,
        type: 'equipment',
        slot: EQUIPMENT_SLOTS.ARMOR,
        equipEffect: (userId) => ({ attack: 0, defense: 10 })
    },
    'equilibrium shell': {
        name: 'Equilibrium Shell',
        effect: '+3 attack, +6 defense',
        value: 95,
        type: 'equipment',
        slot: EQUIPMENT_SLOTS.ARMOR,
        equipEffect: (userId) => ({ attack: 3, defense: 6 })
    },

    // New high-tier accessories
    'celestial emblem': {
        name: 'Celestial Emblem',
        effect: '+30% quest success chance',
        value: 80,
        type: 'equipment',
        slot: EQUIPMENT_SLOTS.ACCESSORY,
        equipEffect: (userId) => ({ attack: 0, defense: 0, successChanceBonus: 0.30 })
    },
    'legendary catalyst': {
        name: 'Legendary Catalyst',
        effect: '+35% XP gain from quests',
        value: 75,
        type: 'equipment',
        slot: EQUIPMENT_SLOTS.ACCESSORY,
        equipEffect: (userId) => ({ xpBoost: 0.35 })
    },
    'grand totem': {
        name: 'Grand Totem',
        effect: '+3 attack, +3 defense, +10% quest success',
        value: 90,
        type: 'equipment',
        slot: EQUIPMENT_SLOTS.ACCESSORY,
        equipEffect: (userId) => ({ attack: 3, defense: 3, successChanceBonus: 0.10 })
    },
    'relic of the ancients': {
        name: 'Relic of the Ancients',
        effect: '+4 attack, +4 defense, +15% XP gain',
        value: 110,
        type: 'equipment',
        slot: EQUIPMENT_SLOTS.ACCESSORY,
        equipEffect: (userId) => ({ attack: 4, defense: 4, xpBoost: 0.15 })
    },
    'combat catalyst': {
        name: 'Combat Catalyst',
        effect: 'Temp +4 attack next quest',
        value: 25,
        type: 'consumable',
        useDuringQuest: false,
        useEffect: (userId) => {
            db.prepare('UPDATE characters SET temp_attack_buff = temp_attack_buff + 4 WHERE userId = ?').run(userId);
            return `You activate the Combat Catalyst! Your next quest's attack will be significantly empowered.`;
        }
    },
    'ancient wisdom': {
        name: 'Ancient Wisdom',
        effect: 'Grants 1500 XP',
        value: 100,
        type: 'consumable',
        useEffect: (userId) => {
            db.prepare('UPDATE characters SET exp = exp + 1500 WHERE userId = ?').run(userId);

            const upMsg = checkLevelUp(userId);
            let response = 'The Ancient Wisdom fills your mind! You gain 1500 XP!';

            if (upMsg) {
                response += `\n${upMsg}`;
            } else {
                const updatedChar = db.prepare('SELECT level, exp FROM characters WHERE userId = ?').get(userId);
                const needed = calculateExpForLevel(updatedChar.level);
                const pct = Math.floor(updatedChar.exp / needed * 100);
                response += `\nLv ${updatedChar.level}: ${pct}% (${needed - updatedChar.exp} XP to next)`;
            }

            return response;
        }
    },
    'scroll of enhancement': {
        name: 'Scroll of Enhancement',
        effect: '+7% perm quest success (one time use)',
        value: 200,
        type: 'consumable',
        useEffect: (userId) => {
            const charStatus = db.prepare('SELECT has_used_scroll_enhancement FROM characters WHERE userId = ?').get(userId);
            if (!charStatus) return "Character not found."; // Added charStatus check

            if (charStatus.has_used_scroll_enhancement) {
                return 'You have already used a Scroll of Enhancement. Its power cannot be used again.';
            } else {
                db.prepare('UPDATE characters SET questSuccessChance = questSuccessChance + 7, has_used_scroll_enhancement = 1 WHERE userId = ?').run(userId);
                return `The ancient scroll bursts into magical flames as you read it! You permanently gain +7% quest success chance!`;
            }
        }
    }, 'cursed milk': {
        name: 'Cursed Milk',
        effect: 'WARNING: Permanently deletes character!',
        value: 42069,
        type: 'consumable',
        useEffect: (userId) => {
            const success = deleteCharacterCompletely(userId);
            if (success) {
                return `💀 The cursed milk burns as it goes down... Your character has been permanently deleted! All progress, items, and gold have been lost. You'll need to start over completely. The curse has claimed another victim... 💀`;
            } else {
                return `💀 The cursed milk feels strange... something went wrong with the deletion process. Please try again or contact support. 💀`;
            }
        }
    }
};



function initializeDatabase() {
    db.prepare(`
        CREATE TABLE IF NOT EXISTS equipment (
            userId TEXT PRIMARY KEY,
            weapon TEXT DEFAULT NULL,
            armor TEXT DEFAULT NULL,
            accessory TEXT DEFAULT NULL
        )
    `).run();

    const columnsToAdd = [
        { name: 'questSuccessChance', type: 'INTEGER DEFAULT 0' },
        { name: 'temp_attack_buff', type: 'INTEGER DEFAULT 0' },
        { name: 'has_used_enhancement_stone', type: 'BOOLEAN DEFAULT 0' },
        // Add this new line for the scroll enhancement column
        { name: 'has_used_scroll_enhancement', type: 'BOOLEAN DEFAULT 0' }
    ];
    columnsToAdd.forEach(column => {
        try {
            db.prepare(`ALTER TABLE characters ADD COLUMN ${column.name} ${column.type}`).run();
            console.log(`Column '${column.name}' added to 'characters' table.`);
        } catch (e) {
            if (!e.message.toLowerCase().includes("duplicate column name")) {
                console.error(`Error adding column ${column.name}: ${e.message}`);
            } else {
                // console.log(`Column '${column.name}' already exists in 'characters' table.`);
            }
        }
    });
}

initializeDatabase();

function giveItem(userId, itemId, quantity) {
    const checkStmt = db.prepare('SELECT quantity FROM inventory WHERE userId = ? AND itemId = ?');
    const existing = checkStmt.get(userId, itemId);

    if (existing) {
        const updateStmt = db.prepare('UPDATE inventory SET quantity = quantity + ? WHERE userId = ? AND itemId = ?');
        updateStmt.run(quantity, userId, itemId);
    } else {
        const insertStmt = db.prepare('INSERT INTO inventory (userId, itemId, quantity) VALUES (?, ?, ?)');
        insertStmt.run(userId, itemId, quantity);
    }
}

function removeItem(userId, itemId, quantity) {
    const updateStmt = db.prepare('UPDATE inventory SET quantity = quantity - ? WHERE userId = ? AND itemId = ?');
    updateStmt.run(quantity, userId, itemId);
    db.prepare('DELETE FROM inventory WHERE userId = ? AND itemId = ? AND quantity <= 0').run(userId, itemId);
}

function viewInventory(userId) {
    const inventory = db.prepare('SELECT itemId, quantity FROM inventory WHERE userId = ?').all(userId);
    const equipmentItems = [];
    const consumableItems = [];

    inventory.forEach(item => {
        const itemInfo = ITEMS[item.itemId];
        if (!itemInfo) return;
        const itemDisplay = `${itemInfo.name} (${itemInfo.effect}) x${item.quantity}`;
        if (itemInfo.type === 'equipment') equipmentItems.push(itemDisplay);
        else consumableItems.push(itemDisplay);
    });

    let response = "Inventory:";
    if (inventory.length === 0) response += " Empty! Visit the shop with 'shop' command.";
    else {
        if (equipmentItems.length > 0) response += `\nEquipment: ${equipmentItems.join(", ")}`;
        if (consumableItems.length > 0) response += `\nConsumables: ${consumableItems.join(", ")}`;
    }

    const equipped = getEquippedItems(userId);
    response += "\n\nEquipped:";
    response += `\n- Weapon: ${equipped && equipped.weapon ? ITEMS[equipped.weapon].name : 'None'}`;
    response += `\n- Armor: ${equipped && equipped.armor ? ITEMS[equipped.armor].name : 'None'}`;
    response += `\n- Accessory: ${equipped && equipped.accessory ? ITEMS[equipped.accessory].name : 'None'}`;
    return response;
}

function ensureEquipmentRecord(userId) {
    const existing = db.prepare('SELECT userId FROM equipment WHERE userId = ?').get(userId);
    if (!existing) {
        db.prepare('INSERT INTO equipment (userId) VALUES (?)').run(userId);
    }
}

function getEquippedItems(userId) {
    ensureEquipmentRecord(userId);
    return db.prepare('SELECT weapon, armor, accessory FROM equipment WHERE userId = ?').get(userId);
}

function equipItem(userId, itemName) {
    let itemIdToEquip = null;
    const inventory = db.prepare('SELECT itemId, quantity FROM inventory WHERE userId = ?').all(userId);

    for (const ownedItem of inventory) {
        const itemDef = ITEMS[ownedItem.itemId];
        if (itemDef && itemDef.type === 'equipment' &&
            (ownedItem.itemId.toLowerCase().includes(itemName.toLowerCase()) || itemDef.name.toLowerCase().includes(itemName.toLowerCase()))) {
            itemIdToEquip = ownedItem.itemId;
            break;
        }
    }

    if (!itemIdToEquip) {
        // Check if itemName itself is a valid equipment itemId (for cases where item might not be in inventory but is a known item)
        let foundItemDef = null;
        for (const id of Object.keys(ITEMS)) {
            if (ITEMS[id].type === 'equipment' && (id.toLowerCase().includes(itemName.toLowerCase()) || ITEMS[id].name.toLowerCase().includes(itemName.toLowerCase()))) {
                foundItemDef = ITEMS[id];
                break; // Found a potential match by name, now verify if it's in inventory
            }
        }
        if (foundItemDef) {
            return `You don't have a "${foundItemDef.name}" in your inventory. Type 'inv' to see your items.`;
        }
        return `No equipment named "${itemName}" found or you don't own it. Type 'inv' to see your inventory.`;
    }


    const item = ITEMS[itemIdToEquip];
    const slot = item.slot;
    ensureEquipmentRecord(userId);

    const currentEquipment = db.prepare(`SELECT ${slot} FROM equipment WHERE userId = ?`).get(userId);
    let message = "";
    if (currentEquipment && currentEquipment[slot]) {
        const oldItemId = currentEquipment[slot];
        giveItem(userId, oldItemId, 1); // Return old item to inventory
        message = `Unequipped ${ITEMS[oldItemId].name}. `;
    }

    db.prepare(`UPDATE equipment SET ${slot} = ? WHERE userId = ?`).run(itemIdToEquip, userId);
    removeItem(userId, itemIdToEquip, 1); // Remove equipped item from inventory
    return `${message}Equipped ${item.name} in ${slot} slot.`;
}

function unequipItem(userId, slotName) {
    let slotToUnequip = null;
    if (slotName.toLowerCase().includes('weapon')) slotToUnequip = EQUIPMENT_SLOTS.WEAPON;
    else if (slotName.toLowerCase().includes('armor')) slotToUnequip = EQUIPMENT_SLOTS.ARMOR;
    else if (slotName.toLowerCase().includes('accessory')) slotToUnequip = EQUIPMENT_SLOTS.ACCESSORY;

    if (!slotToUnequip) return `Invalid slot. Use 'weapon', 'armor', or 'accessory'.`;

    ensureEquipmentRecord(userId);
    const equipment = db.prepare(`SELECT ${slotToUnequip} FROM equipment WHERE userId = ?`).get(userId);

    if (!equipment || !equipment[slotToUnequip]) return `Nothing equipped in ${slotToUnequip} slot.`;

    const itemId = equipment[slotToUnequip];
    giveItem(userId, itemId, 1); // Return item to inventory
    db.prepare(`UPDATE equipment SET ${slotToUnequip} = NULL WHERE userId = ?`).run(userId);
    return `Unequipped ${ITEMS[itemId].name} from ${slotToUnequip} slot.`;
}

// It's assumed ensureCharacterExists is defined elsewhere and ensures the character row exists.
function useItem(userId, itemName, checkGoldWallet, ensureCharacterExists) {
    if (typeof ensureCharacterExists === 'function') { // check if it's passed and is a function
        ensureCharacterExists(userId); // Call it if available
    } else {
        // Fallback or error if ensureCharacterExists is critical and not provided
        // For this example, we'll proceed cautiously.
        // console.warn("ensureCharacterExists function not provided to useItem.");
    }


    if (!itemName) return "Specify an item to use. Type 'inv' to see your inventory.";

    let itemIdToUse = null;
    const inventory = db.prepare('SELECT itemId, quantity FROM inventory WHERE userId = ?').all(userId);

    for (const ownedItem of inventory) {
        const itemDef = ITEMS[ownedItem.itemId];
        if (itemDef && (ownedItem.itemId.toLowerCase().includes(itemName.toLowerCase()) || itemDef.name.toLowerCase().includes(itemName.toLowerCase()))) {
            if (ownedItem.quantity > 0) {
                itemIdToUse = ownedItem.itemId;
                break;
            }
        }
    }

    if (!itemIdToUse) {
        return `You don't have an item matching "${itemName}" in your inventory. Type 'inv' to see your items.`;
    }

    const item = ITEMS[itemIdToUse];

    if (item.type === 'equipment') {
        return equipItem(userId, itemName); // Pass original itemName for equipItem's search logic
    }

    if (item.type === 'consumable') {
        const result = item.useEffect(userId);
        removeItem(userId, itemIdToUse, 1); // Consume the item
        return result;
    }

    return `Item "${item.name}" is not usable in this way.`;
}


// In items.js - Update calculateCombatStats
function calculateCombatStats(userId, consumeBuffs = false) {
    let combatModifiers = {
        extraAttack: 0,
        extraDefense: 0,
        successChanceBonus: 0,
        tempAttackBonus: 0,
        xpBoost: 0, // New XP boost property
    };

    // Equipment effects
    const equipment = getEquippedItems(userId);
    if (equipment) {
        for (const slot of Object.values(EQUIPMENT_SLOTS)) {
            if (equipment[slot]) {
                const item = ITEMS[equipment[slot]];
                if (item?.equipEffect) {
                    const effects = item.equipEffect(userId);
                    combatModifiers.extraAttack += effects.attack || 0;
                    combatModifiers.extraDefense += effects.defense || 0;
                    combatModifiers.successChanceBonus += effects.successChanceBonus || 0;
                    combatModifiers.xpBoost += effects.xpBoost || 0; // Add XP boost
                }
            }
        }
    }


    const charDbData = db.prepare('SELECT questSuccessChance, temp_attack_buff FROM characters WHERE userId = ?').get(userId);
    if (charDbData) {
        if (charDbData.questSuccessChance > 0) {
            combatModifiers.successChanceBonus += (charDbData.questSuccessChance / 100.0);
        }
        if (charDbData.temp_attack_buff > 0) {
            combatModifiers.tempAttackBonus = charDbData.temp_attack_buff;
        }

        if (consumeBuffs) {
            if (charDbData.temp_attack_buff > 0) {
                db.prepare('UPDATE characters SET temp_attack_buff = 0 WHERE userId = ?').run(userId);
            }
            // consume other temp buffs here
        }
    }
    return combatModifiers;
}

export {
    ITEMS,
    EQUIPMENT_SLOTS,
    giveItem,
    removeItem,
    viewInventory,
    useItem,
    equipItem,
    unequipItem,
    getEquippedItems,
    calculateCombatStats,
    initializeDatabase // Export if you want to call it explicitly from outside
};