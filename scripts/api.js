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
        promptParts.push(`Class/Profession: ${className} (MUITO IMPORTANTE: Essa classe deve ter um peso 1.2x maior do que a categoria da raça na escolha das palavras)`);
    }

    if (culture) {
        promptParts.push(`Culture/Background: ${culture} (MUITO IMPORTANTE: Essa cultura deve ter um peso 1.2x maior do que a categoria da raça na escolha das palavras)`);
    }

    if (raceKey === 'custom') {
        promptParts.push(`\nLÓGICA ESPECÍFICA DESTA GERAÇÃO (Baseada nas escolhas do usuário):
        Categorias de palavras: Baseie-se nas informações dadas
        Idiomas para usar: Criatividade do modelo e informações passadas
        Estilo de Sonoridade: Baseado nas informações passadas`);
    } else {
        const fallBackNotes = template.promptNotes ? `Geral: ${template.promptNotes}` : '';
        promptParts.push(`\nLÓGICA ESPECÍFICA DESTA GERAÇÃO:
        Categorias de palavras para as bases: ${template.categories || 'Aleatória'}
        Idiomas-base recomendados para as bases: ${template.languages || 'Aleatório'}
        Estilo de Sonoridade exigida na mescla: ${template.sonority || fallBackNotes}`);
    }
    promptParts.push(`\nREGRAS DE FORMATAÇÃO ESTRITAMENTE OBRIGATÓRIAS:
    - Retorne os 5 nomes seguindo EXATAMENTE este bloco de formato para cada um:
    
    NOME: [Nome Gerado]
    LOGICA: [Palavra 1] ([Idioma]: [Tradução da Palavra 1]) + [Palavra 2] ([Idioma]: [Tradução da Palavra 2])
    ---
    
    - É EXPRESSAMENTE PROIBIDO usar números, pontos de lista ou explicações fora desse formato.`);

    const prompt = promptParts.join('\n');

    const url = "https://api.groq.com/openai/v1/chat/completions";

    const requestBody = {
        model: "llama-3.1-8b-instant",
        messages: [
            {
                role: "system",
                content: "You are a creative name generator for fantasy RPGs. You strictly output names following the formatted block NOME:, LOGICA:, and ---."
            },
            {
                role: "user",
                content: prompt
            }
        ],
        temperature: 0.7,
        max_tokens: 250
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

        const results = [];
        const blocks = content.split('---');
        
        for (let block of blocks) {
            const nameMatch = block.match(/NOME:\s*(.+)/i);
            const logicMatch = block.match(/LOGICA:\s*(.+)/i);
            
            if (nameMatch) {
                let name = nameMatch[1].replace(/,/g, ' ').replace(/\s+/g, ' ').replace(/^[\d\-\.\*]+\s*/, '').trim();
                let logic = logicMatch ? logicMatch[1].trim() : "";
                
                if (name.length > 0) {
                    results.push({ name, logic });
                }
            }
        }

        return results.length > 0 ? results : null;
    } catch (error) {
        console.error(`${MODULE_ID} | Error generating names:`, error);
        ui.notifications.error("Error generating names via Groq API. Check console for details.");
        return null;
    }
}
