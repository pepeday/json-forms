<template>
	<div class="json-form-interface">
		<div v-if="!props.jsonField" class="empty">
			{{ t('select_a_field') }}
		</div>
		<div v-else class="field-list">
			<v-notice v-if="loading">Loading...</v-notice>
			<v-notice v-else-if="error" type="danger">{{ error }}</v-notice>
			<template v-else>
				<!-- Add the related field select -->
				<v-field
					:collection="props.collection"
					:field="relationInfo?.relationField"
					:type="relation?.meta?.interface || 'select-dropdown-m2o'"
					:value="currentValue"
					:disabled="false"
					:name="relationInfo?.relationField"
					:relation="relation"
					:fields="[relationInfo?.jsonField]"
					@input="handleValueChange"
				>
					<template #append>
						<v-menu show-arrow placement="bottom-end">
							<template #activator="{ toggle }">
								<v-icon
									name="info"
									outline
									@click="toggle"
								/>
							</template>
							<div class="related-info">
								<div class="related-field">
									{{ relationInfo?.jsonField }}
								</div>
							</div>
						</v-menu>
					</template>
				</v-field>

				<!-- JSON Display -->
				<div v-if="jsonFields && Object.keys(jsonFields).length > 0" class="json-display">
					<div class="json-header">
						<v-text-field
							:model-value="relationInfo?.jsonField"
							label="JSON Field"
							readonly
						/>
					</div>
					<v-notice type="info">
						<div class="code-wrapper">
							<pre><code>{{ formattedJson }}</code></pre>
						</div>
					</v-notice>
				</div>
			</template>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, computed, watch, inject } from 'vue';
import { useI18n } from 'vue-i18n';
import { useApi, useStores } from '@directus/extensions-sdk';

const props = defineProps<{
	value: any;
	collection: string;
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
const jsonFields = ref<Record<string, any>>({});

// Track the current interface value separately from props.value
const currentValue = ref(props.value);

// Get current form values including unsaved changes
const values = inject<ComputedRef<Record<string, any>>>('values');

// Handle value changes from the interface
function handleValueChange(newValue: any) {
	console.log('Interface value changed:', {
			oldValue: currentValue.value,
			newValue,
			relationInfo: relationInfo.value,
			formValues: values?.value
		});
		
	const actualValue = typeof newValue === 'object' ? newValue?.id : newValue;
	currentValue.value = actualValue;
	emit('input', actualValue);
}

// Get relation info using the stores
const relationInfo = computed(() => {
	if (!props.jsonField?.[0]) return null;
	
	const [relationField, jsonField] = props.jsonField[0].split('.');
	console.log('Current form values:', {
		values: values?.value,
		relationField,
		currentValue: values?.value?.[relationField]
	});
	
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

// Add computed for debugging
const debugInfo = computed(() => ({
	field: props.field,
	collection: props.collection,
	relationField: relationInfo.value?.relationField,
	value: props.value,
	primaryKey: props.primaryKey,
	interface: relation.value?.meta?.interface,
	currentItem: props.primaryKey ? `${props.collection}/${props.primaryKey}` : null
}));

// Watch debugInfo
watch(debugInfo, (info) => {
	console.log('Debug Info:', info);
});

// Watch for changes in the currentValue
watch(
	[currentValue, () => props.jsonField, () => props.primaryKey, () => values?.value],
	async ([newValue, newJsonField, newPrimaryKey, formValues], [oldValue, oldJsonField, oldPrimaryKey]) => {
		console.log('Watch triggered with:', {
			currentValue: currentValue.value,
			formValues,
			relationField: relationInfo.value?.relationField,
			relationValue: formValues?.[relationInfo.value?.relationField],
			value: props.value,
			primaryKey: props.primaryKey
		});

		// Use form value if available
		const relatedId = formValues?.[relationInfo.value?.relationField] ?? currentValue.value;

		// Skip if we don't have a valid primary key
		if (!newPrimaryKey || newPrimaryKey === '+') {
			console.log('No valid primary key, skipping fetch');
			jsonFields.value = {};
			return;
		}

		loading.value = true;
		error.value = null;

		try {
			if (!relationInfo.value || !relation.value?.related_collection) {
				throw new Error('Invalid relation configuration');
			}

			console.log('Using related ID:', {
				fromInterface: relatedId,
				relationField: relationInfo.value.relationField
			});

			if (relatedId) {
				console.log('Fetching related item:', {
					collection: relation.value.related_collection,
					id: relatedId,
					jsonField: relationInfo.value.jsonField
				});

				const response = await api.get(`/items/${relation.value.related_collection}/${relatedId}`, {
					params: {
						fields: [relationInfo.value.jsonField]
					}
				});

				const item = response.data.data;
				console.log('Related item response:', item);

				if (item && item[relationInfo.value.jsonField]) {
					jsonFields.value = item[relationInfo.value.jsonField];
					console.log('Updated jsonFields with:', jsonFields.value);
				} else {
					console.log('No JSON field found in item:', {
						item,
						expectedField: relationInfo.value.jsonField
					});
					jsonFields.value = {};
				}
			} else {
				console.log('No related ID available');
				jsonFields.value = {};
			}
		} catch (err: any) {
			console.error('Error fetching data:', err);
			error.value = err.message;
			jsonFields.value = {};
		} finally {
			loading.value = false;
		}
	},
	{ 
		immediate: true,
		deep: true
	}
);

// Add watcher for jsonFields to see updates
watch(jsonFields, (newValue) => {
	console.log('jsonFields updated:', newValue);
}, { deep: true });

// Add computed for formatted JSON
const formattedJson = computed(() => {
	try {
		return JSON.stringify(jsonFields.value, null, 2);
	} catch (err) {
		return '';
	}
});
</script>

<style lang="scss" scoped>
.json-form-interface {
	width: 100%;
	
	.empty {
		color: var(--theme--form--field--input--foreground-subdued);
		font-style: italic;
	}

	.field-list {
		border: var(--theme--border-width) solid var(--theme--form--field--input--border-color);
		border-radius: var(--theme--border-radius);
		padding: var(--theme--form--field--input--padding);
	}

	.json-display {
		margin-top: 12px;

		.json-header {
			margin-bottom: 8px;
		}

		.code-wrapper {
			max-height: 400px;
			overflow: auto;
			
			pre {
				margin: 0;
				white-space: pre-wrap;
				
				code {
					font-family: var(--theme--font-family-monospace);
					font-size: 14px;
					line-height: 1.5;
				}
			}
		}
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
