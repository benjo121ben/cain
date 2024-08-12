import {
  onManageActiveEffect,
  prepareActiveEffectCategories,
} from '../helpers/effects.mjs';

import { CAIN } from '../helpers/config.mjs';

/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export class CainActorSheet extends ActorSheet {
  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ['cain', 'sheet', 'actor'],
      width: 750,
      height: 750,
      tabs: [
        {
          navSelector: '.sheet-tabs',
          contentSelector: '.sheet-body',
          initial: 'features',
        },
      ],
    });
  }

  /** @override */
  get template() {
    return `systems/cain/templates/actor/actor-${this.actor.type}-sheet.hbs`;
  }

  /* -------------------------------------------- */

  /** @override */
  async getData() {
    const context = super.getData();
    const actorData = this.document.toPlainObject();
    context.system = actorData.system;
    context.flags = actorData.flags;
    context.config = CONFIG.CAIN;

    if (actorData.type == 'character') {
      this._prepareItems(context);
      this._prepareCharacterData(context);
    }

    if (actorData.type == 'npc') {
      this._prepareItems(context);
    }

    context.enrichedBiography = await TextEditor.enrichHTML(
      this.actor.system.biography,
      {
        secrets: this.document.isOwner,
        async: true,
        rollData: this.actor.getRollData(),
        relativeTo: this.actor,
      }
    );

    context.effects = prepareActiveEffectCategories(
      this.actor.allApplicableEffects()
    );

    this._calculateRanges(context);

    return context;
  }

  _prepareCharacterData(context) {
    // Character-specific data preparation
  }

  _prepareItems(context) {
    const gear = [];
    const features = [];
    const spells = {
      0: [],
      1: [],
      2: [],
      3: [],
      4: [],
      5: [],
      6: [],
      7: [],
      8: [],
      9: [],
    };

    for (let i of context.items) {
      i.img = i.img || Item.DEFAULT_ICON;
      if (i.type === 'item') {
        gear.push(i);
      } else if (i.type === 'feature') {
        features.push(i);
      } else if (i.type === 'spell') {
        if (i.system.spellLevel != undefined) {
          spells[i.system.spellLevel].push(i);
        }
      }
    }

    context.gear = gear;
    context.features = features;
    context.spells = spells;
  }

  _calculateRanges(context) {
    context.items.forEach(item => {
      if (item.system.range) {
        item.system.rangeValue = this._parseRange(item.system.range);
      }
    });
  }

  _parseRange(range) {
    const match = range.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);
  
    html.on('click', '.item-edit', (ev) => {
      const li = $(ev.currentTarget).parents('.item');
      const item = this.actor.items.get(li.data('itemId'));
      item.sheet.render(true);
    });
  
    if (!this.isEditable) return;
  
    html.on('click', '.item-create', this._onItemCreate.bind(this));
  
    html.on('click', '.item-delete', (ev) => {
      const li = $(ev.currentTarget).parents('.item');
      const item = this.actor.items.get(li.data('itemId'));
      item.delete();
      li.slideUp(200, () => this.render(false));
    });
  
    html.on('click', '.effect-control', (ev) => {
      const row = ev.currentTarget.closest('li');
      const document =
        row.dataset.parentId === this.actor.id
          ? this.actor
          : this.actor.items.get(row.dataset.parentId);
      onManageActiveEffect(ev, document);
    });
  
    html.on('click', '.rollable', this._onRoll.bind(this));
  
    if (this.actor.isOwner) {
      let handler = (ev) => this._onDragStart(ev);
      html.find('li.item').each((i, li) => {
        if (li.classList.contains('inventory-header')) return;
        li.setAttribute('draggable', true);
        li.addEventListener('dragstart', handler, false);
      });
    }
  
    // Checkbox logic
    html.find('.checkbox-group input[type="checkbox"]').on('change', (event) => {
      const field = event.currentTarget.closest('.checkbox-group').dataset.field;
      const checkboxes = html.find(`.checkbox-group[data-field="${field}"] input[type="checkbox"]`);
      let value = 0;
  
      checkboxes.each((index, cb) => {
        if (cb.checked) value = index + 1;
      });
  
      // Update the corresponding field value
      this.actor.update({ [`system.${field}.value`]: value });
    });
  
    // Talisman input changes
    html.find('.sinOverflow-checkbox').change(this._onOverflowChange.bind(this));
    html.find('.kit-points-checkbox').change(this._onKitPointsChange.bind(this));
    html.find('.clear-sin-marks').click(this._clearSinMarks.bind(this));
    html.find('.delete-sin-mark').click(this._deleteSinMark.bind(this));
    html.find('.roll-sin-mark').click(this._rollSinMark.bind(this));
    html.find('.talisman-name').change(this._onInputChange.bind(this));
    html.find('.talisman-curr-mark-amount').change(this._onInputChange.bind(this));
    html.find('.talisman-min-mark-amount').change(this._onInputChange.bind(this));
    html.find('.talisman-max-mark-amount').change(this._onInputChange.bind(this));
    html.find('.talisman-slider').on('input', this._onSliderChange.bind(this));
    html.find('#add-talisman').click(this._onAddTalisman.bind(this));
    html.find('.delete-talisman').click(this._onDeleteTalisman.bind(this));
    html.find('.increase-marks').click(this._onIncreaseMarks.bind(this));
    html.find('.change-image').click(this._onChangeImage.bind(this));
    html.find('.talisman-image').click(this._onImageClick.bind(this));
    html.find('.talisman-image').on('contextmenu', this._onDecreaseMarks.bind(this));
  }
  
  _onInputChange(event) {
    const index = event.currentTarget.dataset.index;
    const field = event.currentTarget.className.split('-')[1];
    const value = event.currentTarget.value;
    const talismans = this.actor.system.talismans || [];
    talismans[index][field] = value;
    this.actor.update({ 'system.talismans': talismans }).then(() => {
      this.render(false); // Re-render the sheet to reflect changes
    });
  }

  _onOverflowChange(event) {
    const checkboxes = document.querySelectorAll('.sinOverflow-checkbox');
    const isChecked = event.currentTarget.checked;
    let newValue = 0;
  
    checkboxes.forEach(checkbox => {
      if (checkbox.checked) {
        newValue++;
      }
    });
  
    console.log(isChecked);
    console.log(newValue);
  
    this.actor.update({ 'system.sinOverflow.value': newValue }).then(() => {
      this.render(false); // Re-render the sheet to reflect changes
    });
  }

  _onKitPointsChange(event) {
    const checkboxes = document.querySelectorAll('.kit-points-checkbox');
    const isChecked = event.currentTarget.checked;
    let newValue = 0;

    checkboxes.forEach(checkbox => {
      if (checkbox.checked) {
        newValue++;
      }
    });

    console.log(isChecked);
    console.log(newValue);
    
    this.actor.update({ 'system.kitPoints.value': newValue }).then(() => {
      this.render(false); // Re-render the sheet to reflect changes
    });
  }
  
  
  _onDecreaseMarks(event) {
    event.preventDefault();
    const index = event.currentTarget.dataset.index;
    const talismans = this.actor.system.talismans || [];
  
    // Change image similar to how the image change function works but in reverse
    const imagePath = talismans[index].imagePath;
    const imageNumber = parseInt(imagePath.match(/-(\d+)\.png$/)[1], 10);
    if (imageNumber > 0 && talismans[index].currMarkAmount >= 0) {
      talismans[index].currMarkAmount--;
      talismans[index].imagePath = imagePath.replace(/-(\d+)\.png$/, `-${imageNumber - 1}.png`);
    }
  
    this.actor.update({ 'system.talismans': talismans }).then(() => {
      this.render(false); // Re-render the sheet to reflect changes
    });
  }
  
  _onSliderChange(event) {
    const index = event.currentTarget.dataset.index;
    const value = event.currentTarget.value;
    const talismans = this.actor.system.talismans || [];
    talismans[index].currMarkAmount = parseInt(value, 10);
    const imagePath = talismans[index].imagePath;
    talismans[index].imagePath = imagePath.replace(/-(\d+)\.png$/, `-${value}.png`);
    this.actor.update({ 'system.talismans': talismans }).then(() => {
      this.render(false); // Re-render the sheet to reflect changes
    });
  }
  
  _onAddTalisman(event) {
    event.preventDefault();
    const talismans = this.actor.system.talismans || [];
    talismans.push({
      name: 'test-talisman',
      imagePath: 'systems/cain/assets/Talismans/Talisman-A-0.png',
      currMarkAmount: 0,
      minMarkAmount: 0,
      maxMarkAmount: 6,
    });
    this.actor.update({ 'system.talismans': talismans }).then(() => {
      this.render(false); // Re-render the sheet to reflect changes
    });
  }
  
  _onDeleteTalisman(event) {
    event.preventDefault();
    const index = event.currentTarget.dataset.index;
    const talismans = this.actor.system.talismans || [];
    talismans.splice(index, 1);
    this.actor.update({ 'system.talismans': talismans }).then(() => {
      this.render(false); // Re-render the sheet to reflect changes
    });
  }
  
  _onIncreaseMarks(event) {
    event.preventDefault();
    const index = event.currentTarget.dataset.index;
    const talismans = this.actor.system.talismans || [];
    if (talismans[index].currMarkAmount < talismans[index].maxMarkAmount) {
      talismans[index].currMarkAmount++;
      this.actor.update({ 'system.talismans': talismans }).then(() => {
        this.render(false); // Re-render the sheet to reflect changes
      });
    }
  }
  
  _onChangeImage(event) {
    event.preventDefault();
    const index = event.currentTarget.dataset.index;
    const newPath = prompt('Enter new image path:');
    if (newPath) {
      const talismans = this.actor.system.talismans || [];
      talismans[index].imagePath = newPath;
      this.actor.update({ 'system.talismans': talismans }).then(() => {
        this.render(false); // Re-render the sheet to reflect changes
      });
    }
  }
  
  _onImageClick(event) {
    const index = event.currentTarget.dataset.index;
    const talismans = this.actor.system.talismans || [];
    if (talismans[index].currMarkAmount < talismans[index].maxMarkAmount) {
      talismans[index].currMarkAmount++;
      const imagePath = talismans[index].imagePath;
      const imageNumber = parseInt(imagePath.match(/-(\d+)\.png$/)[1], 10);
      if (imageNumber < talismans[index].maxMarkAmount) {
        talismans[index].imagePath = imagePath.replace(/-(\d+)\.png$/, `-${imageNumber + 1}.png`);
      }
      this.actor.update({ 'system.talismans': talismans }).then(() => {
        this.render(false); // Re-render the sheet to reflect changes
      });
    }
  }

  async _rollSinMark(event) {
    event.preventDefault();
    
    // Manually roll 1d6 for the mark
    const TWIST = new foundry.dice.MersenneTwister(Date.now());
    const roll = new Roll('1d6');
    roll.evaluateSync({strict: false});
    let markRoll = Array(roll.dice[0].number).fill(roll.dice[0].faces).reduce((acc, f) => acc + Math.ceil(TWIST.random() * f), roll.total);
    let markIndex = markRoll - 1;
    
    console.log(markRoll);
    console.log(markIndex);
  
    // If rolled a 6, allow the user to choose the mark
    if (markRoll === 6) {
      markIndex = await this._chooseMark();
    }
  
    const sinMarks = this.actor.system.currentSinMarks || [];
    const sinMark = CAIN.sinMarks[markIndex];
  
    // Check if the mark already exists
    const existingMark = sinMarks.find(mark => mark.startsWith(sinMark.name));
    if (existingMark) {
      // Manually roll 1d6 for the ability
      let abilityRoll;
      let newAbility;
      do {
        let abilityRoll = new Roll('1d6');
        abilityRoll.evaluateSync({strict: false});
        abilityRoll = Array(abilityRoll.dice[0].number).fill(abilityRoll.dice[0].faces).reduce((acc, f) => acc + Math.ceil(TWIST.random() * f), abilityRoll.total);
        newAbility = sinMark.abilities[abilityRoll - 1];
      } while (existingMark.includes(newAbility));
  
      // Add the new ability to the existing mark
      sinMarks[sinMarks.indexOf(existingMark)] += `, ${newAbility}`;
    } else {
      // Manually roll 1d6 for the ability
      let abilityRoll = new Roll('1d6');
      abilityRoll.evaluateSync({strict: false});
      abilityRoll = Array(abilityRoll.dice[0].number).fill(abilityRoll.dice[0].faces).reduce((acc, f) => acc + Math.ceil(TWIST.random() * f), abilityRoll.total);
      console.log(sinMark);
      const newAbility = sinMark.abilities[abilityRoll - 1];
  
      // Format the sinMark as "Name - Ability"
      const formattedSinMark = `${sinMark.name} - ${newAbility}`;
  
      // Add the new mark to the sinMarks array
      sinMarks.push(formattedSinMark);
    }
  
    // Update the actor with the new sinMarks array
    this.actor.update({ 'system.currentSinMarks': sinMarks }).then(() => {
      this.render(false); // Re-render the sheet to reflect changes
    });
  }

  async _deleteSinMark(event) {
    event.preventDefault();
    const index = event.currentTarget.dataset.index;
    const sinMarks = this.actor.system.currentSinMarks || [];
    sinMarks.splice(index, 1);
    this.actor.update({ 'system.currentSinMarks': sinMarks }).then(() => {
      this.render(false); // Re-render the sheet to reflect changes
    });
  }

  async _clearSinMarks(event) {
    event.preventDefault();
    this.actor.update({ 'system.currentSinMarks': [] }).then(() => {
      this.render(false); // Re-render the sheet to reflect changes
    });
  }
  
  async _chooseMark() {
    return new Promise((resolve) => {
      const options = CAIN.sinMarks.map((mark, index) => `<option value="${index}">${mark.name}</option>`).join('');
      const content = `
        <form>
          <div class="form-group">
            <label>Choose a Sin Mark:</label>
            <select id="mark-select">${options}</select>
          </div>
        </form>
      `;
  
      new Dialog({
        title: "Choose Sin Mark",
        content: content,
        buttons: {
          choose: {
            label: "Choose",
            callback: (html) => {
              const selectedIndex = parseInt(html.find('#mark-select').val());
              resolve(selectedIndex);
            }
          }
        },
        default: "choose",
        close: () => resolve(0) // Default to the first mark if the dialog is closed
      }).render(true);
    });
  }
  
  async _onItemCreate(event) {
    event.preventDefault();
    const header = event.currentTarget;
    const type = header.dataset.type;
    const data = foundry.utils.duplicate(header.dataset);
    const name = `New ${type.capitalize()}`;
    const itemData = {
      name: name,
      type: type,
      system: data,
    };
    delete itemData.system['type'];

    return await Item.create(itemData, { parent: this.actor });
  }


  _onRoll(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const dataset = element.dataset;

    if (dataset.rollType) {
      if (dataset.rollType == 'item') {
        const itemId = element.closest('.item').dataset.itemId;
        const item = this.actor.items.get(itemId);
        if (item) return item.roll();
      }
    }

    if (dataset.roll) {
      let label = dataset.label ? ` You rolled for ${dataset.label}` : '';
      let roll = new Roll(dataset.roll, this.actor.getRollData());

      console.log(roll);
      roll.roll().then(result => {
        let rollTotal = result.total;
        let message = '';

        result.toMessage({
          speaker: ChatMessage.getSpeaker({ actor: this.actor }),
          flavor: `${label} ${message}`,
          rollMode: game.settings.get('core', 'rollMode'),
        });
      });

      return roll;
    }
  }
}