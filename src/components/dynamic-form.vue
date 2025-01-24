<template>
	<div class="dynamic-fields">
		<v-form
			:key="`form-${sourceId}-${fields.length}`"
			:fields="fieldsWithNames"
			:model-value="formValues"
			:primary-key="'+'"
			:autofocus="false"
			:validation-errors="validationErrors"
			@update:model-value="handleFormUpdate"
		/>
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

const emit = defineEmits(['update', 'validation']);

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
	.field-wrapper {
		margin-bottom: 12px;
		
		&.half {
			width: calc(50% - 8px);
			display: inline-block;
			
			&:nth-child(odd) {
				margin-right: 16px;
			}
		}
		
		&.full {
			width: 100%;
		}
	}
}
</style> 