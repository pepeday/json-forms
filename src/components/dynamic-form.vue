<template>
	<div class="fields-wrapper">
		<div class="fields-list">
			<!-- Preview Mode -->
			<v-form v-if="!editMode" :fields="fieldsWithNames" :model-value="formValues" :primary-key="'+'"
				:autofocus="false" :validation-errors="validationErrors" @update:model-value="handleFormUpdate" />

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
					<v-button small @click="$emit('add-field')">
						{{ t('add_field') }}
					</v-button>
				</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { ValidationError } from '@directus/types';
// import Draggable from 'vuedraggable';

const { t } = useI18n();

const props = defineProps<{
	fields: any[];
	sourceId?: string | number;
	enableEditor: boolean;
}>();

console.log('enableEditor', props.enableEditor);

const emit = defineEmits(['update', 'validation', 'edit-field', 'remove-field', 'add-field']);

const validationErrors = ref<ValidationError[]>([]);

const editMode = ref(false);

// Convert fields to the format expected by v-form
const fieldsWithNames = computed(() => {
	return props.fields.map((field) => ({
		...field,
		schema: null,
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

// Emit proper update events
function handleFormUpdate(newValues: Record<string, any>) {
	console.log('🔵 Form update:', newValues);
	const updatedFields = props.fields.map(field => {
		const newValue = newValues[field.field];
		let processedValue = newValue;

		if (field.meta?.interface === 'datetime') {
			if (!newValue) {
				processedValue = null;
			} else if (field.meta.type === 'date') {
				processedValue = newValue.split('T')[0];
			} else {
				processedValue = newValue;
			}
		}

		return {
			...field,
			value: processedValue
		};
	});

	emit('update', updatedFields);
}

// Update field order
function moveField(index: number, direction: 'up' | 'down') {
	const newFields = [...props.fields]; // Use props.fields instead of computed
	const newIndex = direction === 'up' ? index - 1 : index + 1;
	
	[newFields[index], newFields[newIndex]] = [newFields[newIndex], newFields[index]];
	
	console.log('🔵 Reordering fields:', newFields);
	emit('update', newFields);
}

// Handle field removal
const handleRemoveField = (field: any) => {
	const updatedFields = props.fields.filter(f => f.field !== field.field);
	console.log('🔵 Removing field:', field.field);
	emit('update', updatedFields);
};

// Handle field edit
const handleEditField = (field: any) => {
	console.log('🔵 Editing field:', field);
	emit('edit-field', field);
};

// Handle field updates
const handleFieldUpdate = (field: any, newValue: any) => {

	// Update the field value regardless of validation
	const updatedFields = props.fields.map(f => {
		if (f.field === field.field) {
			return { ...f, value: newValue };
		}
		return f;
	});

	// Run validation but don't block the update
	const errors = updatedFields
		.map(field => validateField(field, field.value))
		.filter((error): error is ValidationError => error !== null);

	// Emit validation status first
	emit('validation', errors);

	// Always emit the update, even if there are validation errors
	emit('update', updatedFields);
};

// Modify validation function to handle empty states better
function validateField(field: any, value: any): ValidationError | null {
	// Only validate required fields when trying to save
	if (field.meta?.required && (value === null || value === undefined || value === '')) {
		return {
			code: 'VALIDATION_FAILED',
			field: field.field,
			type: 'validation' as const,
			message: `${field.name || field.field} is required`,
		};
	}

	// Only validate constraints when there is a value
	if (value !== null && value !== undefined && value !== '') {
		if (field.meta?.interface === 'input' && ['integer', 'decimal'].includes(field.meta.type)) {
			const numValue = Number(value);

			if (field.meta.options?.min !== undefined && numValue < field.meta.options.min) {
				return {
					code: 'VALIDATION_FAILED',
					field: field.field,
					type: 'validation' as const,
					message: `Value must be greater than or equal to ${field.meta.options.min}`,
				};
			}

			if (field.meta.options?.max !== undefined && numValue > field.meta.options.max) {
				return {
					code: 'VALIDATION_FAILED',
					field: field.field,
					type: 'validation' as const,
					message: `Value must be less than or equal to ${field.meta.options.max}`,
				};
			}
		}
	}

	return null;
}
</script>

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
</style>