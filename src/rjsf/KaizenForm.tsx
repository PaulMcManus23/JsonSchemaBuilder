import type { Widget, Field } from '@rjsf/core'
import Form from '@rjsf/core'
import validator from '@rjsf/validator-ajv8'
import { initializeIcons } from '@fluentui/react/lib/Icons'
import { CheckboxWidget } from './widgets/CheckboxWidget'
import { CheckboxesWidget } from './widgets/CheckboxesWidget'
import { EntityLookupWidget } from './widgets/EntityLookupWidget'
import { EntityLookupArrayWidget } from './widgets/EntityLookupArrayWidget'
import { OptionSetWidget } from './widgets/OptionSetWidget'
import TextWidget from './widgets/TextWidget'
import SelectWidget from './widgets/SelectWidget'
import ColourPickerWidget from './widgets/ColourPickerWidget'
import ReadOnlyTextWidget from './widgets/ReadOnlyTextWidget'
import FormattedIntegerWidget from './widgets/FormattedIntegerWidget'
import { ArrayFieldTemplate } from './templates/ArrayFieldTemplate'
import { FieldTemplate } from './templates/FieldTemplate'
import { ObjectFieldTemplate } from './templates/ObjectFieldTemplate'
import { SchemaProvider } from './utils/SchemaContext'
import './KaizenForm.css'

initializeIcons()

export const widgets: Record<string, Widget> = {
  CheckboxWidget,
  CheckboxesWidget,
  EntityLookupWidget: EntityLookupWidget as unknown as Widget,
  EntityLookupArrayWidget: EntityLookupArrayWidget as unknown as Widget,
  OptionSetWidget: OptionSetWidget as unknown as Widget,
  TextWidget,
  ReadOnlyTextWidget,
  FormattedIntegerWidget,
  SelectWidget,
  ColourPickerWidget,
}

export const fields: Record<string, Field> = {}

interface KaizenFormProps {
  schema: Record<string, unknown>
  uiSchema?: Record<string, unknown>
  formData?: unknown
  onChange?: (formData: unknown) => void
}

export function KaizenForm({ schema, uiSchema, formData, onChange }: KaizenFormProps) {
  return (
    <SchemaProvider>
      <Form
        templates={{ ArrayFieldTemplate, FieldTemplate, ObjectFieldTemplate }}
        fields={fields}
        formData={formData ?? {}}
        idPrefix="sensei"
        liveValidate
        schema={schema as never}
        showErrorList={false}
        uiSchema={{ 'ui:submitButtonOptions': { norender: true }, ...uiSchema }}
        validator={validator}
        widgets={widgets}
        onChange={(e) => onChange?.(e.formData)}
      >
        <span />
      </Form>
    </SchemaProvider>
  )
}
