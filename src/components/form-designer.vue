<template>
  <v-card>
    <v-card-text>
      <div class="form">
        <!-- Base Fields -->
        <div class="field-grid">
          <div class="field">
            <div class="field-label">{{ t('field_id') }}</div>
            <v-input
              v-model="fieldData.field"
              :disabled="!!props.field"
              placeholder="t:enter_field_id"
              required
            />
          </div>
          <div class="field">
            <div class="field-label">{{ t('display_name') }}</div>
            <v-input
              v-model="fieldData.name"
              placeholder="t:enter_display_name"
            />
          </div>
        </div>

        <!-- Field Type -->
        <div class="field-grid">
          <div class="field">
            <div class="field-label">Type</div>
            <v-select
              v-model="selectedInterface"
              :items="INTERFACE_TYPES"
              item-text="text"
              item-value="value"
            />
          </div>
          <div class="field">
            <div class="field-label">Field Width</div>
            <v-select
              v-model="fieldData.meta.width"
              :items="[
                { text: 'Full Width', value: 'full' },
                { text: 'Half Width', value: 'half' }
              ]"
            />
          </div>
        </div>

        <v-checkbox
          v-if="fieldData.meta.interface !== 'presentation-notice'"
          v-model="fieldData.meta.required"
          label="Required Field"
        />

        <!-- Field Specific Options -->
        <template v-if="hasSpecificOptions">
          <template v-if="fieldData.meta.interface === 'input'">
            <v-input
              v-model="fieldData.meta.options.placeholder"
              placeholder="t:enter_placeholder"
              :label="t('placeholder')"
            />
            <template v-if="['integer', 'decimal'].includes(fieldData.meta.type)">
              <div class="field-grid">
                <v-input
                  v-model="fieldData.meta.options.min"
                  :type="fieldData.meta.type"
                  label="Min Value"
                />
                <v-input
                  v-model="fieldData.meta.options.max"
                  :type="fieldData.meta.type"
                  label="Max Value"
                />
                <v-input
                  v-model="fieldData.meta.options.step"
                  :type="fieldData.meta.type"
                  label="Step"
                />
              </div>
            </template>
          </template>

          <template v-if="fieldData.meta.interface === 'input-multiline'">
            <v-input
              v-model="fieldData.meta.options.placeholder"
              placeholder="t:enter_placeholder"
              :label="t('placeholder')"
            />
          </template>

          <template v-if="fieldData.meta.interface === 'datetime'">
            <div class="field-grid">
              <div class="field">
                <div class="field-label">Time Format</div>
                <v-checkbox
                  v-model="fieldData.meta.options.use24"
                  label="Use 24-hour format"
                />
              </div>
              <div class="field">
                <div class="field-label">Date Type</div>
                <v-select
                  v-model="fieldData.meta.type"
                  :items="[
                    { text: 'Date Only', value: 'date' },
                    { text: 'Date & Time', value: 'timestamp' }
                  ]"
                />
              </div>
            </div>
          </template>

          <template v-if="fieldData.meta.interface === 'select-dropdown'">
            <div class="choices-container">
                <v-button
                  secondary
                  @click="addChoice"
                  icon="add"
                >
                  Add Choice
                </v-button>
              
              <div class="choices-grid">
                <div 
                  v-for="(choice, index) in fieldData.meta.options.choices" 
                  :key="index"
                  class="choice-row"
                >
                  <div class="field">
                    <div class="field-label">Value</div>
                    <v-input
                      v-model="choice.value"
                      placeholder="t:enter_choice_value"
                      class="choice-input"
                    />
                  </div>
                  <div class="field">
                    <div class="field-label">Label</div>
                    <v-input
                      v-model="choice.text"
                      placeholder="t:enter_choice_label"
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
              <v-select
                v-model="fieldData.meta.options.type"
                :items="NOTICE_TYPES"
                label="Notice Type"
              />
              <v-textarea
                v-model="fieldData.meta.options.text"
                label="Message"
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
    </v-card-text>

    <v-card-actions>
      <v-button secondary @click="$emit('cancel')">Cancel</v-button>
      <v-button @click="save">Save</v-button>
    </v-card-actions>
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps<{
  field?: any;
  existingFields?: any[];
}>();

const emit = defineEmits(['update:field', 'cancel']);

const { t } = useI18n();

const INTERFACE_TYPES = [
  { text: t('text'), value: 'input', type: 'string' },
  { text: t('multiline_text'), value: 'input-multiline', type: 'text' },
  { text: t('number'), value: 'input', type: 'integer' },
  { text: t('decimal'), value: 'input', type: 'decimal' },
  { text: t('dropdown'), value: 'select-dropdown', type: 'string' },
  { text: t('boolean'), value: 'boolean', type: 'boolean' },
  { text: t('date'), value: 'datetime', type: 'date' },
  { text: t('datetime'), value: 'datetime', type: 'timestamp' },
  { text: t('notice'), value: 'presentation-notice', type: 'string' }
];

const NOTICE_TYPES = [
  { text: 'Info', value: 'info' },
  { text: 'Success', value: 'success' },
  { text: 'Warning', value: 'warning' },
  { text: 'Danger', value: 'danger' }
];

const fieldData = ref(props.field ? { ...props.field } : {
  field: generateUniqueId(),
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

const fieldError = ref('');

const selectedInterface = computed({
  get: () => {
    const current = INTERFACE_TYPES.find(
      type => type.value === fieldData.value.meta.interface 
      && (
        // For date/time fields
        (type.value === 'datetime' && ['date', 'timestamp'].includes(fieldData.value.meta.type)) ||
        // For number fields
        (type.value === 'input' && ['integer', 'decimal'].includes(fieldData.value.meta.type)) ||
        // For other fields
        type.type === fieldData.value.meta.type
      )
    );
    return current?.value || 'input';
  },
  set: (newValue: string) => {
    const interfaceType = INTERFACE_TYPES.find(type => type.value === newValue);
    if (interfaceType) {
      updateInterface(interfaceType);
    }
  }
});

const hasSpecificOptions = computed(() => {
  return ['input', 'input-multiline', 'datetime', 'select-dropdown', 'boolean', 'presentation-notice']
    .includes(fieldData.value.meta.interface);
});

function updateInterface(interfaceType: any) {
  fieldData.value.meta.interface = interfaceType.value;
  fieldData.value.meta.type = interfaceType.type;
  
  // Reset options based on interface type
  fieldData.value.meta.options = {};
  
  switch (interfaceType.value) {
    case 'input':
      fieldData.value.meta.options = {
        placeholder: '',
        ...(interfaceType.type === 'decimal' && {
          min: null,
          max: null,
          step: 0.01
        }),
        ...(interfaceType.type === 'integer' && {
          min: null,
          max: null,
          step: 1
        })
      };
      break;
      
    case 'input-multiline':
      fieldData.value.meta.options = {
        placeholder: ''
      };
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
}

function addChoice() {
  if (!fieldData.value.meta.options.choices) {
    fieldData.value.meta.options.choices = [];
  }
  fieldData.value.meta.options.choices.push({ value: '', text: '' });
}

function removeChoice(index: number) {
  fieldData.value.meta.options.choices.splice(index, 1);
}
</script>

<style lang="scss" scoped>
.form {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: var(--theme--spacing);
}

.field-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--theme--form--column-gap, 32px);
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field-label {
  color: var(--theme--form--field--label--foreground);
  font-size: var(--theme--form--field--label--font-size, 14px);
}

.choices-container {
  margin-top: var(--theme--spacing);
}

.choices-header {
  margin-bottom: var(--theme--spacing);
}

.choices-grid {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.choice-row {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: var(--theme--form--column-gap, 32px);
  align-items: flex-end;
}

.choice-input {
  margin: 0;
}

</style>
