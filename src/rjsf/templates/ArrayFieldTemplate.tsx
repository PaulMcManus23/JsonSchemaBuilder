import * as React from 'react'
import type { ArrayFieldTemplateProps } from '@rjsf/core'
import { Stack } from '@fluentui/react/lib/Stack'
import type { IStackStyles, IButtonStyles } from '@fluentui/react'
import { CommandBarButton, DefaultButton } from '@fluentui/react/lib/Button'
import { Markdown } from '../shims/Markdown'
import { ArrayFieldTable } from './ArrayFieldTable'
import { renderArrayInlineTable } from './renderArrayInlineTable'

export class ArrayFieldSharedState {
  public static openArrayDialogOnNewItem = false
}

export const ArrayFieldTemplate: React.FunctionComponent<ArrayFieldTemplateProps> = (props: ArrayFieldTemplateProps) => {
  const stackStyles: Partial<IStackStyles> = { root: { height: 24 } }
  const addStackStyles: Partial<IStackStyles> = { root: { height: 32 } }
  const buttonStyles: Partial<IButtonStyles> = { root: { minWidth: 24 } }

  const label = getLabel(props)
  const renderAsItemDialog = (props.uiSchema as any)?.useArrayItemDialog === true
  const useArrayInlineTable = (props.uiSchema as any)?.useArrayInlineTable === true

  return (
    <div className={`array-wrapper ${props.className}`}>
      {(props.uiSchema as any)?.['ui:title'] || props.title ? (
        <div key={`array-field-title-${props.idSchema.$id}`} className="array-title-wrapper">
          <label className="array-title">
            {(props.uiSchema as any)?.['ui:title'] || props.title}{' '}
            {props.required ? <span className="required-field">*</span> : null}
          </label>
        </div>
      ) : null}

      {(props.uiSchema as any)?.['ui:description'] || props.schema.description ? (
        <div key={`field-description-${props.idSchema.$id}`} className="array-description altus-markdown">
          <Markdown>{((props.uiSchema as any)?.['ui:description'] || props.schema.description) as string}</Markdown>
        </div>
      ) : null}

      {(!props.items || props.items.length === 0) && (
        <div className="no-array-items altus-markdown">
          {(props.uiSchema as any)?.noItemsText === undefined ? (
            <>No {props.title ? props.title : 'Items'} Specified</>
          ) : (
            <Markdown>{(props.uiSchema as any).noItemsText as string}</Markdown>
          )}
        </div>
      )}

      {!renderAsItemDialog && !useArrayInlineTable && renderArrayList(props, stackStyles, buttonStyles, label)}
      {!renderAsItemDialog && useArrayInlineTable ? renderArrayInlineTable(props, label) : null}
      {renderAsItemDialog && !useArrayInlineTable ? <ArrayFieldTable {...props} label={label} /> : null}

      {props.canAdd ? (
        <Stack className="array-add-button" horizontal reversed styles={addStackStyles}>
          <DefaultButton
            iconProps={{ iconName: 'Add' }}
            text={`New ${label}`}
            onClick={() => {
              if (renderAsItemDialog) ArrayFieldSharedState.openArrayDialogOnNewItem = true
              props.onAddClick()
            }}
          />
        </Stack>
      ) : null}
    </div>
  )
}

function getLabel(props: ArrayFieldTemplateProps) {
  if (props.schema.items) {
    const itemsDef: any = props.schema.items
    if (itemsDef.title) return itemsDef.title
  }
  return 'Item'
}

function renderArrayList(
  props: ArrayFieldTemplateProps,
  stackStyles: Partial<IStackStyles>,
  buttonStyles: Partial<IButtonStyles>,
  label: string,
) {
  return (
    <div className="array-items-wrapper">
      {props.items
        ? props.items.map((element, index) => (
            <div key={element.key} className={`array-item-wrapper clearfix ${element.className}`}>
              <div className="array-item-toolbox">
                <Stack horizontal reversed styles={stackStyles}>
                  <CommandBarButton
                    disabled={element.disabled || element.readonly}
                    iconProps={{ iconName: 'Delete' }}
                    styles={buttonStyles}
                    title={`Delete ${label}`}
                    onClick={element.onDropIndexClick(element.index)}
                  />
                  {element.hasMoveUp || element.hasMoveDown ? (
                    <CommandBarButton
                      disabled={element.disabled || element.readonly || !element.hasMoveUp}
                      iconProps={{ iconName: 'Up' }}
                      styles={buttonStyles}
                      title={`Move ${label} Up`}
                      onClick={element.onReorderClick(element.index, element.index - 1)}
                    />
                  ) : null}
                  {element.hasMoveUp || element.hasMoveDown ? (
                    <CommandBarButton
                      disabled={element.disabled || element.readonly || !element.hasMoveDown}
                      iconProps={{ iconName: 'Down' }}
                      styles={buttonStyles}
                      title={`Move ${label} Down`}
                      onClick={element.onReorderClick(element.index, element.index + 1)}
                    />
                  ) : null}
                </Stack>
              </div>
              <div className="array-item-content">{element.children}</div>
            </div>
          ))
        : null}
    </div>
  )
}
