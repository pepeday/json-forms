import { defineInterface } from '@directus/extensions-sdk';
import InterfaceComponent from './interface.vue';

export default defineInterface({
	id: 'json-forms',
	name: 'JSON Forms',
	icon: 'fact_check',
	description: 'JSON to form interface',
	component: InterfaceComponent,
	types: ['json'],
	group: 'standard',
	options: ({ collection }) => {
		return [
			{
				field: 'jsonField',
				name: '$t:field',
				type: 'string',
					meta: {
						width: 'full',
						interface: 'system-fields',
						options: {
							collectionName: collection,
							typeAllowList: ['json'],
							includeRelations: true,
						},
						required: true,
					},
			},
		];
	},
});
