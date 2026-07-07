import { useState } from 'react'
import {
  Dialog,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogContent,
  DialogActions,
  Button,
  Field,
  Textarea,
  Text,
  MessageBar,
  MessageBarBody,
} from '@fluentui/react-components'
import type { SchemaField } from '../types'
import { jsonSchemaToFields } from '../schemaUtils'

interface Props {
  open: boolean
  onClose: () => void
  onImport: (
    fields: SchemaField[],
    uiSchema: Record<string, unknown> | undefined,
    rawSchema: Record<string, unknown>,
  ) => void
}

export default function ImportDialog({ open, onClose, onImport }: Props) {
  const [schemaText, setSchemaText] = useState('')
  const [uiSchemaText, setUiSchemaText] = useState('')
  const [schemaError, setSchemaError] = useState('')
  const [uiSchemaError, setUiSchemaError] = useState('')

  const reset = () => {
    setSchemaText('')
    setUiSchemaText('')
    setSchemaError('')
    setUiSchemaError('')
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleImport = () => {
    setSchemaError('')
    setUiSchemaError('')

    // Parse JSON Schema
    let parsed: unknown
    try {
      parsed = JSON.parse(schemaText)
    } catch {
      setSchemaError('Invalid JSON — check for missing commas, brackets, or quotes.')
      return
    }

    const fields = jsonSchemaToFields(parsed)
    if (fields.length === 0) {
      setSchemaError('No fields found. Schema must be an object type with a "properties" map.')
      return
    }

    // Parse UI Schema (optional)
    let uiSchema: Record<string, unknown> | undefined
    if (uiSchemaText.trim()) {
      try {
        uiSchema = JSON.parse(uiSchemaText) as Record<string, unknown>
      } catch {
        setUiSchemaError('Invalid JSON in UI Schema.')
        return
      }
    }

    onImport(fields, uiSchema, parsed as Record<string, unknown>)
    reset()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(_, d) => { if (!d.open) handleClose() }}>
      <DialogSurface style={{ maxWidth: 580, width: '90vw' }}>
        <DialogTitle>Import Schema</DialogTitle>
        <DialogBody>
          <DialogContent>
            <Text size={200} style={{ color: 'var(--colorNeutralForeground3)', display: 'block', marginBottom: 16 }}>
              Paste a JSON Schema below. The schema must be an object type with a{' '}
              <code style={{ fontFamily: 'Consolas, monospace' }}>properties</code> map.
              Importing will replace the current canvas.
            </Text>

            <Field
              label="JSON Schema"
              required
              validationState={schemaError ? 'error' : 'none'}
              validationMessage={schemaError || undefined}
              style={{ marginBottom: 16 }}
            >
              <Textarea
                value={schemaText}
                onChange={(_, d) => { setSchemaText(d.value); setSchemaError('') }}
                placeholder={'{\n  "type": "object",\n  "properties": {\n    "name": { "type": "string" }\n  }\n}'}
                style={{ fontFamily: 'Consolas, monospace', fontSize: 12, minHeight: 180 }}
                resize="vertical"
              />
            </Field>

            <Field
              label="UI Schema (optional)"
              validationState={uiSchemaError ? 'error' : 'none'}
              validationMessage={uiSchemaError || undefined}
            >
              <Textarea
                value={uiSchemaText}
                onChange={(_, d) => { setUiSchemaText(d.value); setUiSchemaError('') }}
                placeholder={'{\n  "name": { "ui:autofocus": true }\n}'}
                style={{ fontFamily: 'Consolas, monospace', fontSize: 12, minHeight: 100 }}
                resize="vertical"
              />
            </Field>

            {!schemaError && !uiSchemaError && schemaText.trim() === '' && (
              <MessageBar intent="info" style={{ marginTop: 12 }}>
                <MessageBarBody>
                  <Text size={100}>Tip: you can also view the current schema as JSON using the "JSON →" toggle in the preview panel, then copy it here.</Text>
                </MessageBarBody>
              </MessageBar>
            )}
          </DialogContent>

          <DialogActions>
            <Button appearance="secondary" onClick={handleClose}>Cancel</Button>
            <Button
              appearance="primary"
              onClick={handleImport}
              disabled={!schemaText.trim()}
            >
              Import
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  )
}
