import React from 'react';
import type {
  Field,
  FieldProps,
  Overrides,
  RadioField,
  SelectField,
} from '@measured/puck';
import {
  MultilineTextInput,
  RadioInput,
  Select,
  TextInput,
} from '@commercetools/nimbus';

// ---------------------------------------------------------------------------
// Nimbus field-type overrides
//
// Puck renders its built-in field inputs (text / textarea / select / radio)
// with its own plain HTML controls, which look nothing like the rest of the
// app. `overrides.fieldTypes` lets us swap just the input for the Nimbus
// equivalent while still reusing Puck's label wrapper (passed in as `Label`),
// so labels stay consistent and stored data is untouched. `custom` fields
// (DatasourceField, RichTextField, ImagePickerField) bypass this entirely.
// ---------------------------------------------------------------------------

type LabelComp = React.ComponentType<{
  label?: string;
  icon?: React.ReactNode;
  el?: 'label' | 'div';
  readOnly?: boolean;
  children?: React.ReactNode;
}>;

/** Extra props Puck injects at runtime that aren't part of the public FieldProps type. */
type Extra = {
  name: string;
  label?: string;
  readOnly?: boolean;
  children?: React.ReactNode;
  Label?: LabelComp;
};

type RenderProps<V = unknown, F = Field> = FieldProps<F, V> & Extra;

/** Reuses Puck's own label wrapper (or renders bare when there's no label). */
const FieldShell: React.FC<{
  Label?: LabelComp;
  label?: string;
  name: string;
  readOnly?: boolean;
  children: React.ReactNode;
}> = ({ Label, label, name, readOnly, children }) => {
  if (!Label) return <>{children}</>;
  // `el="div"` avoids wrapping interactive React-Aria groups (select/radio) in a <label>.
  return (
    <Label label={label || name} el="div" readOnly={readOnly}>
      {children}
    </Label>
  );
};

const TextFieldOverride: React.FC<RenderProps<string>> = ({
  value,
  onChange,
  label,
  name,
  readOnly,
  id,
  Label,
}) => (
  <FieldShell Label={Label} label={label} name={name} readOnly={readOnly}>
    <TextInput
      id={id}
      value={value ?? ''}
      onChange={(v) => onChange(v)}
      isDisabled={readOnly}
      width="100%"
    />
  </FieldShell>
);

const TextareaFieldOverride: React.FC<RenderProps<string>> = ({
  value,
  onChange,
  label,
  name,
  readOnly,
  id,
  Label,
}) => (
  <FieldShell Label={Label} label={label} name={name} readOnly={readOnly}>
    <MultilineTextInput
      id={id}
      value={value ?? ''}
      onChange={(v) => onChange(v)}
      isDisabled={readOnly}
      rows={4}
      width="100%"
    />
  </FieldShell>
);

const SelectFieldOverride: React.FC<RenderProps<string | number | boolean, SelectField>> = ({
  field,
  value,
  onChange,
  label,
  name,
  readOnly,
  Label,
}) => {
  const options = field.options ?? [];
  return (
    <FieldShell Label={Label} label={label} name={name} readOnly={readOnly}>
      <Select.Root
        aria-label={label || name}
        selectedKey={value == null ? undefined : String(value)}
        isDisabled={readOnly}
        onSelectionChange={(key) => {
          const opt = options.find((o) => String(o.value) === String(key));
          onChange(opt ? opt.value : (key as string));
        }}
      >
        <Select.Options>
          {options.map((o) => (
            <Select.Option key={String(o.value)} id={String(o.value)}>
              {o.label}
            </Select.Option>
          ))}
        </Select.Options>
      </Select.Root>
    </FieldShell>
  );
};

const RadioFieldOverride: React.FC<RenderProps<string | number | boolean, RadioField>> = ({
  field,
  value,
  onChange,
  label,
  name,
  readOnly,
  Label,
}) => {
  const options = field.options ?? [];
  return (
    <FieldShell Label={Label} label={label} name={name} readOnly={readOnly}>
      <RadioInput.Root
        aria-label={label || name}
        value={String(value ?? '')}
        isDisabled={readOnly}
        onChange={(key) => {
          const opt = options.find((o) => String(o.value) === key);
          onChange(opt ? opt.value : key);
        }}
      >
        {options.map((o) => (
          <RadioInput.Option key={String(o.value)} value={String(o.value)}>
            {o.label}
          </RadioInput.Option>
        ))}
      </RadioInput.Root>
    </FieldShell>
  );
};

export const nimbusFieldTypes: NonNullable<Overrides['fieldTypes']> = {
  text: TextFieldOverride,
  textarea: TextareaFieldOverride,
  select: SelectFieldOverride,
  radio: RadioFieldOverride,
};
