export const MODULE_ID = "name-generator-ai";

export function registerSettings() {
  game.settings.register(MODULE_ID, "groqApiKey", {
    name: "Groq API Key",
    hint: "Enter your Groq API key here to enable AI name generation.",
    scope: "world",     
    config: true,
    type: String,
    default: "",
    restricted: true,
  });
}
