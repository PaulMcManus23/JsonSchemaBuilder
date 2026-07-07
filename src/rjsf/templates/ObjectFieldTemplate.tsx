import * as React from 'react'
import type { ObjectFieldTemplateProps } from '@rjsf/core'
import { TableCell } from '@fluentui/react-components'
import { Markdown } from '../shims/Markdown'

export const ObjectFieldTemplate: React.FunctionComponent<ObjectFieldTemplateProps> = (props: ObjectFieldTemplateProps) => {
  const useArrayInlineTableRow = (props.uiSchema as any)?.useArrayInlineTableRow === true

  if (useArrayInlineTableRow) {
    return (
      <>
        {props.properties.map((element) => (
          <TableCell key={element.name}>{element.content}</TableCell>
        ))}
      </>
    )
  }

  return (
    <div className="object-wrapper">
      {(props.uiSchema as any)?.['ui:title'] || props.title ? (
        <div key={`object-field-title-${props.idSchema.$id}`} className="object-title-wrapper">
          <label className="object-title">
            {(props.uiSchema as any)?.['ui:title'] || props.title}{' '}
            {props.required ? <span className="required-field">*</span> : null}
          </label>
        </div>
      ) : null}

      {(props.uiSchema as any)?.['ui:description'] || props.schema.description ? (
        <div key={`field-description-${props.idSchema.$id}`} className="object-description altus-markdown">
          <Markdown>{((props.uiSchema as any)?.['ui:description'] || props.schema.description) as string}</Markdown>
        </div>
      ) : null}

      <div className="ms-Grid object-field-grid" dir="ltr">
        <div className="ms-Grid-row">
          {props.properties.map((element, index) => {
            const elementProps: any = element.content.props
            const isArray = elementProps?.schema?.type === 'array'
            const isObject = elementProps?.schema?.type === 'object'
            const hasFullWidth = elementProps?.schema?.fullWidth === true || elementProps?.uiSchema?.fullWidth === true
            const hasHalfWidth = elementProps?.uiSchema?.halfWidth === true
            const hasLeftAlignedRow = elementProps?.uiSchema?.leftAlignedRow === true
            const isSingleProperty = props.properties.length === 1

            if (hasLeftAlignedRow) {
              return (
                <div
                  key={`object-property-wrapper-${props.idSchema.$id}-${index}`}
                  className="ms-Grid-col ms-lg12 ms-xl12 property-wrapper left-aligned-row"
                >
                  {element.content}
                </div>
              )
            }

            const cellGridSize =
              ((isArray || isObject) && !hasHalfWidth) || hasFullWidth || (isSingleProperty && !hasHalfWidth)
                ? 'ms-xl12'
                : 'ms-lg12 ms-xl6'

            return (
              <div key={`object-property-wrapper-${props.idSchema.$id}-${index}`} className={`ms-Grid-col ${cellGridSize} property-wrapper`}>
                {element.content}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
