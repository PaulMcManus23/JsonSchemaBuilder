import React from 'react'
import { Dropdown } from '@fluentui/react/lib/Dropdown'
import type { IDropdownOption } from '@fluentui/react/lib/Dropdown'
import type { WidgetProps } from '@rjsf/core'
import { MockDataService } from '../services/MockDataService'
import { SchemaContext } from '../utils/SchemaContext'

interface OptionSetWidgetState {
  options: IDropdownOption[]
  optionSetName: string
  entity?: string
  global?: boolean
  providerValue?: any
}

export class OptionSetWidget extends React.Component<WidgetProps, OptionSetWidgetState> {
  protected dataService: MockDataService
  static contextType = SchemaContext
  declare context: React.ContextType<typeof SchemaContext>

  constructor(props: WidgetProps) {
    super(props)
    this.dataService = new MockDataService()

    const options = (props.uiSchema as any)?.['ui:options']
    this.state = {
      options: [],
      optionSetName: options?.optionSetName as string ?? '',
      entity: options?.entity as string,
      global: (options?.global ?? true) as boolean,
    }
  }

  public async componentDidMount() {
    const options = await this.dataService.getOptionSetValues(
      this.state.global ?? true,
      this.state.optionSetName,
      this.state.entity,
    )
    this.setState({ options })
  }

  public render(): JSX.Element {
    const { id, disabled, readonly, value, multiple, onChange, onBlur, onFocus } = this.props

    const _onChange = (_ev?: React.FormEvent<HTMLElement>, item?: IDropdownOption) => {
      if (!item) return
      if (multiple) {
        const current = value || []
        if (item.selected) onChange([...current, item.key])
        else onChange(current.filter((k: any) => k !== item.key))
      } else {
        onChange(item.key)
      }
    }

    return (
      <Dropdown
        className="siq-json-optionset-select"
        disabled={disabled || readonly}
        multiSelect={multiple}
        options={this.state.options}
        selectedKey={value}
        onBlur={() => onBlur(id, value)}
        onChange={_onChange}
        onFocus={() => onFocus(id, value)}
      />
    )
  }
}
