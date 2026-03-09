import { MODULE_ID } from "./settings.js";
import { generateNames } from "./api.js";

export class NameGeneratorApp extends FormApplication {
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            id: "name-generator-ai",
            classes: [MODULE_ID, "app"],
            title: "AI Name Generator",
            template: `modules/${MODULE_ID}/templates/name-generator.html`,
            width: 400,
            height: "auto",
            closeOnSubmit: false
        });
    }

    getData() {
        return {
            names: this.names || []
        };
    }

    activateListeners(html) {
        super.activateListeners(html);
        html.find('#generate-btn').click(this._onGenerate.bind(this));

        html.find('.copy-name').click(event => {
            const name = event.currentTarget.dataset.name;
            navigator.clipboard.writeText(name);
            ui.notifications.info(`Copied "${name}" to clipboard.`);
        });
    }

    async _onGenerate(event) {
        event.preventDefault();

        const btn = this.element.find('#generate-btn');
        const icon = btn.find('i');
        const originalIconClass = icon.attr('class');

        btn.prop('disabled', true);
        icon.attr('class', 'fas fa-spinner fa-spin');

        const race = this.element.find('#ng-race').val();
        const culture = this.element.find('#ng-culture').val();

        if (!race || !culture) {
            ui.notifications.warn("Please enter both a race and a culture.");
            btn.prop('disabled', false);
            icon.attr('class', originalIconClass);
            return;
        }

        const names = await generateNames(race, culture);

        btn.prop('disabled', false);
        icon.attr('class', originalIconClass);

        if (names && names.length > 0) {
            this.names = names;
            this.render(false);
        }
    }

    async _updateObject(event, formData) {
        // Required by FormApplication, but handled by the button click
    }
}
