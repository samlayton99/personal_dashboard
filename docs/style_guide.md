# Style Guide

Reference for maintaining visual consistency across all pages. Follow these patterns exactly when building new features.

## Color System

All colors use oklch. The palette has two axes: a neutral gray base and a warm cream accent.

| Token | Role | Usage |
|-------|------|-------|
| `--background` | Page background | Off-white with faint warm tint. Visible in gaps between panels. |
| `--card` | Panel/card surfaces | Pure white. All content panels sit on this. |
| `--primary` | Dark slate-blue | Panel headers, active tab outlines, selected item borders, buttons. |
| `--primary-foreground` | White text on primary | Panel header titles, active button text. |
| `--secondary` | Neutral light gray | Sub-panel backgrounds (e.g., todo columns use `bg-secondary/40`). |
| `--muted-foreground` | Medium gray text | Labels, metadata, inactive UI text. |
| `--accent` | Warm cream | Hover highlights only. Never use as a default/resting background. |
| `--destructive` | Red | Delete confirmations, retire actions. |
| `--border` | Warm gray border | Panel outlines, separators, card borders. |

**Key rule:** Default surfaces are neutral white/gray. The warm cream (`--accent`) only appears on hover states (`hover:bg-accent/50`). Do not use cream as a resting state.

## Typography

- **Sans:** Inter (`--font-sans`). All body text.
- **Mono:** JetBrains Mono (`--font-mono`). Numeric values only (scoreboard, stats).
- No Geist. The project was migrated from Geist to Inter.

### Size Scale

| Context | Class |
|---------|-------|
| Panel header title | `text-sm font-semibold` |
| Tile/card title | `text-sm font-medium` |
| Body text, inputs | `text-sm` |
| Todo items | `text-[13px]` |
| Sub-panel headers (NOW, IN PROGRESS) | `text-[10px] font-semibold uppercase tracking-widest` |
| Metadata labels | `text-xs text-muted-foreground` |
| Badge text | `text-[10px]` |
| Scoreboard labels | `text-[11px]` |
| Scoreboard values | `text-xs font-mono font-semibold tabular-nums` |

## Layout Architecture

The page is a CSS grid. Panels are separated by `gap-1.5` with `p-1.5` on the outer container so the off-white background shows between them.

```
grid-cols-[33%_1fr]  (left column: objectives, right column: everything else)
```

Right column is split:
```
grid-rows-[1fr_36vh]  (top: todos, bottom: pushes)
```

Each panel wrapper: `min-h-0 overflow-hidden rounded-lg border bg-card`.

**Critical:** Every flex/grid container that needs to scroll must have `min-h-0` on the flex child. Without it, flex items won't shrink below content size and scrolling breaks.

## Panel Structure

Every panel follows the same skeleton:

```
<div className="flex h-full min-h-0 flex-col">
  {/* Header: fixed height, dark background */}
  <div className="flex h-10 shrink-0 items-center rounded-t-lg bg-primary px-3">
    <h2 className="text-sm font-semibold text-primary-foreground">Title</h2>
  </div>

  {/* Scrollable content */}
  <ScrollArea className="min-h-0 flex-1">
    <div className="px-3 py-2">...</div>
  </ScrollArea>
</div>
```

- Header is always `h-10` with `shrink-0`. All panel headers are the same height.
- Header background is `bg-primary` (dark slate-blue) with `text-primary-foreground` (white).
- Header has `rounded-t-lg` to match the panel's `rounded-lg` border.
- Content area uses `<ScrollArea>` with `min-h-0 flex-1` so it scrolls when content overflows.

## Tab Bar

- Height: `h-11`, background: `bg-background` (matches page, not panels).
- Tabs are `rounded-full border` pills.
- Active: `border-primary text-primary bg-primary/5` (outlined pill, not filled).
- Inactive: `border-transparent text-muted-foreground`, hover shows `border-border`.
- No filled/solid backgrounds on tabs. The active state is an outline, not a fill.

## Interactive Elements

### Hover States

Every clickable element must have visible hover feedback. The three patterns:

1. **Cards/tiles:** `hover:bg-accent/50` (warm cream tint). Used on objective tiles, push tiles.
2. **Buttons on dark backgrounds:** `hover:bg-white/10 hover:text-white` (panel headers, detail panel header).
3. **Text links/actions:** `hover:text-foreground` from `text-muted-foreground`. Used on tab bar, sort toggles.

**All clickable elements must have `cursor-pointer`.** dnd-kit items use `cursor-grab` / `active:cursor-grabbing`.

### Selected State

When a tile is being edited (detail panel is open), it gets:
```
border-primary bg-primary/5 ring-1 ring-primary/20
```
This replaces the default `bg-card` and `border-border`. Subtle blue tint + primary border + faint ring.

### Delete Buttons

- Hidden by default, visible on row hover: `text-muted-foreground/0 group-hover:text-muted-foreground hover:!text-destructive`
- Requires `group` on the parent row.
- Icon: 3.5x3.5 X SVG, `strokeWidth={2}`.

### Destructive Actions

Two-step pattern:
1. First click shows the button (`"Delete permanently"` or `"Retire"`).
2. Second click confirms with an inline `"This cannot be undone."` message + confirm/cancel.

Style: `text-destructive hover:text-destructive hover:bg-destructive/10` for the trigger, `variant="destructive"` for the confirm button.

## Detail Panels (Popups)

Detail panels are not modals or sheets. They are `absolute inset-0` overlays positioned inside a specific container.

- **Objective detail** covers the right column (todos + pushes area).
- **Push detail** covers only the todos panel area.

Structure:
```
<div ref={cardRef} className="absolute inset-0 z-20 flex flex-col rounded-lg border bg-card shadow-lg">
  <div className="flex h-10 shrink-0 ... rounded-t-lg bg-primary">header</div>
  <ScrollArea className="min-h-0 flex-1">
    <div className="p-5">content</div>
  </ScrollArea>
</div>
```

### Click-away behavior

Uses a `document.addEventListener("mousedown", ...)` listener that checks `ref.contains()`. This allows clicks to pass through to underlying elements (clicking another tile saves+closes the current panel and opens the new one in a single action).

No blocking overlay. No fixed backdrop. The click is not intercepted.

### Auto-save

Closing the detail panel (click-away, X button, clicking another item) always saves. The `onClose` callback is wired to `saveAndClose()` which:
1. Updates parent state immediately (optimistic).
2. Closes the panel.
3. Persists to server in background via `startTransition`.

The explicit "Discard" button is the only way to close without saving.

## Scrollbars

Scrollbar thumbs are hidden by default (`opacity-0`) and fade in on hover (`group-hover/scroll-area:opacity-100`, `transition-opacity duration-300`). This is implemented in the `ScrollArea` component via `group/scroll-area` on the root and `group-hover/scroll-area:opacity-100` on the thumb.

## Optimistic Updates

All mutations follow this pattern:
1. Update local state immediately.
2. Close any panels / update UI.
3. Fire server action in `startTransition(() => ...)` (non-blocking background).
4. No `revalidatePath` -- client state is the source of truth during the session.

Temp IDs (`temp_*`, `push_temp_*`) are used for optimistic creates. All server actions early-return if given a temp ID. Temp items cannot be opened in detail panels.

## Spacing Reference

| Context | Value |
|---------|-------|
| Gap between panels | `gap-1.5` (6px) |
| Outer page padding | `p-1.5` (6px) |
| Panel content padding | `px-3 py-2` or `p-2` |
| Detail panel body padding | `p-5` |
| Between form fields | `space-y-4` |
| Between tiles in a list | `gap-2` |
| Grid gaps (pushes, todo columns) | `gap-2` |

## What Not to Do

- No dark mode. No theme toggle. Light only.
- No cream/accent as a resting surface color. Cream is hover-only.
- No Sheet/sidebar for detail panels. Use the absolute overlay pattern.
- No `revalidatePath` in server actions. Optimistic state handles it.
- No filled tab backgrounds. Active tabs are outlined pills.
- No large font sizes. The largest text in the app is `text-sm` (14px).
- No spinners longer than 300ms. Use optimistic updates instead.
