<template>
  <v-drawer
    v-model="internalActive"
    :title="props.field ? t('edit_field') : t('add_field')"
    icon="box"
    persistent
    @cancel="$emit('cancel')"
  >
    <div class="content">
      <div class="form">
        <!-- Base Fields -->
        <div class="field-grid">
          <div class="field">
            <div class="field-label">{{ t('display_name') }}</div>
            <v-input
              v-model="fieldData.name"
              :placeholder="t('enter_display_name')"
              @update:model-value="updateFieldId"
              required
            />
          </div>
          <div class="field">
            <div class="field-label">{{ t('field_id') }}</div>
            <v-input
              v-model="fieldData.field"
              :disabled="!!props.field"
              :placeholder="t('enter_field_id')"
            />
          </div>
        </div>

        <!-- Field Type -->
        <div class="field-grid">
          <div class="field">
            <div class="field-label">{{ t('field_type') }}</div>
            <v-select
              v-model="selectedInterface"
              :items="INTERFACE_TYPES"
              item-text="text"
              item-value="value"
            />
          </div>
          <div class="field">
            <div class="field-label">{{ t('field_width') }}</div>
            <v-select
              v-model="fieldData.meta.width"
              :items="[
                { text: t('full_width'), value: 'full' },
                { text: t('half_width'), value: 'half' }
              ]"
            />
          </div>
        </div>

        <!-- After field width selection -->
        <div class="field-grid">
          <div class="field" v-if="['input', 'input-multiline'].includes(fieldData.meta.interface)">
            <div class="field-label">{{ t('input_type') }}</div>
            <v-select
              v-model="selectedInputType"
              :items="INPUT_TYPES"
              item-text="text"
              item-value="value"
            />
          </div>
          <div class="field">
            <div class="field-label">{{ t('required') }}</div>
            <div class="field-input">
              <v-checkbox
                v-if="fieldData.meta.interface !== 'presentation-notice'"
                v-model="fieldData.meta.required"
                :label="t('required_field')"
                block
              />
            </div>
          </div>
        </div>

        <!-- Field Specific Options -->
        <template v-if="hasSpecificOptions">
          <template v-if="['input', 'input-multiline'].includes(fieldData.meta.interface)">
            <div class="field">
              <div class="field-label">{{ t('placeholder') }}</div>
              <template v-if="fieldData.meta.options.inputType === 'multiline'">
                <v-textarea
                  v-model="fieldData.meta.options.placeholder"
                  :placeholder="$t('enter_a_placeholder')"
                />
              </template>
              <template v-else>
                <v-input
                  v-model="fieldData.meta.options.placeholder"
                  :placeholder="$t('enter_a_placeholder')"
                />
              </template>
            </div>

            <template v-if="['integer', 'decimal'].includes(fieldData.meta.options.inputType)">
              <div class="field-grid">
                <div class="field">
                  <div class="field-label">{{ t('minimum_value') }}</div>
                  <v-input
                    v-model="fieldData.meta.options.min"
                    :type="fieldData.meta.type"
                    :placeholder="$t('enter_minimum_value')"
                  />
                </div>
                <div class="field">
                  <div class="field-label">{{ t('maximum_value') }}</div>
                  <v-input
                    v-model="fieldData.meta.options.max"
                    :type="fieldData.meta.type"
                    :placeholder="$t('enter_maximum_value')"
                  />
                </div>
                <div class="field">
                  <div class="field-label">{{ t('step_interval') }}</div>
                  <v-input
                    v-model="fieldData.meta.options.step"
                    :type="fieldData.meta.type"
                    :placeholder="$t('enter_step_value')"
                  />
                </div>
              </div>
            </template>
          </template>

          <template v-if="fieldData.meta.interface === 'datetime'">
            <div class="field-grid">
              <div class="field">
                <div class="field-label">{{ t('date_type') }}</div>
                <v-select
                  v-model="fieldData.meta.type"
                  :items="[
                    { text: t('date_only'), value: 'date' },
                    { text: t('date_and_time'), value: 'timestamp' }
                  ]"
                />
              </div>
              <div class="field">
                <div class="field-label">{{ t('time_format') }}</div>
                <v-checkbox
                  v-model="fieldData.meta.options.use24"
                  :label="t('use_24h_format')"
                />
              </div>
            </div>
          </template>

          <template v-if="fieldData.meta.interface === 'select-dropdown'">
            <div class="choices-container">
              <div class="choices-header">
                <v-button
                  secondary
                  @click="addChoice"
                >
                  {{ t('add_choice') }}
                  <v-icon name="add" />
                </v-button>
              </div>
              
              <div class="choices-grid">
                <div 
                  v-for="(choice, index) in fieldData.meta.options.choices" 
                  :key="index"
                  class="choice-row"
                >
                  <div class="field">
                    <div class="field-label">Label</div>
                    <v-input
                      v-model="choice.text"
                      :placeholder="t('enter_choice_label')"
                      class="choice-input"
                      @update:model-value="updateChoiceValue(index)"
                    />
                  </div>
                  <div class="field">
                    <div class="field-label">Value</div>
                    <v-input
                      v-model="choice.value"
                      :placeholder="t('enter_choice_value')"
                      class="choice-input"
                    />
                  </div>
                  <v-icon
                    name="close"
                    clickable
                    @click="removeChoice(index)"
                  />
                </div>
              </div>
            </div>
          </template>

          <template v-if="fieldData.meta.interface === 'select-radio'">
            <div class="choices-container">
              <div class="choices-header">
                <v-button
                  secondary
                  @click="addChoice"
                >
                  {{ t('add_choice') }}
                  <v-icon name="add" />
                </v-button>
              </div>
              
              <div class="choices-grid">
                <div 
                  v-for="(choice, index) in fieldData.meta.options.choices" 
                  :key="index"
                  class="choice-row"
                >
                  <div class="field">
                    <div class="field-label">Label</div>
                    <v-input
                      v-model="choice.text"
                      :placeholder="t('enter_choice_label')"
                      class="choice-input"
                      @update:model-value="updateChoiceValue(index)"
                    />
                  </div>
                  <div class="field">
                    <div class="field-label">Value</div>
                    <v-input
                      v-model="choice.value"
                      :placeholder="t('enter_choice_value')"
                      class="choice-input"
                    />
                  </div>
                  <v-icon
                    name="close"
                    clickable
                    @click="removeChoice(index)"
                  />
                </div>
              </div>
            </div>
          </template>

          <template v-if="fieldData.meta.interface === 'boolean'">
            <v-input
              v-model="fieldData.meta.options.label"
              label="Checkbox Label"
            />
          </template>

          <template v-if="fieldData.meta.interface === 'presentation-notice'">
            <div class="field-grid">
              <div class="field">
                <div class="field-label">{{ t('notice_type') }}</div>
                <v-select
                  v-model="fieldData.meta.options.type"
                  :items="NOTICE_TYPES"
                />
              </div>
              <div class="field">
                <div class="field-label">{{ t('notice_message') }}</div>
                <v-input
                  v-model="fieldData.meta.options.text"
                  :placeholder="$t('enter_notice_message')"
                />
              </div>
            </div>
          </template>

          <template v-if="fieldData.meta.interface === 'select-multiple-checkbox'">
            <div class="choices-container">
              <div class="choices-header">
                <v-button
                  secondary
                  @click="addChoice"
                >
                  {{ t('add_choice') }}
                  <v-icon name="add" />
                </v-button>
              </div>
              
              <div class="choices-grid">
                <div 
                  v-for="(choice, index) in fieldData.meta.options.choices" 
                  :key="index"
                  class="choice-row"
                >
                  <div class="field">
                    <div class="field-label">Label</div>
                    <v-input
                      v-model="choice.text"
                      :placeholder="t('enter_choice_label')"
                      class="choice-input"
                      @update:model-value="updateChoiceValue(index)"
                    />
                  </div>
                  <div class="field">
                    <div class="field-label">Value</div>
                    <v-input
                      v-model="choice.value"
                      :placeholder="t('enter_choice_value')"
                      class="choice-input"
                    />
                  </div>
                  <v-icon
                    name="close"
                    clickable
                    @click="removeChoice(index)"
                  />
                </div>
              </div>
            </div>
          </template>

          <template v-if="fieldData.meta.interface === 'presentation-html'">
            <div class="field">
              <div class="field-label">{{ t('html_content') }}</div>
              <interface-input-rich-text-html
                :value="fieldData.meta.options.html"
                :toolbar="[
                  'bold', 
                  'italic', 
                  'underline',
                  'bullist', 
                  'numlist',
                  'removeformat', 
                  'customImage',
                  'alignleft', 
                  'aligncenter',
                  'h1', 'h2', 'h3',
                  'table',
                  'code'
                ]"
                :tinymce-overrides="{
                  entity_encoding: 'raw',
                  height: 300
                }"
                @input="fieldData.meta.options.html = $event"
              />
            </div>
          </template>
        </template>

        <v-notice
          v-if="fieldError"
          type="danger"
        >
          {{ fieldError }}
        </v-notice>
      </div>
    </div>

    <template #actions>
      <v-button
        v-tooltip.bottom="t('save')"
        icon
        rounded
        @click="save"
      >
        <v-icon name="check" />
      </v-button>
    </template>
  </v-drawer>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps<{
  field?: any;
  existingFields?: any[];
  active: boolean;
}>();

const emit = defineEmits(['update:field', 'cancel', 'update:active']);

const { t } = useI18n();

const internalActive = computed({
  get: () => props.active,
  set: (val) => emit('update:active', val)
});

watch(() => internalActive.value, (newVal) => {
  if (!newVal) {
    emit('cancel');
  }
});

const INTERFACE_TYPES = [
  { text: t('input'), value: 'input', type: 'string' },
  { text: t('dropdown'), value: 'select-dropdown', type: 'string' },
  { text: t('radio'), value: 'select-radio', type: 'string' },
  { text: t('checkbox group'), value: 'select-multiple-checkbox', type: 'json' },
  { text: t('boolean'), value: 'boolean', type: 'boolean' },
  { text: t('datetime'), value: 'datetime', type: 'timestamp' },
  { text: t('notice'), value: 'presentation-notice', type: 'string' },
  { text: t('html content'), value: 'presentation-html', type: 'text' }
];

const INPUT_TYPES = [
  { text: t('text'), value: 'text', type: 'string' },
  { text: t('multiline'), value: 'multiline', type: 'text' },
  { text: t('number'), value: 'integer', type: 'integer' },
  { text: t('decimal'), value: 'decimal', type: 'decimal' }
];

const NOTICE_TYPES = [
  { text: 'Info', value: 'info' },
  { text: 'Success', value: 'success' },
  { text: 'Warning', value: 'warning' },
  { text: 'Danger', value: 'danger' }
];

let previousAutoId = '';

const getDefaultFieldData = () => ({
  field: '',
  name: '',
  meta: {
    interface: 'input',
    type: 'string',
    width: 'full',
    required: false,
    options: {
      placeholder: ''
    }
  },
  value: null
});

const fieldData = ref(props.field ? { ...props.field } : getDefaultFieldData());

watch(() => props.active, (newVal) => {
  if (newVal && !props.field) {
    fieldData.value = getDefaultFieldData();
  }
});

const fieldError = ref('');

const selectedInterface = computed({
  get: () => {
    const current = INTERFACE_TYPES.find(
      type => type.value === fieldData.value.meta.interface 
      && type.type === fieldData.value.meta.type
      && (!type.inputType || type.inputType === fieldData.value.meta.options?.inputType)
    );
    return current?.value || 'input';
  },
  set: (newValue: string) => {
    const interfaceType = INTERFACE_TYPES.find(type => type.value === newValue);
    if (interfaceType) {
      fieldData.value.meta.interface = interfaceType.value;
      fieldData.value.meta.type = interfaceType.type;
      updateInterface(interfaceType);
    }
  }
});

const selectedInputType = computed({
  get: () => {
    return fieldData.value.meta.options?.inputType || 'text';
  },
  set: (newValue: string) => {
    const inputType = INPUT_TYPES.find(type => type.value === newValue);
    if (inputType) {
      fieldData.value.meta.type = inputType.type;
      fieldData.value.meta.interface = inputType.value === 'multiline' ? 'input-multiline' : 'input';
      fieldData.value.meta.options = {
        ...fieldData.value.meta.options,
        inputType: inputType.value,
        ...(inputType.value === 'multiline' && {
          placeholder: fieldData.value.meta.options?.placeholder || '',
          trim: true,
          font: 'sans-serif',
          clear: false
        }),
        ...(inputType.value === 'decimal' && {
          min: null,
          max: null,
          step: 0.01
        }),
        ...(inputType.value === 'integer' && {
          min: null,
          max: null,
          step: 1
        })
      };
    }
  }
});

const hasSpecificOptions = computed(() => {
  return [
    'input', 
    'input-multiline', 
    'datetime', 
    'select-dropdown', 
    'select-radio', 
    'boolean', 
    'presentation-notice', 
    'select-multiple-checkbox',
    'presentation-html'
  ].includes(fieldData.value.meta.interface);
});

function updateInterface(interfaceType: any) {
  fieldData.value.meta.options = {};
  
  switch (interfaceType.value) {
    case 'input':
      fieldData.value.meta.options = {
        placeholder: '',
        inputType: 'text',
        min: null,
        max: null,
        step: null,
        trim: true
      };
      fieldData.value.meta.type = 'string';
      break;
      
    case 'datetime':
      fieldData.value.meta.options = {
        use24: true,
        mode: interfaceType.type === 'date' ? 'date' : 'datetime'
      };
      break;
      
    case 'select-dropdown':
      fieldData.value.meta.options = {
        choices: []
      };
      break;
      
    case 'boolean':
      fieldData.value.meta.options = {
        label: 'Enabled'
      };
      break;
      
    case 'presentation-notice':
      fieldData.value.meta.options = {
        text: '',
        type: 'info'
      };
      break;

    case 'select-multiple-checkbox':
      fieldData.value.meta.options = {
        choices: [],
        allowOther: false,
        iconOn: 'check_box',
        iconOff: 'check_box_outline_blank',
        color: 'var(--theme--primary)',
        itemsShown: 12
      };
      break;

    case 'presentation-html':
      fieldData.value.meta.options = {
        html: ''
      };
      break;
  }
}

function generateUniqueId() {
  return `field_${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

function validateFieldId(): boolean {
  if (!fieldData.value.field) {
    fieldError.value = 'Field ID is required';
    return false;
  }

  // If we're editing an existing field, allow the same ID
  if (props.field?.field === fieldData.value.field) {
    return true;
  }

  const existingField = props.existingFields?.find(
    f => f.field === fieldData.value.field
  );

  if (existingField) {
    fieldError.value = `This ID is already used. Try: ${fieldData.value.field}_${Date.now()}`;
    return false;
  }

  fieldError.value = '';
  return true;
}

function save() {
  if (!validateFieldId()) return;
  emit('update:field', JSON.parse(JSON.stringify(fieldData.value)));
  internalActive.value = false;
}

function formatValueFromLabel(label: string): string {
  if (!label) return '';

  return label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_') // Replace special chars and spaces with underscore
    .replace(/^_+|_+$/g, '')     // Remove leading/trailing underscores
    .replace(/_+/g, '_');        // Replace multiple underscores with single
}

function updateChoiceValue(index: number) {
  const choice = fieldData.value.meta.options.choices[index];
  // If text is empty, clear the value too
  if (!choice.text) {
    choice.value = '';
    return;
  }

  // Generate the new value from the current text
  const newValue = formatValueFromLabel(choice.text);
  
  // Update if empty or if the current value was auto-generated from a previous text
  const previousValue = formatValueFromLabel(choice.text.slice(0, -1));
  if (!choice.value || choice.value === '' || choice.value === previousValue) {
    choice.value = newValue;
  }
}

function addChoice() {
  if (!fieldData.value.meta.options.choices) {
    fieldData.value.meta.options.choices = [];
  }
  fieldData.value.meta.options.choices.push({ text: '', value: '' });
}

function removeChoice(index: number) {
  fieldData.value.meta.options.choices.splice(index, 1);
}

function updateFieldId() {
  // Only auto-generate if this is a new field and the ID hasn't been manually edited
  if (!props.field && (!fieldData.value.field || fieldData.value.field === previousAutoId)) {
    const newId = formatValueFromLabel(fieldData.value.name);
    fieldData.value.field = newId ? `field_${newId}` : generateUniqueId();
    previousAutoId = fieldData.value.field;
  }
}
</script>

<style lang="scss" scoped>
.content {
  padding: var(--content-padding);
}

.form {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.field-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-gap: var(--theme--form--column-gap, 8px);
}

.field {
  display: flex;
  flex-direction: column;

  > * + * {
    margin-top: 8px;
  }
}

.field-label {
  color: var(--theme--form--field--label--foreground);
  font-size: var(--theme--form--field--label--font-size, 14px);
}

.choices-container {
  display: flex;
  flex-direction: column;

  > * + * {
    margin-top: 24px;
  }
}

.choices-header {
  display: flex;
  
  .add-choice-button {
    min-width: 120px;
  }
}

.choices-grid {
  display: flex;
  flex-direction: column;

  > * + * {
    margin-top: 24px;
  }
}

.choice-row {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  grid-gap: var(--theme--form--column-gap, 8px);
  align-items: center;
}

.choice-row .v-icon {
  display: flex;
  align-items: center;
}

.choice-input {
  margin: 0;
}
</style>
