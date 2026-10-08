# 03 Editor: drag and drop, publish

Precondition: playbook 02 created the page "E2E Home". Resize first: `mcp__chrome-devtools__resize_page` width=1440 height=900.

```
1. mcp__chrome-devtools__take_snapshot        -> find the "E2E Home" row and its Edit button
2. mcp__chrome-devtools__click uid=<Edit button of "E2E Home">
3. mcp__chrome-devtools__wait_for             text=<name of a component in the left component list, e.g. "HeroBanner">
4. mcp__chrome-devtools__take_snapshot        -> uid of the component in the left list, uid of the canvas drop zone
5. mcp__chrome-devtools__drag                 from_uid=<component in left list> to_uid=<canvas drop zone>
6. mcp__chrome-devtools__take_snapshot        -> assert the dropped component's text/fields now appear in the canvas
7. mcp__chrome-devtools__click uid=<Publish button>
8. mcp__chrome-devtools__list_network_requests -> assert PUT .../puck-pages/<key>/states/published = 200,
                                                  no 4xx/5xx, no x-project-key header
9. mcp__chrome-devtools__list_console_messages -> assert no entry of type error
10. mcp__chrome-devtools__take_screenshot     filePath=plans/evidence/<spec-id>/03-published.png
```

Evidence checklist: screenshot saved, network list noted, console clean. If `drag` does not move the item (the editor
uses pointer-based dragging), record that as a finding and use the keyboard alternative in the snapshot.
