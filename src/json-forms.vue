<template>
	<div v-if="props.jsonField" class="json-form-interface">
		<v-notice v-if="loading">Loading...</v-notice>
		<v-notice v-else-if="error" type="danger">{{ error }}</v-notice>
		<template v-else>
			<!-- Relation field -->
			<div class="field-list">
				<v-field
					:collection="props.collection"
					:field="relationInfo?.relationField"
					:type="relation?.meta?.interface || 'select-dropdown-m2o'"
					:value="currentValue"
					:disabled="false"
					:name="relationInfo?.relationField"
					:relation="relation"
					:fields="[relationInfo?.jsonField]"
					:validation-errors="validationErrors"
					@input="handleValueChange"
				>
					<template #append>
						<v-menu show-arrow placement="bottom-end">
							<template #activator="{ toggle }">
								<v-icon name="info" outline @click="toggle" />
							</template>
							<div class="related-info">
								<div class="related-field">
									{{ relationInfo?.jsonField }}
								</div>
							</div>
						</v-menu>
					</template>
				</v-field>
			</div>

			<!-- Dynamic form with validation -->
			<dynamic-form
				v-if="jsonFields && jsonFields.length > 0"
				:fields="jsonFields"
				:collection="collection"
				:source-id="currentValue"
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
import { ref, computed, watch, inject, type ComputedRef } from 'vue';
import { useI18n } from 'vue-i18n';
import { useApi, useStores } from '@directus/extensions-sdk';
import DynamicForm from './components/dynamic-form.vue';
import { ValidationError } from '@directus/types';

const props = defineProps<{
	collection: string;
	value: any;
	field: string;
	jsonField?: string[];
	primaryKey: string | number | null;
}>();

const emit = defineEmits(['input']);
const { t } = useI18n();
const api = useApi();

// Add stores
const { useRelationsStore, useCollectionsStore } = useStores();
const relationsStore = useRelationsStore();
const collectionsStore = useCollectionsStore();

const loading = ref(false);
const error = ref<string | null>(null);
const jsonFields = ref<any[]>([]);
const currentValue = ref(props.value);

// Get current form values including unsaved changes
const values = inject<ComputedRef<Record<string, any>>>('values');

// Get relation info using the stores
const relationInfo = computed(() => {
	if (!props.jsonField?.[0]) return null;
	
	const [relationField, jsonField] = props.jsonField[0].split('.');
	
	return {
		relationField,
		jsonField,
		currentFormValue: values?.value?.[relationField]
	};
});

// Get relation using the relationField from jsonField path
const relation = computed(() => {
	if (!relationInfo.value?.relationField) return null;
	const rel = relationsStore.getRelationsForField(props.collection, relationInfo.value.relationField)?.[0];
	return {
		...rel,
		meta: {
			...(rel?.meta || {}),
			interface: 'select-dropdown-m2o'
		}
	};
});

const relatedCollection = computed(() => {
	if (!relation.value?.related_collection) return null;
	return collectionsStore.getCollection(relation.value.related_collection);
});

// Add state management flags
const isInitialized = ref(false);
const isLoadingTemplate = ref(false);
const isUpdating = ref(false);
let updateTimeout: NodeJS.Timeout;

// Add a flag to track if we're currently handling a value update
const isHandlingValueUpdate = ref(false);

// Add a ref to track the last fetched ID
const lastFetchedId = ref<string | number | null>(null);

// Add a computed to check if we have a local value
const localJsonValue = computed(() => {
	if (!values?.value || !props.field) return null;
	// Get the JSON array from the local value
	const localValue = values.value[props.field];

	return Array.isArray(localValue) ? localValue : null;
});

// Add refs to track state
const isInitialLoad = ref(true);
const lastProcessedValue = ref<number | null>(null);
const isRelationChange = ref(false);
const hasLoadedLocalData = ref(false);

// Add validation state
const validationErrors = ref<ValidationError[]>([]);

// Handle validation from dynamic form
function handleValidation(errors: ValidationError[]) {
	if (errors.length > 0) {
		
		// Map the validation error to the parent field
		const parentError: ValidationError = {
			code: 'VALIDATION_FAILED',
			field: props.field,
			type: 'validation',
			message: errors.map(e => e.message).join(', ')
		};

		validationErrors.value = [parentError];
		
		// Emit null to prevent saving
		emit('input', null);
	} else {
		validationErrors.value = [];
		emit('input', jsonFields.value);
	}
}

// Modify handleUpdate to work with validation
function handleUpdate(updatedFields: any[]) {
	if (!isInitialized.value) return;

	isUpdating.value = true;
	jsonFields.value = JSON.parse(JSON.stringify(updatedFields));
	
	clearTimeout(updateTimeout);
	updateTimeout = setTimeout(() => {
		isHandlingValueUpdate.value = true;
		// Only emit input if there are no validation errors
		emit('input', jsonFields.value);
		isHandlingValueUpdate.value = false;
		isUpdating.value = false;
	}, 300);
}

// Modify the watch function
watch(
	[() => values?.value, () => props.field],
	async ([formValues, field]) => {


		// Skip if no relation info is available
		if (!relationInfo.value) return;

		// Skip if we're in the middle of updates
		if (isUpdating.value || isLoadingTemplate.value || isHandlingValueUpdate.value) return;

		const currentRelatedValue = formValues?.[relationInfo.value.relationField];
		const localJsonData = formValues?.[field];

		// First check for local data on initial load
		if (!hasLoadedLocalData.value && Array.isArray(localJsonData) && localJsonData.length > 0) {
			jsonFields.value = JSON.parse(JSON.stringify(localJsonData));
			isHandlingValueUpdate.value = true;
			emit('input', jsonFields.value);
			isHandlingValueUpdate.value = false;
			isInitialized.value = true;
			lastProcessedValue.value = currentRelatedValue;
			hasLoadedLocalData.value = true;
			return;
		}

		// Then handle relation changes or initial relation selection
		if ((currentRelatedValue !== lastProcessedValue.value || isRelationChange.value) && currentRelatedValue) {
			lastProcessedValue.value = currentRelatedValue;
			
			try {
				loading.value = true;
				error.value = null;
				isLoadingTemplate.value = true;

				const response = await api.get(`/items/${relation.value?.related_collection}/${currentRelatedValue}`, {
					params: {
						fields: [relationInfo.value.jsonField]
					}
				});

				const item = response.data.data;
				const fields = item?.[relationInfo.value.jsonField];
				
				if (Array.isArray(fields) && fields.length > 0) {
					jsonFields.value = JSON.parse(JSON.stringify(fields));
					isHandlingValueUpdate.value = true;
					emit('input', jsonFields.value);
					isHandlingValueUpdate.value = false;
					isInitialized.value = true;
				} else {
					clearFormData();
				}
			} catch (err: any) {
				error.value = err.message;
				clearFormData();
			} finally {
				loading.value = false;
				isLoadingTemplate.value = false;
				isInitialLoad.value = false;
				isRelationChange.value = false;
			}
		}
	},
	{ immediate: true }
);

// Modify handleValueChange
function handleValueChange(newValue: any) {


	const actualValue = typeof newValue === 'object' ? newValue?.id : newValue;
	
	currentValue.value = actualValue;
	lastProcessedValue.value = null; // Reset to force reload
	isRelationChange.value = true;
	isInitialized.value = false;
	error.value = null;
	clearFormData(); // Clear existing fields immediately
}

// Add a function to clear form data
function clearFormData() {
	jsonFields.value = [];
	isHandlingValueUpdate.value = true;
	emit('input', null);
	isHandlingValueUpdate.value = false;
}

// Add all other functions from the provided code...
// (handleValueChange, etc.)

</script>

<style lang="scss" scoped>
.json-form-interface {
	width: 100%;
	
	.empty {
		color: var(--theme--form--field--input--foreground-subdued);
		font-style: italic;
	}

	.field-list {
		padding: var(--theme--form--field--input--padding) 0px;
	}

	.related-info {
		padding: 8px;
		.related-field {
			font-family: monospace;
			color: var(--theme--form--field--input--foreground-subdued);
		}
	}
}
</style>
