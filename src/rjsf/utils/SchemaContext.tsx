import React, { createContext, useState } from 'react'

export type ISchemaFields = Record<string, any>

export interface ISchemaContextType {
  fields: ISchemaFields
  addField: (propName: string, value: any) => void
  removeField: (propName: string) => void
  getField: (propName: string) => any
}

export const SchemaContext = createContext<ISchemaContextType | null>(null)

function cleanUpPropName(fieldName: string) {
  return fieldName.replace('sensei_', '')
}

export const SchemaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [fields, setFields] = useState<ISchemaFields>({})

  const addField = (propName: string, value: any) => {
    if (!propName) return
    const name = cleanUpPropName(propName)
    setFields(prev => ({ ...prev, [name]: value }))
  }

  const removeField = (propName: string) => {
    const name = cleanUpPropName(propName)
    setFields(prev => {
      const next = { ...prev }
      delete next[name]
      return next
    })
  }

  const getField = (propName: string) => {
    return fields[cleanUpPropName(propName)]
  }

  return (
    <SchemaContext.Provider value={{ fields, addField, removeField, getField }}>
      {children}
    </SchemaContext.Provider>
  )
}
