<template>
	<div v-if="props.jsonField" class="json-form-interface">
		<v-notice v-if="loading">Loading...</v-notice>
		<v-notice v-else-if="error" type="danger">{{ error }}</v-notice>
		<template v-else>
			<!-- Add debug info -->
			<v-notice v-if="!jsonFields || jsonFields.length === 0" type="warning">
				Debug: No fields available. jsonFields: {{ jsonFields }}, 
				value: {{ value }}, 
				initialized: {{ isInitialized }}
			</v-notice>
			
			<!-- Dynamic form with validation -->
			<dynamic-form
				v-if="jsonFields && jsonFields.length > 0"
				:fields="jsonFields"
				:collection="collection"
				:validation-errors="validationErrors"
				@update="handleUpdate"
				@validation="handleValidation"
			/>
			<v-notice v-else type="info">
				{{ t('no_form_available') }}
			</v-notice>
		</template>
	</div>
</template>

<script setup lang="ts">
import { ref, watch, inject, type ComputedRef } from 'vue';
import { useI18n } from 'vue-i18n';
import DynamicForm from './components/dynamic-form.vue';
import type { ValidationError } from '@directus/types';

const props = defineProps<{
	collection: string;
	value: any;
	field: string;
	jsonField?: string[];
	primaryKey: string | number | null;
	validationErrors?: ValidationError[];
}>();

const emit = defineEmits(['input', 'validation']);
const { t } = useI18n();

const loading = ref(false);
const error = ref<string | null>(null);
const jsonFields = ref<any[]>([]);

// Get current form values including unsaved changes
const values = inject<ComputedRef<Record<string, any>>>('values');

// Add state management flags
const isInitialized = ref(false);
const isUpdating = ref(false);
let updateTimeout: NodeJS.Timeout;

// Add validation state
const validationErrors = ref<ValidationError[]>([]);

// Handle validation from dynamic form
const handleValidation = (errors: ValidationError[]) => {
	console.log('🔍 Validation triggered with errors:', errors);
	
	if (errors.length > 0) {
		// Map our field-specific errors to the parent field format
		const mappedErrors = errors.map(error => ({
			...error,
			collection: props.collection,
			field: error.field, // Keep the original field name for the dynamic form
			parentField: `${props.field}(${error.field})`, // Store the parent field format separately
		}));

		// Set local validation state - use unmapped errors for the dynamic form
		validationErrors.value = errors;
		console.log('❌ Setting validation errors:', mappedErrors);

		// Emit mapped errors to parent
		emit('validation', mappedErrors);
		
		// Keep the current value
		emit('input', jsonFields.value);
	} else {
		validationErrors.value = [];
		console.log('✅ Validation passed, emitting fields:', jsonFields.value);
		emit('validation', []);
		emit('input', jsonFields.value);
	}
};

// Handle form updates
const handleUpdate = (updatedFields: any[]) => {
	console.log('🔄 Update triggered. Initialized:', isInitialized.value);
	
	if (!isInitialized.value) return;

	console.log('📝 Previous fields:', jsonFields.value);
	console.log('📝 Updated fields:', updatedFields);
	
	isUpdating.value = true;
	jsonFields.value = JSON.parse(JSON.stringify(updatedFields));
	
	clearTimeout(updateTimeout);
	updateTimeout = setTimeout(() => {
		console.log('⏱️ Debounced update emitting:', jsonFields.value);
		emit('input', jsonFields.value);
		isUpdating.value = false;
	}, 300);
};

// Watch for changes in the field value
watch(
	[() => values?.value, () => props.field],
	([formValues, field]) => {
		console.log('👀 Watch triggered:', { 
			formValues, 
			field, 
			isUpdating: isUpdating.value,
			jsonFieldsProp: props.jsonField,
			jsonFieldsRef: jsonFields.value
		});
		
		if (!field || isUpdating.value) return;

		const currentData = formValues?.[field];
		console.log('📊 Current field data:', currentData);

		// Only update if we have valid data or no data yet
		if (Array.isArray(currentData) || !isInitialized.value) {
			if (Array.isArray(currentData)) {
				console.log('📝 Setting jsonFields with:', currentData);
				jsonFields.value = JSON.parse(JSON.stringify(currentData));
				isInitialized.value = true;
				console.log('✨ Initialized with data:', jsonFields.value);
			} else if (!isInitialized.value) {
				console.log('🆕 Setting empty jsonFields');
				jsonFields.value = [];
				console.log('🗑️ Clearing fields - initial state');
				emit('input', []);
				isInitialized.value = true;
			}
		}
	},
	{ immediate: true }
);

// Add immediate check of props
watch(
	() => props.value,
	(newValue) => {
		console.log('🔄 Value prop changed:', newValue);
		if (Array.isArray(newValue) && !isUpdating.value) {
			console.log('📝 Setting jsonFields from value prop:', newValue);
			jsonFields.value = JSON.parse(JSON.stringify(newValue));
			isInitialized.value = true;
		}
	},
	{ immediate: true }
);

// Watch for incoming validation errors from parent
watch(
	() => props.validationErrors,
	(newErrors) => {
		if (newErrors?.length) {
			// Filter for only our field's errors and convert back to local format
			const ourErrors = newErrors
				.filter(error => error.field.startsWith(`${props.field}(`))
				.map(error => ({
					...error,
					field: error.field.slice(props.field.length + 1, -1), // Remove parent field wrapper
				}));
			validationErrors.value = ourErrors;
		} else {
			validationErrors.value = [];
		}
	},
	{ immediate: true }
);
</script>

<style lang="scss" scoped>
.json-form-interface {
	width: 100%;
	
	.empty {
		color: var(--theme--form--field--input--foreground-subdued);
		font-style: italic;
	}
}
</style>
