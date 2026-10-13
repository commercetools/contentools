# 04 Renderer

Precondition: playbook 03 published "E2E Home".

```
1. mcp__chrome-devtools__navigate_page        url=http://localhost:5174/?tab=renderer   (or click the "Renderer" tab)
2. mcp__chrome-devtools__take_snapshot        -> uids of Type, Mode, page key input, Render button
3. mcp__chrome-devtools__fill uid=<page key input> value=<key of "E2E Home"> ; select Mode = published ; click uid=<Render>
4. mcp__chrome-devtools__wait_for             text=<the published title, e.g. "Hello">   (timeout 15000)
5. mcp__chrome-devtools__list_console_messages -> assert no entry of type error
6. mcp__chrome-devtools__list_network_requests -> assert the published fetch is 200 and carries no project-scoping header
7. (optional) mcp__chrome-devtools__lighthouse_audit   device=desktop mode=navigation -> note accessibility and best-practice scores
8. mcp__chrome-devtools__take_screenshot      filePath=plans/evidence/<spec-id>/04-rendered.png
```

Evidence checklist: screenshot saved, console clean, network clean.
