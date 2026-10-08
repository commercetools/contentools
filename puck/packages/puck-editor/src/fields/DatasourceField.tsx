import React, { useState } from 'react';
import { useIntl, FormattedMessage } from 'react-intl';
import { Button, FormField, Icon, Select, Stack, Text, TextInput } from '@commercetools/nimbus';
import { Close, DragIndicator } from '@commercetools/nimbus-icons';
import { useProductSearch } from '@commercetools-demo/puck-api';
// Datasource value types live in the Nimbus-free render package; re-export them
// here so existing imports of `../fields/DatasourceField` keep working.
import type { DatasourceType, DatasourceValue } from '@commercetools-demo/puck-components';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type { DatasourceType, DatasourceValue };

export interface DatasourceFieldProps {
  value: DatasourceValue | undefined;
  onChange: (value: DatasourceValue) => void;
  /**
   * When set, the datasource type is pinned to this value and the type
   * selector dropdown is hidden. Use this for components that only ever work
   * with a single datasource type (declared in their component config), so
   * editors aren't shown an irrelevant choice.
   */
  fixedType?: DatasourceType;
}

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

// Option labels are resolved inside the component via `useIntl()` (module scope
// has no react-intl context), so the constant holds MessageDescriptors.
const TYPE_OPTIONS = [
  { value: 'product-by-sku', message: { id: 'Editor.datasourceProductBySku' } },
  { value: 'products-by-sku', message: { id: 'Editor.datasourceProductsBySku' } },
] as const;

const EMPTY_VALUE: DatasourceValue = { type: 'product-by-sku', skus: [''] };

// ---------------------------------------------------------------------------
// ProductSearchPicker — typeahead search for product selection (task #4)
// ---------------------------------------------------------------------------

interface ProductSearchPickerProps {
  /** SKUs already selected, so we can mark them in the results. */
  selectedSkus: string[];
  onSelect: (sku: string) => void;
}

const ProductSearchPicker: React.FC<ProductSearchPickerProps> = ({
  selectedSkus,
  onSelect,
}) => {
  const intl = useIntl();
  const [query, setQuery] = useState('');
  // Whether the results list is shown. Typing (a query change) opens it;
  // clicking inside the input dismisses it without clearing the text.
  const [open, setOpen] = useState(false);
  const { results, loading, error } = useProductSearch(query);

  return (
    <Stack direction="column" gap="100">
      {/* Mousedown inside the field dismisses an open results list. A plain
          wrapper is used (rather than TextInput's own handlers) because Nimbus'
          react-aria input doesn't forward raw DOM click events; the click still
          bubbles to this div. Clicks on a result sit in a sibling node, so they
          aren't caught here and selection keeps working. */}
      <div onMouseDown={() => setOpen(false)}>
        <FormField.Root>
          <FormField.Label>
            <FormattedMessage id="Editor.searchProducts" />
          </FormField.Label>
          <FormField.Input>
            <TextInput
              placeholder={intl.formatMessage({ id: 'Editor.searchProductsPlaceholder' })}
              value={query}
              onChange={(value) => {
                setQuery(value);
                setOpen(true);
              }}
            />
          </FormField.Input>
        </FormField.Root>
      </div>

      {open && query.trim() !== '' && (
        <div
          role="listbox"
          aria-label={intl.formatMessage({ id: 'Editor.productSearchResults' })}
          aria-busy={loading}
          style={{
            maxHeight: 220,
            overflowY: 'auto',
            border: '1px solid var(--color-neutral-90, #e0e0e0)',
            borderRadius: 'var(--border-radius-4, 4px)',
            background: 'var(--color-surface, #fff)',
          }}
        >
          {loading && (
            <div style={{ padding: 8, fontSize: 13, color: 'var(--color-neutral-40, #666)' }}>
              <FormattedMessage id="Editor.searching" />
            </div>
          )}
          {error && (
            <div style={{ padding: 8, fontSize: 13, color: 'var(--color-error, #c0392b)' }}>
              {error}
            </div>
          )}
          {!loading && !error && results.length === 0 && (
            <div style={{ padding: 8, fontSize: 13, color: 'var(--color-neutral-40, #666)' }}>
              <FormattedMessage id="Editor.noProductsFound" />
            </div>
          )}
          {results.map((product) => {
            const sku = product.sku;
            const alreadySelected = !!sku && selectedSkus.includes(sku);
            return (
              <button
                key={product.id}
                type="button"
                role="option"
                aria-selected={alreadySelected}
                disabled={!sku}
                onClick={() => sku && onSelect(sku)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  width: '100%',
                  padding: 8,
                  border: 'none',
                  borderBottom: '1px solid var(--color-neutral-95, #f4f4f4)',
                  background: alreadySelected
                    ? 'var(--color-primary-95, #e6eefb)'
                    : 'transparent',
                  cursor: sku ? 'pointer' : 'not-allowed',
                  textAlign: 'left',
                }}
              >
                {product.image ? (
                  <img
                    src={product.image}
                    alt=""
                    style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }}
                  />
                ) : (
                  <span
                    aria-hidden="true"
                    style={{ width: 32, height: 32, background: 'var(--color-neutral-95, #f4f4f4)', borderRadius: 4, flexShrink: 0 }}
                  />
                )}
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {product.name ?? intl.formatMessage({ id: 'Editor.unnamedProduct' })}
                  </span>
                  <span style={{ display: 'block', fontSize: 11, color: 'var(--color-neutral-40, #666)' }}>
                    {sku
                      ? intl.formatMessage({ id: 'Editor.skuLabel' }, { sku })
                      : intl.formatMessage({ id: 'Editor.noSkuOnMasterVariant' })}
                  </span>
                </span>
                {alreadySelected && (
                  <span style={{ fontSize: 11, color: 'var(--color-primary, #1a1a2e)' }}>
                    <FormattedMessage id="Editor.added" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </Stack>
  );
};

// ---------------------------------------------------------------------------
// DatasourceField — custom Puck field component
// ---------------------------------------------------------------------------

export const DatasourceField: React.FC<DatasourceFieldProps> = ({
  value,
  onChange,
  fixedType,
}) => {
  const intl = useIntl();
  const base: DatasourceValue = value ?? EMPTY_VALUE;
  // When a component pins the type, honour it over whatever the value carries.
  const current: DatasourceValue = fixedType
    ? { ...base, type: fixedType }
    : base;
  const selectedSkus = current.skus.filter(Boolean);

  const removeSkuValue = (sku: string) => {
    const updated = current.skus.filter((s) => s !== sku);
    onChange({ ...current, skus: updated.length > 0 ? updated : [''] });
  };

  // Add a SKU chosen from the product-search picker.
  const selectProduct = (sku: string) => {
    if (current.type === 'product-by-sku') {
      onChange({ ...current, skus: [sku] });
      return;
    }
    const existing = current.skus.filter(Boolean);
    if (existing.includes(sku)) return;
    onChange({ ...current, skus: [...existing, sku] });
  };

  // Drag-and-drop reordering of the selected products. The stored `skus` array
  // *is* the display order (the renderer keeps it), so reordering is just moving
  // an item in that array. Only meaningful for the multi-product type.
  const reorderable =
    current.type === 'products-by-sku' && selectedSkus.length > 1;
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const moveSku = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0) return;
    const next = [...selectedSkus];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange({ ...current, skus: next });
  };

  const resetDrag = () => {
    setDragIndex(null);
    setOverIndex(null);
  };

  return (
    <Stack direction="column" gap="200">
      {!fixedType && (
        <FormField.Root>
          <FormField.Label>
            <FormattedMessage id="Editor.datasourceType" />
          </FormField.Label>
          <FormField.Input>
            <Select.Root
              selectedKey={current.type}
              onSelectionChange={(key) => {
                const newType = key as DatasourceType;
                onChange({
                  type: newType,
                  skus: newType === 'product-by-sku' ? [current.skus[0] ?? ''] : current.skus,
                });
              }}
            >
              <Select.Options>
                {TYPE_OPTIONS.map((o) => (
                  <Select.Option key={o.value} id={o.value}>
                    {intl.formatMessage(o.message)}
                  </Select.Option>
                ))}
              </Select.Options>
            </Select.Root>
          </FormField.Input>
        </FormField.Root>
      )}

      <ProductSearchPicker
        selectedSkus={selectedSkus}
        onSelect={selectProduct}
      />

      <Stack direction="column" gap="100">
        <Text fontSize="sm" fontWeight="700">
          {current.type === 'product-by-sku'
            ? intl.formatMessage({ id: 'Editor.selectedProduct' })
            : intl.formatMessage({ id: 'Editor.selectedProducts' })}
        </Text>
        {reorderable && (
          <Text fontSize="xs" color="neutral.11">
            <FormattedMessage id="Editor.dragToReorder" />
          </Text>
        )}
        {selectedSkus.length === 0 ? (
          <Text fontSize="sm" color="neutral.11">
            <FormattedMessage id="Editor.noProductSelectedSearch" />
          </Text>
        ) : (
          <Stack direction="column" gap="100">
            {selectedSkus.map((sku, i) => {
              const isDragging = dragIndex === i;
              const isDropTarget =
                reorderable && overIndex === i && dragIndex !== null && dragIndex !== i;
              return (
                <div
                  key={sku}
                  draggable={reorderable}
                  onDragStart={reorderable ? () => setDragIndex(i) : undefined}
                  onDragOver={
                    reorderable
                      ? (e) => {
                          // Required so the row is a valid drop target.
                          e.preventDefault();
                          if (overIndex !== i) setOverIndex(i);
                        }
                      : undefined
                  }
                  onDrop={
                    reorderable
                      ? (e) => {
                          e.preventDefault();
                          if (dragIndex !== null) moveSku(dragIndex, i);
                          resetDrag();
                        }
                      : undefined
                  }
                  onDragEnd={reorderable ? resetDrag : undefined}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '4px 6px',
                    borderRadius: 4,
                    background: isDropTarget ? 'var(--color-primary-95, #e6eefb)' : 'transparent',
                    boxShadow: isDropTarget
                      ? 'inset 0 0 0 2px var(--color-primary, #1a1a2e)'
                      : 'none',
                    opacity: isDragging ? 0.5 : 1,
                  }}
                >
                  {reorderable && (
                    <span
                      aria-hidden="true"
                      title={intl.formatMessage({ id: 'Editor.dragToReorder' })}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        cursor: 'grab',
                        color: 'var(--color-neutral-40, #666)',
                        flexShrink: 0,
                      }}
                    >
                      <Icon as={DragIndicator} />
                    </span>
                  )}
                  <span
                    style={{
                      flex: 1,
                      minWidth: 0,
                      fontSize: 13,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {intl.formatMessage({ id: 'Editor.skuLabel' }, { sku })}
                  </span>
                  <Button
                    variant="ghost"
                    colorPalette="critical"
                    size="xs"
                    onPress={() => removeSkuValue(sku)}
                  >
                    <Icon as={Close} /> <FormattedMessage id="Editor.remove" />
                  </Button>
                </div>
              );
            })}
          </Stack>
        )}
      </Stack>
    </Stack>
  );
};
