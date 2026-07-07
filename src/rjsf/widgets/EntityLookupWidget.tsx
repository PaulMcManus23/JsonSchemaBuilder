import React from 'react'
import { TagPicker, TagItem } from '@fluentui/react/lib/Pickers'
import type { ITag } from '@fluentui/react/lib/Pickers'
import type { WidgetProps } from '@rjsf/core'
import { MockDataService } from '../services/MockDataService'
import type { EntitySearchConfig } from '../services/IDataService'
import { SchemaContext } from '../utils/SchemaContext'

export interface EntityLookupWidgetState {
  selectedItems?: ITag[]
  config?: EntitySearchConfig
  providerValue?: any
}

export class EntityLookupWidget extends React.Component<WidgetProps, EntityLookupWidgetState> {
  protected dataService: MockDataService
  static contextType = SchemaContext
  declare context: React.ContextType<typeof SchemaContext>

  constructor(props: WidgetProps) {
    super(props)
    this.dataService = new MockDataService()

    let config: EntitySearchConfig | undefined = undefined
    const options = (props.uiSchema as any)?.['ui:options']
    if (options?.endPoint) {
      config = {
        endPoint: options.endPoint as string,
        additionalSearchFilter: options.additionalSearchFilter as string,
        nameField: options.nameField as string,
        nameFieldPath: options.nameFieldPath as string,
        valueField: options.valueField as string,
        supportsContains: (options.supportsContains ?? true) as boolean,
        provider: (options.provider ?? false) as boolean,
        consumer: (options.consumer ?? '') as string,
        supportOrderBy: (options.supportOrderBy ?? true) as boolean,
        supportTop: (options.supportTop ?? true) as boolean,
        localizedLabels: (options.localizedLabels ?? false) as boolean,
        readOnlyItems: (options.readOnlyItems ?? []) as string[],
      }
    }

    this.state = {
      selectedItems: props.value
        ? [{ key: props.value, name: '(Loading...)' }]
        : undefined,
      config,
    }
  }

  public componentDidMount() { this.loadNames() }

  public componentDidUpdate(prevProps: WidgetProps) {
    if (JSON.stringify(prevProps.value ?? '') !== JSON.stringify(this.props.value ?? '')) {
      this.loadNames()
    } else {
      const contextProviderValue: any = this.state.config?.consumer && this.context?.fields[this.state.config.consumer]
      if ((this.state.config?.consumer && contextProviderValue) || (contextProviderValue === undefined && this.state.providerValue)) {
        if (JSON.stringify(this.state.providerValue) !== JSON.stringify(contextProviderValue)) {
          this.loadNames()
        }
      }
    }
  }

  public shouldComponentUpdate() { return true }

  public render(): JSX.Element {
    if (!this.state.config) return <>Invalid configuration</>

    const consumer = this.state.config.consumer
    const context = this.context!
    const consumerValue = consumer ? context?.fields[consumer] : undefined

    return (
      <TagPicker
        className="siq-json-entity-lookup"
        disabled={!!(consumer && !consumerValue)}
        inputProps={{ placeholder: this.props.placeholder }}
        resolveDelay={400}
        selectedItems={this.state.selectedItems}
        pickerSuggestionsProps={{
          loadingText: 'Loading', searchingText: 'Searching',
          noResultsFoundText: 'No Results Found', suggestionsHeaderText: 'Suggestions',
        }}
        onEmptyResolveSuggestions={this.onEmptyResolveSuggestions.bind(this)}
        onResolveSuggestions={this.onResolveSuggestions.bind(this)}
        onChange={(items) => {
          const readOnlyItems = this.state.config?.readOnlyItems || []
          let newItems = items || []
          const missingReadOnly = readOnlyItems.filter(r => newItems.findIndex(i => i.key === r) < 0)
          if (missingReadOnly.length > 0) {
            const previousItems = this.state.selectedItems || []
            const restoredItems = missingReadOnly
              .map(key => previousItems.find(p => p.key === key))
              .filter((i): i is ITag => !!i)
            newItems = [...restoredItems, ...newItems]
          }
          this.setState({ selectedItems: newItems }, () => {
            const single = this.props.schema.type !== 'array'
            if (single) this.props.onChange(newItems.length ? newItems[0].key : null)
            else this.props.onChange(newItems.length ? newItems.map(i => i.key) : null)
          })
        }}
        onRenderItem={(p) => {
          const isReadOnly = this.state.config?.readOnlyItems?.includes(p.item.key as string)
          if (isReadOnly) {
            return (
              <TagItem
                {...p}
                title={`${p.item.name} (Default)`}
                styles={{ root: { background: '#eaeaea', cursor: 'default' }, close: { display: 'none' } }}
                onRemoveItem={() => {}}
              >
                {p.item.name}
              </TagItem>
            )
          }
          return <TagItem {...p}>{p.item.name}</TagItem>
        }}
      />
    )
  }

  protected async onEmptyResolveSuggestions(selectedItems?: ITag[]): Promise<ITag[]> {
    const result = await this.dataService.suggestEntity(this.state.config!)
    return result.filter(r => !selectedItems || selectedItems.findIndex(i => i.key === r.key) < 0)
  }

  protected async onResolveSuggestions(filter: string, selectedItems?: ITag[]): Promise<ITag[]> {
    const result = await this.dataService.searchEntityConfig(this.state.config!, filter)
    return result.filter(r => !selectedItems || selectedItems.findIndex(i => i.key === r.key) < 0)
  }

  private loadNames() {
    const providerValue: any = this.state.config?.consumer && this.context?.fields[this.state.config.consumer]
    const readOnlyItems = this.state.config?.readOnlyItems || []

    let values: string[] = []
    if (this.props.value) {
      if (Array.isArray(this.props.value)) values = [...this.props.value]
      else values = [this.props.value]
    }

    readOnlyItems.forEach(item => { if (!values.includes(item)) values.push(item) })

    if (values.length > 0 && this.state.config) {
      Promise.all(values.map(v => this.dataService.getRecord(this.state.config!, v)))
        .then(records => this.setState({ selectedItems: records, providerValue }))
        .catch(console.error)
      return
    }

    this.setState({ selectedItems: [], providerValue })
  }
}
