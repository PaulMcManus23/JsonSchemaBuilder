import React from 'react'
import { Dropdown } from '@fluentui/react/lib/Dropdown'
import type { WidgetProps } from '@rjsf/core'
import type { IDropdownOption } from '@fluentui/react/lib/Dropdown'

const allowedProps = [
  'placeHolder', 'options', 'onChange', 'onRenderLabel', 'onRenderPlaceholder',
  'onRenderTitle', 'onRenderCaretDown', 'dropdownWidth', 'responsiveMode',
  'defaultSelectedKeys', 'selectedKeys', 'multiselectDelimiter', 'notifyOnReselect',
  'isDisabled', 'keytipProps', 'theme', 'styles', 'componentRef', 'label',
  'ariaLabel', 'id', 'className', 'defaultSelectedKey', 'selectedKey', 'multiSelect',
  'onRenderContainer', 'onRenderList', 'onRenderItem', 'onRenderOption', 'onDismiss',
  'disabled', 'required', 'calloutProps', 'panelProps', 'errorMessage', 'placeholder',
  'openOnKeyboardFocus',
]

function pick(obj: Record<string, any>, keys: string[]): Record<string, any> {
  const result: Record<string, any> = {}
  for (const k of keys) { if (k in obj) result[k] = obj[k] }
  return result
}

function SelectWidget({ id, options, required, disabled, readonly, value, multiple, onChange, onBlur, onFocus, rawErrors }: WidgetProps) {
  const { enumOptions, enumDisabled } = options

  const _onChange = (_ev?: React.FormEvent<HTMLElement>, item?: IDropdownOption) => {
    if (!item) return
    if (multiple) {
      const valueOrDefault = value || []
      if (item.selected) onChange([...valueOrDefault, item.key])
      else onChange(valueOrDefault.filter((k: any) => k !== item.key))
    } else {
      onChange(item.key)
    }
  }
  const _onBlur = (e: any) => onBlur(id, e.target?.value)
  const _onFocus = (e: any) => onFocus(id, e.target?.value)

  const newOptions = (enumOptions as { value: any; label: any }[]).map(o => ({
    key: o.value,
    text: o.label,
    disabled: ((enumDisabled as any[]) || []).includes(o.value),
  }))

  if (!required && !multiple) {
    newOptions.splice(0, 0, { key: '', text: '', disabled: false })
  }

  const uiProps: any = pick((options.props as Record<string, any>) || {}, allowedProps)
  uiProps.className = `${uiProps.className ?? ''} siq-selectfield`
  uiProps.required = false

  return (
    <Dropdown
      disabled={disabled || readonly}
      multiSelect={multiple}
      onBlur={_onBlur}
      onChange={_onChange}
      onFocus={_onFocus}
      defaultSelectedKey={value}
      options={newOptions}
      {...uiProps}
      errorMessage={(rawErrors || []).join('\n')}
    />
  )
}

export default SelectWidget
