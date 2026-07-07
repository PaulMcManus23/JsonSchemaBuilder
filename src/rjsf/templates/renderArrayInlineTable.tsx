import {
  Table, TableHeader, TableRow, TableHeaderCell, TableBody, TableCell, TableCellLayout, Button,
} from '@fluentui/react-components'
import { ArrowDownRegular, ArrowUpRegular, DeleteRegular } from '@fluentui/react-icons'
import type { ArrayFieldTemplateProps } from '@rjsf/core'
import type { JSONSchema7 } from 'json-schema'
import * as React from 'react'
import { TooltipMarkdown } from '../shims/TooltipMarkdown'

function getArrayFromDictionary<T extends object>(dict: Record<string, T> | undefined | null): Array<T & { key: string }> {
  if (!dict) return []
  return Object.entries(dict).map(([key, val]) => ({ ...(val as T), key }))
}

export function renderArrayInlineTable(props: ArrayFieldTemplateProps, label: string) {
  if (props.items.length === 0) return <></>

  const columns = getArrayFromDictionary<JSONSchema7>((props.schema.items as any)?.properties)
  const requiredColumns: string[] | undefined = (props.schema.items as any)?.required
  const isReadOnlyTable = (props.schema as any).readOnly === true
  const hasAnyActions = props.items.some(item => item.hasMoveUp || item.hasMoveDown || item.hasRemove)

  const getColumnWidth = (column: JSONSchema7 & { key: string }): string => {
    const columnUiSchema = (props.uiSchema as any)?.items?.[column.key]
    if (columnUiSchema?.['ui:widget'] === 'ColourPickerWidget') return '90px'
    const colourPickerCount = columns.filter(c => (props.uiSchema as any)?.items?.[c.key]?.['ui:widget'] === 'ColourPickerWidget').length
    const remainingColumns = columns.length - colourPickerCount
    return remainingColumns > 0 ? `${100 / remainingColumns}%` : `${100 / columns.length}%`
  }

  return (
    <Table role="grid">
      <TableHeader>
        <TableRow>
          {columns.map((c) => (
            <TableHeaderCell key={c.key} style={{ width: getColumnWidth(c) }}>
              <TooltipMarkdown description={c.description as string | undefined}>
                <strong>{c.title}</strong>
                {requiredColumns?.includes(c.key) ? <span className="required-field">*</span> : null}
              </TooltipMarkdown>
            </TableHeaderCell>
          ))}
          {hasAnyActions ? (
            <TableHeaderCell style={{ width: '150px', maxWidth: '150px' }}>
              <strong>Actions</strong>
            </TableHeaderCell>
          ) : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {props.items.map((item, index) => (
          <TableRow
            key={item.key}
            className={`array-inline-item-row${isReadOnlyTable ? ' array-inline-item-row--readonly' : ''}`}
          >
            {item.children}
            {hasAnyActions ? (
              <TableCell>
                <TableCellLayout>
                  {item.hasMoveUp || item.hasMoveDown ? (
                    <Button
                      appearance="transparent"
                      disabled={item.disabled || item.readonly || !item.hasMoveDown}
                      icon={<ArrowDownRegular />}
                      title={`Move ${label} Down`}
                      onClick={item.onReorderClick(item.index, item.index + 1)}
                    />
                  ) : null}
                  {item.hasMoveUp || item.hasMoveDown ? (
                    <Button
                      appearance="transparent"
                      disabled={item.disabled || item.readonly || !item.hasMoveUp}
                      icon={<ArrowUpRegular />}
                      title={`Move ${label} Up`}
                      onClick={item.onReorderClick(item.index, item.index - 1)}
                    />
                  ) : null}
                  {item.hasRemove ? (
                    <Button
                      appearance="transparent"
                      disabled={item.disabled || item.readonly}
                      icon={<DeleteRegular />}
                      title={`Delete ${label}`}
                      onClick={item.onDropIndexClick(item.index)}
                    />
                  ) : null}
                </TableCellLayout>
              </TableCell>
            ) : null}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
