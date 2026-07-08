import { v4 as uuidv4 } from "uuid";
import type { SchemaField, FieldType } from "./types";

export function fieldsToJsonSchema(fields: SchemaField[]): object {
  const properties: Record<string, object> = {};
  const required: string[] = [];

  for (const field of fields) {
    properties[field.name || field.id] = fieldToSchema(field);
    if (field.required) required.push(field.name || field.id);
  }

  return {
    type: "object",
    title: "Schema",
    properties,
    ...(required.length > 0 ? { required } : {}),
  };
}

function fieldToSchema(field: SchemaField): object {
  const base: Record<string, unknown> = {
    type: field.type,
    ...(field.title ? { title: field.title } : {}),
    ...(field.description ? { description: field.description } : {}),
  };

  if (field.type === "string") {
    if (field.minLength !== undefined) base.minLength = field.minLength;
    if (field.maxLength !== undefined) base.maxLength = field.maxLength;
    if (field.pattern) base.pattern = field.pattern;
    if (field.format) base.format = field.format;
    if (field.enum && field.enum.length > 0) {
      base.enum = field.enum;
      delete base.type;
    }
  }

  if (field.type === "number" || field.type === "integer") {
    if (field.minimum !== undefined) base.minimum = field.minimum;
    if (field.maximum !== undefined) base.maximum = field.maximum;
    if (field.enum && field.enum.length > 0) {
      base.enum = field.enum.map(Number);
      delete base.type;
    }
  }

  if (field.type === "array") {
    if (
      field.itemType === "object" &&
      field.itemFields &&
      field.itemFields.length > 0
    ) {
      const itemProps: Record<string, object> = {};
      const itemRequired: string[] = [];
      for (const f of field.itemFields) {
        itemProps[f.name || f.id] = fieldToSchema(f);
        if (f.required) itemRequired.push(f.name || f.id);
      }
      base.items = {
        type: "object",
        properties: itemProps,
        ...(itemRequired.length ? { required: itemRequired } : {}),
      };
    } else {
      base.items = { type: field.itemType ?? "string" };
    }
  }

  if (field.type === "object" && field.children && field.children.length > 0) {
    const childProps: Record<string, object> = {};
    const childRequired: string[] = [];
    for (const child of field.children) {
      childProps[child.name || child.id] = fieldToSchema(child);
      if (child.required) childRequired.push(child.name || child.id);
    }
    base.properties = childProps;
    if (childRequired.length > 0) base.required = childRequired;
  }

  return base;
}

// ── UI Schema ─────────────────────────────────────────────

export function fieldsToUiSchema(
  fields: SchemaField[],
): Record<string, unknown> {
  const ui: Record<string, unknown> = {};
  for (const field of fields) {
    const key = field.name || field.id;
    const fieldUi: Record<string, unknown> = {};

    if (field.uiWidget) fieldUi["ui:widget"] = field.uiWidget;
    if (field.uiFullWidth) fieldUi["fullWidth"] = true;

    if (field.type === "array") {
      if (field.uiArrayDisplay === "table")
        fieldUi["useArrayInlineTable"] = true;
      if (field.uiArrayDisplay === "dialog")
        fieldUi["useArrayItemDialog"] = true;
    }

    let extraOpts: Record<string, unknown> = {};
    try {
      if (field.uiOptions) extraOpts = JSON.parse(field.uiOptions);
    } catch {
      /* ignore */
    }
    if (Object.keys(extraOpts).length > 0) fieldUi["ui:options"] = extraOpts;

    if (field.type === "object" && field.children?.length) {
      Object.assign(fieldUi, fieldsToUiSchema(field.children));
    }
    if (
      field.type === "array" &&
      field.itemType === "object" &&
      field.itemFields?.length
    ) {
      const itemUi = fieldsToUiSchema(field.itemFields);
      if (Object.keys(itemUi).length) fieldUi["items"] = itemUi;
    }

    if (Object.keys(fieldUi).length) ui[key] = fieldUi;
  }
  return ui;
}

export function applyUiSchemaToFields(
  fields: SchemaField[],
  uiSchema: Record<string, unknown>,
): SchemaField[] {
  return fields.map((field) => {
    const key = field.name || field.id;
    const fieldUi = uiSchema[key] as Record<string, unknown> | undefined;
    if (!fieldUi) return field;
    const updated = { ...field };
    if (typeof fieldUi["ui:widget"] === "string")
      updated.uiWidget = fieldUi["ui:widget"];
    if (fieldUi["fullWidth"] === true) updated.uiFullWidth = true;
    if (fieldUi["useArrayInlineTable"] === true)
      updated.uiArrayDisplay = "table";
    if (fieldUi["useArrayItemDialog"] === true)
      updated.uiArrayDisplay = "dialog";
    const opts = fieldUi["ui:options"] as Record<string, unknown> | undefined;
    if (opts && Object.keys(opts).length)
      updated.uiOptions = JSON.stringify(opts, null, 2);
    if (field.type === "object" && field.children?.length) {
      updated.children = applyUiSchemaToFields(field.children, fieldUi);
    }
    if (
      field.type === "array" &&
      field.itemType === "object" &&
      field.itemFields?.length
    ) {
      const itemsUi = fieldUi["items"] as Record<string, unknown> | undefined;
      if (itemsUi)
        updated.itemFields = applyUiSchemaToFields(field.itemFields, itemsUi);
    }
    return updated;
  });
}

// ── Import: JSON Schema → SchemaField[] ───────────────────

function resolveType(propSchema: Record<string, unknown>): FieldType {
  let t = propSchema.type;
  // Handle ["string", "null"] style — take first non-null
  if (Array.isArray(t)) t = t.find((x) => x !== "null") ?? "string";
  // enum with no type → treat as string
  if (!t && Array.isArray(propSchema.enum)) return "string";
  const valid: FieldType[] = [
    "string",
    "number",
    "integer",
    "boolean",
    "array",
    "object",
  ];
  return valid.includes(t as FieldType) ? (t as FieldType) : "string";
}

function propToField(
  key: string,
  propSchema: Record<string, unknown>,
  requiredKeys: string[],
): SchemaField {
  const type = resolveType(propSchema);
  const field: SchemaField = {
    id: uuidv4(),
    name: key,
    type,
    required: requiredKeys.includes(key),
    ...(propSchema.title ? { title: propSchema.title as string } : {}),
    ...(propSchema.description
      ? { description: propSchema.description as string }
      : {}),
  };

  if (type === "string") {
    if (propSchema.format !== undefined)
      field.format = propSchema.format as string;
    if (propSchema.minLength !== undefined)
      field.minLength = propSchema.minLength as number;
    if (propSchema.maxLength !== undefined)
      field.maxLength = propSchema.maxLength as number;
    if (propSchema.pattern !== undefined)
      field.pattern = propSchema.pattern as string;
    if (Array.isArray(propSchema.enum))
      field.enum = propSchema.enum as string[];
  }

  if (type === "number" || type === "integer") {
    if (propSchema.minimum !== undefined)
      field.minimum = propSchema.minimum as number;
    if (propSchema.maximum !== undefined)
      field.maximum = propSchema.maximum as number;
  }

  if (type === "array") {
    const items = (propSchema.items ?? {}) as Record<string, unknown>;
    const itemType = resolveType(items);
    field.itemType = itemType;
    if (
      itemType === "object" &&
      items.properties &&
      typeof items.properties === "object"
    ) {
      const itemReq = (items.required as string[] | undefined) ?? [];
      field.itemFields = Object.entries(
        items.properties as Record<string, unknown>,
      ).map(([k, v]) => propToField(k, v as Record<string, unknown>, itemReq));
    }
  }

  if (type === "object") {
    field.children = [];
    if (propSchema.properties && typeof propSchema.properties === "object") {
      const childReq = (propSchema.required as string[] | undefined) ?? [];
      field.children = Object.entries(
        propSchema.properties as Record<string, unknown>,
      ).map(([k, v]) => propToField(k, v as Record<string, unknown>, childReq));
    }
  }

  return field;
}

export function jsonSchemaToFields(raw: unknown): SchemaField[] {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
  const schema = raw as Record<string, unknown>;

  if (
    schema.type === "object" &&
    schema.properties &&
    typeof schema.properties === "object"
  ) {
    const required = (schema.required as string[] | undefined) ?? [];
    return Object.entries(schema.properties as Record<string, unknown>).map(
      ([k, v]) => propToField(k, v as Record<string, unknown>, required),
    );
  }

  return [];
}
