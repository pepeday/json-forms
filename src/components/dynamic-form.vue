<template>
	<div class="fields-wrapper">
		<div v-if="enableEditor || fields.length > 0" class="fields-list">
			<!-- Preview Mode -->
			<template v-if="!editMode">
				<!-- Render HTML fields first -->
				<template v-for="field in fieldsWithNames" :key="field.field">
					<div 
						v-if="field.meta.interface === 'presentation-html'"
						:class="['wysiwyg-content', field.meta.width]"
					>
						<div class="wysiwyg-wrapper" v-html="field.meta.options.html"></div>
					</div>
				</template>

				<!-- Then render the form for other fields -->
				<v-form 
					v-if="fields.length" 
					:fields="fieldsWithNames.filter(f => f.meta.interface !== 'presentation-html')" 
					:model-value="formValues" 
					:primary-key="'+'"
					:autofocus="false" 
					:validation-errors="validationErrors" 
					:show-no-visible-fields="false"
					@update:model-value="handleFormUpdate">
				</v-form>

				<!-- Subtle Empty State -->
				<div v-else-if="enableEditor" class="empty-state">
					<v-icon name="info" />
					<span >{{ t('no_fields') }}</span>
				</div>
			</template>

			<!-- Edit Mode -->
			<div v-else>
				<div class="fields-grid">
					<v-list-item 
						v-for="(field, index) in fieldsWithNames" 
						:key="field.field"
						v-tooltip="'Click to edit'"
						clickable
						block
						class="link"
						:class="{ 'half-width': field.meta?.width === 'half' }"
						@click="handleEditField(field)"
					>
						<v-list-item-content>
							<div class="field-info">
								<span class="field-name">
									{{ field.name }}
									<v-icon 
										v-if="field.meta?.required" 
										class="required"
										sup
										name="star"
										filled
									/>
								</span>
								<span class="field-details">{{ field.field }} ({{ field.meta.interface }})</span>
							</div>
						</v-list-item-content>

						<v-list-item-action class="action-buttons">
							<v-icon 
								name="arrow_upward" 
								clickable 
								:disabled="index === 0"
								@click.stop.prevent="moveField(index, 'up')" 
							/>
							<v-icon 
								name="arrow_downward" 
								clickable 
								:disabled="index === fieldsWithNames.length - 1"
								@click.stop.prevent="moveField(index, 'down')" 
							/>
							<v-icon 
								name="delete" 
								clickable 
								class="delete-icon"
								v-tooltip="'Remove Field'"
								@click.stop="handleRemoveField(field)" 
							/>
						</v-list-item-action>
					</v-list-item>
				</div>

			</div>

			<div v-if="enableEditor" class="button-group">
					<v-button small @click="editMode = !editMode">
						{{ editMode ? t('preview') : t('edit') }}
					</v-button>
					<v-button small @click="openFieldDialog()">
						{{ t('add_field') }}
					</v-button>
				</div>
		</div>

		<!-- Move dialog here -->
		<form-designer
			v-model:active="showFieldDialog"
			:field="editingField"
			:existing-fields="fields"
			@update:field="handleFieldUpdate"
			@cancel="closeFieldDialog"
		/>
	</div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { ValidationError } from '@directus/types';
import FormDesigner from './form-designer.vue';

const { t } = useI18n();

const logPrefix = '🔷 [DynamicForm]';

const props = defineProps<{
	fields: any[];
	sourceId?: string | number;
	enableEditor: boolean;
}>();


const emit = defineEmits(['update', 'validation', 'edit-field', 'remove-field', 'add-field']);

const validationErrors = ref<ValidationError[]>([]);

const editMode = ref(false);

// Add dialog state
const showFieldDialog = ref(false);
const editingField = ref<any>(null);

// Cache common transformations
const baseTransforms = {
	schema: null,
	type: 'string'
};

// Convert fields to the format expected by v-form
const fieldsWithNames = computed(() => {
	const fields = props.fields.map((field) => ({
		...field,
		...baseTransforms,
		meta: {
			...field.meta,
			field: field.field,
			...(field.meta?.interface === 'input' && {
				type: field.meta.type || 'string',
				...(field.meta.type === 'decimal' && {
					min: field.meta.options?.min,
					max: field.meta.options?.max,
					step: field.meta.options?.step || 0.01
				}),
				...(field.meta.type === 'integer' && {
					min: field.meta.options?.min,
					max: field.meta.options?.max,
					step: field.meta.options?.step || 1
				})
			}),
			...(field.meta?.interface === 'datetime' && {
				type: field.meta.type || 'timestamp',
				mode: 'datetime',
				use24: true
			}),
		},
		type: field.meta?.type || (
			field.meta?.interface === 'datetime' ? 'timestamp' : 'string'
		),
	}));
	
	return fields;
});

const formValues = computed(() => {
	const values: Record<string, any> = {};
	props.fields.forEach(field => {
		if (field.meta?.interface === 'datetime') {
			values[field.field] = field.value || null;
		} else if (field.meta?.interface === 'input') {
			switch (field.meta.type) {
				case 'integer':
					values[field.field] = field.value !== null ? parseInt(field.value) : null;
					break;
				case 'decimal':
					values[field.field] = field.value !== null ? parseFloat(field.value) : null;
					break;
				default:
					values[field.field] = field.value;
			}
		} else {
			values[field.field] = field.value;
		}
	});
	return values;
});

// Dialog handlers
function openFieldDialog(field?: any) {
	editingField.value = field ? JSON.parse(JSON.stringify(field)) : null;
	showFieldDialog.value = true;
}

function handleFieldUpdate(field: any) {
	const newFields = [...props.fields];
	const existingIndex = newFields.findIndex(f => f.field === field.field);
	
	if (existingIndex >= 0) {
		newFields[existingIndex] = field;
	} else {
		newFields.push(field);
	}
	
	emit('update', newFields);
	closeFieldDialog();
}

function closeFieldDialog() {
	showFieldDialog.value = false;
	editingField.value = null;
}

// Replace the current handleFormUpdate with this simpler version
function handleFormUpdate(newValues: Record<string, any>) {
	const updatedFields = props.fields.map(field => {
		const newValue = newValues[field.field];
		if (field.value === newValue) return field;

		
		return {
			...field,
			value: field.meta?.interface === 'datetime' && newValue
				? field.meta.type === 'date'
					? newValue.split('T')[0]
					: newValue
				: newValue
		};
	});

	emit('update', updatedFields);
}

// Update field order
function moveField(index: number, direction: 'up' | 'down') {
	const newFields = [...props.fields]; // Use props.fields instead of computed
	const newIndex = direction === 'up' ? index - 1 : index + 1;
	
	[newFields[index], newFields[newIndex]] = [newFields[newIndex], newFields[index]];
	
	emit('update', newFields);
}

// Handle field removal
const handleRemoveField = (field: any) => {
	const updatedFields = props.fields.filter(f => f.field !== field.field);
	emit('update', updatedFields);
};

// Handle field edit
const handleEditField = (field: any) => {
	openFieldDialog(field);
};
</script>

<style>
/* Global styles for WYSIWYG content */
.wysiwyg-content .wysiwyg-wrapper img {
	max-width: 100% !important;
	height: auto !important;
	display: block !important;
	margin: 8px auto !important;
}
</style>

<style lang="scss" scoped>
.fields-wrapper {
	position: relative;
}

.fields-grid {
	display: grid;
	grid-template-columns: repeat(2, 1fr);
	gap: 12px;
	margin-bottom: 20px;

	:deep(.v-list-item.block + .v-list-item.block) {
		margin-top: 0;
	}
}

.link {
	display: flex;
	align-items: center;
	width: 100%;
	height: 100%;
	padding: var(--theme--spacing);
	margin: 0;
	color: var(--theme--foreground);
	background-color: var(--theme--background);
	border: var(--theme--border-width) solid var(--theme--form--field--input--border-color);
	border-radius: var(--theme--border-radius);
	transition: all var(--fast) var(--transition);
	grid-column: span 2;

	&.half-width {
		grid-column: span 1;
	}

	&:hover {
		background-color: var(--theme--background-accent);
	}

	.action-buttons {
		display: flex;
		gap: 8px;
		opacity: 1;
	}

	.v-icon {
		--v-icon-color: var(--theme--foreground-subdued);

		&:not(:disabled):hover {
			--v-icon-color: var(--theme--foreground);
		}

		&:disabled {
			opacity: 0.5;
			cursor: not-allowed;
		}

		&.delete-icon {
			--v-icon-color: var(--theme--danger);
		}
	}
}

.field-info {
	display: flex;
	flex-direction: column;
	gap: 4px;

	.field-name {
		font-weight: 600;
	}

	.field-details {
		color: var(--theme--foreground-subdued);
		font-size: 0.9em;
	}
}

.required-icon {
	color: var(--theme--primary);
	margin-left: 4px;
}

.button-group {
	display: flex;
	gap: 8px;
	margin-top: 20px;
}

.edit-icon {
	--v-icon-color: var(--theme--primary);
}

.delete-icon {
	--v-icon-color: var(--theme--danger);
}

.field-controls {
	display: none;
}

.empty-state {
	display: flex;
	align-items: center;
	gap: 8px;
	color: var(--theme--foreground-subdued);
	font-size: 0.9em;
	padding: 8px 0;

	.v-icon {
		--v-icon-color: var(--theme--foreground-subdued);
	}

}

.wysiwyg-content {
	width: 100%;
	max-width: 100%;
	overflow: hidden;
	
	.wysiwyg-wrapper {
		width: 100%;
		max-width: 100%;
		display: block;
		
		:deep(table) {
			max-width: 100%;
			overflow-x: auto;
		}
	}
}
</style>