import { MODULE_ID } from "./settings.js";
import { generateNames } from "./api.js";

export class NameGeneratorApp extends FormApplication {
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            id: "name-generator-ai",
            classes: [MODULE_ID, "app"],
            title: "AI Name Generator",
            template: `modules/${MODULE_ID}/templates/name-generator.html`,
            width: 420,
            height: "auto",
            closeOnSubmit: false
        });
    }

    getData() {
        const templates = game.settings.get(MODULE_ID, "raceTemplates");
        return {
            names: this.names || [],
            races: templates
        };
    }

    activateListeners(html) {
        super.activateListeners(html);

        // Initialize race description
        this._updateRaceDescription(html);

        html.find('#ng-race').change(event => {
            this._updateRaceDescription(html);
        });

        html.find('#generate-btn').click(this._onGenerate.bind(this));

        html.find('.copy-name').click(event => {
            const name = event.currentTarget.dataset.name;
            navigator.clipboard.writeText(name);
            ui.notifications.info(`Copied "${name}" to clipboard.`);
        });
    }

    _updateRaceDescription(html) {
        const selectedRace = html.find('#ng-race').val();
        const templates = game.settings.get(MODULE_ID, "raceTemplates");
        const template = templates[selectedRace];

        if (template) {
            html.find('#ng-race-description').text(template.description);
        }

        if (selectedRace === 'custom') {
            html.find('#ng-custom-race-group').slideDown(200);
        } else {
            html.find('#ng-custom-race-group').slideUp(200);
        }
    }

    async _onGenerate(event) {
        event.preventDefault();

        const btn = this.element.find('#generate-btn');
        const icon = btn.find('i');
        const originalIconClass = icon.attr('class');

        btn.prop('disabled', true);
        icon.attr('class', 'fas fa-spinner fa-spin');

        const raceKey = this.element.find('#ng-race').val();
        const customRace = this.element.find('#ng-custom-race').val();
        const gender = this.element.find('#ng-gender').val();
        const className = this.element.find('#ng-class').val();
        const culture = this.element.find('#ng-culture').val();

        if (raceKey === 'custom' && !customRace.trim()) {
            ui.notifications.warn("Please enter a custom race name.");
            btn.prop('disabled', false);
            icon.attr('class', originalIconClass);
            return;
        }

        const options = {
            raceKey,
            customRace,
            gender,
            className,
            culture
        };

        const names = await generateNames(options);

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
