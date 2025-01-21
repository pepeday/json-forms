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
	if (errors.length > 0) {
		// Format validation errors to match v-form expectations exactly
		const consolidatedErrors = errors.map(error => ({
			code: 'VALIDATION_FAILED',
			collection: props.collection,
			field: `${props.field}(${error.field})`,  // Format: parentField(childField)
			type: 'validation' as const,
			message: error.message
		}));

		console.log('🔍 Emitting validation errors:', JSON.stringify({
			original: errors,
			formatted: consolidatedErrors
		}, null, 2));

		validationErrors.value = errors;
		emit('validation', consolidatedErrors);
		emit('input', null);  // Prevent saving when validation fails
	} else {
		validationErrors.value = [];
		emit('validation', []);
		emit('input', jsonFields.value);
	}
};

// Handle form updates
const handleUpdate = (updatedFields: any[]) => {
	if (!isInitialized.value) return;
	
	isUpdating.value = true;
	jsonFields.value = JSON.parse(JSON.stringify(updatedFields));
	
	clearTimeout(updateTimeout);
	updateTimeout = setTimeout(() => {
		// Don't emit input here - let validation handler control it
		isUpdating.value = false;
	}, 300);
};

// Watch for changes in the field value
watch(
	[() => values?.value, () => props.field, () => props.value],
	([formValues, field, propValue]) => {
		console.log('👀 Watch triggered:', { 
			formValues, 
			field, 
			propValue,
			isUpdating: isUpdating.value,
			jsonFieldsProp: props.jsonField,
			jsonFieldsRef: jsonFields.value
		});
		
		if (!field || isUpdating.value) return;

		// First check props.value as it takes precedence
		if (propValue) {
			try {
				// Handle both string and array inputs
				const parsedValue = typeof propValue === 'string' 
					? JSON.parse(propValue)
					: propValue;

				if (Array.isArray(parsedValue)) {
					console.log('📝 Setting jsonFields from prop value:', parsedValue);
					jsonFields.value = JSON.parse(JSON.stringify(parsedValue));
					isInitialized.value = true;
					return; // Exit early as we've handled the update
				}
			} catch (e) {
				console.warn('Failed to parse propValue:', e);
			}
		}

		// Then check form values
		const currentData = formValues?.[field];
		console.log('📊 Current field data:', currentData);

		// Only update if we have valid data or need initialization
		if (Array.isArray(currentData)) {
			console.log('📝 Setting jsonFields with form data:', currentData);
			jsonFields.value = JSON.parse(JSON.stringify(currentData));
			isInitialized.value = true;
		} else if (!isInitialized.value || (!currentData && jsonFields.value.length === 0)) {
			// Only set empty fields if not initialized or if we have no data
			console.log('🆕 Setting empty jsonFields');
			jsonFields.value = [];
			emit('input', []);
			isInitialized.value = true;
		}
	},
	{ 
		immediate: true,
		deep: true  // Add deep watching to catch nested changes
	}
);

// Watch for incoming validation errors from parent
watch(
	() => props.validationErrors,
	(newErrors) => {
		console.log('🔍 Parent Validation Update:', JSON.stringify({
			receivedErrors: newErrors,
			field: props.field,
			filtered: newErrors?.filter(error => error.field.startsWith(`${props.field}(`))
		}, null, 2));

		if (newErrors?.length) {
			const ourErrors = newErrors
				.filter(error => error.field.startsWith(`${props.field}(`))
				.map(error => ({
					...error,
					field: error.field.slice(props.field.length + 1, -1),
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
