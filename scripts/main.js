import { MODULE_ID, registerSettings } from "./settings.js";
import { NameGeneratorApp } from "./app.js";

Hooks.once("init", () => {
    console.log(`${MODULE_ID} | Initializing Name Generator AI`);
    registerSettings();

    // Auto-register API for macros
    game.modules.get(MODULE_ID).api = {
        NameGeneratorApp,
        showApp: () => new NameGeneratorApp().render(true)
    };
});

Hooks.on("renderActorDirectory", (app, html, data) => {
    // Add a button to the directory header
    const button = $(`<button class="name-generator-btn"><i class="fas fa-magic"></i> Generate Names</button>`);

    button.on("click", () => {
        new NameGeneratorApp().render(true);
    });

    // Try finding action-buttons first (Foundry v11/v12 standard), fallback to header-actions
    let headerActions = html.find('.directory-header .action-buttons');
    if (headerActions.length === 0) {
        headerActions = html.find('.header-actions');
    }

    headerActions.append(button);
});
