# Human-only steps discovered by spec G

| ID | Step | Needed before | Details |
| -- | ---- | ------------- | ------- |
| M-G1 | Create a **public-read GCS media bucket** (the live-tested backend, Q-06 answered: GCP). The S3 and Cloudinary variants below are listed for operators only: GCS uniform-access bucket with `allUsers` -> `roles/storage.objectViewer` and a service account with `roles/storage.objectAdmin` on that bucket (download its JSON key and base64 it on one line: `base64 -i key.json \| tr -d '\n'`); or S3 bucket with Block Public Access relaxed for bucket policies, a policy allowing `s3:GetObject` on `contentools/media/*`, and an IAM user with `s3:PutObject`, `s3:GetObject`, `s3:ListBucket`, `s3:DeleteObject`; or a Cloudinary account (cloud name, API key, API secret). | live check 6.3, first real deployment | Extends plans M-02. The service never creates buckets or IAM. |
| M-G2 | Not needed: the owner has no S3 or Cloudinary accounts (Q-06 answer). Those providers stay mock-tested and are documented as unverified live. | - | Revisit only if someone provides accounts. |
