import * as React from 'react'
import type { WidgetProps } from '@rjsf/core'
import { TextField } from '@fluentui/react/lib/TextField'

const FormattedIntegerWidget: React.FC<WidgetProps> = ({ id, value, disabled, readonly, placeholder, autofocus, onChange, rawErrors, options }) => {
  const optionValues = options as Record<string, unknown>
  const displayPrefix = typeof optionValues.displayPrefix === 'string' ? optionValues.displayPrefix : ''
  const displaySuffix = typeof optionValues.displaySuffix === 'string' ? optionValues.displaySuffix : ''

  const [isFocused, setIsFocused] = React.useState(false)
  const [editValue, setEditValue] = React.useState<string>(
    value !== undefined && value !== null ? String(value) : ''
  )

  React.useEffect(() => {
    if (!isFocused) setEditValue(value !== undefined && value !== null ? String(value) : '')
  }, [value, isFocused])

  const displayValue =
    isFocused || value === undefined || value === null || editValue === ''
      ? editValue
      : `${displayPrefix}${value}${displaySuffix}`

  function handleFocus() { setIsFocused(true) }

  function handleChange(_event: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, newValue?: string) {
    const nextValue = (newValue ?? '').trim()
    const withoutPrefix = displayPrefix && nextValue.startsWith(displayPrefix) ? nextValue.substring(displayPrefix.length) : nextValue
    const withoutSuffix = displaySuffix && withoutPrefix.endsWith(displaySuffix)
      ? withoutPrefix.substring(0, withoutPrefix.length - displaySuffix.length)
      : withoutPrefix
    const rawDigits = withoutSuffix.replace(/[^0-9-]/g, '')
    const digitsOnly = rawDigits.startsWith('-') ? `-${rawDigits.substring(1).replace(/-/g, '')}` : rawDigits.replace(/-/g, '')
    setEditValue(digitsOnly)
    if (digitsOnly === '' || digitsOnly === '-') { onChange(options.emptyValue); return }
    const parsed = Number.parseInt(digitsOnly, 10)
    if (!Number.isNaN(parsed)) onChange(parsed)
  }

  function handleBlur() { setIsFocused(false) }

  return (
    <TextField
      autoFocus={autofocus}
      disabled={disabled}
      errorMessage={rawErrors?.join('\n') ?? ''}
      id={id}
      placeholder={placeholder}
      readOnly={readonly}
      value={displayValue}
      onBlur={handleBlur}
      onChange={handleChange}
      onFocus={handleFocus}
    />
  )
}

export default FormattedIntegerWidget
