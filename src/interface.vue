<template>
	<div class="json-form-interface">
		<div class="field-list">
			<div class="dynamic-fields">
				<v-form
					:fields="fieldsWithNames"
					:model-value="formValues"
					:primary-key="'+'"
					:autofocus="false"
					@update:model-value="handleFormUpdate"
				/>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { Field } from '@directus/types';

const props = defineProps<{
	collection: string;
}>();

const emit = defineEmits(['input']);

// Static JSON structure
const jsonStructure = [
	{
		"field": "quantity",
		"name": "Item Quantity",
		"meta": {
			"interface": "input",
			"type": "integer",
			"width": "half",
			"options": {
				"min": 0,
				"max": 100,
				"step": 1,
				"placeholder": "Enter quantity"
			}
		},
		"value": 1
	},
	{
		"field": "description",
		"name": "$t:description",
		"meta": {
			"interface": "input-multiline",
			"type": "text",
			"width": "full",
			"options": {
				"placeholder": "Enter description",
				"font": "sans-serif"
			}
		},
		"value": ""
	},
	{
		"field": "date_required",
		"name": "Required Date",
		"meta": {
			"interface": "datetime",
			"type": "timestamp",
			"width": "half",
			"options": {
				"includeSeconds": false,
				"mode": "datetime",
				"use24": true
			}
		},
		"value": null
	},
	{
		"field": "delivery_date",
		"name": "Delivery Date",
		"meta": {
			"interface": "datetime",
			"type": "date",
			"width": "half",
			"options": {
				"mode": "date"
			}
		},
		"value": null
	},
	{
		"field": "price",
		"name": "Price",
		"meta": {
			"interface": "input",
			"type": "decimal",
			"width": "half",
			"options": {
				"min": 0,
				"step": 0.01,
				"placeholder": "Enter price"
			}
		},
		"value": 0
	},
	{
		"field": "is_active",
		"name": "Active Status",
		"meta": {
			"interface": "boolean",
			"width": "half",
			"options": {
				"label": "Is this item active?"
			}
		},
		"value": true
	},
	{
		"field": "notice_field",
		"meta": {
			"interface": "presentation-notice",
			"width": "full",
			"options": {
				"text": "Please review all fields carefully before submitting",
				"type": "info"
			}
		}
	},
	{
		"field": "item_type",
		"name": "Item Type",
		"meta": {
			"interface": "select-dropdown",
			"width": "half",
			"options": {
				"choices": [
					{
						"text": "Type A",
						"value": "a"
					},
					{
						"text": "Type B",
						"value": "b"
					},
					{
						"text": "Type C",
						"value": "c"
					}
				]
			}
		},
		"value": "a"
	}
];

const fields = ref(jsonStructure);

// Convert fields to the format expected by v-form
const fieldsWithNames = computed(() => {
	return fields.value.map((field) => ({
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
	fields.value.forEach(field => {
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
	console.log('Form values updated:', newValues);
	
	fields.value = fields.value.map(field => {
		const newValue = newValues[field.field];
		
		if (field.meta?.interface === 'datetime') {
			console.log('Datetime field update:', {
				field: field.field,
				newValue,
				type: typeof newValue,
				mode: field.meta.options?.mode
			});
		} else if (field.meta?.interface === 'input') {
			console.log('Input field update:', {
				field: field.field,
				newValue,
				type: field.meta.type
			});
		}
		
		return {
			...field,
			value: newValue,
		};
	});
	
	console.log('Updated fields:', fields.value);
	emit('input', fields.value);
}
</script>

<style lang="scss" scoped>
.json-form-interface {
	width: 100%;
	
	.field-list {
		border: var(--theme--border-width) solid var(--theme--form--field--input--border-color);
		border-radius: var(--theme--border-radius);
		padding: var(--theme--form--field--input--padding);
	}

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
}
</style>
