<template>
  <v-card>
    <v-card-text>
      <div class="field-form">
        <!-- Basic field info -->
        <div class="field-row">
          <v-input
            v-model="fieldData.field"
            placeholder="Field ID"
            class="field-half"
          />
          <v-input
            v-model="fieldData.name"
            placeholder="Display Name"
            class="field-half"
          />
        </div>

        <!-- Interface selection -->
        <div class="field-row">
          <v-select
            v-model="fieldData.meta.interface"
            :items="availableInterfaces"
            placeholder="Select Interface"
            class="field-half"
          />
          <v-select
            v-model="fieldData.meta.width"
            :items="[
              { text: 'Full Width', value: 'full' },
              { text: 'Half Width', value: 'half' }
            ]"
            placeholder="Field Width"
            class="field-half"
          />
        </div>

        <!-- Interface specific options -->
        <div v-if="fieldData.meta.interface === 'input'" class="field-row">
          <v-select
            v-model="fieldData.meta.type"
            :items="inputTypes"
            placeholder="Input Type"
            class="field-full"
          />
        </div>

        <div v-if="fieldData.meta.interface === 'input'" class="field-row">
          <v-input
            v-model="fieldData.meta.options.placeholder"
            placeholder="Placeholder Text"
            class="field-full"
          />
        </div>

        <!-- Number type specific options -->
        <div v-if="['integer', 'decimal'].includes(fieldData.meta.type)" class="field-row">
          <v-input
            v-model="fieldData.meta.options.min"
            type="number"
            placeholder="Min Value"
            class="field-third"
          />
          <v-input
            v-model="fieldData.meta.options.max"
            type="number"
            placeholder="Max Value"
            class="field-third"
          />
          <v-input
            v-model="fieldData.meta.options.step"
            type="number"
            placeholder="Step"
            class="field-third"
          />
        </div>

        <!-- Date and time specific options -->
        <div v-if="fieldData.meta.interface === 'datetime'" class="field-row">
          <v-select
            v-model="fieldData.meta.type"
            :items="[
              { text: 'Date & Time', value: 'timestamp' },
              { text: 'Date Only', value: 'date' }
            ]"
            placeholder="Date Type"
            class="field-half"
          />
          <v-checkbox
            v-model="fieldData.meta.required"
            label="Required"
            class="field-half"
          />
        </div>
      </div>
    </v-card-text>

    <v-card-actions>
      <v-button secondary @click="$emit('cancel')">Cancel</v-button>
      <v-button @click="save">Save</v-button>
    </v-card-actions>
  </v-card>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

const props = defineProps<{
  field?: any; // Optional - if provided, we're editing an existing field
}>();

const emit = defineEmits(['update:field', 'cancel']);

// Initialize field data from prop or create new
const fieldData = ref(props.field ? JSON.parse(JSON.stringify(props.field)) : {
  field: '',
  name: '',
  meta: {
    interface: 'input',
    type: 'string',
    width: 'full',
    options: {}
  },
  value: null
});

// Available options
const availableInterfaces = [
  { text: 'Input', value: 'input' },
  { text: 'Date & Time', value: 'datetime' },
  { text: 'Boolean', value: 'boolean' },
  { text: 'Dropdown', value: 'select-dropdown' },
  { text: 'Notice', value: 'presentation-notice' }
];

const inputTypes = [
  { text: 'Text', value: 'string' },
  { text: 'Number', value: 'integer' },
  { text: 'Decimal', value: 'decimal' },
  { text: 'Multiline Text', value: 'text' }
];

// Save the configured field
function save() {
  emit('update:field', JSON.parse(JSON.stringify(fieldData.value)));
}

// Watch for interface changes
watch(() => fieldData.value.meta.interface, (newInterface) => {
  if (newInterface === 'datetime') {
    // Set defaults for datetime interface
    fieldData.value.meta.type = 'timestamp';
    fieldData.value.meta.options = {
      mode: 'datetime',
      use24: true
    };
  }
});
</script>

<style lang="scss" scoped>
.field-form {
  padding: 20px;
}

.field-row {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
}

.field-half {
  width: 50%;
}

.field-third {
  width: 33.33%;
}

.field-full {
  width: 100%;
}
</style>
