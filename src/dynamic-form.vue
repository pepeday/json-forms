<template>
	<div class="dynamic-fields">
		<v-form
			:key="`form-${sourceId}-${fields.length}`"
			:fields="fieldsWithNames"
			:model-value="formValues"
			:primary-key="'+'"
			:autofocus="false"
			@update:model-value="handleFormUpdate"
		/>
	</div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Field } from '@directus/types';

const props = defineProps<{
	fields: any[];
	collection: string;
	sourceId?: string | number;
}>();

const emit = defineEmits(['update']);

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
	const updatedFields = props.fields.map(field => {
		const newValue = newValues[field.field];
		
		if (newValue === undefined) {
			return field;
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
	
	emit('update', updatedFields);
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