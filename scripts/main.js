import { MODULE_ID, registerSettings } from "./settings.js";
import { NameGeneratorApp } from "./app.js";

Hooks.once("init", () => {
    console.log(`${MODULE_ID} | Initializing Name Generator AI`);
    registerSettings();
});

Hooks.on("renderActorDirectory", (app, html, data) => {
    // Add a button to the directory header
    const button = $(`<button class="name-generator-btn"><i class="fas fa-magic"></i> Generate Names</button>`);

    button.on("click", () => {
        new NameGeneratorApp().render(true);
    });

    html.find('.header-actions').append(button);
});
