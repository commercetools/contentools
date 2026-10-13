# New owner questions (spec G)

| ID | Question | Recommended default (assumed in the specs) | Affects |
| -- | -------- | ------------------------------------------ | ------- |
| Q-G1 | Do you need **private buckets / expiring signed URLs**? Content stores the picked URL inside page JSON, so expiring URLs break published pages. | No. Public-read bucket or CDN only (`MEDIA_PUBLIC_BASE_URL`); signed mode is a documented non-goal. | G, H (README), P |
| Q-G2 | OK to **change the media-library response to cursor pagination** (`{ limit, nextCursor, hasMore }`, no `page`/`totalItems`/`totalPages`)? Requires changing the picker (spec J) and the MCP tool (spec M). | Yes: S3/GCS cannot count a prefix cheaply and the old totals were wrong past 500/1000 objects. | G, J, M |
| Q-G3 | Default MIME allowlist: images (jpeg, png, gif, webp, avif) and PDF; **SVG off** (stored XSS), video off (512 MB container). Is that acceptable for the picker, which today requests `svg`? | Yes; operators opt in via `MEDIA_ALLOWED_MIME_TYPES`. | G, J |
| Q-G4 | Default `MEDIA_STORAGE_PROVIDER` is **`none`** (media endpoints answer 501, picker should fall back to URL entry). The old default was a broken `gcpcms`. | `none`. | G, H, J, K |
| Q-G5 | Media-library listing now **requires a token** (it was reachable with only `x-project-key`). Any storefront that lists media anonymously? | No such consumer; keep it protected. | G, E |
| Q-G6 | (answered by the owner, Q-06) Live testing uses GCS only; S3 and Cloudinary stay supported but unverified live. | As answered. | G, H (README) |
