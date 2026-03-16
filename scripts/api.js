import { MODULE_ID } from "./settings.js";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.1-8b-instant";

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

    try {
        console.log(`${MODULE_ID} | Inciando Etapa 1: Selecionando palavras base...`);
        const words = await _step1ChooseWords(template, raceName, className, culture, apiKey);
        if (!words || words.length === 0) throw new Error("Falha na Etapa 1: Não foi possível selecionar as palavras.");
        console.log(`${MODULE_ID} | Palavras selecionadas:`, words);

        console.log(`${MODULE_ID} | Inciando Etapa 2: Traduzindo palavras...`);
        const translatedWords = await _step2Translate(words, template, apiKey);
        if (!translatedWords || translatedWords.length === 0) throw new Error("Falha na Etapa 2: Não foi possível traduzir as palavras.");
        console.log(`${MODULE_ID} | Palavras traduzidas:`, translatedWords);

        console.log(`${MODULE_ID} | Inciando Etapa 3: Fundindo nomes...`);
        const results = await _step3MergeNames(translatedWords, raceName, template, apiKey, gender);
        if (!results || results.length === 0) throw new Error("Falha na Etapa 3: Não foi possível gerar os nomes finais.");
        console.log(`${MODULE_ID} | Nomes finais gerados:`, results);

        return results;

    } catch (error) {
        console.error(`${MODULE_ID} | Erro durante a geração de nomes:`, error);
        ui.notifications.error("Erro gerando nomes via Groq API. Verifique o console do Foundry (F12) para detalhes.");
        return null;
    }
}

async function _callGroqAPI(systemPrompt, userPrompt, apiKey, maxTokens = 250, temperature = 0.7) {
    const requestBody = {
        model: MODEL,
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
        ],
        temperature: temperature,
        max_tokens: maxTokens
    };

    const response = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API retornou ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || "";
}

async function _step1ChooseWords(template, raceName, className, culture, apiKey) {
    const systemPrompt = "Você é um especialista em etimologia e criação de conceitos para RPG. Sua tarefa é extrair o significado de uma raça/classe/cultura e retornar 4 palavras em PORTUGUÊS que tenham forte ligação semântica com o personagem. SEJA CRIATIVO: Evite termos óbvios ou clichês banais (Ex: ao invés de 'Rei', use 'Soberano' ou 'Coroa'; ao invés de 'Fogo', use 'Brasa' ou 'Chama').";
    
    let userPrompt = `Gere EXATAMENTE 4 palavras em Português para servir de base para o nome de um personagem.\nRaça: ${raceName}\n`;
    
    if (template.categories) userPrompt += `Categorias de Inspiração: ${template.categories}\n`;
    if (className) userPrompt += `Classe/Profissão (PESO ALTO NA ESCOLHA): ${className}\n`;
    if (culture) userPrompt += `Cultura/Background (PESO ALTO NA ESCOLHA): ${culture}\n`;

    userPrompt += `\nRetorne EXATAMENTE no formato de lista separada por vírgulas, sem mais nenhum texto, numeração ou explicação. \nExemplo de saída esperada:\nBrasa, Escudo, Coroa, Tempestade`;

    const content = await _callGroqAPI(systemPrompt, userPrompt, apiKey, 80, 0.8);
    // Limpar e extrair as palavras
    const words = content.replace(/[.]/g, '').split(',').map(w => w.trim()).filter(w => w.length > 0);
    return words.slice(0, 4);
}

async function _step2Translate(words, template, apiKey) {
    const systemPrompt = "Você é um tradutor especialista em linguística e criação de mundos de fantasia. Você recebe 4 palavras em Português e deve traduzi-las de acordo com regras estritas.";
    
    let userPrompt = `Palavras base em Português: ${words.join(', ')}\nIdiomas-base sugeridos para a raça (escolha dentre esses): ${template.languages || 'Qualquer idioma de fantasia'}\n`;
    
    userPrompt += `\nTraduza essas 4 palavras para os idiomas acima obedecendo a seguinte REGRA DE OURO ESTRITA:
- SEMPRE 3 palavras DEVEM ser traduzidas para os "Idiomas-base" exógenos.
- SEMPRE EXATAMENTE 1 das 4 palavras DEVE ser mantida INTACTA em Português (sem tradução, representando a raiz nativa).

Retorne EXATAMENTE no formato linha a linha abaixo, e NADA MAIS:
[Palavra Traduzida 1] ([Palavra PT 1] - [Idioma Alvo 1])
[Palavra Traduzida 2] ([Palavra PT 2] - [Idioma Alvo 2])
[Palavra Traduzida 3] ([Palavra PT 3] - [Idioma Alvo 3])
[Palavra Original 4] ([Palavra PT 4] - Pt)`;

    const content = await _callGroqAPI(systemPrompt, userPrompt, apiKey, 150, 0.4);
    // O retorno esperado são as 4 linhas
    const lines = content.split('\n').map(l => l.trim()).filter(line => line.length > 0);
    return lines;
}

async function _step3MergeNames(translatedLines, raceName, template, apiKey, gender) {
    const systemPrompt = "Você é um exímio criador de Nomes de Fantasia. Sua especialidade é pegar pedaços silábicos de palavras estruturadas, cortá-las e fundi-las para criar Nomes e Sobrenomes lindíssimos e que fluam bem para a fala.";
    
    let userPrompt = `As fundações para a construção morfológica dos nossos nomes são estas 4 raízes:\n${translatedLines.join('\n')}\n\n`;
    userPrompt += `Raça: ${raceName}\n`;
    if (gender && gender !== 'any') userPrompt += `Gênero/Apresentação do indivíduo: ${gender}\n`;
    if (template.sonority || (template.promptNotes && template.promptNotes.trim() !== '')) {
        userPrompt += `Estilo Músico-Linguístico (Sonoridade Sugerida): ${template.sonority || template.promptNotes}\n`;
    }

    userPrompt += `\nREGRAS DE CRIAÇÃO OBRIGATÓRIAS:
1. Gere 5 opções diferentes de nomes de personagens (Nome e Sobrenome separados por espaço).
2. Para cada personagem, mescle sílabas retiradas ÚNICA E EXCLUSIVAMENTE das 4 palavras fornecidas.
3. Não use a palavra-base inteira se ela for de uso comum, desconstrua morfologicamente transformando-as em prefixos e sufixos!
4. Exemplo Metodológico: Raiz (Root - In) + Leão (Leon - Es) + Espada (Espada - Pt) = "Roolen Sangadra"

FORMATO DE RETORNO ESTrito PARA OS 5 PERSONAGENS:
LOGICA: [Explique brevemente de onde tirou os PEDAÇOS formatando como: "Palavra 1 + Palavra 2 | Palavra 3 + Palavra 4"]
NOME: [Nome Final Inédito gerado a partir da Lógica] [Sobrenome Inédito]
---

É PROIBIDO USAR MARCADORES NUMÉRICOS, BULLETS COMO (1.) OU INCLUIR TEXTOS EXTRAS. Apenas repita a estrutura LOGICA:\\nNOME:\\n--- cinco vezes.`;

    const content = await _callGroqAPI(systemPrompt, userPrompt, apiKey, 400, 0.7);
    
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
    
    return results;
}
