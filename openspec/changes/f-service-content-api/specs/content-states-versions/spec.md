## ADDED Requirements

### Requirement: Draft and published states
For pages and content items the service SHALL keep a state object (container `<item container>-state`, key `<bu>_<itemKey>`, value `{key, businessUnitKey, states:{draft?, published?}}`). Creating or updating an item SHALL set `states.draft` to the saved value. `GET .../:key/states` SHALL return the state object, or `{key, businessUnitKey, states:{}}` when none exists.
`PUT .../:key/states/published` SHALL set `states.published` to the item's current stored value; with `?clearDraft=true` it SHALL also remove `states.draft`. `DELETE .../:key/states/draft` SHALL replace the stored item value with the published value (keeping `businessUnitKey`), remove `states.draft` and return the new state; when there is no published state it SHALL answer `404` `No published state found`. Writes SHALL be safe under concurrent requests (version check with retry); after retries are exhausted the answer is `409`.

#### Scenario: Publish keeps draft by default
- **WHEN** a page is published without `clearDraft`
- **THEN** the state has both `draft` and `published`

#### Scenario: Publish with clearDraft
- **WHEN** the page is published with `?clearDraft=true`
- **THEN** the state has `published` and no `draft`

#### Scenario: Revert
- **WHEN** a published page is edited (draft differs) and `DELETE .../states/draft` is called
- **THEN** the stored page value equals the published value and `states.draft` is absent

#### Scenario: Revert without publication
- **WHEN** a never-published page receives `DELETE .../states/draft`
- **THEN** the response is `404` `No published state found`

#### Scenario: Concurrent saves
- **WHEN** two `PUT` updates of one page run at the same time
- **THEN** both succeed and the version history contains both entries

### Requirement: Version history with pruning
Each create or update SHALL prepend an entry `{...savedValue, id: <uuid v4>, timestamp: <ISO-8601>}` to the version object (container `<item container>-version`, key `<bu>_<itemKey>`, value `{key, businessUnitKey, versions:[...]}`, newest first). The list SHALL be truncated to the newest `MAX_VERSIONS` entries (default 5, configured through D). `GET .../:key/versions` SHALL return the object, or `{key, businessUnitKey, versions:[]}` when none exists.

#### Scenario: Pruning
- **WHEN** `MAX_VERSIONS=5` and a page is created then updated 6 times
- **THEN** the versions list has exactly 5 entries, the first is the newest, and the creation entry is gone

#### Scenario: Custom limit
- **WHEN** `MAX_VERSIONS=2` and a page is created and updated once
- **THEN** the list has 2 entries; after one more update it still has 2

#### Scenario: Empty history
- **WHEN** versions of an unknown key are requested
- **THEN** the response is `200` with `versions: []`
