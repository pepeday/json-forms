import { defineInterface } from '@directus/extensions-sdk';
import InterfaceComponent from './json-forms.vue';

export default defineInterface({
	id: 'json-forms',
	name: 'JSON Forms',
	icon: 'fact_check',
	description: 'JSON to form interface',
	component: InterfaceComponent,
	types: ['json'],
	group: 'standard',
	options:  [
			{
				field: 'enableDesigner',
				name: 'Enable Designer',
				type: 'boolean',
				meta: {
					width: 'full',
					interface: 'system-boolean',
				},
			},
		]
});
