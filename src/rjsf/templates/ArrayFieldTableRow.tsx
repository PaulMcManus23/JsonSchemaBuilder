import * as React from 'react'
import { Stack } from '@fluentui/react/lib/Stack'
import { Dialog, DialogType } from '@fluentui/react/lib/Dialog'
import { DefaultButton, PrimaryButton } from '@fluentui/react/lib/Button'
import { Button, TableRow, TableCell, TableCellLayout } from '@fluentui/react-components'
import { EditRegular, ArrowUpRegular, ArrowDownRegular, DeleteRegular } from '@fluentui/react-icons'
import Form, { IChangeEvent } from '@rjsf/core'
import validator from '@rjsf/validator-ajv8'
import { optionsList } from '@rjsf/utils'
import type { UiSchema, Registry } from '@rjsf/core'
import type { JSONSchema7 } from 'json-schema'
import { FieldTemplate } from './FieldTemplate'
import { ObjectFieldTemplate } from './ObjectFieldTemplate'
import { ArrayFieldSharedState, ArrayFieldTemplate } from './ArrayFieldTemplate'
import { fields, widgets } from '../KaizenForm'
import { DisplayName } from './DisplayName'
import type { IColumnDefinition } from './ArrayFieldTable'

export interface IArrayFieldTableRowProps {
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
  readonly columns: IColumnDefinition[]
  readonly registry: Registry
}

export interface IArrayFieldTableRowState extends React.ComponentState {
  showDialog: boolean
  formData: any
  providerValues: Record<string, string>
}

export class ArrayFieldTableRow extends React.Component<IArrayFieldTableRowProps, IArrayFieldTableRowState> {
  private wasNew = false

  constructor(props: IArrayFieldTableRowProps) {
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

  public componentDidUpdate(prevProps: IArrayFieldTableRowProps) {
    if (this.props.children.props.formData !== prevProps.children.props.formData) {
      this.setState({ formData: this.props.children.props.formData })
    }
  }

  public render(): JSX.Element {
    const schema = this.getSchema()
    return (
      <>
        <TableRow>
          {this.props.columns.map((c, i) => {
            const displayName = c.key && this.getFormattedValue(c.key, schema)
            return (
              <TableCell
                key={i.toString()}
                role="gridcell"
                style={{ width: `${100 / this.props.columns.length}%` }}
                tabIndex={0}
                onDoubleClick={() => this.setState({ showDialog: true })}
              >
                <TableCellLayout>
                  {displayName !== null && displayName !== undefined ? (
                    <DisplayName
                      displayName={String(displayName)}
                      providerValues={this.state.providerValues}
                      registry={this.props.registry}
                      uiSchema={c.uiSchema}
                    />
                  ) : (
                    i === 0 ? <>{this.props.label} {this.props.rowNumber}</> : null
                  )}
                </TableCellLayout>
              </TableCell>
            )
          })}
          <TableCell role="gridcell" style={{ width: '150px', maxWidth: '150px' }} tabIndex={0}>
            <TableCellLayout>
              <Button
                appearance="transparent"
                disabled={this.props.disabled || this.props.readonly}
                icon={<EditRegular />}
                title={`Edit ${this.props.label}`}
                onClick={() => this.setState({ showDialog: true })}
              />
              {this.props.hasMoveUp || this.props.hasMoveDown ? (
                <Button
                  appearance="transparent"
                  disabled={this.props.disabled || this.props.readonly || !this.props.hasMoveDown}
                  icon={<ArrowDownRegular />}
                  title={`Move ${this.props.label} Down`}
                  onClick={this.props.onReorderClick(this.props.index, this.props.index + 1)}
                />
              ) : null}
              {this.props.hasMoveUp || this.props.hasMoveDown ? (
                <Button
                  appearance="transparent"
                  disabled={this.props.disabled || this.props.readonly || !this.props.hasMoveUp}
                  icon={<ArrowUpRegular />}
                  title={`Move ${this.props.label} Up`}
                  onClick={this.props.onReorderClick(this.props.index, this.props.index - 1)}
                />
              ) : null}
              <Button
                appearance="transparent"
                disabled={this.props.disabled || this.props.readonly}
                icon={<DeleteRegular />}
                title={`Delete ${this.props.label}`}
                onClick={this.props.onDropIndexClick(this.props.index)}
              />
            </TableCellLayout>
          </TableCell>
        </TableRow>
        {this.renderDialog(schema)}
      </>
    )
  }

  private renderDialog(schema: any) {
    return (
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

  private getFormattedValue(arrayItemDialogLabelKey: string, schema: JSONSchema7) {
    const formData = this.props.children.props.formData
    if (arrayItemDialogLabelKey) {
      const propSchema = schema.properties && (schema.properties[arrayItemDialogLabelKey] as JSONSchema7)
      const value = formData[arrayItemDialogLabelKey]
      if (propSchema?.enum) {
        const options = optionsList(propSchema as any)
        const selected = options.find((o: any) => o.value == value)
        if (selected) return selected.label
      }
      return value
    }
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
