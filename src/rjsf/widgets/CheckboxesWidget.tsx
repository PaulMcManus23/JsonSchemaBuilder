import * as React from 'react'
import { Checkbox } from '@fluentui/react/lib/Checkbox'
import { Stack } from '@fluentui/react/lib/Stack'

function selectValue(value: any, selected: any[], all: any[]) {
  const at = all.indexOf(value)
  const updated = selected.slice(0, at).concat(value, selected.slice(at))
  return updated.sort((a: any, b: any) => (all.indexOf(a) > all.indexOf(b) ? 1 : 0))
}

function deselectValue(value: any, selected: any[]) {
  return selected.filter((v: any) => v !== value)
}

export const CheckboxesWidget: React.FunctionComponent<any> = (props: any) => {
  const { id, disabled, options, value, readonly, onChange } = props
  const { enumDisabled, inline } = options
  const enumOptions: { label: string; value: string }[] = options.enumOptions

  return (
    <div className="checkboxes" id={id}>
      <Stack horizontal={inline} tokens={{ childrenGap: inline ? 10 : 5 }}>
        {enumOptions.map((option, index) => {
          const checked = value.indexOf(option.value) !== -1
          const itemDisabled = enumDisabled && enumDisabled.indexOf(option.value) !== -1
          return (
            <Checkbox
              key={`${id}_${index}`}
              checked={checked}
              className={`checkbox ${disabled || itemDisabled || readonly ? 'disabled' : ''}`}
              id={`${id}_${index}`}
              label={option.label}
              disabled={disabled || itemDisabled || readonly}
              onChange={(_ev, checked) => {
                const all = enumOptions.map(o => o.value)
                if (checked) onChange(selectValue(option.value, value, all))
                else onChange(deselectValue(option.value, value))
              }}
            />
          )
        })}
      </Stack>
    </div>
  )
}
