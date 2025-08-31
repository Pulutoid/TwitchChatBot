import { askAI } from "./ollamaAPI.js";
import { doubleCheckIsSafe } from "./banphraseHandler.js";
import { getTriviaQuestion, decodeHtmlEntities } from "./triviaHandler.js";
import { getFact } from "./randomFactApi.js";
import { getAdvice } from "./randomAdviceApi.js";

import droll from 'droll';
import RPG from './RPG.js'

function sanitizeName(name) {
    return name.replace(/[<>]/g, "");
}

async function handleAskCommand(param) {
    const question = param.substring(param.indexOf("ask") + 4).trim();

    let output = await askAI(question);
    if (output === "[?]") return "?";

    output = output.replace('.', '');
    output = output.replace(',', '');
    return decodeHtmlEntities(output)
}

async function handleTriviaCommand() {
    return await getTriviaQuestion();
}

function handleHelpCommand() {
    return `Commands: ask, trivia, rpg (ues kloy rpg help for more),  roll (eg. kloy roll d20+2).`.trim();
}
async function handleRollCommand(param) {
    const diceToRoll = param.substring(param.indexOf("roll") + 5).trim();
    console.log(diceToRoll)

    var result = `${droll.roll(diceToRoll)}`;
    console.log(result)

    return result;
}
function handleRPGCommand(param, userId) {
    const subCommand = param.substring(param.indexOf("rpg") + 4).trim();
    var result = RPG(subCommand, userId);
    return result;
}



// Core router
export async function finalOutputString(param, chatterName, state) {
    let output = null;
    chatterName = sanitizeName(chatterName);

    const lowerParam = param.toLowerCase().trim();

    if (lowerParam.startsWith("test")) {
        output = "hello world";
    }
    else if (lowerParam.startsWith("1337")) {
        output = "hecking elite bro! BatChest";
    }
    else if (lowerParam.startsWith("ask") || lowerParam.startsWith("q")) {
        output = await handleAskCommand(lowerParam);
    }
    else if (lowerParam.startsWith("trivia")) {
        return "/me [Trivia is disabled]"
    }
    else if (lowerParam.startsWith("help")) {
        output = handleHelpCommand();
    }
    else if (lowerParam.startsWith("roll")) {

        let rollResult = await handleRollCommand(lowerParam);
        output = rollResult
    }
    else if (lowerParam.startsWith("rpg")) {
        output = handleRPGCommand(lowerParam, chatterName);
    }
    else if (lowerParam.startsWith("fact") || lowerParam.startsWith("facts") || lowerParam.startsWith("fax")) {
        output = await getFact();
        output = " OMGScoots Did you know that " + output;
    }
    else if (lowerParam.startsWith("advice") || lowerParam.startsWith("advise") || lowerParam.startsWith("fax")) {
        output = await getAdvice();
        output = " Based advice: " + output;
    }
    else if (lowerParam.startsWith("streameronline")) {
        output = "[disabled while stream is live]"
    }



    const isSafe = await doubleCheckIsSafe(output);
    output = !isSafe ? "[Blocked by Banphrase API 1984 ]" : output;
    return `@${chatterName}, ${output}`;
}
