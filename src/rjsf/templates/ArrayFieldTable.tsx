import * as React from 'react'
import {
  Table, TableHeader, TableRow, TableHeaderCell, TableBody,
} from '@fluentui/react-components'
import type { ArrayFieldTemplateProps, UiSchema } from '@rjsf/core'
import type { JSONSchema7 } from 'json-schema'
import { ArrayFieldTableRow } from './ArrayFieldTableRow'

export interface IArrayFieldTableProps extends ArrayFieldTemplateProps {
  readonly label: string
}

export interface IColumnDefinition {
  label?: JSONSchema7
  uiSchema?: UiSchema
  key?: string
}

export const ArrayFieldTable: React.FunctionComponent<IArrayFieldTableProps> = (props: IArrayFieldTableProps) => {
  const columns: IColumnDefinition[] = React.useMemo(() => getColumns(props), [])

  if (props.items.length === 0) return <></>

  return (
    <Table role="grid">
      <TableHeader>
        <TableRow>
          {columns.map((c) => (
            <TableHeaderCell key={c.key} style={{ width: `${100 / columns.length}%` }}>
              <strong>{c.label?.title}</strong>
            </TableHeaderCell>
          ))}
          <TableHeaderCell style={{ width: '150px', maxWidth: '150px' }}>
            <strong>Actions</strong>
          </TableHeaderCell>
        </TableRow>
      </TableHeader>
      <TableBody>
        {props.items.map((item, index) => (
          <ArrayFieldTableRow
            {...item}
            key={index.toString()}
            columns={columns}
            label={props.label}
            registry={props.registry}
            rowNumber={index + 1}
          />
        ))}
      </TableBody>
    </Table>
  )
}

function getColumns(props: IArrayFieldTableProps) {
  const columnsRequested: string[] | undefined = (props.uiSchema as any)?.arrayTableColumns
  const columns: IColumnDefinition[] = []

  if (columnsRequested && props.schema.items) {
    const itemsDef = props.schema.items as JSONSchema7
    const itemsUiSchema: UiSchema = (props.uiSchema as any)?.items
    const properties = itemsDef.properties as Record<string, JSONSchema7>

    columnsRequested.forEach((c) => {
      columns.push({ label: properties[c], uiSchema: itemsUiSchema?.[c], key: c })
    })
  } else {
    const columnLabelProps = processLabel(props)
    columns.push({ label: columnLabelProps.label, uiSchema: columnLabelProps.uiSchema, key: columnLabelProps.key })
  }
  return columns
}

function processLabel(props: IArrayFieldTableProps) {
  let label: JSONSchema7 | undefined = undefined
  let uiSchema: UiSchema | undefined = undefined
  let key: string | undefined = undefined

  if (props.schema.items) {
    const itemsDef: any = props.schema.items
    const properties: Record<string, JSONSchema7> = itemsDef.properties

    if (key) {
      label = properties[key]
      uiSchema = (props.uiSchema as any)?.items?.[key]
    } else {
      for (const keyToCheck in properties) {
        const item = properties[keyToCheck]
        if (item.type === 'string') {
          label = item; uiSchema = (props.uiSchema as any)?.items?.[keyToCheck]; key = keyToCheck; break
        }
      }
    }
  }

  return { label, key, uiSchema }
}
