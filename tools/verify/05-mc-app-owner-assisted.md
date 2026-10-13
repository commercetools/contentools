# 05 Merchant Center custom application (owner-assisted)

A. Automatable: none. The agent cannot log in to Merchant Center.

B. Needs an owner login (manual step M-04): the Chrome profile attached to the connector must already hold a logged-in
Merchant Center session. If the login page appears, stop and ask the owner to sign in, then continue.

Preconditions: the custom application is deployed (or served locally through `mc-scripts start`) and installed for the
sandbox project; its MC URL is `https://mc.<region>.commercetools.com/<project-key>/<entryPointUriPath>`.

```
1. mcp__chrome-devtools__resize_page          width=1440 height=900
2. mcp__chrome-devtools__navigate_page        url=<MC URL of the custom application>
3. mcp__chrome-devtools__wait_for             text=<application title or the "Pages" sidebar entry>   (timeout 30000)
4. mcp__chrome-devtools__take_snapshot        -> assert the page list renders (rows or the empty-state text)
5. mcp__chrome-devtools__list_console_messages -> assert no entry of type error
6. mcp__chrome-devtools__list_network_requests -> assert calls to the Contentools service return 2xx, carry an Authorization
                                                  header, and no request has a 4xx/5xx status
7. mcp__chrome-devtools__take_screenshot      filePath=plans/evidence/<spec-id>/05-mc-pages.png   (crop or avoid tokens and user data)
```

Evidence checklist: screenshot saved without secrets, console clean, network clean, owner login noted as the human step.
