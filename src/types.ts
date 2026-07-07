export type FieldType = 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object'

export interface SchemaField {
  id: string
  name: string
  type: FieldType
  title?: string
  description?: string
  required?: boolean
  // string
  minLength?: number
  maxLength?: number
  pattern?: string
  format?: string
  enum?: string[]
  // number / integer
  minimum?: number
  maximum?: number
  // array — primitive or complex
  itemType?: FieldType
  itemFields?: SchemaField[]   // used when itemType === 'object'
  // object children
  children?: SchemaField[]
  // ui schema
  uiWidget?: string
  uiFullWidth?: boolean
  uiArrayDisplay?: 'default' | 'table' | 'dialog'
  uiOptions?: string  // JSON string for extra ui:options
}

export interface BuilderState {
  fields: SchemaField[]
  selectedId: string | null
}
