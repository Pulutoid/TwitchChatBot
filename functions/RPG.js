// Fixed table creation - move column checks AFTER table creation
import Database from 'better-sqlite3';
import droll from 'droll';
import { MONSTERS, getMonsterForLevel, RAID_BOSSES } from './monsters.js';
import { shopItems } from './shop.js';
import { viewInventory, useItem, removeItem, giveItem, calculateCombatStats } from './items.js';

const db = new Database('rpg.db');
db.pragma('journal_mode = WAL');

// Create all tables FIRST before checking for columns
db.prepare(`
    CREATE TABLE IF NOT EXISTS wallets (
        userId TEXT PRIMARY KEY,
        coinWallet INTEGER NOT NULL DEFAULT 0,
        lastCollectedDay TEXT
    )
`).run();

db.prepare(`
    CREATE TABLE IF NOT EXISTS characters (
        userId TEXT PRIMARY KEY,
        level INTEGER DEFAULT 1,
        exp INTEGER DEFAULT 0,
        maxHp INTEGER DEFAULT 5,
        currentHp INTEGER DEFAULT 5,
        attack INTEGER DEFAULT 1,
        defense INTEGER DEFAULT 0,
        lastQuestTime TEXT DEFAULT NULL,
        restUntil TEXT DEFAULT NULL
    )
`).run();

db.prepare(`
    CREATE TABLE IF NOT EXISTS inventory (
        userId TEXT NOT NULL,
        itemId TEXT NOT NULL,
        quantity INTEGER DEFAULT 1,
        PRIMARY KEY (userId, itemId)
    )
`).run();

db.prepare(`
    CREATE TABLE IF NOT EXISTS duel_challenges (
        challengerId TEXT NOT NULL,
        defenderId TEXT NOT NULL,
        requestTime TEXT NOT NULL,
        PRIMARY KEY (challengerId, defenderId)
    )
`).run();

// Add any other tables you might need
db.prepare(`
    CREATE TABLE IF NOT EXISTS equipment (
        userId TEXT NOT NULL,
        itemId TEXT NOT NULL,
        quantity INTEGER DEFAULT 1,
        PRIMARY KEY (userId, itemId)
    )
`).run();

db.prepare(`
    CREATE TABLE IF NOT EXISTS shop_purchases (
        userId TEXT NOT NULL,
        itemId TEXT NOT NULL,
        purchaseTime TEXT NOT NULL,
        quantity INTEGER DEFAULT 1
    )
`).run();

// NOW check for missing columns and add them if needed
const cols = db.prepare("PRAGMA table_info(characters);").all();

if (!cols.some(c => c.name === 'lastQuestTime')) {
    db.prepare("ALTER TABLE characters ADD COLUMN lastQuestTime TEXT DEFAULT NULL;").run();
}

if (!cols.some(c => c.name === 'restUntil')) {
    db.prepare("ALTER TABLE characters ADD COLUMN restUntil TEXT DEFAULT NULL;").run();
}

export { db };

export function deleteCharacterCompletely(userId) {
    try {
        // Delete from all tables in the correct order to avoid foreign key issues
        db.prepare('DELETE FROM duel_challenges WHERE challengerId = ? OR defenderId = ?').run(userId, userId);
        db.prepare('DELETE FROM inventory WHERE userId = ?').run(userId);
        db.prepare('DELETE FROM characters WHERE userId = ?').run(userId);
        db.prepare('DELETE FROM wallets WHERE userId = ?').run(userId);
        db.prepare('DELETE FROM equipment WHERE userId = ?').run(userId);
        db.prepare('DELETE FROM shop_purchases WHERE userId = ?').run(userId);

        // If you have an equipment table, uncomment this:
        // db.prepare('DELETE FROM equipment WHERE userId = ?').run(userId);

        console.log(`Character ${userId} completely deleted from all tables`);
        return true;
    } catch (error) {
        console.error('Error deleting character:', error);
        return false;
    }
}

export default function RPG(subCommand, chatterName) {
    let output = "type kloy rpg help for commands";

    console.log(`chatter name is ${chatterName}`);

    // Parse the command
    const args = subCommand.toLowerCase().split(' ');
    const command = args[0];
    const param = args.slice(1).join(' ');

    // Process simple commands
    if (command.startsWith("wallet") || command.startsWith("gold")) {
        output = `Your gold: ${checkGoldWallet(chatterName)}`;
    }
    else if (command.startsWith("checkin") || command.startsWith("check") || command.startsWith("daily")) {
        output = `[daily bonus is part of questing now]`;
    }
    else if (command.startsWith("char") || command.startsWith("character")) {
        output = checkCharacter(chatterName);
    }
    else if (command.startsWith("quest") || command.startsWith("adventure")) {
        output = questing(chatterName);
    }
    else if (command.startsWith("inv") || command.startsWith("inventory")) {
        output = viewInventory(chatterName);
    }
    else if (command.startsWith("shop") || command.startsWith("buy")) {
        output = shopItems(chatterName, param, checkGoldWallet, ensureCharacterExists);
    }
    else if (command.startsWith("use")) {
        output = useItem(chatterName, param, checkGoldWallet, ensureCharacterExists);
    }
    else if (command.startsWith("exp") || command.startsWith("xp") || command.startsWith("progress")) {
        output = expProgress(chatterName);
    }
    else if (command.startsWith("help")) {
        output = "Commands: quest (adventure & collect daily gold bonus), char (view character), inv (check inventory), wallet (check gold), shop (buy items), use [item], exp (show progress)";
    }
    else if (command.startsWith("duel")) {
        output = handleDuel(chatterName, param);
    }
    else if (command.startsWith("raid")) {
        // output = handleRaid(chatterName);
        output = ` go play wow or something !buh `
    }

    return output;
}

// Make sure a character exists for this user
function ensureCharacterExists(userId) {
    const stmt = db.prepare('SELECT userId FROM characters WHERE userId = ?');
    const character = stmt.get(userId);

    if (!character) {
        // Create a new character with default stats
        const insertStmt = db.prepare(`
            INSERT INTO characters (userId)
            VALUES (?)
        `);
        insertStmt.run(userId);
    }
}

function calculateDailyGold() {
    let amountOfGoldToAdd = droll.roll("2d4".replace(" ", ""));

    console.log(amountOfGoldToAdd);
    // Roll the dice
    let roll1 = amountOfGoldToAdd.rolls[0];  // First roll
    let roll2 = amountOfGoldToAdd.rolls[1];  // Second roll
    let modifierValue = amountOfGoldToAdd.modifier || 0;
    let total = roll1 + roll2 + modifierValue;

    // Output as a sentence
    let goldCalculationMessage = `You also received a daily quest bonus of ${total} gold! (Rolled: ${roll1} + ${roll2})`;

    return { totalGoldToAdd: total, message: goldCalculationMessage };
}
// Implement the duel handling function
function handleDuel(userId, param) {
    ensureCharacterExists(userId);

    // Parse the command parameters
    const parts = param.trim().split(' ');

    // If no parameters or first param is "help", show help
    if (!param || parts[0] === "help") {
        return "Duel Commands: 'duel [player]' to challenge, 'duel accept [player]' to accept, 'duel reject [player]' to decline, 'duel cancel [player]' to cancel challenge";
    }

    // Check for sub-commands
    if (parts[0] === "accept") {
        return acceptDuel(userId, parts[1]);
    } else if (parts[0] === "reject") {
        return rejectDuel(userId, parts[1]);
    } else if (parts[0] === "cancel") {
        return cancelDuel(userId, parts[1]);
    }

    // If we reach here, it's a duel challenge to another player
    const targetPlayer = param.trim();

    // Prevent self-duels
    if (targetPlayer.toLowerCase() === userId.toLowerCase()) {
        return "You can't duel yourself!";
    }

    // Check if target player exists
    const targetCheck = db.prepare('SELECT userId FROM characters WHERE userId = ?').get(targetPlayer);
    if (!targetCheck) {
        return `Player "${targetPlayer}" doesn't exist in the RPG system.`;
    }

    // Check if player is already in a duel challenge
    const existingChallenge = db.prepare(
        'SELECT * FROM duel_challenges WHERE (challengerId = ? AND defenderId = ?) OR (challengerId = ? AND defenderId = ?)'
    ).get(userId, targetPlayer, targetPlayer, userId);

    if (existingChallenge) {
        if (existingChallenge.challengerId === userId) {
            return `You've already challenged ${targetPlayer} to a duel. Wait for them to respond or use 'duel cancel ${targetPlayer}'.`;
        } else {
            return `${targetPlayer} has already challenged you to a duel! Use 'duel accept ${targetPlayer}' to accept or 'duel reject ${targetPlayer}' to decline.`;
        }
    }

    // Create a new duel challenge
    const now = new Date().toISOString();
    db.prepare('INSERT INTO duel_challenges (challengerId, defenderId, requestTime) VALUES (?, ?, ?)')
        .run(userId, targetPlayer, now);

    return `You challenged ${targetPlayer} to a friendly duel! They can accept with 'duel accept ${userId}' or decline with 'duel reject ${userId}'.`;
}

function acceptDuel(userId, challengerId) {
    if (!challengerId) {
        return "Please specify who's duel challenge you want to accept.";
    }

    // Check if the challenge exists
    const challenge = db.prepare(
        'SELECT * FROM duel_challenges WHERE challengerId = ? AND defenderId = ?'
    ).get(challengerId, userId);

    if (!challenge) {
        return `No duel challenge from ${challengerId} found.`;
    }

    // Remove the challenge
    db.prepare('DELETE FROM duel_challenges WHERE challengerId = ? AND defenderId = ?')
        .run(challengerId, userId);

    // Execute the duel
    return executeDuel(challengerId, userId);
}

function rejectDuel(userId, challengerId) {
    if (!challengerId) {
        return "Please specify who's duel challenge you want to reject.";
    }

    // Check if the challenge exists
    const challenge = db.prepare(
        'SELECT * FROM duel_challenges WHERE challengerId = ? AND defenderId = ?'
    ).get(challengerId, userId);

    if (!challenge) {
        return `No duel challenge from ${challengerId} found.`;
    }

    // Remove the challenge
    db.prepare('DELETE FROM duel_challenges WHERE challengerId = ? AND defenderId = ?')
        .run(challengerId, userId);

    return `You declined the duel challenge from ${challengerId}.`;
}

function cancelDuel(userId, defenderId) {
    if (!defenderId) {
        return "Please specify which duel challenge you want to cancel.";
    }

    // Check if the challenge exists
    const challenge = db.prepare(
        'SELECT * FROM duel_challenges WHERE challengerId = ? AND defenderId = ?'
    ).get(userId, defenderId);

    if (!challenge) {
        return `You don't have an active duel challenge with ${defenderId}.`;
    }

    // Remove the challenge
    db.prepare('DELETE FROM duel_challenges WHERE challengerId = ? AND defenderId = ?')
        .run(userId, defenderId);

    return `You cancelled your duel challenge to ${defenderId}.`;
}

function executeDuel(challenger, defender) {
    // Get challenger stats
    const challengerData = db.prepare('SELECT level, attack, defense, currentHp, maxHp FROM characters WHERE userId = ?')
        .get(challenger);

    // Get defender stats
    const defenderData = db.prepare('SELECT level, attack, defense, currentHp, maxHp FROM characters WHERE userId = ?')
        .get(defender);

    // Calculate combat modifiers for both players
    const challengerMods = calculateCombatStats(challenger, false); // Don't consume buffs
    const defenderMods = calculateCombatStats(defender, false); // Don't consume buffs

    // Calculate effective stats
    const challengerAttack = challengerData.attack + challengerMods.extraAttack + challengerMods.tempAttackBonus;
    const challengerDefense = challengerData.defense + challengerMods.extraDefense;
    const defenderAttack = defenderData.attack + defenderMods.extraAttack + defenderMods.tempAttackBonus;
    const defenderDefense = defenderData.defense + defenderMods.extraDefense;

    // Calculate health factors
    const challengerHealthFactor = challengerData.currentHp / challengerData.maxHp;
    const defenderHealthFactor = defenderData.currentHp / defenderData.maxHp;

    // Build display strings with temp buff indicators
    const challengerAttackDisplay = `${challengerAttack}${challengerMods.tempAttackBonus > 0 ? '*' : ''}`;
    const challengerDefenseDisplay = `${challengerDefense}`;
    const defenderAttackDisplay = `${defenderAttack}${defenderMods.tempAttackBonus > 0 ? '*' : ''}`;
    const defenderDefenseDisplay = `${defenderDefense}`;

    // Calculate power ratios
    // Attack effectiveness vs opponent defense
    const challengerPower = challengerAttack / (defenderDefense + 5);
    const defenderPower = defenderAttack / (challengerDefense + 5);

    // Apply health factors to power
    const challengerAdjustedPower = challengerPower * (0.5 + (challengerHealthFactor * 0.5));
    const defenderAdjustedPower = defenderPower * (0.5 + (defenderHealthFactor * 0.5));

    // Calculate win probability based on adjusted power
    const totalPower = challengerAdjustedPower + defenderAdjustedPower;
    const challengerWinProb = challengerAdjustedPower / totalPower;

    // Add some randomness to make duels interesting 
    // Range from 0.75x to 1.25x of calculated probability
    const randomFactor = 0.75 + (Math.random() * 0.5);
    const adjustedWinProb = Math.min(0.9, Math.max(0.1, challengerWinProb * randomFactor));

    // Determine winner
    const roll = Math.random();
    const challengerWins = roll < adjustedWinProb;

    // Create combat log
    let combatLog = `Duel: ${challenger} vs ${defender}\n`;
    combatLog += `${challenger} (L${challengerData.level} | ATK:${challengerAttackDisplay}/DEF:${challengerDefenseDisplay} | HP:${challengerData.currentHp}/${challengerData.maxHp})\n`;
    combatLog += `${defender} (L${defenderData.level} | ATK:${defenderAttackDisplay}/DEF:${defenderDefenseDisplay} | HP:${defenderData.currentHp}/${defenderData.maxHp})\n`;

    // Roll details
    const winProbPercent = Math.round(adjustedWinProb * 100);
    combatLog += `[Roll: ${Math.round(roll * 100)}/${winProbPercent}] `;

    // Result
    if (challengerWins) {
        combatLog += `${challenger} wins the duel!`;
    } else {
        combatLog += `${defender} wins the duel!`;
    }

    // This is just a friendly duel - no HP loss or rewards
    combatLog += "\n(Friendly duel - no HP loss or rewards)";

    return combatLog;
}

function checkDailyGoldEligibility(userId) {
    const currentDay = new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'

    const selectStmt = db.prepare('SELECT lastCollectedDay FROM wallets WHERE userId = ?');
    const user = selectStmt.get(userId);

    if (!user) {
        // New user, eligible for daily gold
        return { eligible: true, firstTime: true };
    } else if (user.lastCollectedDay !== currentDay) {
        // Existing user who hasn't collected today
        return { eligible: true, firstTime: false };
    } else {
        // Already collected today
        return { eligible: false, firstTime: false };
    }
}

function addDailyGoldBonus(userId) {
    const currentDay = new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'
    const eligibility = checkDailyGoldEligibility(userId);

    if (!eligibility.eligible) {
        return { bonusGiven: false, message: "" };
    }

    const goldBonus = calculateDailyGold();

    if (eligibility.firstTime) {
        // New user - insert record
        const insertStmt = db.prepare(`
            INSERT INTO wallets (userId, coinWallet, lastCollectedDay)
            VALUES (?, ?, ?)
        `);
        insertStmt.run(userId, goldBonus.totalGoldToAdd, currentDay);
    } else {
        // Existing user - update record
        const updateStmt = db.prepare(`
            UPDATE wallets
            SET coinWallet = coinWallet + ?,
                lastCollectedDay = ?
            WHERE userId = ?
        `);
        updateStmt.run(goldBonus.totalGoldToAdd, currentDay, userId);
    }

    return {
        bonusGiven: true,
        message: `\n${goldBonus.message}`,
        amount: goldBonus.totalGoldToAdd,
        isNewUser: eligibility.firstTime
    };
}

function checkGoldWallet(userId) {
    const selectStmt = db.prepare('SELECT coinWallet FROM wallets WHERE userId = ?');
    const user = selectStmt.get(userId);

    if (user) {
        console.log(`chatter wallet is ${user.coinWallet}`);
        return user.coinWallet; // Return the current amount of gold in the wallet
    } else {
        // Ensure wallet exists
        const insertStmt = db.prepare(`
            INSERT OR IGNORE INTO wallets (userId, coinWallet, lastCollectedDay)
            VALUES (?, 0, NULL)
        `);
        insertStmt.run(userId);
        return 0; // Return 0 if the user doesn't exist in the database
    }
}



function checkCharacter(userId) {
    ensureCharacterExists(userId);
    // Fetch once
    const character = db.prepare('SELECT * FROM characters WHERE userId = ?').get(userId);

    // Get equipment bonuses
    const combatModifiers = calculateCombatStats(userId, false); // false = don't consume buffs

    let restingInfo = '';
    if (character.restUntil) {
        const now = new Date();
        const restUntil = new Date(character.restUntil);
        if (now < restUntil) {
            const diffMinutes = Math.ceil((restUntil - now) / 60000);
            const hours = Math.floor(diffMinutes / 60);
            const minutes = diffMinutes % 60;
            restingInfo = ` | RESTING: ${hours}h ${minutes}m remaining`;
        } else {
            // Rest over → restore half HP
            const halfHp = Math.floor(character.maxHp / 2);
            db.prepare(
                'UPDATE characters SET currentHp = ?, restUntil = NULL WHERE userId = ?'
            ).run(halfHp, userId);
            // Mutate for this response
            character.currentHp = halfHp;
            character.restUntil = null;
        }
    }

    // Calculate effective stats with equipment
    const effectiveAttack = character.attack + combatModifiers.extraAttack;
    const effectiveDefense = character.defense + combatModifiers.extraDefense;

    const expNeeded = calculateExpForLevel(character.level);
    const expDisplay = `${character.exp}/${expNeeded}`;
    const gold = checkGoldWallet(userId);

    return [
        `Level ${character.level}`,
        `XP: ${expDisplay}`,
        `HP: ${character.currentHp}/${character.maxHp}`,
        `Attack: Base: ${character.attack} (total:  ${effectiveAttack})`, // Show base and effective
        `Defense: Base: ${character.defense} (total: ${effectiveDefense})`, // Show base and effective
        `Gold: ${gold}${restingInfo}`
    ].join(' | ');
}




function questing(userId) {
    ensureCharacterExists(userId);

    // -- 1) REST CHECK & RECOVERY --
    const restRow = db
        .prepare('SELECT restUntil FROM characters WHERE userId = ?')
        .get(userId);

    if (restRow.restUntil) {
        const now = new Date();
        const restUntil = new Date(restRow.restUntil);

        if (now < restUntil) {
            // Still resting: compute time left
            const diffMin = Math.ceil((restUntil - now) / 60000);
            const hrs = Math.floor(diffMin / 60);
            const mins = diffMin % 60;
            let timeMsg = '';
            if (hrs > 0) {
                timeMsg += `${hrs} hour${hrs > 1 ? 's' : ''}`;
                if (mins > 0) timeMsg += ' and ';
            }
            if (mins > 0 || hrs === 0) {
                timeMsg += `${mins} minute${mins > 1 ? 's' : ''}`;
            }
            return `You're too wounded to quest! Rest for ${timeMsg} more or use a health potion.`;
        }

        // Rest over: heal half maxHp, clear rest flag
        const { maxHp } = db
            .prepare('SELECT maxHp FROM characters WHERE userId = ?')
            .get(userId);
        const halfHp = Math.floor(maxHp / 2);
        db.prepare(
            'UPDATE characters SET currentHp = ?, restUntil = NULL WHERE userId = ?'
        ).run(halfHp, userId);

        return `You've rested and recovered to ${halfHp}/${maxHp} HP.`;
    }

    // -- 2) QUEST COOLDOWN --
    const charRow = db
        .prepare('SELECT lastQuestTime FROM characters WHERE userId = ?')
        .get(userId);
    const now = new Date();
    const cdMinutes = 60;

    if (charRow.lastQuestTime) {
        const diff = (now - new Date(charRow.lastQuestTime)) / 60000;
        if (diff < cdMinutes) {
            const remain = Math.ceil(cdMinutes - diff);
            return `Wait ${remain} more minute(s) before questing again.`;
        }
    }

    // Update the quest timestamp
    db.prepare('UPDATE characters SET lastQuestTime = ? WHERE userId = ?')
        .run(now.toISOString(), userId);

    // -- 3) LOAD STATS & MODIFIERS --
    const char = db
        .prepare('SELECT level, attack, defense, currentHp, maxHp, exp FROM characters WHERE userId = ?')
        .get(userId);

    const monster = getMonsterForLevel(char.level, userId);
    // Check for active combat items like Damage Charm
    const consumables = checkActiveCombatItems(userId);
    monster.hp = Math.max(1, monster.hp - consumables.monsterDebuff); // Apply charm damage

    // Calculate modifiers, consuming temporary buffs
    const mods = calculateCombatStats(userId, true);

    // Use the calculated total effective stats for display and calculations
    const playerAttackEffective = char.attack + mods.extraAttack + mods.tempAttackBonus;
    const playerDefenseEffective = char.defense + mods.extraDefense;

    // For display purposes, show effective stats with temp indicator
    const playerAttackDisplay = `${playerAttackEffective}${mods.tempAttackBonus > 0 ? '*' : ''}`;
    const playerDefenseDisplay = `${playerDefenseEffective}`;

    // --- IMPROVED COMBAT MATH ---
    // CORE IMPROVEMENT: Combat now uses a weighted scoring system rather than pure chance

    // 1. Calculate stat advantages (more important than before)
    const attackRatio = playerAttackEffective / Math.max(1, monster.damage);
    const defenseRatio = playerDefenseEffective / Math.max(5, monster.hp);
    const healthRatio = char.currentHp / char.maxHp;

    // 2. Calculate base advantage score (weighted sum of ratios)
    //    This score now has a much stronger influence on combat outcome
    const baseAdvantageScore = (attackRatio * 0.4) + (defenseRatio * 0.4) + (healthRatio * 0.2);

    // 3. Level difference is now a direct modifier, not just random chance
    const levelDiff = char.level - monster.level;
    const levelModifier = Math.min(0.2, Math.max(-0.2, levelDiff * 0.05));

    // 4. Apply success chance modifiers from items (preserved importance)
    const itemModifier = mods.successChanceBonus;

    // 5. Calculate final success threshold (0.0-1.0)
    // Base range is now 0.35 to 0.75, modified by all factors
    // This makes combat more deterministic for well-prepared players
    const baseSuccess = 0.35 + (baseAdvantageScore * 0.4);
    const successChance = Math.min(0.75, Math.max(0.35, baseSuccess + levelModifier + itemModifier));

    // Special ability effects
    let monsterDesc = monster.name;
    let specialEffect = '';
    if (monster.isVariant) monsterDesc = `${monster.name} (${monster.isVariant})`;

    // Apply special abilities with clearer effects
    let monsterDamageMultiplier = 1.0;
    let successChancePenalty = 0;

    if (monster.specialAbility && Math.random() < monster.specialAbility.chance) {
        switch (monster.specialAbility.effect) {
            case 'damageOverTime':
                successChancePenalty = 0.1;
                specialEffect = 'poisoned';
                break;
            case 'criticalHit':
                monsterDamageMultiplier = 1.5;
                specialEffect = 'critical hit';
                break;
            case 'dodge':
                successChancePenalty = 0.15;
                specialEffect = 'agile';
                break;
            case 'lifeSteal':
                monster.hasLifeSteal = true;
                specialEffect = 'life-draining';
                break;
        }
    }

    // Update success chance with penalties
    const finalSuccessChance = Math.max(0.2, successChance - successChancePenalty);

    // Apply damage multiplier to monster damage
    monster.damage = Math.floor(monster.damage * monsterDamageMultiplier);

    // Daily gold bonus
    const daily = addDailyGoldBonus(userId);
    const dailyMsg = daily.bonusGiven ? `\n${daily.message}` : '';
    const welcome = (daily.bonusGiven && daily.isNewUser) ? 'Welcome adventurer! ' : '';

    // Build a consistent combat description
    let combatDesc = `[${welcome}You (ATK:${playerAttackDisplay}/DEF:${playerDefenseDisplay}) vs ${monsterDesc} (ATK:${monster.damage}${specialEffect ? ' ' + specialEffect : ''})]`;

    // Add the explicit temporary buff message(s)
    let tempBuffMessage = '';
    if (mods.tempAttackBonus > 0) {
        tempBuffMessage += `Combat Scroll Active: +${mods.tempAttackBonus} ATK*.`;
    }
    if (tempBuffMessage) {
        combatDesc += ` (${tempBuffMessage})`;
    }

    // -- 5) RESOLVE COMBAT --
    // IMPROVEMENT: Add skill factor to reduce pure randomness
    // The closer the player's stats match the ideal, the smaller the random factor becomes

    // Calculate "skill factor" - how well-matched player is to monster
    const skillFactor = Math.min(1.0, baseAdvantageScore);

    // Random factor is now scaled by skill - higher skill = less randomness 
    const randomWeight = 0.5 - (skillFactor * 0.3); // 0.2 to 0.5 random influence
    const skillWeight = 1.0 - randomWeight;

    // Final combat score is weighted between skill and luck
    // This is the key improvement - better stats = more predictable outcomes
    const skillComponent = skillWeight * finalSuccessChance;
    const randomRoll = Math.random() * randomWeight;
    const combatScore = skillComponent + randomRoll;

    // For display purposes, show a roll result that matches our system
    const displayRoll = Math.floor(Math.random() * 100) + 1; // Still show a d100 roll
    const targetRoll = Math.floor(finalSuccessChance * 100);
    const rollResult = `[Roll: ${displayRoll}/${targetRoll}]`;

    // Determine combat outcome based on weighted score
    const isVictory = combatScore >= 0.5;

    if (isVictory) {
        // Victory path
        // Flawless victory more directly tied to power ratio
        const flawlessChance = Math.min(0.3, 0.05 + (baseAdvantageScore * 0.25));
        const flawless = Math.random() < flawlessChance;

        // XP calculation - more XP for higher level monsters
        const levelDiff = monster.level - char.level;
        const expGain = Math.ceil(
            monster.exp *
            Math.max(0.5, 1 + levelDiff * 0.1) *
            (1 + mods.xpBoost) // Apply XP boost
        );
        // Gold with flawless bonus
        let goldGain = Math.ceil(droll.roll(monster.gold).total * (flawless ? 1.2 : 1.0));

        // LEVEL CAP IMPLEMENTATION: Check if character is at max level before adding XP
        if (char.level >= 21) {
            // Convert XP to gold for max level characters
            const bonusGold = Math.ceil(expGain / 3); // Convert XP to gold at 1:3 ratio
            goldGain += bonusGold;
        } else {
            // If not at max level, add XP normally
            db.prepare('UPDATE characters SET exp = exp + ? WHERE userId = ?')
                .run(expGain, userId);
        }

        // Always add gold
        db.prepare('UPDATE wallets SET coinWallet = coinWallet + ? WHERE userId = ?')
            .run(goldGain, userId);

        // Handle damage in victory case
        let dmgMsg = '';
        let finalHp = char.currentHp;

        if (!flawless) {
            // Calculate damage reduction based on defense
            const damageReduction = playerDefenseEffective / (playerDefenseEffective + 10);

            // Improved damage calculation - more consistent and balanced
            // Damage depends on how close the combat was
            const victoryMargin = combatScore - 0.5; // How much above threshold we were
            const victoryDamageRatio = 0.4 - (victoryMargin * 0.8); // Less damage when victory was decisive

            const baseDamage = monster.damage * Math.max(0.05, victoryDamageRatio);
            const actualDamage = Math.max(1, Math.floor(baseDamage * (1 - damageReduction)));
            const damageRoll = `${Math.floor(victoryDamageRatio * 100)}% hit`;

            finalHp = Math.max(1, char.currentHp - actualDamage);
            db.prepare('UPDATE characters SET currentHp = ? WHERE userId = ?').run(finalHp, userId);

            dmgMsg = ` Took ${actualDamage} damage (${damageRoll}). HP: ${finalHp}/${char.maxHp}`;
        }

        // Build victory message with consistent structure
        let resultMsg = flawless ? "Flawless Victory! " : "Victory! ";
        resultMsg += `${rollResult} Found ${goldGain} gold`;

        // Add max level bonus notification
        if (char.level >= 21) {
            resultMsg += ` (includes max level bonus)`;
        }
        resultMsg += ".";

        // Handle item drops
        const dropChance = flawless ? 0.5 : 0.35;
        if (Math.random() < dropChance) {
            const treasureRoll = Math.random();
            if (flawless) {
                if (treasureRoll < 0.25) { giveItem(userId, 'time scroll', 1); resultMsg += " +Time Scroll"; }
                else if (treasureRoll < 0.65) { giveItem(userId, 'treasure', 1); resultMsg += " +Treasure"; }
                else if (treasureRoll < 0.85) { giveItem(userId, 'potion', 1); resultMsg += " +Health Potion"; }
                else { giveItem(userId, 'amulet', 1); resultMsg += " +Lucky Amulet"; }
            } else {
                if (treasureRoll < 0.15) { giveItem(userId, 'rare treasure', 1); resultMsg += " +Rare Treasure"; }
                else if (treasureRoll < 0.6) { giveItem(userId, 'treasure', 1); resultMsg += " +Treasure"; }
                else if (treasureRoll < 0.8) { giveItem(userId, 'potion', 1); resultMsg += " +Health Potion"; }
                else { giveItem(userId, 'amulet', 1); resultMsg += " +Lucky Amulet"; }
            }
        }

        // Add HP status and EXP progress
        if (char.level < 21) {
            const upMsg = checkLevelUp(userId);
            if (upMsg) {
                return `${combatDesc}\n${resultMsg}${dmgMsg}${dailyMsg}\n${upMsg}`;
            } else {
                const updatedChar = db.prepare('SELECT level, exp FROM characters WHERE userId = ?').get(userId);
                const needed = calculateExpForLevel(updatedChar.level);
                const pct = Math.floor(updatedChar.exp / needed * 100);
                return `${combatDesc}\n${resultMsg}${dmgMsg}${dailyMsg}\nLv ${updatedChar.level}: ${pct}% (${needed - updatedChar.exp} XP to next)`;
            }
        } else {
            // Max level message
            return `${combatDesc}\n${resultMsg}${dmgMsg}${dailyMsg}\nLevel 21 (Maximum level reached)`;
        }

    } else {
        // Defeat path - Make it clear WHY the player lost
        // Calculate defense factor for damage reduction
        const damageReduction = playerDefenseEffective / (playerDefenseEffective + 10);

        // Improved damage calculation on defeat
        // Defeat margin affects damage taken - closer fights do less damage
        const defeatMargin = 0.5 - combatScore; // How much below threshold we were
        const defeatDamageMultiplier = 0.7 + (defeatMargin * 0.6); // More damage when defeat was decisive

        const baseDamage = monster.damage * defeatDamageMultiplier;
        const finalDamage = Math.max(1, Math.floor(baseDamage * (1 - damageReduction)));
        const defeatHitPower = `${Math.floor(defeatDamageMultiplier * 100)}% power`;

        // Clear explanation of what happened
        let defeatReason = "";
        if (attackRatio < 0.8) {
            defeatReason = "Your attack was too weak";
        } else if (defenseRatio < 0.7) {
            defeatReason = "Your defense was insufficient";
        } else if (healthRatio < 0.5) {
            defeatReason = "Low health before fight";
        } else if (specialEffect) {
            defeatReason = `Monster's ${specialEffect} ability`;
        } else {
            defeatReason = "Bad luck this time";
        }

        const newHp = Math.max(0, char.currentHp - finalDamage);
        db.prepare('UPDATE characters SET currentHp = ? WHERE userId = ?').run(newHp, userId);

        // Build defeat message with consistent structure
        let resultMsg = `Defeat! ${rollResult} ${monsterDesc} hit for ${finalDamage} damage (${defeatHitPower}, ${defeatReason})`;

        if (newHp === 0) {
            const restUntil = new Date(new Date().getTime() + (3 * 60 * 60 * 1000));
            db.prepare('UPDATE characters SET restUntil = ? WHERE userId = ?').run(restUntil.toISOString(), userId);
            resultMsg += ". Knocked out! Rest 3h or use potion.";
        } else {
            resultMsg += `. HP: ${newHp}/${char.maxHp}`;
        }

        // Consolation XP
        let consolationMsg = "";
        // Closer defeats give more consolation XP
        const consolationChance = 0.3 + (0.3 * (1 - defeatMargin)); // 30-60% chance based on how close the fight was
        if (Math.random() < consolationChance) {
            const consolationExp = Math.max(1,
                Math.floor(monster.exp * 0.3 * (1 + mods.xpBoost))
            );

            // LEVEL CAP IMPLEMENTATION: Check if character is at max level before adding consolation XP
            if (char.level >= 21) {
                consolationMsg = `\nNo XP gained (max level reached)`;
            } else {
                db.prepare('UPDATE characters SET exp = exp + ? WHERE userId = ?').run(consolationExp, userId);

                const levelUpMsg = checkLevelUp(userId);
                if (levelUpMsg) {
                    consolationMsg = `\nGained ${consolationExp} XP despite defeat!\n${levelUpMsg}`;
                } else {
                    const xpChar = db.prepare('SELECT level, exp FROM characters WHERE userId = ?').get(userId);
                    const xpNeeded = calculateExpForLevel(xpChar.level);
                    const progressPercent = Math.floor((xpChar.exp / xpNeeded) * 100);
                    consolationMsg = `\nGained ${consolationExp} XP. (Lv ${xpChar.level}: ${progressPercent}%)`;
                }
            }
        }

        return `${combatDesc}\n${resultMsg}${dailyMsg}${consolationMsg}`;
    }
}


// Simplified level up function that omits detailed stat messages
export function checkLevelUp(userId) {
    const charStmt = db.prepare('SELECT level, exp, maxHp, currentHp, attack, defense FROM characters WHERE userId = ?');
    const character = charStmt.get(userId);

    // If already at level cap, don't allow further leveling
    if (character.level >= 21) {
        // Store excess XP in case you want to use it later
        return `You've reached the maximum level cap (21)!`;
    }

    const expNeeded = calculateExpForLevel(character.level);
    // Check if player has enough exp to level up
    if (character.exp >= expNeeded) {
        const newLevel = character.level + 1;
        const newExp = character.exp - expNeeded; // Leftover exp

        // Calculate stat increases based on level
        // Higher levels get slightly better stat increases
        const hpIncrease = Math.max(1, Math.floor(1 + newLevel / 5));
        const newMaxHp = character.maxHp + hpIncrease;

        // Remove the healing on level up
        const newCurrentHp = character.currentHp; // Keep current HP the same

        // Attack increases every level, defense every other level
        const attackIncrease = Math.max(1, Math.floor(1 + newLevel / 10));
        const defenseIncrease = newLevel % 2 === 0 ? 1 : 0;

        const newAttack = character.attack + attackIncrease;
        const newDefense = character.defense + defenseIncrease;

        // Simplified level-up message
        let levelUpMessage = `LEVEL UP! You reached level ${newLevel}!`;

        // Add special message if player reaches level cap
        if (newLevel >= 21) {
            levelUpMessage += ` Congratulations! You've reached the maximum level cap!`;
        } else {
            levelUpMessage += ` Next level at ${calculateExpForLevel(newLevel)} XP.`;
        }

        // Update the character in the database
        db.prepare(`
            UPDATE characters
            SET level = ?, exp = ?, maxHp = ?, currentHp = ?, attack = ?, defense = ?
            WHERE userId = ?
        `).run(newLevel, newExp, newMaxHp, newCurrentHp, newAttack, newDefense, userId);

        // Check for additional level ups (in case player gained multiple levels)
        // But only if we haven't reached level cap
        if (newLevel < 21) {
            const additionalLevelUp = checkLevelUp(userId);
            if (additionalLevelUp) {
                // If they leveled up again, append that message
                return levelUpMessage + " " + additionalLevelUp;
            }
        }

        return levelUpMessage;
    }

    return null;
}



export function calculateExpForLevel(level) {
    return fibonacci(level);
}

function fibonacci(num) {
    num = num + 3;

    let num1 = 0;
    let num2 = 1;
    let sum;
    if (num === 1) {
        return num1;
    } else if (num === 2) {
        return num2;
    } else {
        for (let i = 3; i <= num; i++) {
            sum = num1 + num2;
            num1 = num2;
            num2 = sum;
        }
        return num2;
    }
}

// 2. Modify expProgress function to display special message at level cap
function expProgress(userId) {
    ensureCharacterExists(userId);

    const char = db.prepare('SELECT level, exp FROM characters WHERE userId = ?').get(userId);

    // Special case for max level
    if (char.level >= 21) {
        return `Level ${char.level} - Maximum level reached! You are at the pinnacle of power!`;
    }

    const expNeeded = calculateExpForLevel(char.level);
    const expRemaining = expNeeded - char.exp;
    const progressPercent = Math.floor((char.exp / expNeeded) * 100);

    // Create a visual progress bar
    const barLength = 20;
    const filledSegments = Math.floor((progressPercent / 100) * barLength);
    const emptySegments = barLength - filledSegments;

    const progressBar = '[' + '='.repeat(filledSegments) + ' '.repeat(emptySegments) + ']';

    return `Level ${char.level} progress: ${progressBar} ${progressPercent}%\n` +
        `XP: ${char.exp}/${expNeeded} (${expRemaining} more needed for level ${char.level + 1})`;
}

function checkActiveCombatItems(userId) {
    const consumables = {
        attackBonus: 0,
        defenseBonus: 0,
        monsterDebuff: 0
    };

    // Check for combat scroll
    const combatScrollCheck = db.prepare('SELECT quantity FROM inventory WHERE userId = ? AND itemId = ?');
    const hasCombatScroll = combatScrollCheck.get(userId, 'combat scroll');

    if (hasCombatScroll && hasCombatScroll.quantity > 0) {
        // Apply combat scroll effect
        consumables.attackBonus += 2;
        // Remove the scroll after use
        removeItem(userId, 'combat scroll', 1);
    }

    // Check for damage charm
    const damageCharmCheck = db.prepare('SELECT quantity FROM inventory WHERE userId = ? AND itemId = ?');
    const hasDamageCharm = damageCharmCheck.get(userId, 'damage charm');

    if (hasDamageCharm && hasDamageCharm.quantity > 0) {
        // Apply damage charm effect
        consumables.monsterDebuff += 3;
        // Remove the charm after use
        removeItem(userId, 'damage charm', 1);
    }

    return consumables;
}

function handleRaid(userId) {
    const boss = RAID_BOSSES.eternityTyrant;
    const char = db.prepare('SELECT level, currentHp, maxHp, attack, defense FROM characters WHERE userId = ?').get(userId);

    if (char.level < boss.minLevel) {
        return `Level ${boss.minLevel} required for raids!`;
    }

    // Calculate effective stats with items and buffs
    const mods = calculateCombatStats(userId, true); // consume buffs
    const effectiveAttack = char.attack + mods.extraAttack + mods.tempAttackBonus;
    const effectiveDefense = char.defense + mods.extraDefense;

    // Apply any monster debuffs from items (e.g., damage charm)
    const consumables = checkActiveCombatItems(userId);
    const monsterDebuff = consumables.monsterDebuff;

    let result = [];
    result.push(`\n=== RAID STARTED ===\n${boss.description}`);
    result.push(`Your Stats: ATK ${effectiveAttack}${mods.tempAttackBonus > 0 ? '*' : ''}, DEF ${effectiveDefense}`);

    let currentHp = char.currentHp;

    for (const [index, phase] of boss.phases.entries()) {
        let phaseHp = Math.max(1, phase.hp - monsterDebuff);
        const phaseDefense = phase.defense || 0;
        result.push(`\nPHASE ${index + 1}: ${phase.name} | HP: ${phaseHp} | ATK: ${phase.damage} | DEF: ${phaseDefense}`);
        if (phase.specialAbility) {
            result.push(`Special: ${phase.specialAbility.description}`);
        }

        while (phaseHp > 0 && currentHp > 0) {
            // Player's attack
            const playerDamage = Math.max(1, effectiveAttack - phaseDefense);
            phaseHp -= playerDamage;
            result.push(`You strike for ${playerDamage} (${Math.max(phaseHp, 0)} HP remaining)`);

            if (phaseHp <= 0) break;

            // Boss attack with special abilities
            let bossDamage = Math.max(1, phase.damage - effectiveDefense);
            if (phase.specialAbility && Math.random() < phase.specialAbility.chance) {
                switch (phase.specialAbility.effect) {
                    case 'criticalHit':
                        bossDamage = Math.floor(bossDamage * 1.5);
                        result.push(`Boss lands a critical hit!`);
                        break;
                    case 'dodge':
                        result.push(`Boss dodges your attack!`);
                        continue; // Skip boss damage this round
                }
            }

            currentHp = Math.max(0, currentHp - bossDamage);
            result.push(`Boss retaliates for ${bossDamage} damage! (Your HP: ${currentHp}/${char.maxHp})`);
        }

        if (currentHp <= 0) {
            result.push("You were defeated...");
            break;
        }
    }

    // Update player HP after raid
    db.prepare('UPDATE characters SET currentHp = ? WHERE userId = ?').run(currentHp, userId);

    if (currentHp > 0) {
        const reward = droll.roll("3d10").total;
        db.prepare('UPDATE wallets SET coinWallet = coinWallet + ? WHERE userId = ?').run(reward, userId);
        giveItem(userId, 'cosmic core', 1);
        result.push("\nRAID VICTORY! Rewards: " + reward + " gold and Cosmic Core!");
    } else {
        result.push("\nRaid failed...");
    }

    return result.join('\n');
}
