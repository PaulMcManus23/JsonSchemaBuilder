import * as React from 'react'
import type { FieldTemplateProps } from '@rjsf/core'
import { Markdown } from '../shims/Markdown'

export const FieldTemplate: React.FunctionComponent<FieldTemplateProps> = (props: FieldTemplateProps) => {
  const { id, classNames, label, displayLabel, help, required, rawDescription, children, schema } = props

  const useArrayInlineTable = (props.uiSchema as any)?.useArrayInlineTableRow === true

  if (useArrayInlineTable) {
    return <>{children}</>
  }

  return (
    <div className={`field-wrapper ${classNames ?? ''}`}>
      {displayLabel ? (
        <label className="field-label" htmlFor={id}>
          {(props.uiSchema as any)?.['ui:title'] || schema.title || null}{' '}
          {required ? <span className="required-field">*</span> : null}
        </label>
      ) : null}
      {children}
      {displayLabel && rawDescription ? (
        <div className="field-description altus-markdown">
          <Markdown>{rawDescription}</Markdown>
        </div>
      ) : null}
      {help}
    </div>
  )
}
