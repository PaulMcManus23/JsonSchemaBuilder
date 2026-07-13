import { useState } from "react";
import { Button, Text, Badge } from "@fluentui/react-components";
import type { SchemaField } from "../types";
import { fieldsToJsonSchema, fieldsToUiSchema } from "../schemaUtils";
import { KaizenForm } from "../rjsf/KaizenForm";

interface Props {
  fields: SchemaField[];
  schemaMeta?: { title?: string; description?: string };
  rawSchema?: Record<string, unknown> | null;
  rawUiSchema?: Record<string, unknown> | null;
  onClearRaw?: () => void;
  formData?: unknown;
  onFormDataChange?: (formData: unknown) => void;
  width?: number;
}

function JsonSection({ label, value }: { label: string; value: unknown }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(value, null, 2)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div className="json-section">
      <div className="json-section-header">
        <Text
          size={100}
          weight="semibold"
          style={{
            color: "var(--colorNeutralForeground3)",
            letterSpacing: ".06em",
            textTransform: "uppercase",
          }}
        >
          {label}
        </Text>
        <Button
          appearance="subtle"
          size="small"
          onClick={handleCopy}
          style={
            copied
              ? { color: "var(--colorStatusSuccessForeground1)" }
              : undefined
          }
        >
          {copied ? "Copied!" : "Copy"}
        </Button>
      </div>
      <pre className="json-block">{JSON.stringify(value, null, 2)}</pre>
    </div>
  );
}

export default function PreviewPanel({
  fields,
  schemaMeta,
  rawSchema,
  rawUiSchema,
  onClearRaw,
  formData,
  onFormDataChange,
  width,
}: Props) {
  const [showJson, setShowJson] = useState(false);

  const isRaw = !!rawSchema;
  const schema = isRaw
    ? rawSchema
    : (fieldsToJsonSchema(fields, schemaMeta) as Record<string, unknown>);
  const uiSchema = isRaw ? (rawUiSchema ?? {}) : fieldsToUiSchema(fields);
  const hasContent = isRaw || fields.length > 0;

  return (
    <div
      className="panel preview-panel"
      style={width ? { width, flexShrink: 0 } : { flex: 1 }}
    >
      <div className="panel-header">
        <span className="panel-title">
          {showJson ? "JSON" : "Live Preview"}
        </span>
        {isRaw && (
          <Badge
            appearance="tint"
            color="warning"
            size="small"
            style={{ cursor: "pointer" }}
            onClick={onClearRaw}
            title="Using imported schema — click to switch to builder schema"
          >
            Imported ✕
          </Badge>
        )}
        <Button
          appearance="secondary"
          size="small"
          onClick={() => setShowJson((v) => !v)}
        >
          {showJson ? "← Form" : "JSON →"}
        </Button>
      </div>
      <div className="panel-body">
        {showJson ? (
          <div className="json-output-wrap">
            <JsonSection label="JSON Schema" value={schema} />
            <JsonSection
              label="UI Schema"
              value={Object.keys(uiSchema).length > 0 ? uiSchema : {}}
            />
          </div>
        ) : (
          <div className="rjsf-wrap">
            {!hasContent ? (
              <Text
                size={200}
                as="p"
                style={{
                  display: "block",
                  padding: "48px 16px",
                  textAlign: "center",
                  color: "var(--colorNeutralForeground3)",
                }}
              >
                Add fields to the canvas to see a live form preview.
              </Text>
            ) : (
              <KaizenForm
                schema={schema}
                uiSchema={uiSchema}
                formData={formData}
                onChange={onFormDataChange}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
