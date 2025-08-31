import Database from 'better-sqlite3';

const db = new Database('cooldowns.db');
db.pragma('journal_mode = WAL');

db.prepare(`
    CREATE TABLE IF NOT EXISTS cooldowns (
        userId TEXT NOT NULL,
        functionName TEXT NOT NULL,
        lastCalled INTEGER NOT NULL,
        PRIMARY KEY (userId, functionName)
    )
`).run();

function checkCooldown(userId, functionName, cooldownDuration) {
    const now = Date.now();
    const row = db.prepare(`
        SELECT lastCalled FROM cooldowns
        WHERE userId = ? AND functionName = ?
    `).get(userId, functionName);

    const lastCalled = row ? row.lastCalled : 0;

    if (now - lastCalled >= cooldownDuration) {
        db.prepare(`
            INSERT INTO cooldowns (userId, functionName, lastCalled)
            VALUES (?, ?, ?)
            ON CONFLICT(userId, functionName) DO UPDATE SET lastCalled=excluded.lastCalled
        `).run(userId, functionName, now);

        const cooldownRemaining = cooldownDuration - (now - lastCalled);

        console.log(`cooldown for ${functionName} is up and it is ${cooldownRemaining}  `)
        return { cooldownFinished: true, cooldownRemaining: 0 };
    } else {

        const cooldownRemaining = cooldownDuration - (now - lastCalled);
        console.log(`cooldown for ${functionName} is not done and it is ${cooldownRemaining}  `)

        return { cooldownFinished: false, cooldownRemaining };
    }
}

const FUNCTION_COOLDOWN_MS = {
    trivia: 900000,
    ask: 10000,

};


function cooldownCheck(userId, functionName) {
    const cooldown = FUNCTION_COOLDOWN_MS[functionName];
    if (!cooldown) {
        return { cooldownFinished: true, cooldownRemaining: 0 };
    }
    return checkCooldown(userId, functionName, cooldown);
}

export { cooldownCheck };
