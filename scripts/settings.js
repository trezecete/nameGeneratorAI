import { RaceTemplatesEditor } from "./templates-editor.js";
import { RACE_TEMPLATES } from "./templates.js";

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

  game.settings.register(MODULE_ID, "raceTemplates", {
    name: "Race Templates",
    scope: "world",
    config: false,
    type: Object,
    default: RACE_TEMPLATES
  });

  game.settings.registerMenu(MODULE_ID, "raceTemplatesMenu", {
    name: "Manage Race Templates",
    label: "Configure Templates",
    hint: "Configure the races, descriptions, and AI instructions for the name generator.",
    icon: "fas fa-users-cog",
    type: RaceTemplatesEditor,
    restricted: true
  });
}
