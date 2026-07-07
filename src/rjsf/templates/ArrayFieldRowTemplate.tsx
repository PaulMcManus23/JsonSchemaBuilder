import * as React from 'react'
import { Stack } from '@fluentui/react/lib/Stack'
import type { IStackStyles, IButtonStyles } from '@fluentui/react'
import { Dialog, DialogType } from '@fluentui/react/lib/Dialog'
import { CommandBarButton, DefaultButton, PrimaryButton } from '@fluentui/react/lib/Button'
import Form, { IChangeEvent } from '@rjsf/core'
import validator from '@rjsf/validator-ajv8'
import type { Registry } from '@rjsf/core'
import { FieldTemplate } from './FieldTemplate'
import { ObjectFieldTemplate } from './ObjectFieldTemplate'
import { ArrayFieldSharedState, ArrayFieldTemplate } from './ArrayFieldTemplate'
import { fields, widgets } from '../KaizenForm'
import { DisplayName } from './DisplayName'

export interface IArrayFieldRowTemplateProps {
  readonly label: string
  readonly rowNumber: number
  readonly children: React.ReactElement
  readonly className: string
  readonly disabled: boolean
  readonly hasMoveDown: boolean
  readonly hasMoveUp: boolean
  readonly hasRemove: boolean
  readonly hasToolbar: boolean
  readonly index: number
  readonly onAddIndexClick: (index: number) => (event?: any) => void
  readonly onDropIndexClick: (index: number) => (event?: any) => void
  readonly onReorderClick: (index: number, newIndex: number) => (event?: any) => void
  readonly readonly: boolean
  readonly key: string
  readonly arrayItemDialogLabelKey?: string
  readonly registry: Registry
}

export interface IArrayFieldRowTemplateState extends React.ComponentState {
  showDialog: boolean
  formData: any
  providerValues: Record<string, string>
}

export class ArrayFieldRowTemplate extends React.Component<IArrayFieldRowTemplateProps, IArrayFieldRowTemplateState> {
  private wasNew = false

  constructor(props: IArrayFieldRowTemplateProps) {
    super(props)
    this.wasNew = ArrayFieldSharedState.openArrayDialogOnNewItem
    this.cancel = this.cancel.bind(this)
    this.save = this.save.bind(this)
    this.state = {
      showDialog: ArrayFieldSharedState.openArrayDialogOnNewItem,
      formData: props.children.props.formData,
      providerValues: {},
    }
    ArrayFieldSharedState.openArrayDialogOnNewItem = false
  }

  public componentDidUpdate(prevProps: IArrayFieldRowTemplateProps) {
    if (this.props.children.props.formData !== prevProps.children.props.formData) {
      this.setState({ formData: this.props.children.props.formData })
    }
  }

  public render(): JSX.Element {
    const stackStyles: Partial<IStackStyles> = { root: { height: 24 } }
    const buttonStyles: Partial<IButtonStyles> = { root: { minWidth: 24 } }
    const displayName = this.getDisplayName()
    const schema = this.getSchema()
    const labelUISchema = this.props.arrayItemDialogLabelKey && (this.props.children.props.uiSchema || {})[this.props.arrayItemDialogLabelKey]

    return (
      <div className={`array-item-wrapper clearfix ${this.props.className}`}>
        <div className="array-item-toolbox">
          <Stack horizontal reversed styles={stackStyles}>
            <CommandBarButton
              disabled={this.props.disabled || this.props.readonly}
              iconProps={{ iconName: 'Delete' }}
              styles={buttonStyles}
              title={`Delete ${this.props.label}`}
              onClick={this.props.onDropIndexClick(this.props.index)}
            />
            {this.props.hasMoveUp || this.props.hasMoveDown ? (
              <CommandBarButton
                disabled={this.props.disabled || this.props.readonly || !this.props.hasMoveUp}
                iconProps={{ iconName: 'Up' }}
                styles={buttonStyles}
                title={`Move ${this.props.label} Up`}
                onClick={this.props.onReorderClick(this.props.index, this.props.index - 1)}
              />
            ) : null}
            {this.props.hasMoveUp || this.props.hasMoveDown ? (
              <CommandBarButton
                disabled={this.props.disabled || this.props.readonly || !this.props.hasMoveDown}
                iconProps={{ iconName: 'Down' }}
                styles={buttonStyles}
                title={`Move ${this.props.label} Down`}
                onClick={this.props.onReorderClick(this.props.index, this.props.index + 1)}
              />
            ) : null}
            <CommandBarButton
              disabled={this.props.disabled || this.props.readonly}
              iconProps={{ iconName: 'Edit' }}
              styles={buttonStyles}
              title={`Edit ${this.props.label}`}
              onClick={() => this.setState({ showDialog: true })}
            />
          </Stack>
        </div>
        <div onDoubleClick={() => this.setState({ showDialog: true })}>
          {displayName ? (
            <DisplayName
              displayName={displayName}
              providerValues={this.state.providerValues}
              registry={this.props.registry}
              uiSchema={labelUISchema || undefined}
            />
          ) : (
            `${this.props.label} ${this.props.rowNumber}`
          )}
        </div>
        <Dialog
          hidden={!this.state.showDialog}
          minWidth="1024px"
          dialogContentProps={{ type: DialogType.normal, styles: { title: { fontWeight: 'bold' } }, showCloseButton: true }}
          modalProps={{ isBlocking: true, styles: { main: { width: 1024 } } }}
          onDismiss={this.cancel}
        >
          <div className="array-item-dialog-content">
            <Form
              templates={{ ArrayFieldTemplate, FieldTemplate, ObjectFieldTemplate }}
              fields={fields}
              formData={this.state.formData}
              idPrefix="sensei"
              liveValidate
              schema={schema}
              showErrorList={false}
              uiSchema={this.props.children.props.uiSchema}
              validator={validator}
              widgets={widgets}
              onChange={(e: IChangeEvent<string>) => this.setState({ formData: e.formData })}
            >
              <span />
            </Form>
          </div>
          <Stack className="array-ok-button" horizontal reversed tokens={{ childrenGap: 7 }}>
            <DefaultButton text="Cancel" onClick={this.cancel} />
            <PrimaryButton text="OK" onClick={this.save} />
          </Stack>
        </Dialog>
      </div>
    )
  }

  private getSchema() {
    let schema = this.props.children.props.schema
    if (schema.title || schema.id) {
      const ownerSchema = (this.props.children as any)._owner?.pendingProps?.schema
      if (ownerSchema) {
        for (const propKey of Object.keys(ownerSchema)) {
          const prop = ownerSchema[propKey]
          if ((prop.id && prop.id === schema.id) || (prop.title && prop.title === schema.title)) {
            schema = { ...prop }; break
          }
        }
      }
    }
    return schema
  }

  private getDisplayName() {
    const formData = this.props.children.props.formData
    if (this.props.arrayItemDialogLabelKey) return formData[this.props.arrayItemDialogLabelKey]
    for (const key of Object.keys(formData)) {
      const displayName = formData[key]
      if (displayName?.substring) return displayName
    }
    return undefined
  }

  private save(): void {
    this.props.children.props.onChange(this.state.formData)
    this.setState({ showDialog: false })
  }

  private cancel(): void {
    this.setState({ formData: this.props.children.props.formData, showDialog: false })
  }
}
