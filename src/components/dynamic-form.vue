<template>
	<div class="dynamic-fields">
		<!-- Fields with controls -->
		<div v-for="field in fieldsWithNames" :key="field.field" class="field-container">
			<div class="field-controls">
				<v-button
					v-tooltip="'Edit Field'"
					x-small
					icon
					@click="$emit('edit-field', field)"
				>
					<v-icon name="edit" />
				</v-button>
				<v-button
					v-tooltip="'Remove Field'"
					x-small
					icon
					class="delete"
					@click="$emit('remove-field', field)"
				>
					<v-icon name="delete" />
				</v-button>
			</div>

			<!-- Actual form field -->
			<v-form
				:fields="[field]"
				:model-value="formValues"
				:primary-key="'+'"
				:autofocus="false"
				:validation-errors="validationErrors"
				@update:model-value="handleFormUpdate"
			/>
		</div>

		<!-- Add Field button -->
		<v-button small @click="$emit('add-field')" class="add-field">
			<v-icon name="add" />
			Add Field
		</v-button>
	</div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { Field, ValidationError } from '@directus/types';

const props = defineProps<{
	fields: any[];
	collection: string;
	sourceId?: string | number;
}>();

const emit = defineEmits(['update', 'validation', 'edit-field', 'remove-field', 'add-field']);

const validationErrors = ref<ValidationError[]>([]);

// Convert fields to the format expected by v-form
const fieldsWithNames = computed(() => {
	
	return props.fields.map((field) => ({
		...field,
		collection: props.collection,
		schema: null,
		meta: {
			...field.meta,
			field: field.field,
			collection: props.collection,
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
				mode: field.meta.options?.mode || 'datetime',
				includeSeconds: field.meta.options?.includeSeconds || false,
				use24: field.meta.options?.use24 ?? true
			}),
		},
		type: field.meta?.type || (
			field.meta?.interface === 'datetime' ? 'timestamp' : 
			field.meta?.interface === 'input' ? 'string' : 'string'
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

function handleFormUpdate(newValues: Record<string, any>) {
	validationErrors.value = [];
	
	const updatedFields = props.fields.map(field => {
		const newValue = newValues[field.field];
		let processedValue = newValue;
		
		if (field.meta?.interface === 'input') {
			if (newValue === '' || newValue === null || newValue === undefined) {
				processedValue = null;
			} else {
				switch (field.meta.type) {
					case 'integer':
						processedValue = parseInt(newValue);
						break;
					case 'decimal':
						processedValue = parseFloat(newValue);
						break;
					default:
						processedValue = newValue;
				}
			}
		} else if (field.meta?.interface === 'datetime') {
			if (!newValue) {
				processedValue = null;
			} else if (field.meta.type === 'date' && newValue) {
				processedValue = newValue.split('T')[0];
			} else {
				processedValue = newValue;
			}
		}

		const error = validateField(field, processedValue);
		if (error) {
			validationErrors.value.push(error);
		}

		return {
			...field,
			value: processedValue,
		};
	});


	emit('update', updatedFields);
	emit('validation', validationErrors.value);
}

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
.dynamic-fields {
	.field-container {
		position: relative;
		margin-bottom: 20px;

		.field-controls {
			position: absolute;
			top: -8px;
			right: -8px;
			display: flex;
			gap: 4px;
			opacity: 0;
			transition: opacity var(--fast) var(--transition);
			z-index: 1;
			background: var(--theme--background);
			padding: 4px;
			border-radius: var(--theme--border-radius);
		}

		&:hover .field-controls {
			opacity: 1;
		}
	}

	.field-actions {
		margin-top: 20px;
		display: flex;
		justify-content: flex-end;
	}

	.delete {
		--v-button-color: var(--theme--danger);
		--v-button-background-color: var(--theme--danger-10);
		--v-button-background-color-hover: var(--theme--danger-25);
	}

	.add-field {
		--v-button-color: var(--theme--primary);
		--v-button-background-color: var(--theme--primary-10);
		--v-button-background-color-hover: var(--theme--primary-25);
	}
}
</style> 