export interface EntitySearchConfig {
  endPoint: string
  additionalSearchFilter?: string
  valueField: string
  nameField: string
  nameFieldPath: string
  supportsContains: boolean
  provider?: boolean
  consumer?: string
  supportOrderBy?: boolean
  supportTop?: boolean
  localizedLabels?: boolean
  readOnlyItems?: string[]
}

export interface IRecord {
  key: string
  name: string
}
