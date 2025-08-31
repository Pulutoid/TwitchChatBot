// Monster definitions for the RPG system
const MONSTERS = {
    // Level 1 (2 monsters)
    'rat': { name: 'Giant Rat', hp: 3, damage: 1, exp: 1, gold: '1d2', level: 1 },
    'bat': { name: 'Cave Bat', hp: 2, damage: 2, exp: 1, gold: '1d2', level: 1 },

    // Level 2 (2 monsters)
    'kobold': { name: 'Kobold', hp: 4, damage: 2, exp: 2, gold: '1d3', level: 2 },
    'spider': { name: 'Giant Spider', hp: 5, damage: 3, exp: 2, gold: '1d3', level: 2 },

    // Level 3 (3 monsters)
    'goblin': { name: 'Goblin', hp: 6, damage: 5, exp: 3, gold: '1d4', level: 3 },
    'zombie': { name: 'Zombie', hp: 7, damage: 4, exp: 4, gold: '1d4', level: 3 },
    'wolf': { name: 'Dire Wolf', hp: 6, damage: 6, exp: 3, gold: '1d4+1', level: 3 },

    // Level 4 (3 monsters)
    'bandit': { name: 'Bandit', hp: 8, damage: 7, exp: 5, gold: '1d6', level: 4 },
    'gnoll': { name: 'Gnoll', hp: 9, damage: 6, exp: 5, gold: '1d6+1', level: 4 },
    'slime': { name: 'Acidic Slime', hp: 8, damage: 8, exp: 6, gold: '1d6', level: 4 },



    'ghost': { name: 'Ghost', hp: 7, damage: 6, exp: 6, gold: '2d6', level: 5 },
    'skeleton': { name: 'Skeleton', hp: 6, damage: 8, exp: 6, gold: '2d5', level: 5 },
    'wight': { name: 'Wight', hp: 8, damage: 7, exp: 7, gold: '2d6', level: 5 },
    'specter': { name: 'Specter', hp: 7, damage: 9, exp: 8, gold: '3d4', level: 5 },

    // Level 5 (4 monsters)
    'ghost': { name: 'Ghost', hp: 7, damage: 7, exp: 6, gold: '2d4', level: 5 },
    'skeleton': { name: 'Skeleton', hp: 8, damage: 6, exp: 7, gold: '2d4+1', level: 5 },
    'wight': { name: 'Wight', hp: 7, damage: 8, exp: 7, gold: '2d4', level: 5 },
    'specter': { name: 'Specter', hp: 8, damage: 7, exp: 8, gold: '2d4+1', level: 5 },

    // Level 6 (4 monsters)
    'basilisk': { name: 'Basilisk', hp: 9, damage: 10, exp: 9, gold: '2d5', level: 6 },
    'orc': { name: 'Orc', hp: 10, damage: 9, exp: 10, gold: '2d5+1', level: 6 },
    'minotaur': { name: 'Minotaur', hp: 9, damage: 11, exp: 11, gold: '2d5', level: 6 },
    'cockatrice': { name: 'Cockatrice', hp: 10, damage: 10, exp: 10, gold: '2d5+1', level: 6 },

    // Level 7 (4 monsters)
    'phaseCat': { name: 'Phase Cat', hp: 11, damage: 12, exp: 13, gold: '2d6', level: 7 },
    'troll': { name: 'Troll', hp: 12, damage: 11, exp: 14, gold: '2d6+1', level: 7 },
    'manticore': { name: 'Manticore', hp: 11, damage: 13, exp: 15, gold: '2d6', level: 7 },
    'hellhound': { name: 'Hellhound', hp: 12, damage: 12, exp: 14, gold: '2d6+1', level: 7 },

    // Level 8 (4 monsters)
    'banshee': { name: 'Banshee', hp: 13, damage: 14, exp: 18, gold: '3d5', level: 8 },
    'ogre': { name: 'Ogre', hp: 14, damage: 13, exp: 19, gold: '3d5+1', level: 8 },
    'cyclops': { name: 'Cyclops', hp: 13, damage: 15, exp: 20, gold: '3d5', level: 8 },
    'deathKnight': { name: 'Death Knight', hp: 14, damage: 14, exp: 19, gold: '3d5+1', level: 8 },

    // Level 9 (6 monsters)
    'gorgon': { name: 'Gorgon', hp: 15, damage: 16, exp: 27, gold: '3d6', level: 9 },
    'wraith': { name: 'Wraith', hp: 16, damage: 15, exp: 28, gold: '3d6+1', level: 9 },
    'lich': { name: 'Lich', hp: 15, damage: 17, exp: 30, gold: '3d6', level: 9 },
    'beholder': { name: 'Beholder', hp: 16, damage: 16, exp: 29, gold: '3d6+1', level: 9 },
    'wyvern': { name: 'Wyvern', hp: 17, damage: 15, exp: 28, gold: '3d6', level: 9 },
    'vampire': { name: 'Vampire', hp: 16, damage: 17, exp: 31, gold: '3d6+1', level: 9 },

    // Level 10 (6 monsters)
    'treant': { name: 'Treant', hp: 18, damage: 18, exp: 39, gold: '3d7', level: 10 },
    'frostGiant': { name: 'Frost Giant', hp: 19, damage: 17, exp: 41, gold: '3d7+2', level: 10 },
    'earthElemental': { name: 'Earth Elemental', hp: 20, damage: 16, exp: 40, gold: '3d7', level: 10 },
    'dragonWyrmling': { name: 'Dragon Wyrmling', hp: 18, damage: 19, exp: 43, gold: '3d7+2', level: 10 },
    'stormDragon': { name: 'Storm Dragon', hp: 19, damage: 18, exp: 44, gold: '3d7', level: 10 },
    'fleshGolem': { name: 'Flesh Golem', hp: 20, damage: 17, exp: 42, gold: '3d7+2', level: 10 },

    // Level 11 (6 monsters)
    'ironGolem': { name: 'Iron Golem', hp: 22, damage: 20, exp: 120, gold: '4d6', level: 11 },
    'stormGiant': { name: 'Storm Giant', hp: 23, damage: 21, exp: 125, gold: '4d6+2', level: 11 },
    'mindFlayer': { name: 'Mind Flayer', hp: 21, damage: 22, exp: 130, gold: '4d6', level: 11 },
    'blackDragon': { name: 'Black Dragon', hp: 24, damage: 20, exp: 125, gold: '4d6+2', level: 11 },
    'deathSlaad': { name: 'Death Slaad', hp: 22, damage: 22, exp: 128, gold: '4d6', level: 11 },
    'elderBrain': { name: 'Elder Brain', hp: 23, damage: 21, exp: 122, gold: '4d6+2', level: 11 },

    // Level 12 (6 monsters)
    'chimera': { name: 'Chimera', hp: 25, damage: 23, exp: 175, gold: '4d7', level: 12 },
    'fireGiant': { name: 'Fire Giant', hp: 26, damage: 22, exp: 180, gold: '4d7+2', level: 12 },
    'hydra': { name: 'Hydra', hp: 27, damage: 21, exp: 185, gold: '4d7', level: 12 },
    'shadowDragon': { name: 'Shadow Dragon', hp: 25, damage: 24, exp: 182, gold: '4d7+2', level: 12 },
    'planetar': { name: 'Planetar', hp: 26, damage: 23, exp: 178, gold: '4d7', level: 12 },
    'prismaticBeast': { name: 'Prismatic Beast', hp: 27, damage: 22, exp: 188, gold: '4d7+2', level: 12 },

    // Level 13 (6 monsters)
    'ancientMummy': { name: 'Ancient Mummy', hp: 32, damage: 27, exp: 310, gold: '5d6', level: 13 },
    'pitFiend': { name: 'Pit Fiend', hp: 33, damage: 28, exp: 320, gold: '5d6+3', level: 13 },
    'thunderbird': { name: 'Thunderbird', hp: 34, damage: 26, exp: 315, gold: '5d6', level: 13 },
    'krakenPriest': { name: 'Kraken Priest', hp: 33, damage: 27, exp: 325, gold: '5d6+3', level: 13 },
    'timeEater': { name: 'Time Eater', hp: 32, damage: 29, exp: 330, gold: '5d6', level: 13 },
    'solarPhoenix': { name: 'Solar Phoenix', hp: 34, damage: 27, exp: 318, gold: '5d6+3', level: 13 },

    // Level 14 (6 monsters)
    'nightshade': { name: 'Nightshade', hp: 38, damage: 30, exp: 420, gold: '5d7', level: 14 },
    'aboleth': { name: 'Aboleth', hp: 39, damage: 31, exp: 430, gold: '5d7+3', level: 14 },
    'balor': { name: 'Balor', hp: 40, damage: 29, exp: 415, gold: '5d7', level: 14 },
    'kraken': { name: 'Kraken', hp: 38, damage: 32, exp: 435, gold: '5d7+3', level: 14 },
    'tarrasqueCub': { name: 'Tarrasque Cub', hp: 40, damage: 30, exp: 440, gold: '5d7', level: 14 },
    'voidReaper': { name: 'Void Reaper', hp: 39, damage: 31, exp: 425, gold: '5d7+3', level: 14 },

    // Level 15 (6 monsters)
    'eldritchHorror': { name: 'Eldritch Horror', hp: 45, damage: 35, exp: 540, gold: '6d6', level: 15 },
    'astralDreadnought': { name: 'Astral Dreadnought', hp: 46, damage: 36, exp: 550, gold: '6d6+4', level: 15 },
    'archlich': { name: 'Archlich', hp: 47, damage: 34, exp: 560, gold: '6d6', level: 15 },
    'worldSerpent': { name: 'World Serpent', hp: 45, damage: 37, exp: 545, gold: '6d6+4', level: 15 },
    'dreamDevourer': { name: 'Dream Devourer', hp: 46, damage: 35, exp: 555, gold: '6d6', level: 15 },
    'quantumBehemoth': { name: 'Quantum Behemoth', hp: 47, damage: 36, exp: 565, gold: '6d6+4', level: 15 },

    // Level 16 (6 monsters)
    'tarrasque': { name: 'Tarrasque', hp: 55, damage: 42, exp: 890, gold: '6d7', level: 16 },
    'overmind': { name: 'Overmind', hp: 56, damage: 43, exp: 900, gold: '6d7+4', level: 16 },
    'realityBreaker': { name: 'Reality Breaker', hp: 57, damage: 41, exp: 910, gold: '6d7', level: 16 },
    'eternityWurm': { name: 'Eternity Wurm', hp: 55, damage: 44, exp: 905, gold: '6d7+4', level: 16 },
    'infinityGolem': { name: 'Infinity Golem', hp: 56, damage: 42, exp: 895, gold: '6d7', level: 16 },
    'cosmicJuggernaut': { name: 'Cosmic Juggernaut', hp: 57, damage: 43, exp: 915, gold: '6d7+4', level: 16 },

    // Level 17 (6 monsters)
    'phoenixOverlord': { name: 'Phoenix Overlord', hp: 75, damage: 55, exp: 2150, gold: '7d7', level: 17 },
    'leviathanPrime': { name: 'Leviathan Prime', hp: 76, damage: 56, exp: 2200, gold: '7d7+5', level: 17 },
    'chaosTitan': { name: 'Chaos Titan', hp: 77, damage: 54, exp: 2250, gold: '7d7', level: 17 },
    'omniversalWarden': { name: 'Omniversal Warden', hp: 75, damage: 57, exp: 2180, gold: '7d7+5', level: 17 },
    'voidTyrant': { name: 'Void Tyrant', hp: 76, damage: 55, exp: 2220, gold: '7d7', level: 17 },
    'hyperionBeast': { name: 'Hyperion Beast', hp: 77, damage: 56, exp: 2230, gold: '7d7+5', level: 17 },

    // Level 18 (6 monsters)
    'phoenix': { name: 'Phoenix', hp: 90, damage: 65, exp: 3900, gold: '8d7', level: 18 },
    'leviathan': { name: 'Leviathan', hp: 92, damage: 66, exp: 4000, gold: '8d7+6', level: 18 },
    'titan': { name: 'Titan', hp: 93, damage: 64, exp: 4100, gold: '8d7', level: 18 },
    'primalDragon': { name: 'Primal Dragon', hp: 91, damage: 67, exp: 4050, gold: '8d7+6', level: 18 },
    'omnipotentEntity': { name: 'Omnipotent Entity', hp: 100, damage: 70, exp: 4300, gold: '10d7', level: 18 }, // Still slightly stronger as a "boss"
    'finalityWarden': { name: 'Finality Warden', hp: 95, damage: 68, exp: 4200, gold: '9d7', level: 18 }, // Slightly stronger as a "sub-boss"
    // Level 19 (6 monsters)
    'chronophageEclipse': { name: 'Chronophage Eclipse', hp: 110, damage: 72, exp: 4100, gold: '9d7', level: 19 },
    'shadowEmperor': { name: 'Shadow Emperor', hp: 108, damage: 70, exp: 4200, gold: '8d7+6', level: 19 },
    'wyrmOfEndings': { name: 'Wyrm of Endings', hp: 112, damage: 74, exp: 4300, gold: '10d7', level: 19 },
    'harbingerOfOblivion': { name: 'Harbinger of Oblivion', hp: 109, damage: 73, exp: 4000, gold: '9d7', level: 19 },
    'colossusOfTheDeep': { name: 'Colossus of the Deep', hp: 111, damage: 72, exp: 4150, gold: '8d7+6', level: 19 },
    'beastBeyondStars': { name: 'Beast Beyond Stars', hp: 113, damage: 75, exp: 4300, gold: '10d7', level: 19 },

    // Level 20 (6 monsters)
    'forgefatherOfGods': { name: 'Forgefather of Gods', hp: 120, damage: 78, exp: 4250, gold: '10d7', level: 20 },
    'seraphOfRuin': { name: 'Seraph of Ruin', hp: 118, damage: 77, exp: 4200, gold: '9d7', level: 20 },
    'netherboundMonarch': { name: 'Netherbound Monarch', hp: 122, damage: 79, exp: 4300, gold: '10d7', level: 20 },
    'echoOfTheUnwritten': { name: 'Echo of the Unwritten', hp: 119, damage: 76, exp: 4100, gold: '8d7+6', level: 20 },
    'wrathOfTheEternals': { name: 'Wrath of the Eternals', hp: 121, damage: 78, exp: 4150, gold: '9d7', level: 20 },
    'infinityShatterer': { name: 'Infinity Shatterer', hp: 123, damage: 80, exp: 4300, gold: '10d7', level: 20 },

    // Level 21 (6 monsters)
    'voidkingAscendant': { name: 'Voidking Ascendant', hp: 130, damage: 85, exp: 4300, gold: '10d7', level: 21 },
    'ninefoldHydra': { name: 'Ninefold Hydra', hp: 128, damage: 83, exp: 4250, gold: '9d7+4', level: 21 },
    'timeUnraveler': { name: 'Time Unraveler', hp: 132, damage: 86, exp: 4200, gold: '9d7', level: 21 },
    'crownOfTheEndless': { name: 'Crown of the Endless', hp: 129, damage: 84, exp: 4300, gold: '10d7', level: 21 },
    'oblivionPrime': { name: 'Oblivion Prime', hp: 131, damage: 87, exp: 4150, gold: '9d7+3', level: 21 },
    'finalGodbreaker': { name: 'Final Godbreaker', hp: 135, damage: 90, exp: 4300, gold: '10d7', level: 21 }


};


const RAID_BOSSES = {
    'eternityTyrant': {
        name: 'Eternity Tyrant',
        description: 'A colossal being of cosmic malevolence that threatens reality itself.',
        phases: [
            {
                name: 'Eternity Tyrant (Phase 1)',
                hp: 200,
                maxHp: 200,
                damage: 18,
                specialAbility: {
                    effect: 'cosmicBarrier',
                    description: 'Reduces damage taken by 30%',
                    chance: 1.0
                },
                exp: 0, // Only awarded at final phase
                gold: '0',
                level: 23
            },
            {
                name: 'Eternity Tyrant (Phase 2)',
                hp: 220,
                maxHp: 220,
                damage: 22,
                specialAbility: {
                    effect: 'voidLash',
                    description: 'Deals additional damage that bypasses defense',
                    chance: 0.4
                },
                exp: 0, // Only awarded at final phase
                gold: '0',
                level: 24
            },
            {
                name: 'Eternity Tyrant (Final Form)',
                hp: 250,
                maxHp: 250,
                damage: 25,
                specialAbility: {
                    effect: 'cosmicRend',
                    description: 'Can hit multiple times in one attack',
                    chance: 0.3
                },
                exp: 9000,
                gold: '20d10+50',
                level: 25
            }
        ],
        minLevel: 15, // Minimum level required to challenge
        cooldownHours: 24, // Hours before the raid can be attempted again
        rewards: {
            guaranteed: ['cosmic essence', 'void crystal'],
            rare: ['eternity shard', 'tyrant crown', 'cosmic core']
        }
    },
    'chromaLeviathan': {
        name: 'Chroma Leviathan',
        description: 'An ancient elemental beast with mastery over all elements.',
        phases: [
            {
                name: 'Chroma Leviathan (Ice Form)',
                hp: 190,
                maxHp: 190,
                damage: 9,
                specialAbility: {
                    effect: 'frostAura',
                    description: 'Reduces attack speed and effectiveness',
                    chance: 0.5
                },
                exp: 0,
                gold: '0',
                level: 22
            },
            {
                name: 'Chroma Leviathan (Fire Form)',
                hp: 210,
                maxHp: 210,
                damage: 10,
                specialAbility: {
                    effect: 'inferno',
                    description: 'Deals burn damage over time',
                    chance: 0.4
                },
                exp: 0,
                gold: '0',
                level: 23
            },
            {
                name: 'Chroma Leviathan (Primal Form)',
                hp: 240,
                maxHp: 240,
                damage: 11,
                specialAbility: {
                    effect: 'elementalShift',
                    description: 'Changes weaknesses and resistances unpredictably',
                    chance: 0.3
                },
                exp: 8500,
                gold: '18d10+40',
                level: 24
            }
        ],
        minLevel: 14,
        cooldownHours: 20,
        rewards: {
            guaranteed: ['elemental core', 'leviathan scale'],
            rare: ['chromatic essence', 'elemental crown', 'primordial heart']
        }
    }
};

function getMonsterForLevel(level, userId) {
    // Create base weighted pool as before
    const pool = [];
    Object.entries(MONSTERS).forEach(([id, monster]) => {
        const levelDiff = Math.abs(monster.level - level);
        if (levelDiff <= 2) {
            const entries = levelDiff === 0 ? 5 : levelDiff === 1 ? 3 : 1;
            for (let i = 0; i < entries; i++) {
                pool.push(id);
            }
        }
    });

    // Select random monster
    const randomIndex = Math.floor(Math.random() * pool.length);
    const monsterId = pool[randomIndex];
    let monster = { ...MONSTERS[monsterId] };

    // Apply variations (5% chance for elite, 1% chance for boss)
    const variationRoll = Math.random();
    if (variationRoll < 0.01) {
        monster.name = `${monster.name} Boss`;
        monster.hp = Math.floor(monster.hp * 2);
        monster.damage = monster.damage + 2;
        monster.exp = Math.floor(monster.exp * 1.5);
        monster.isVariant = 'boss';
    } else if (variationRoll < 0.05) {
        monster.name = `Elite ${monster.name}`;
        monster.hp = Math.floor(monster.hp * 1.3);
        monster.damage = monster.damage + 1;
        monster.exp = Math.floor(monster.exp * 1.2);
        monster.isVariant = 'elite';
    }

    // Add special ability if none exists (30% chance)
    if (!monster.specialAbility && Math.random() < 0.3) {
        const abilities = [
            { name: 'Poison', effect: 'damageOverTime', chance: 0.2 },
            { name: 'Critical Strike', effect: 'criticalHit', chance: 0.15 },
            { name: 'Evasion', effect: 'dodge', chance: 0.2 },
            { name: 'Life Drain', effect: 'lifeSteal', chance: 0.25 }
        ];

        monster.specialAbility = abilities[Math.floor(Math.random() * abilities.length)];
    }

    return monster;
}
export { MONSTERS, RAID_BOSSES, getMonsterForLevel };