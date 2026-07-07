import { useState } from 'react'
import Form from '@rjsf/core'
import validator from '@rjsf/validator-ajv8'
import type { SchemaField } from '../types'
import { fieldsToJsonSchema } from '../schemaUtils'
import FieldEditor from './FieldEditor'

interface Props {
  fields: SchemaField[]
  selectedId: string | null
  onChange: (updated: SchemaField) => void
}

function findField(fields: SchemaField[], id: string): SchemaField | null {
  for (const f of fields) {
    if (f.id === id) return f
    if (f.children) {
      const found = findField(f.children, id)
      if (found) return found
    }
  }
  return null
}

export default function RightPanel({ fields, selectedId, onChange }: Props) {
  const [tab, setTab] = useState<'edit' | 'preview' | 'json'>('edit')

  const schema = fieldsToJsonSchema(fields) as Record<string, unknown>
  const selectedField = selectedId ? findField(fields, selectedId) : null

  return (
    <div className="right-panel">
      <div className="right-tabs">
        <button className={`right-tab${tab === 'edit' ? ' active' : ''}`} onClick={() => setTab('edit')}>
          Edit
        </button>
        <button className={`right-tab${tab === 'preview' ? ' active' : ''}`} onClick={() => setTab('preview')}>
          Preview
        </button>
        <button className={`right-tab${tab === 'json' ? ' active' : ''}`} onClick={() => setTab('json')}>
          JSON
        </button>
      </div>

      <div className="right-tab-body">
        {tab === 'edit' && (
          <FieldEditor
            field={selectedField}
            onChange={onChange}
          />
        )}

        {tab === 'preview' && (
          <div className="preview-panel">
            <h3>Live Preview</h3>
            {fields.length === 0 ? (
              <p style={{ color: 'var(--text2)', fontSize: 12, lineHeight: 1.6 }}>
                Add fields to the canvas to see a live form preview here.
              </p>
            ) : (
              <Form
                schema={schema as never}
                validator={validator}
                onSubmit={() => {}}
                uiSchema={{
                  'ui:submitButtonOptions': { norender: true },
                }}
              />
            )}
          </div>
        )}

        {tab === 'json' && (
          <div className="preview-panel">
            <h3>JSON Schema</h3>
            <pre className="json-output">
              {JSON.stringify(schema, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
