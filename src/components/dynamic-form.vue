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
	
	// Clear previous validation errors
	validationErrors.value = [];
	
	const updatedFields = props.fields.map(field => {
		const newValue = newValues[field.field];
		
		
		if (newValue === undefined) {
			return field;
		}
		
		// Validate all fields for required
		const error = validateField(field, newValue);
		if (error) {

			validationErrors.value.push(error);
		}
		
		if (field.meta?.interface === 'datetime') {

			
			if (field.meta.type === 'date' && newValue) {
				return {
					...field,
					value: newValue.split('T')[0]
				};
			}
		} else if (field.meta?.interface === 'input') {
			switch (field.meta.type) {
				case 'integer':
					return {
						...field,
						value: newValue !== null ? parseInt(newValue) : null
					};
				case 'decimal':
					return {
						...field,
						value: newValue !== null ? parseFloat(newValue) : null
					};
			}
		}
		
		return {
			...field,
			value: newValue,
		};
	});
	
	
	// Emit validation status first
	emit('validation', validationErrors.value);
	
	// Only emit update if there are no validation errors
	if (validationErrors.value.length === 0) {
		emit('update', updatedFields);
	}
}

// Add validation function
function validateField(field: any, value: any): ValidationError | null {
	// Check required fields first
	if (field.meta?.required && (value === null || value === undefined || value === '')) {
		return {
			code: 'VALIDATION_FAILED',
			field: field.field,
			type: 'required',
			message: `${field.name || field.field} is required`,
		};
	}

	// Then check numeric constraints for input fields
	if (field.meta?.interface === 'input' && ['integer', 'decimal'].includes(field.meta.type)) {
		const numValue = Number(value);
		
		if (field.meta.options?.min !== undefined && numValue < field.meta.options.min) {
			return {
				code: 'VALIDATION_FAILED',
				field: field.field,
				type: 'min',
				message: `Value must be greater than or equal to ${field.meta.options.min}`,
			};
		}
		
		if (field.meta.options?.max !== undefined && numValue > field.meta.options.max) {
			return {
				code: 'VALIDATION_FAILED',
				field: field.field,
				type: 'max',
				message: `Value must be less than or equal to ${field.meta.options.max}`,
			};
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