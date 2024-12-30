# Directus JSON Forms Interface

A custom interface extension for Directus that allows you to create dynamic forms based on JSON field templates.

## Features

- Dynamic form generation from JSON templates
- Support for M2O (Many-to-One) relationships
- Real-time form updates
- Support for various field types:
  - Text inputs
  - Numbers (integer/decimal)
  - DateTime fields
  - And more...

## Installation

1. Navigate to your Directus extensions folder:
   
   cd /path/to/directus/extensions

2. Clone or copy this extension into a json-forms directory

3. Install dependencies:
   
   cd json-forms
   npm install

4. Build the extension:
   
   npm run build

## Usage

1. In your Directus collection, create a JSON field to store the form data

2. Create a related collection to store your form templates with a JSON field containing the field definitions

3. Configure the interface:
   - Select the JSON Forms interface for your JSON field
   - Configure the relationship to your templates collection
   - Specify the JSON field in your templates collection that contains the field definitions

## Field Template Structure

Field templates should be defined as an array of objects. Example structure:

{
  "field": "fieldName",
  "meta": {
    "interface": "input",
    "type": "string",
    "options": {
      "placeholder": "Enter value..."
    }
  }
}

## Complete Example

Here's a complete example of an office inspection form template:

```json
[
    {
        "field": "inspector_notes",
        "name": "Inspector Notes",
        "meta": {
            "interface": "input-multiline",
            "type": "text",
            "width": "full",
            "options": {
                "placeholder": "Enter general inspection notes...",
                "font": "sans-serif"
            }
        }
    },
    {
        "field": "inspection_date",
        "name": "Inspection Date & Time",
        "meta": {
            "interface": "datetime",
            "type": "timestamp",
            "width": "half",
            "options": {
                "includeSeconds": false,
                "mode": "datetime",
                "use24": true
            }
        }
    },
    {
        "field": "next_inspection",
        "name": "Next Inspection Due",
        "meta": {
            "interface": "datetime",
            "type": "date",
            "width": "half",
            "options": {
                "mode": "date"
            }
        }
    },
    {
        "field": "room_temperature",
        "name": "Room Temperature (°C)",
        "meta": {
            "interface": "input",
            "type": "decimal",
            "width": "half",
            "options": {
                "min": 15,
                "max": 30,
                "step": 0.1,
                "placeholder": "Enter temperature"
            }
        }
    },
    {
        "field": "occupancy_count",
        "name": "Current Occupancy",
        "meta": {
            "interface": "input",
            "type": "integer",
            "width": "half",
            "options": {
                "min": 0,
                "max": 500,
                "step": 1,
                "placeholder": "Number of occupants"
            }
        }
    },
    {
        "field": "safety_notice",
        "meta": {
            "interface": "presentation-notice",
            "width": "full",
            "options": {
                "text": "Please ensure all fire exits are unobstructed",
                "type": "warning"
            }
        }
    },
    {
        "field": "fire_exits_clear",
        "name": "Fire Exits Clear",
        "meta": {
            "interface": "boolean",
            "width": "half",
            "options": {
                "label": "Are all fire exits clear of obstruction?"
            }
        }
    },
    {
        "field": "emergency_lights",
        "name": "Emergency Lights",
        "meta": {
            "interface": "boolean",
            "width": "half",
            "options": {
                "label": "Are emergency lights functional?"
            }
        }
    },
    {
        "field": "risk_level",
        "name": "Risk Assessment",
        "meta": {
            "interface": "select-dropdown",
            "width": "half",
            "options": {
                "choices": [
                    {
                        "text": "Low Risk",
                        "value": "low"
                    },
                    {
                        "text": "Medium Risk",
                        "value": "medium"
                    },
                    {
                        "text": "High Risk",
                        "value": "high"
                    }
                ]
            }
        }
    }
]
```

This example includes:
- Multiline text input for inspector notes
- DateTime field for inspection timestamp
- Date field for next inspection
- Decimal input for temperature readings
- Integer input for occupancy count
- Warning notice about fire safety
- Boolean toggles for safety checks
- Dropdown select for risk assessment

## Supported Field Types

- Input (interface: "input")
  - String
  - Integer
  - Decimal
- Multiline (interface: "input-multiline")
- Boolean (interface: "boolean")
- Select Dropdown (interface: "select-dropdown")
  - Single select with custom choices
- DateTime (interface: "datetime")
  - Date
  - Time
  - DateTime
- Presentation (interface: "presentation-notice")
  - Info notices
  - Warning notices
  - Error notices

## Field Properties

- field: Unique identifier for the field
- name: Display name of the field
- meta:
  - interface: The field type interface
  - type: Data type for the field
  - width: Layout width ("half" or "full")
  - options: Interface-specific configuration
- value: Current field value

## Development

1. Install dependencies:
   npm install

2. Start development server:
   npm run dev

## License

MIT License 