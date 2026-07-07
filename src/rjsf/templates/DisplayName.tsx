import React from 'react'
import type { UiSchema, Registry } from '@rjsf/core'
import { SchemaContext } from '../utils/SchemaContext'
import { Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner'

export interface IDisplayNameProps {
  readonly displayName: string
  readonly registry: Registry
  readonly uiSchema?: UiSchema
  readonly providerValues: Record<string, string>
}

export interface IDisplayNameState extends React.ComponentState {
  displayName?: string
  loading: boolean
  consumer?: string
}

export class DisplayName extends React.Component<IDisplayNameProps, IDisplayNameState> {
  static contextType = SchemaContext
  declare context: React.ContextType<typeof SchemaContext>

  constructor(props: IDisplayNameProps) {
    super(props)

    const proposedState: IDisplayNameState = { loading: false }

    if (props.uiSchema) {
      const consumer = (props.uiSchema['ui:options'] as any)?.consumer as string
      proposedState.consumer = consumer
      proposedState.loading = true
    } else {
      proposedState.displayName = props.displayName
    }

    this.state = proposedState
  }

  public componentDidMount() {
    this.loadDisplayName()
    setTimeout(() => {
      if (this.state.loading && !this.state.displayName) {
        this.setState({ displayName: this.props.displayName })
      }
    }, 5000)
  }

  public componentDidUpdate(prevProps: IDisplayNameProps) {
    if (this.props.displayName !== prevProps.displayName) {
      this.setState({ loading: !!this.props.uiSchema, displayName: undefined }, () => {
        this.loadDisplayName()
      })
    } else {
      const consumerValue = this.getConsumerValue()
      if (consumerValue && !this.state.displayName) {
        this.loadDisplayName()
      }
    }
  }

  public async loadDisplayName() {
    if (this.props.uiSchema) {
      const widgetName = this.props.uiSchema['ui:widget'] as string
      const widget = this.props.registry.widgets[widgetName] as any
      if (widget?.getLabel) {
        const consumerValue = this.getConsumerValue()
        if (this.state.consumer && !consumerValue) return
        const getLabel: (options: any, value: string, providerValue: string) => Promise<string> = widget.getLabel
        try {
          const label = await getLabel(this.props.uiSchema['ui:options'], this.props.displayName, consumerValue)
          this.setState({ loading: false, displayName: label })
        } catch {
          setTimeout(() => this.loadDisplayName(), 2000)
        }
        return
      }
    }
    this.setState({ loading: false, displayName: this.props.displayName?.toString() })
  }

  private getConsumerValue() {
    const context = this.context!
    return this.state.consumer ? context?.fields[this.state.consumer] : undefined
  }

  public render(): JSX.Element {
    return (
      <>
        {this.state.loading ? <Spinner size={SpinnerSize.xSmall} /> : null}
        {this.state.displayName}
      </>
    )
  }
}
