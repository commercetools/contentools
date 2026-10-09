# Runbook

Day-2 operations for a deployed Contentools connector. Unsupported commercetools-labs reference code, see
[SUPPORT.md](../SUPPORT.md). First deployment: [INSTALL.md](../INSTALL.md). The service-level details (scopes,
configuration, fail-open and fail-closed table, lifecycle scripts) are in [service/README.md](../service/README.md)
and are not repeated here.

Placeholders are in angle brackets. Never write a real token, project key or URL of your own into a file that is
committed. Commands marked "to be verified" have not been run against a deployed connector yet; the end-to-end
acceptance check is meant to run them.

## 1. Health and logs

```bash
curl -fsS https://<service-url>/health        # <service-url> ends in /service; answers {"status":"UP",...}
commercetools connect deployment logs --key <deployment-key> --application service \
  --startDate <iso-timestamp> --endDate <iso-timestamp>
```

Use `--application mcp` for the MCP application. Every log line is JSON with `level`, `message`, `timestamp` and,
inside a request, `correlationId`; one access-log line per request carries the route template, status, duration
and business unit. Every error body carries the same `correlationId` and the response header `X-Correlation-ID`
returns it for successful calls too. When a user quotes the `correlationId` of an error, filter the logs for it. To
trace a call of your own, send an `X-Correlation-ID` (8 to 128 characters of `A-Z a-z 0-9 . _ -`). Request bodies,
`Authorization` headers and secrets are never logged.

## 2. Redeploy after a configuration change

```bash
commercetools connect deployment redeploy --key <deployment-key> \
  --configuration CLOUD_IDENTIFIER=<cloud-id> \
  --configuration service.<KEY>=<value> --configuration admin-app.<KEY>=<value> ...
```

Send **every key you want kept**, not just the changed one: keys that `connect.yaml` does not declare are dropped,
and a value omitted from a redeploy may be lost (observed in the Merchant Center application builds; confirm with
`commercetools connect deployment describe --key <deployment-key>` after each redeploy). `postDeploy` runs again and
is read-only, so it is safe to repeat. A change can take up to a minute to apply; a full deployment up to about 15 minutes.

## 3. Redeploy after a code change

1. Push the code and a new git tag (for example `v1.0.1`).
2. Point the staged connector at the tag: `commercetools connect connectorstaged update --key contentools --repository-tag <tag>` (check `--help` for the exact flags of your CLI version).
3. Publish it (`commercetools connect connectorstaged publish --key contentools`), which runs the validation pipeline.
4. `commercetools connect deployment redeploy --key <deployment-key> --updateConnector` with every configuration key (section 2).

If behaviour does not change, compare the connector version shown by `deployment describe` with the connector's
current version and read the staged connector's publishing report. A failed build leaves the previous code serving.
(To be verified: the exact flag names in step 2 and 3.)

## 4. Rotate `SERVICE_API_TOKEN`

The service accepts one static token at a time.

1. Generate a new value: `openssl rand -base64 48` (at least 32 characters).
2. Redeploy with the new value for **both** applications that use it, and every other key unchanged:
   `--configuration service.SERVICE_API_TOKEN=<new>` and `--configuration mcp.SERVICE_API_TOKEN=<new>` (the two must be equal).
   Never pass a placeholder for a secured key whose value you cannot recover; keep the secured values in your own secret store.
3. Wait for the redeploy to finish (`deployment describe` shows `Deployed`).
4. Update every other caller: scripts, server jobs, the Postman `service_api_token` variable, the playground `.env` of anyone using it.
5. Verify: the old token answers 401 and the new one 200, for example `curl -s -o /dev/null -w '%{http_code}\n' -H "Authorization: Bearer <token>" https://<service-url>/default/preview/puck-pages/<page-key>` (use a real page key; a missing page answers 404, which still proves the token was accepted), and one write.
6. Between steps 2 and 4 callers still holding the old token get 401. Do it outside editing hours.

Merchant Center users are not affected: their session tokens are verified separately.

To rotate `MCP_ACCESS_TOKEN` without downtime, set it to `new,old`, move the MCP clients to the new value, then remove the old one (comma-separated list, each at least 32 characters).

## 5. Rotate the commercetools API client secret

Connect generates the runtime API client from `inheritAs.apiClient` for each deployment. There is no secret to
store or rotate by hand. To get a fresh client, redeploy (section 2) and confirm with `deployment logs` that the
`postDeploy` checks `token` and `scopes` report `ok`. (To be verified: whether a plain redeploy re-creates the client.
If the Merchant Center shows the old client still active, delete it there after the new deployment works.)

## 6. Backups and restore

All content is custom objects in the project. To export, read each container through the commercetools HTTP API
(for example `GET /<project-key>/custom-objects/<container>` with a client that has `view_key_value_documents`
or `manage_key_value_documents`, paging with `limit` and `offset`). The containers are listed in
[architecture.md](architecture.md#4-data-model): `puck-page`, `puck-page-state`, `puck-page-version`, `puck-content`,
`puck-content-state`, `puck-content-version`, `puck-template`, `configuration`, `content-type`, `datasource`
(each with your `CONTAINER_PREFIX`).

To restore a single page or content item, use the service itself: `GET /<business-unit>/puck-pages/<key>/versions`
returns the saved versions (newest first), then `PUT /<business-unit>/puck-pages/<key>` with the old version's
fields writes it back as a new draft, and `PUT .../states/published` publishes it. Media lives in the storage
backend and has to be backed up there.

## 7. Poison messages and replay: not applicable

The connector has no event, job or subscription application, no queue and no dead-letter topic: commercetools never
calls it, so no message can be redelivered or poisoned. Every request is synchronous and answered with its result.
A failed request is retried by its caller. `PUT`, `DELETE`, publish and revert are safe to repeat: they address an
item by key, and a repeated `PUT` appends one more version (pruned to `MAX_VERSIONS`) without creating a second item.
A repeated `POST` that creates a page, a content item or a template is **not** idempotent: every call generates a
new key, so a retried create can leave a duplicate that has to be deleted; `POST /datasource/:key` answers 409
when the key already exists. If an `event` application is ever added, this section must be replaced with a
detection, containment and replay runbook.

## 8. Fail-open and fail-closed (summary)

Stance: content reads, writes and preview are fail-closed (a commercetools outage answers 503 or 502, no stale cache,
nothing stored by the service itself). A request without a verifiable credential answers 401 (403 for the wrong
project or a missing permission). Datasource resolution while reading a page is fail-open on purpose (the value
resolves to `null` so the page still renders). The service registers no API Extension and no Subscription, so an
outage can never block carts or orders. Full table: [service/README.md](../service/README.md#fail-open-and-fail-closed).

## 9. Uninstall

```bash
commercetools connect deployment delete --key <deployment-key>
```

`preUndeploy` deletes nothing and sends no request; it logs which custom object containers and which media prefix
remain. The custom objects are **not** deleted. To remove them, delete each container's objects with the commercetools
HTTP API (`DELETE /<project-key>/custom-objects/<container>/<key>` for every key) and empty the media prefix in the
bucket. Remove the custom application from the Merchant Center registration separately.

## 10. Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| Blank page or 404 for assets in the Merchant Center | The Application URL is the placeholder or the wrong application: use the `admin-app` URL from `deployment describe` |
| 401 on every request from the Merchant Center app | The token audience does not match: `CONNECT_SERVICE_URL` must be the https origin the app forwards to, or `CLOUD_IDENTIFIER` is not the project's region |
| 401 from scripts or MCP | `SERVICE_API_TOKEN` is wrong, or differs between `service` and `mcp` |
| 403 for a Merchant Center user | The token belongs to another project, or the user lacks `MC_REQUIRED_PERMISSION` |
| 403 from commercetools in the logs | A scope is missing on the API client: `postDeploy` check `scopes` names it; redeploy so Connect regenerates the client |
| 502 or 503 from the service | commercetools is unreachable, rate limiting or rejecting the client; read the log line with the `correlationId` |
| 503 with `Retry-After` | The Merchant Center key set could not be fetched; retry |
| Browser CORS error | The origin is not in `CORS_ALLOWED_ORIGINS` |
| First request slow | Sandbox cold start, about 15 seconds |
| Media upload fails or answers 501 | `MEDIA_STORAGE_PROVIDER` is `none`, or the storage credentials or bucket are wrong; the log names the key, never its value |
| Existing content disappeared | `CONTAINER_PREFIX` was changed; restore the previous value |
| Deployment shows old behaviour | The code update chain was not completed (section 3) |
| A setting has no effect | The key is not declared in `connect.yaml`, or it was left out of the last redeploy (section 2) |
