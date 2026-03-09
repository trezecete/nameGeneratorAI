import { MODULE_ID } from "./settings.js";
import { RACE_TEMPLATES } from "./templates.js";

export class RaceTemplatesEditor extends FormApplication {
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            id: "race-templates-editor",
            classes: [MODULE_ID, "templates-editor"],
            title: "Manage Race Templates",
            template: `modules/${MODULE_ID}/templates/templates-editor.html`,
            width: 600,
            height: 700,
            resizable: true,
            closeOnSubmit: true
        });
    }

    getData() {
        const templates = game.settings.get(MODULE_ID, "raceTemplates") || RACE_TEMPLATES;
        return {
            templates: templates
        };
    }

    activateListeners(html) {
        super.activateListeners(html);

        html.find('#add-template').click(this._onAddTemplate.bind(this));
        html.find('.delete-template').click(this._onDeleteTemplate.bind(this));
        html.find('#reset-templates').click(this._onResetTemplates.bind(this));
    }

    async _onAddTemplate(event) {
        event.preventDefault();
        const formData = this._getSubmitData();
        const templates = expandObject(formData).templates || {};

        const newKey = `race_${Object.keys(templates).length + 1}_${Date.now()}`;
        templates[newKey] = {
            label: "New Race",
            description: "Description of the race names.",
            promptNotes: "AI instructions for this race."
        };

        this.templates = templates;
        this.render();
    }

    async _onDeleteTemplate(event) {
        event.preventDefault();
        const id = event.currentTarget.closest('.template-item').dataset.id;

        const formData = this._getSubmitData();
        const templates = expandObject(formData).templates || {};
        delete templates[id];

        this.templates = templates;
        this.render();
    }

    async _onResetTemplates(event) {
        event.preventDefault();
        const confirm = await Dialog.confirm({
            title: "Reset Templates",
            content: "<p>Are you sure you want to reset all templates to module defaults? This will erase your changes.</p>"
        });

        if (confirm) {
            await game.settings.set(MODULE_ID, "raceTemplates", RACE_TEMPLATES);
            this.render();
        }
    }

    async _updateObject(event, formData) {
        const expanded = expandObject(formData);
        const templates = expanded.templates || {};

        // Clean up keys if necessary (e.g. if we had specific logic for custom)
        await game.settings.set(MODULE_ID, "raceTemplates", templates);
        ui.notifications.info("Race templates saved successfully.");

        // Re-render the main app if open
        Object.values(ui.windows).forEach(w => {
            if (w.constructor.name === "NameGeneratorApp") w.render(true);
        });
    }

    // Override to use internal memory if we haven't saved yet but re-rendered
    render(force, options) {
        if (this.templates) {
            options = options || {};
            options.data = { templates: this.templates };
        }
        return super.render(force, options);
    }
}
