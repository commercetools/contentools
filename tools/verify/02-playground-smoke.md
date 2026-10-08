# 02 Playground smoke

Precondition: playbook 01 is running. `<uid>` values come from the latest `take_snapshot`. Steps 5 to 9 need the final
auth contract and props (spec J); before that run steps 1 to 4 only.

```
1. mcp__chrome-devtools__new_page             url=http://localhost:5174
2. mcp__chrome-devtools__wait_for             text="Tailwind v4 test banner"   (timeout 15000; a stable heading of the playground)
3. mcp__chrome-devtools__take_snapshot        -> assert the page lists the Pages tab (Page manager)
4. mcp__chrome-devtools__list_console_messages -> assert no entry of type error
5. mcp__chrome-devtools__click uid=<"Create page" button> ; fill uid=<name input> value="E2E Home" ; click uid=<confirm>
6. mcp__chrome-devtools__wait_for             text="E2E Home"
7. mcp__chrome-devtools__list_network_requests -> assert POST .../test-bu/puck-pages = 200/201, no 4xx/5xx,
                                                  request headers have Authorization: Bearer ..., NONE has x-project-key
8. mcp__chrome-devtools__evaluate_script      function="async () => (await fetch('http://localhost:8080/service/test-bu/puck-pages', {headers:{Authorization:'Bearer local-dev-token'}})).json()"
                                              -> assert the array contains the key of "E2E Home"
9. mcp__chrome-devtools__take_screenshot      filePath=plans/evidence/<spec-id>/02-created.png
```

## Checklist (all must hold)

- [ ] no console errors
- [ ] no 4xx/5xx in the network list
- [ ] no `x-project-key` request header
- [ ] evidence saved under `plans/evidence/<spec-id>/` (not committed)
- [ ] the service log line for the request has the correlation id field
