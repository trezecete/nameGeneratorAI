import { MODULE_ID } from "./settings.js";
import { RACE_TEMPLATES } from "./templates.js";

export async function generateNames(options) {
    const { raceKey, customRace, gender, className, culture } = options;
    const apiKey = game.settings.get(MODULE_ID, "groqApiKey");

    if (!apiKey) {
        ui.notifications.error("Groq API Key is not set in module settings.");
        return null;
    }

    const template = RACE_TEMPLATES[raceKey];
    const raceName = raceKey === 'custom' ? customRace : template.label;

    let promptParts = [
        `Generate 5 unique, creative, and fitting character names for a tabletop RPG character.`,
        `Race: ${raceName}`
    ];

    if (gender && gender !== 'any') {
        promptParts.push(`Gender/Presentation: ${gender}`);
    }

    if (className) {
        promptParts.push(`Class/Profession: ${className}`);
    }

    if (culture) {
        promptParts.push(`Culture/Background: ${culture}`);
    }

    promptParts.push(`\nGuidelines specific to this race: ${template.promptNotes}`);
    promptParts.push(`\nReturn ONLY the names, separated by commas, with no other text, numbers, or explanation.`);

    const prompt = promptParts.join('\n');

    const url = "https://api.groq.com/openai/v1/chat/completions";

    const requestBody = {
        model: "llama-3.1-8b-instant",
        messages: [
            {
                role: "system",
                content: "You are a creative name generator for fantasy RPGs. You strictly output a comma-separated list of names and nothing else."
            },
            {
                role: "user",
                content: prompt
            }
        ],
        temperature: 0.7,
        max_tokens: 100
    };

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API returned ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        const content = data.choices[0]?.message?.content || "";

        return content.split(',').map(n => n.trim()).filter(n => n.length > 0);
    } catch (error) {
        console.error(`${MODULE_ID} | Error generating names:`, error);
        ui.notifications.error("Error generating names via Groq API. Check console for details.");
        return null;
    }
}
