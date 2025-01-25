<template>
	<v-button small class="toggle-mode" @click="isDesignMode = !isDesignMode">
		<v-icon :name="isDesignMode ? 'visibility' : 'edit'" />
		{{ isDesignMode ? t('preview_form') : t('edit_form') }}
	</v-button>

	<!-- Form Designer Mode -->
	<form-designer v-if="isDesignMode" :fields="jsonFields" @update:fields="handleDesignerUpdate" />
	<div v-if="props.jsonField" class="json-form-interface">
		<v-notice v-if="loading">Loading...</v-notice>
		<v-notice v-else-if="error" type="danger">{{ error }}</v-notice>
		<template v-else>
			<!-- Add mode toggle -->




			<!-- Form Preview/Use Mode -->
			<dynamic-form v-if="jsonFields && jsonFields.length > 0 && !isDesignMode" :fields="jsonFields" :collection="collection"
				:validation-errors="validationErrors" @update="handleUpdate" @validation="handleValidation" />
			<v-notice v-else type="info">
				{{ t('no_form_available') }}
			</v-notice>
		</template>
	</div>
</template>

<script setup lang="ts">
console.log('version 16');
import { ref, watch, inject, type ComputedRef, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import DynamicForm from './components/dynamic-form.vue';
import FormDesigner from './components/form-designer.vue';
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
const values = inject<ComputedRef<Record<string, any>>>('values');
const isUpdating = ref(false);
let updateTimeout: NodeJS.Timeout;

// Add validation state
const validationErrors = ref<ValidationError[]>([]);

// Add isDesignMode state
const isDesignMode = ref(false);
const disabled = computed(() => props.primaryKey != null);

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

// Add composable to track specific field value
const useFieldValue = (values: ComputedRef<Record<string, any>> | undefined, fieldName: string) => {
	// Create a ref to store the last known value
	const lastValue = ref<any>(undefined);

	// Update function that only triggers when our specific field changes
	const updateValue = () => {
		const newValue = values?.value?.[fieldName];
		if (JSON.stringify(lastValue.value) !== JSON.stringify(newValue)) {
			lastValue.value = newValue;
		}
	};

	// Watch only our field's path
	if (values) {
		watch(() => values.value?.[fieldName], updateValue, { immediate: true });
	}

	return lastValue;
};

// Use the composable instead of computed
const fieldValue = useFieldValue(values, props.field);

// Initialize form data
onMounted(() => {
	logDebug('onMounted', {
		fieldValue: parseJsonSafely(fieldValue.value),
		propValue: parseJsonSafely(props.value)
	});

	const initialData = parseJsonSafely(fieldValue.value) ?? parseJsonSafely(props.value);
	if (Array.isArray(initialData)) {
		jsonFields.value = JSON.parse(JSON.stringify(initialData));
	} else {
		jsonFields.value = [];
		emit('input', []);
	}
});

// Watch only our specific field value
watch(
	() => parseJsonSafely(fieldValue.value),
	(newValue) => {
		logDebug('field watch', {
			newValue,
			isUpdating: isUpdating.value,
			currentFields: jsonFields.value
		});

		if (!isUpdating.value && Array.isArray(newValue)) {
			jsonFields.value = JSON.parse(JSON.stringify(newValue));
		}
	}
);

// Watch for direct prop changes (e.g., from dropdown)
watch(
	() => parseJsonSafely(props.value),
	(newValue) => {
		logDebug('props.value watch', {
			newValue,
			isUpdating: isUpdating.value,
			currentFields: jsonFields.value
		});

		if (!isUpdating.value && Array.isArray(newValue)) {
			jsonFields.value = JSON.parse(JSON.stringify(newValue));
		}
	}
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

// Handle form updates
const handleUpdate = (updatedFields: any[]) => {
	isUpdating.value = true;
	jsonFields.value = JSON.parse(JSON.stringify(updatedFields));

	clearTimeout(updateTimeout);
	updateTimeout = setTimeout(() => {
		isUpdating.value = false;
	}, 300);
};

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

// Add handler for designer updates
const handleDesignerUpdate = (updatedFields: any[]) => {
	handleUpdate(updatedFields);
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
