# @commercetools-demo/puck-components

Nimbus-free "visualize" layer for the Puck CMS: the component render functions,
their prop types, shared render helpers, the i18n catalogs, and a render-only
Puck config (`defaultRenderConfig` / `createRenderConfig`). Storefronts consume
this through [`@commercetools-demo/puck-renderer`](../puck-renderer); the editor
composes these render functions with its own field widgets.

Nothing here imports `@commercetools/nimbus` or `@chakra-ui/react`.

## Theming rich text (`.puck-rich-text-content`)

`RichTextContent` renders sanitized rich-text HTML and ships a small scoped
stylesheet so the output looks consistent regardless of the host's CSS reset
(e.g. Tailwind Preflight). **Every declared property reads from a CSS custom
property**, with the built-in value as the `var()` fallback:

```css
.puck-rich-text-content h1 {
  font-size: var(--puck-rich-text-content--h1--font-size, 2em);
  /* … */
}
```

So you can restyle any element by setting the matching variable on
`.puck-rich-text-content` itself, or on any ancestor (they cascade/inherit):

```css
/* Your global stylesheet or a wrapper */
.puck-rich-text-content {
  --puck-rich-text-content--h1--font-size: 3rem;
  --puck-rich-text-content--h1--font-weight: 700;
  --puck-rich-text-content--a--color: #e94560;
  --puck-rich-text-content--line-height: 1.75;
}

/* Or scope overrides to one page/section */
.my-article {
  --puck-rich-text-content--blockquote--border-left: 4px solid #2c5530;
  --puck-rich-text-content--code--background: #f5f5f5;
}
```

Variable naming convention: `--puck-rich-text-content--<element>--<property>`.
Grouped selectors use one representative key — `strong` covers `<strong>`/`<b>`,
`em` covers `<em>`/`<i>`, `s` covers `<s>`/`<del>`, `pre-code` is `<code>` inside
`<pre>`.

### Full variable reference

| Variable | Default | Applies to |
| --- | --- | --- |
| `--puck-rich-text-content--line-height` | `1.6` | container `line-height` |
| `--puck-rich-text-content--first-child--margin-top` | `0` | first child `margin-top` |
| `--puck-rich-text-content--last-child--margin-bottom` | `0` | last child `margin-bottom` |
| `--puck-rich-text-content--h1--font-size` | `2em` | `h1` |
| `--puck-rich-text-content--h1--font-weight` | `400` | `h1` |
| `--puck-rich-text-content--h1--line-height` | `1.2` | `h1` |
| `--puck-rich-text-content--h1--margin` | `0.67em 0` | `h1` |
| `--puck-rich-text-content--h2--font-size` | `1.5em` | `h2` |
| `--puck-rich-text-content--h2--font-weight` | `400` | `h2` |
| `--puck-rich-text-content--h2--line-height` | `1.25` | `h2` |
| `--puck-rich-text-content--h2--margin` | `0.75em 0` | `h2` |
| `--puck-rich-text-content--h3--font-size` | `1.17em` | `h3` |
| `--puck-rich-text-content--h3--font-weight` | `400` | `h3` |
| `--puck-rich-text-content--h3--line-height` | `1.3` | `h3` |
| `--puck-rich-text-content--h3--margin` | `0.83em 0` | `h3` |
| `--puck-rich-text-content--h4--font-size` | `1em` | `h4` |
| `--puck-rich-text-content--h4--font-weight` | `400` | `h4` |
| `--puck-rich-text-content--h4--margin` | `1em 0` | `h4` |
| `--puck-rich-text-content--h5--font-size` | `0.83em` | `h5` |
| `--puck-rich-text-content--h5--font-weight` | `400` | `h5` |
| `--puck-rich-text-content--h5--margin` | `1.17em 0` | `h5` |
| `--puck-rich-text-content--h6--font-size` | `0.75em` | `h6` |
| `--puck-rich-text-content--h6--font-weight` | `400` | `h6` |
| `--puck-rich-text-content--h6--margin` | `1.33em 0` | `h6` |
| `--puck-rich-text-content--p--margin` | `1em 0` | `p` |
| `--puck-rich-text-content--strong--font-weight` | `700` | `strong`, `b` |
| `--puck-rich-text-content--em--font-style` | `italic` | `em`, `i` |
| `--puck-rich-text-content--u--text-decoration` | `underline` | `u` |
| `--puck-rich-text-content--s--text-decoration` | `line-through` | `s`, `del` |
| `--puck-rich-text-content--ul--list-style` | `disc` | `ul` |
| `--puck-rich-text-content--ul--margin` | `1em 0` | `ul` |
| `--puck-rich-text-content--ul--padding-left` | `1.5em` | `ul` |
| `--puck-rich-text-content--ol--list-style` | `decimal` | `ol` |
| `--puck-rich-text-content--ol--margin` | `1em 0` | `ol` |
| `--puck-rich-text-content--ol--padding-left` | `1.5em` | `ol` |
| `--puck-rich-text-content--li--margin` | `0.25em 0` | `li` |
| `--puck-rich-text-content--a--color` | `#2563eb` | `a` |
| `--puck-rich-text-content--a--text-decoration` | `underline` | `a` |
| `--puck-rich-text-content--blockquote--margin` | `1em 0` | `blockquote` |
| `--puck-rich-text-content--blockquote--padding-left` | `1em` | `blockquote` |
| `--puck-rich-text-content--blockquote--border-left` | `3px solid #d1d5db` | `blockquote` |
| `--puck-rich-text-content--blockquote--color` | `#4b5563` | `blockquote` |
| `--puck-rich-text-content--code--font-family` | `ui-monospace, SFMono-Regular, Menlo, monospace` | `code` |
| `--puck-rich-text-content--code--background` | `rgba(0,0,0,0.06)` | `code` |
| `--puck-rich-text-content--code--padding` | `0.1em 0.3em` | `code` |
| `--puck-rich-text-content--code--border-radius` | `3px` | `code` |
| `--puck-rich-text-content--code--font-size` | `0.9em` | `code` |
| `--puck-rich-text-content--pre--background` | `rgba(0,0,0,0.06)` | `pre` |
| `--puck-rich-text-content--pre--padding` | `0.75em 1em` | `pre` |
| `--puck-rich-text-content--pre--border-radius` | `6px` | `pre` |
| `--puck-rich-text-content--pre--overflow-x` | `auto` | `pre` |
| `--puck-rich-text-content--pre-code--background` | `none` | `code` inside `pre` |
| `--puck-rich-text-content--pre-code--padding` | `0` | `code` inside `pre` |
| `--puck-rich-text-content--img--max-width` | `100%` | `img` |
| `--puck-rich-text-content--img--height` | `auto` | `img` |
| `--puck-rich-text-content--hr--border` | `none` | `hr` |
| `--puck-rich-text-content--hr--border-top` | `1px solid #e5e7eb` | `hr` |
| `--puck-rich-text-content--hr--margin` | `1.5em 0` | `hr` |

> Notes
> - `margin` / `padding` / `border` variables take the full shorthand value
>   (e.g. `--puck-rich-text-content--h1--margin: 0.67em 0`).
> - A value containing commas (font stacks, `rgba(...)`) is a valid `var()`
>   fallback and equally valid as an override.
