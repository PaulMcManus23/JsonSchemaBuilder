import React from 'react'
import { TextField } from '@fluentui/react/lib/TextField'
import { ComboBox } from '@fluentui/react/lib/ComboBox'
import type { WidgetProps } from '@rjsf/core'
import { SelectableOptionMenuItemType } from '@fluentui/react'

const allowedProps = [
  'multiline', 'resizable', 'autoAdjustHeight', 'underlined', 'borderless',
  'label', 'description', 'prefix', 'suffix', 'iconProps', 'defaultValue',
  'value', 'disabled', 'readOnly', 'errorMessage', 'onChange',
  'className', 'inputClassName', 'ariaLabel', 'validateOnFocusIn',
  'validateOnFocusOut', 'validateOnLoad', 'theme', 'styles', 'autoComplete',
  'mask', 'maskChar', 'maskFormat', 'type', 'list',
]

function pick(obj: Record<string, any>, keys: string[]): Record<string, any> {
  const result: Record<string, any> = {}
  for (const k of keys) { if (k in obj) result[k] = obj[k] }
  return result
}

function TextWidget({ id, placeholder, readonly, disabled, value, onChange, onBlur, onFocus, autofocus, options, schema, rawErrors }: WidgetProps) {
  const _onChange = ({ target: { value } }: React.ChangeEvent<HTMLInputElement>) => {
    onChange(value === '' ? options.emptyValue : value)
  }
  const _onBlur = ({ target: { value } }: React.FocusEvent<HTMLInputElement>) => { onBlur(id, value) }
  const _onFocus = ({ target: { value } }: React.FocusEvent<HTMLInputElement>) => { onFocus(id, value) }

  const uiProps: any = pick((options.props as Record<string, any>) || {}, allowedProps)
  const inputType = schema.type === 'string' ? 'text' : `${schema.type}`
  uiProps.className = `${uiProps.className ?? ''} siq-textfield`
  uiProps.required = false

  if (schema.examples && Array.isArray(schema.examples) && schema.type === 'string') {
    const examples = schema.examples as string[]
    if (examples.length) {
      const exampleOptions = [
        { key: 'Header', text: 'Examples', itemType: SelectableOptionMenuItemType.Header },
        ...examples.map((e, i) => ({ key: i.toString(), text: e })),
      ]
      return (
        <ComboBox
          {...uiProps}
          allowFreeform={true}
          errorMessage={(rawErrors || []).join('\n')}
          id={id}
          options={exampleOptions}
          readOnly={readonly}
          onBlur={_onBlur as any}
          onFocus={_onFocus as any}
          onChange={(_event, o, _i, val) => {
            if (o && !val) onChange(o.text)
            else onChange(val === '' ? options.emptyValue : val)
          }}
          autoComplete="off"
          disabled={disabled}
          placeholder={placeholder}
          autoFocus={autofocus}
          type={inputType as string}
          text={value || value === 0 ? value : ''}
        />
      )
    }
  }

  return (
    <TextField
      disabled={disabled}
      type={inputType as string}
      value={value || value === 0 ? value : ''}
      onBlur={_onBlur as any}
      onChange={_onChange as any}
      onFocus={_onFocus as any}
      errorMessage={(rawErrors || []).join('\n')}
      id={id}
      placeholder={placeholder}
      autoFocus={autofocus}
      readOnly={readonly}
      {...uiProps}
    />
  )
}

export default TextWidget
