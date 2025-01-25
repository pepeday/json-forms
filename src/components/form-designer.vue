<template>
  <div class="form-designer">
    <v-notice type="info">Configure your form fields below</v-notice>

    <!-- Fields List -->
    <v-list v-model="selectedFields" class="fields-list" :multiple="false">
      <v-list-item
        v-for="(field, index) in fields"
        :key="index"
        :value="index"
        block
        clickable
        :class="{ 'is-active': editingIndex === index }"
      >
        <v-icon name="drag_handle" class="drag-handle" left />
        
        <v-list-item-content>
          <v-text-overflow>{{ field.name || 'Unnamed Field' }}</v-text-overflow>
          <v-text-overflow class="field-details">
            {{ field.field }} - {{ field.meta.interface }}
            <span v-if="field.meta.type">({{ field.meta.type }})</span>
          </v-text-overflow>
        </v-list-item-content>

        <div class="spacer" />

        <v-list-item-actions>
          <v-button
            v-tooltip="'Edit Field'"
            icon
            small
            @click.stop="editField(index)"
          >
            <v-icon name="edit" />
          </v-button>
          <v-button
            v-tooltip="'Delete Field'"
            icon
            small
            class="delete"
            @click.stop="removeField(index)"
          >
            <v-icon name="delete" />
          </v-button>
        </v-list-item-actions>
      </v-list-item>
    </v-list>

    <!-- Add field button -->
    <v-button @click="openFieldDialog()" class="add-field">
      <v-icon name="add" />
      Add Field
    </v-button>

    <!-- Field Edit Dialog -->
    <v-dialog
      v-model="showFieldDialog"
      :title="editingIndex === -1 ? 'Add Field' : 'Edit Field'"
      @esc="closeFieldDialog"
    >
      <template #default>
        <v-card>
          <v-card-title>{{ editingIndex === -1 ? 'Add Field' : 'Edit Field' }}</v-card-title>
          
          <v-card-text>
            <div class="field-form">
              <div class="field-row">
                <v-input
                  v-model="editingField.field"
                  placeholder="Field ID"
                  class="field-half"
                />
                <v-input
                  v-model="editingField.name"
                  placeholder="Display Name"
                  class="field-half"
                />
              </div>

              <div class="field-row">
                <v-select
                  v-model="editingField.meta.interface"
                  :items="availableInterfaces"
                  placeholder="Select Interface"
                  class="field-half"
                />
                <v-select
                  v-model="editingField.meta.width"
                  :items="[
                    { text: 'Full Width', value: 'full' },
                    { text: 'Half Width', value: 'half' }
                  ]"
                  placeholder="Field Width"
                  class="field-half"
                />
              </div>

              <!-- Type selection for input interface -->
              <div v-if="editingField.meta.interface === 'input'" class="field-row">
                <v-select
                  v-model="editingField.meta.type"
                  :items="inputTypes"
                  placeholder="Input Type"
                  class="field-full"
                />
              </div>

              <!-- Options based on interface type -->
              <div v-if="editingField.meta.interface === 'input'" class="field-row">
                <v-input
                  v-model="editingField.meta.options.placeholder"
                  placeholder="Placeholder Text"
                  class="field-full"
                />
              </div>

              <!-- Number type specific options -->
              <div v-if="['integer', 'decimal'].includes(editingField.meta.type)" class="field-row">
                <v-input
                  v-model="editingField.meta.options.min"
                  type="number"
                  placeholder="Min Value"
                  class="field-third"
                />
                <v-input
                  v-model="editingField.meta.options.max"
                  type="number"
                  placeholder="Max Value"
                  class="field-third"
                />
                <v-input
                  v-model="editingField.meta.options.step"
                  type="number"
                  placeholder="Step"
                  class="field-third"
                />
              </div>
            </div>
          </v-card-text>

          <v-card-actions>
            <v-button secondary @click="closeFieldDialog">
              Cancel
            </v-button>
            <v-button @click="saveField">
              Save
            </v-button>
          </v-card-actions>
        </v-card>
      </template>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, defineProps, defineEmits } from 'vue';

const props = defineProps<{
  fields: any[]
}>();

const emit = defineEmits(['update:fields']);

const showFieldDialog = ref(false);
const editingIndex = ref(-1);
const editingField = ref(getEmptyField());
const selectedFields = ref<number[]>([]);

function getEmptyField() {
  return {
    field: '',
    name: '',
    meta: {
      interface: 'input',
      type: 'string',
      width: 'full',
      options: {}
    },
    value: null
  };
}

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

function openFieldDialog(index?: number) {
  if (index !== undefined) {
    editingIndex.value = index;
    editingField.value = JSON.parse(JSON.stringify(props.fields[index]));
  } else {
    editingIndex.value = -1;
    editingField.value = getEmptyField();
  }
  showFieldDialog.value = true;
}

function editField(index: number) {
  openFieldDialog(index);
}

function closeFieldDialog() {
  showFieldDialog.value = false;
  editingField.value = getEmptyField();
  editingIndex.value = -1;
}

function saveField() {
  const newFields = [...props.fields];
  
  if (editingIndex.value === -1) {
    newFields.push(editingField.value);
  } else {
    newFields[editingIndex.value] = editingField.value;
  }
  
  emit('update:fields', newFields);
  closeFieldDialog();
}

function removeField(index: number) {
  const newFields = [...props.fields];
  newFields.splice(index, 1);
  emit('update:fields', newFields);
}
</script>

<style scoped>
.form-designer {
  padding: 20px;
}

.fields-list {
  margin: 20px 0;
  --v-list-min-width: 100%;
  --v-list-background-color: var(--theme--background);
}

.field-details {
  color: var(--theme--foreground-subdued);
  font-size: 0.9em;
}

.spacer {
  flex-grow: 1;
}

.drag-handle {
  cursor: grab;
  margin-right: 8px;
}

.drag-handle:active {
  cursor: grabbing;
}

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

.add-field {
  margin: 20px 0;
}

.is-active {
  background-color: var(--background-normal);
}

.delete {
  --v-button-color: var(--theme--danger);
  --v-button-background-color: var(--theme--danger-10);
  --v-button-background-color-hover: var(--theme--danger-25);
}
</style>
