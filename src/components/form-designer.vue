<template>
  <div class="form-designer">
    <v-notice type="info">Configure your form fields below</v-notice>

    <!-- List of configured fields -->
    <div class="fields-list">
      <v-list>
        <template v-for="(field, index) in fields" :key="index">
          <v-list-item>
            <v-list-item-content>
              <div class="field-config">
                <!-- Basic field info -->
                <div class="field-row">
                  <v-input
                    v-model="field.field"
                    placeholder="Field ID"
                    class="field-half"
                  />
                  <v-input
                    v-model="field.name"
                    placeholder="Display Name"
                    class="field-half"
                  />
                </div>

                <div class="field-row">
                  <!-- Interface selection -->
                  <v-select
                    v-model="field.meta.interface"
                    :items="availableInterfaces"
                    placeholder="Select Interface"
                    class="field-half"
                  />
                  
                  <!-- Width selection -->
                  <v-select
                    v-model="field.meta.width"
                    :items="[
                      { text: 'Full Width', value: 'full' },
                      { text: 'Half Width', value: 'half' }
                    ]"
                    placeholder="Field Width"
                    class="field-half"
                  />
                </div>

                <!-- Type selection for input interface -->
                <div v-if="field.meta.interface === 'input'" class="field-row">
                  <v-select
                    v-model="field.meta.type"
                    :items="inputTypes"
                    placeholder="Input Type"
                    class="field-full"
                  />
                </div>

                <!-- Options based on interface type -->
                <div v-if="field.meta.interface === 'input'" class="field-row">
                  <v-input
                    v-model="field.meta.options.placeholder"
                    placeholder="Placeholder Text"
                    class="field-full"
                  />
                </div>

                <!-- Number type specific options -->
                <div v-if="['integer', 'decimal'].includes(field.meta.type)" class="field-row">
                  <v-input
                    v-model="field.meta.options.min"
                    type="number"
                    placeholder="Min Value"
                    class="field-third"
                  />
                  <v-input
                    v-model="field.meta.options.max"
                    type="number"
                    placeholder="Max Value"
                    class="field-third"
                  />
                  <v-input
                    v-model="field.meta.options.step"
                    type="number"
                    placeholder="Step"
                    class="field-third"
                  />
                </div>
              </div>
            </v-list-item-content>
            
            <!-- Actions -->
            <v-list-item-actions>
              <v-button @click="removeField(index)" icon secondary>
                <v-icon name="delete" />
              </v-button>
            </v-list-item-actions>
          </v-list-item>
        </template>
      </v-list>
    </div>

    <!-- Add field button -->
    <v-button @click="addField" class="add-field">
      <v-icon name="add" />
      Add Field
    </v-button>

    <!-- Preview JSON output -->
    <pre class="json-preview">{{ JSON.stringify(fields, null, 2) }}</pre>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const fields = ref<any[]>([]);

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

const addField = () => {
  fields.value.push({
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
};

const removeField = (index: number) => {
  fields.value.splice(index, 1);
};
</script>

<style scoped>
.form-designer {
  padding: 20px;
}

.fields-list {
  margin: 20px 0;
}

.field-config {
  padding: 10px;
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

.add-field {
  margin: 20px 0;
}

.json-preview {
  margin-top: 20px;
  padding: 10px;
  background: var(--background-subdued);
  border-radius: var(--border-radius);
  font-family: monospace;
}
</style>
