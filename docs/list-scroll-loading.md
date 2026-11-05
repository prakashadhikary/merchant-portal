# Applications list: scroll loading

The applications table fills the window height under the navbar and scrolls inside itself. It fetches only the pages the user can see and shows a skeleton row in every slot that hasn't loaded yet.

## Pieces

| Piece                   | Responsibility                                                                                                             |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `ApplicationsListStore` | Holds one slot per application on the server, `null` until its page arrives. Fetches pages on request.                     |
| `ApplicationsTable`     | Renders the slots in a virtual list that fills its host's height and scrolls internally. Reports which rows are on screen. |
| `ApplicationsListPage`  | Passes the store's rows to the table and sends the table's visible range back to the store.                                |

## Flow

1. **First page.** When the filters change, the store requests page 1 on its own. Until it arrives, `total` is `null` and the page shows `<mp-applications-table [busy]="true">`: a header and 5 static skeleton rows, with no virtual list.
2. **Size the list.** Page 1 returns `total`. The store builds `rows` with length `total`, fills in the loaded items, and leaves every other slot `null`. The virtual list is now as tall as the full result set, so the scrollbar reflects every row.
3. **Scroll.** `cdk-virtual-scroll-viewport` keeps only the rows in and near the table's viewport in the DOM. A `null` slot renders skeleton cells and gets `aria-busy="true"`.
4. **Report the range.** The table listens to the viewport's `renderedRangeStream` (visible rows plus buffer). It emits `rangeChange` only after the range has held still for `RANGE_SETTLE_MS` (150 ms), so dragging the scrollbar doesn't request every page it passes.
5. **Fetch what's on screen.** The page calls `store.loadRange(start, end)`. The store works out which pages cover those rows and requests the ones it has never requested. Jumping to the end skips the pages in between.
6. **Fill in.** When a page arrives, its items replace the `null` slots. `trackRow` keys a skeleton slot by its index and a loaded row by its id, so the skeleton row is swapped for the real one.

## Store rules

- **Page status.** Each page is tracked as `loading`, `loaded` or `error`. `loadRange` skips any page already in the map, so scrolling back and forth never refetches.
- **Failures.** A failed page stays failed until the user clicks Retry, which calls `retry()` and re-requests every failed page. Scrolling past a failed page doesn't keep hitting the API.
- **Filters.** Changing the filters starts over: `switchMap` cancels every request in flight and resets the state.
- **Total changes.** If the server reports a different `total` on a later page (applications created or filtered out in the meantime), `rows` is resized to match.

## UI details

- **Height.** The layout shell is a flex column at least as tall as the window. The list page takes the height left under the navbar (minimum 30rem), and the card hands it to the table, whose viewport flexes to fill it (minimum 15rem when nothing gives it a height, as in Storybook). The footer always sits below the table and shows "Loaded X of Y", a spinner while any page is loading, the latest error with Retry, or "All applications loaded".
- **Fixed row height.** Every row is exactly `ROW_HEIGHT` (40 px). The virtual scroll strategy depends on this, and it is set in the table's SCSS.
- **Accessibility.** The grid uses `role="table"`. `aria-rowcount` is the server total and `aria-rowindex` is each row's position, so screen readers announce positions in the full list, not just the rows in the DOM.

## Tests

- `applications-list-page.spec.ts` covers the first-load skeleton, fetching the page for a range scrolled to, and Retry.
- `applications-table.spec.ts` covers skeleton slots, `busy` mode, and that `rangeChange` emits only the range it settles on.
- `applications-list.store.spec.ts` covers page bookkeeping.

jsdom has no layout, so the tests set the range with `viewport.setRenderedRange(...)` after waiting for the viewport's first animation frame.
