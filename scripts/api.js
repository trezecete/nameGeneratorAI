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

        ESTRUTURA DE GERAÇÃO OBRIGATÓRIA:
        Siga este processo mental único para gerar o lote de 5 nomes:
        1. ESCOLHA DAS 4 PALAVRAS ÂNCORA: Com base nas "Categorias de palavras", escolha 4 termos em Português.
           - SEJA CRIATIVO: Evite clichês (Ex: Troque "Rei" por "Trono" ou "Coroa"; "Fogo" por "Labareda").
        2. TRADUÇÃO PARA IDIOMAS DA RAÇA:
           - REGRA DE OURO 1: Traduza pelo menos 2 das 4 palavras para os "Idiomas-base".
           - REGRA DE OURO 2: Mantenha pelo menos 1 das 4 palavras em Português puro.
        3. GERAÇÃO DOS 5 NOMES: Use APENAS pedaços dessas 4 palavras traduzidas como inspiração.
           - Os 5 nomes devem ser variações harmônicas usando diferentes combinações e cortes dessas palavras.
           - NÃO use a palavra inteira; transforme-a foneticamente para soar como um nome de fantasia real e não ridículo.
        
        EXEMPLO:
        Categorias: Natureza e Magia. Idiomas: Francês e Inglês.
        - Âncoras: Orvalho, Raiz, Éter, Bruma.
        - Traduções: Rosée (Fr), Root (In), Éter (Pt), Mist (In).
        - Nome 1: Roserot Mistéter
        - Nome 2: Mistier Roseiz
        - Nome 3: Roorter Misté
        (...)
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
    1. Escreva o bloco LOGICA_GLOBAL uma única vez no topo.
    2. Escreva os 5 nomes em blocos separados por "---".
    
    FORMATO ESPERADO:
    LOGICA_GLOBAL: [Palavra 1] ([Significado] - [Idioma]) | [Palavra 2] ([Significado] - [Idioma]) | [Palavra 3] ([Significado] - [Idioma]) | [Palavra 4] ([Significado] - [Idioma])
    ---
    NOME: [Primeiro Nome] [Sobrenome]
    ---
    NOME: [Primeiro Nome] [Sobrenome]
    ---
    (até completar 5 nomes)`);

    const prompt = promptParts.join('\n');

    const url = "https://api.groq.com/openai/v1/chat/completions";

    const requestBody = {
        model: "llama-3.1-8b-instant",
        messages: [
            {
                role: "system",
                content: "You are a creative name generator. You output LOGICA_GLOBAL once, then 5 names separated by ---."
            },
            {
                role: "user",
                content: prompt
            }
        ],
        temperature: 0.7,
        max_tokens: 300
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
        const globalLogicMatch = content.match(/LOGICA_GLOBAL:\s*(.+)/i);
        const globalLogic = globalLogicMatch ? globalLogicMatch[1].trim() : "";
        
        const blocks = content.split('---');

        for (let block of blocks) {
            const nameMatch = block.match(/NOME:\s*(.+)/i);
            
            if (nameMatch) {
                let name = nameMatch[1].replace(/,/g, ' ').replace(/\s+/g, ' ').replace(/^[\d\-\.\*]+\s*/, '').trim();
                
                if (name.length > 0) {
                    results.push({ name, logic: globalLogic });
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
