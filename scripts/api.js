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

        REGRAS DE CRIAÇÃO PASSO-A-PASSO:
        Para criar os Nomes e Sobrenomes de cada personagem, siga este fluxo criativo:
        1. Leia as "Categorias de palavras" (fornecidas mais abaixo neste prompt) e escolha 4 palavras em Português que tenham forte ligação com o personagem selecionado.
            - Ex: Se a categoria diz Natureza e Batalha, você pode escolher: Raiz, Leão, Espada, Sangue.
        2. Traduza essas 4 palavras para os "Idiomas-base" sugeridos (fornecidos mais abaixo). Você pode variar os idiomas entre as 4 palavras.
            - Ex: Raiz -> Root (In), Leão -> Leon (Es).
        3. FUSÃO DO NOME: Pegue 2 dessas palavras traduzidas, corte pedaços de cada uma e junte-as para criar um primeiro nome totalmente novo e único.
        4. FUSÃO DO SOBRENOME: Faça o mesmo processo de fusão com as outras 2 palavras traduzidas para criar o sobrenome.
        5. SONORIDADE: O resultado final (Nome e Sobrenome) deve soar natural e respeitar o "Estilo de Sonoridade" exigido.
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
    
    NOME: [Nome Gerado] [Sobrenome Gerado]
    LOGICA: [Palavra Traduzida 1] ([Significado em Português 1] - [Idioma 1]) + [Palavra Traduzida 2] ([Significado em Português 2] - [Idioma 2]) | [Palavra Traduzida 3] ([Significado em Português 3] - [Idioma 3]) + [Palavra Traduzida 4] ([Significado em Português 4] - [Idioma 4])
    ---
    
    - Exemplo prático do que espero na LÓGICA: Coin (Moeda - In) + Espada (Espada - Pt) | Win (Vencer - In) + Basura (Maçã - Es)
    - É EXPRESSAMENTE PROIBIDO usar números de lista (1. 2.), marcadores extras ou explicações fora desse formato.`);

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
