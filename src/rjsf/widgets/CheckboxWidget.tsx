import * as React from 'react'
import { Toggle } from '@fluentui/react/lib/Toggle'
import type { WidgetProps } from '@rjsf/core'
import { Markdown } from '../shims/Markdown'

function schemaRequiresTrueValue(schema: any): boolean {
  if (schema.const) return true
  if (schema.enum && schema.enum.length === 1 && schema.enum[0] === true) return true
  if (schema.anyOf && schema.anyOf.length === 1) return schemaRequiresTrueValue(schema.anyOf[0])
  if (schema.oneOf && schema.oneOf.length === 1) return schemaRequiresTrueValue(schema.oneOf[0])
  if (schema.allOf) return schema.allOf.some(schemaRequiresTrueValue)
  return false
}

export const CheckboxWidget: React.FunctionComponent<WidgetProps> = (props: WidgetProps) => {
  const { schema, id, value, disabled, readonly, label, onChange } = props
  const uiSchemaAny = props.uiSchema as any

  return (
    <div className={`checkbox ${disabled || readonly ? 'disabled' : ''}`}>
      <Toggle
        key={id}
        checked={typeof value === 'undefined' ? false : value}
        disabled={disabled || readonly}
        id={id}
        label={label}
        offText={uiSchemaAny?.offText ?? 'No'}
        onText={uiSchemaAny?.onText ?? 'Yes'}
        onChange={(_event, checked) => onChange(checked)}
      />
      {schema.description ? (
        <div className="field-description altus-markdown">
          <Markdown>{schema.description as string}</Markdown>&nbsp;
        </div>
      ) : null}
    </div>
  )
}
