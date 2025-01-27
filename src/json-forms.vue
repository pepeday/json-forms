<template>


	<!-- Form Designer Mode -->
	<div v-if="props.jsonField !== null" class="json-form-interface">
		<v-notice v-if="loading">Loading...</v-notice>
		<v-notice v-else-if="error" type="danger">{{ error }}</v-notice>
		<template v-else>
			<dynamic-form 
				:fields="jsonFields" 
				:collection="collection"
				:validation-errors="validationErrors" 
				@update="handleUpdate"
				@validation="handleValidation"
				:enableEditor="props.enableEditor"
			/>
		</template>
	</div>
</template>

<script setup lang="ts">
console.log('version 24');
import { ref, watch, inject, type ComputedRef, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import DynamicForm from './components/dynamic-form.vue';
import type { ValidationError } from '@directus/types';

const props = defineProps<{
	collection: string;
	value: any;
	field: string;
	jsonField?: string[] | null;
	primaryKey: string | number | null;
	validationErrors?: ValidationError[];
	enableEditor: boolean;
}>();

const emit = defineEmits(['input', 'validation']);
const { t } = useI18n();

const loading = ref(false);
const error = ref<string | null>(null);
const jsonFields = ref<any[]>([]);
const values = inject<ComputedRef<Record<string, any>>>('values');
const isUpdating = ref(false);
let updateTimeout: NodeJS.Timeout;

// Add validation state
const validationErrors = ref<ValidationError[]>([]);

// Add isDesignMode state
const disabled = computed(() => props.primaryKey != null); //need to fix this?

// Add debug logging helper
const logDebug = (location: string, data: any) => {
	console.log(`🔍 [JsonForms ${location}]:`, data);
};

// Add helper to safely parse JSON string or return original value
const parseJsonSafely = (value: any) => {
	if (typeof value === 'string') {
		try {
			return JSON.parse(value);
		} catch (e) {
			return value;
		}
	}
	return value;
};

// Replace the current update handling with this
const handleUpdate = (updatedFields: any[]) => {
	// Don't use isUpdating flag for form updates
	jsonFields.value = updatedFields;
	emit('input', updatedFields);
};

// Modify the fieldValue watcher to be more precise
const useFieldValue = (values: ComputedRef<Record<string, any>> | undefined, fieldName: string) => {
	const lastValue = ref<any>(undefined);
	
	if (values) {
		watch(
			() => values.value?.[fieldName],
			(newValue) => {
				const parsed = parseJsonSafely(newValue);
				// Only update if the value is significantly different
				if (Array.isArray(parsed) && JSON.stringify(parsed) !== JSON.stringify(lastValue.value)) {
					lastValue.value = parsed;
					jsonFields.value = parsed;
				}
			},
			{ immediate: true }
		);
	}

	return lastValue;
};

// Use the composable instead of computed
const fieldValue = useFieldValue(values, props.field);

// Add at the top of script setup
const logPrefix = '🔍 [JsonForms]';

// Add more detailed logging in key places
onMounted(() => {
	console.log(`${logPrefix} Mounting with props:`, {
		jsonField: props.jsonField ?? [],
		enableEditor: props.enableEditor,
		collection: props.collection,
		value: props.value,
		field: props.field
	});

	const initialData = parseJsonSafely(fieldValue.value) ?? parseJsonSafely(props.value);
	console.log(`${logPrefix} Initial data:`, {
		parsedFieldValue: parseJsonSafely(fieldValue.value),
		parsedPropValue: parseJsonSafely(props.value),
		initialData,
		isArray: Array.isArray(initialData)
	});

	if (Array.isArray(initialData)) {
		jsonFields.value = JSON.parse(JSON.stringify(initialData));
	} else {
		console.log(`${logPrefix} No valid initial data, setting empty array`);
		jsonFields.value = [];
		emit('input', []);
	}
});

// Watch for incoming validation errors from parent
watch(
	() => props.validationErrors,
	(newErrors) => {
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

// Handle validation from dynamic form
const handleValidation = (errors: ValidationError[]) => {
	if (errors.length > 0) {
		const consolidatedErrors = errors.map(error => ({
			code: 'VALIDATION_FAILED',
			collection: props.collection,
			field: `${props.field}(${error.field})`,
			type: 'validation' as const,
			message: error.message
		}));

		validationErrors.value = errors;
		emit('validation', consolidatedErrors);
		emit('input', null);
	} else {
		validationErrors.value = [];
		emit('validation', []);
		emit('input', jsonFields.value);
	}
};
</script>

<style lang="scss" scoped>
.json-form-interface {
	width: 100%;

	.empty {
		color: var(--theme--form--field--input--foreground-subdued);
		font-style: italic;
	}

	.toggle-mode {
		margin-bottom: 20px;
	}
}
</style>
