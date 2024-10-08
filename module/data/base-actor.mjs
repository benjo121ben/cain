import CainDataModel from "./base-model.mjs";

export default class CainActorBase extends CainDataModel {

  static defineSchema() {
    const fields = foundry.data.fields;
    const requiredInteger = { required: true, nullable: false, integer: true };
    const schema = {};

    schema.health = new fields.SchemaField({
      value: new fields.NumberField({ ...requiredInteger, initial: 10, min: 0 }),
      max: new fields.NumberField({ ...requiredInteger, initial: 10 })
    });
    schema.power = new fields.SchemaField({
      value: new fields.NumberField({ ...requiredInteger, initial: 5, min: 0 }),
      max: new fields.NumberField({ ...requiredInteger, initial: 5 })
    });
    schema.biography = new fields.StringField({ required: true, initial: "<b>QUESTIONNAIRE</b><ul><li>How did you first manifest your powers?</li><li>Is your sin-seed in your brain or in your heart?</li><li>What do you hide in the deepest parts of you?</li><li>Is your hand your hand?</li><li>Do you remember the face of your mother?</li></ul>" });  
    
    return schema;

  }
}