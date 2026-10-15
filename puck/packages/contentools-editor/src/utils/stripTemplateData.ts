import type { Config, ComponentData, Data } from '@measured/puck';

/**
 * Produce a "without data" copy of Puck data for use as a template.
 *
 * Each **leaf** component's props are reset to its config `defaultProps` (so a
 * new page created from the template shows the component's default contents,
 * not the source page's data). **Container** components — those that hold child
 * components in a zone — keep their props, so structural fields (e.g. a Grid's
 * `columnCount`) survive and the nested layout renders correctly.
 *
 * Nested components live in a flat `data.zones` map keyed `"<parentId>:<zone>"`;
 * `<parentId>` is the parent component's `props.id`. Every component's
 * `props.id` is always preserved so those zone keys stay consistent.
 */
export function stripPuckDataToTemplate(data: Data, config: Config): Data {
  const zones = data.zones ?? {};

  // Ids of components that own at least one non-empty zone → keep their props.
  const containerIds = new Set(
    Object.entries(zones)
      .filter(([, components]) => components.length > 0)
      .map(([zoneKey]) => zoneKey.slice(0, zoneKey.indexOf(':')))
  );

  const strip = (component: ComponentData): ComponentData => {
    const { id } = component.props;
    if (containerIds.has(id)) {
      // Container: preserve props so its zones keep rendering.
      return component;
    }
    const defaults =
      (config.components?.[component.type]?.defaultProps as
        | Record<string, unknown>
        | undefined) ?? {};
    // Reset to the component's default props, keeping its id so zone keys
    // (`"<id>:<zone>"`) stay consistent.
    return { ...component, props: { ...defaults, id } };
  };

  return {
    ...data,
    content: data.content.map(strip),
    root: { ...data.root, props: { ...(config.root?.defaultProps ?? {}) } },
    ...(data.zones && {
      zones: Object.fromEntries(
        Object.entries(zones).map(([zoneKey, components]) => [
          zoneKey,
          components.map(strip),
        ])
      ),
    }),
  };
}
