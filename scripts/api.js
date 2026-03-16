import { MODULE_ID } from "./settings.js";

export async function generateNames(options) {
    const { raceKey, customRace, gender, className, culture } = options;
    const apiKey = game.settings.get(MODULE_ID, "groqApiKey");

    if (!apiKey) {
        ui.notifications.error("Groq API Key is not set in module settings.");
        return null;
    }

    const templates = game.settings.get(MODULE_ID, "raceTemplates");
    const template = templates[raceKey];
    const raceName = raceKey === 'custom' ? customRace : template.label;

    let promptParts = [
        `Você é um criador de linguagens e nomes de fantasia.

        Sua tarefa é criar NOMES TOTALMENTE INVENTADOS para diferentes raças de fantasia.

        REGRAS GERAIS E LÓGICA DE CRIAÇÃO:
        - Os nomes DEVEM ter Nome e Sobrenome.
        - Os nomes devem ser criados a partir da junção de duas palavras relacionadas à categoria/descrição da raça.
        - Se a raça tiver idiomas definidos, você deve pensar nas palavras-base nesses idiomas antes de misturá-las.
        - Misture sílabas e pedaços dessas palavras. Corte as palavras no meio e junte-as para formar um nome novo, pronunciável e único (Ex: inicio de uma + final da outra).
        - NÃO use palavras do nosso mundo de forma direta. Deforme-as até se tornarem originais e soarem naturais para a cultura da raça.
        
        EXEMPLO DO PROCESSO (Apenas para basear sua lógica):
        Temas: Natureza e Magia. Idiomas: Francês e Inglês.
        Ideia 1: Folha (Fr: feuille) + Chuva (En: rain) -> feu + ain = Feuain
        Ideia 2: Cair (Pt: cai) + Céu (En: sky) -> ca + sky = Casky
        Resultado: Feuain Casky
        `,
        `Gere 5 nomes de personagens únicos, criativos e adequados para um personagem de RPG de mesa seguindo EXATAMENTE essa lógica de mescla de palavras.`,
        `Raça/Modelo: ${raceName}`
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

    promptParts.push(`\nOrientações específicas para esta raça: ${template.promptNotes}`);
    promptParts.push(`\nRetorne SOMENTE os nomes, separados por vírgulas, sem nenhum outro texto, números ou explicações.`);

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
