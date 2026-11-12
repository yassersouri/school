# Interactive activities toolkit

Screen-only (non-printable) activities live in `gradeN/interactive/{math,reading}/`.
Every page loads two shared files — no build step, no dependencies:

```html
<link rel="stylesheet" href="../../../assets/interactive/interactive.css">
<div class="ia-app"></div>
<script src="../../../assets/interactive/engine.js"></script>
<script> /* activity code using window.IA */ </script>
```

Theme a page with `:root { --ia-accent: #2e7d32; --ia-accent-2: #e8f5e9; }`.
`grade1/interactive/math/01_ten_frame_flash.html` is the reference template.

## API (`window.IA`)

| Area | Functions |
|---|---|
| Game loop | `IA.game({id, title, emoji, back, instructions, rounds, levels, levelTitle, round(r)})` — `r.stage`, `r.level`, `r.index`, `r.answer(ok, el, msg)`, `r.skip()`. First-try answers score; stars (1–3) saved to `localStorage`. |
| Free play | `IA.freePlay({id, title, emoji, back, instructions})` → `{stage, setProgress, setScore, done(stars)}` for explorers/simulators. |
| Choices | `IA.choices(r, container, options, correct, {render, speak, cls:'wide', isCorrect})` |
| Drag & drop | `IA.dragDrop({items, targets, onDrop(item, target), accept, keepInPlace})` — mouse/touch/pen drag **and** tap-to-select → tap-to-place, keyboard Enter/Space. |
| Input | `IA.numberInput(container, onCheck(value, input), {decimal, text, width})` |
| Speech | `IA.say(text, {rate, onend, onboundary, force})`, `IA.sayParts([...], gapMs, {onpart, onend})`, `IA.speakButton(text)`, `IA.stopSpeech()`, `IA.speechAvailable` (Web Speech API; respects the 🔈 mute toggle). |
| Feedback | `IA.good(el)`, `IA.bad(el)`, `IA.toast(msg)`, `IA.confetti()`, `IA.sfx.{good,bad,tap,win}()` |
| Helpers | `IA.el(tag, attrs, children)`, `IA.clear`, `IA.rand`, `IA.pick`, `IA.shuffle`, `IA.sample`, `IA.numberChoices(answer, count, spread, min)` |
| Hubs | Add `data-activity="<id>"` to a card and call `IA.renderHubStars()` to show saved stars. |

Shared CSS classes: `.ia-prompt`, `.ia-big`, `.ia-emoji`, `.ia-sub`, `.ia-row`, `.ia-col`, `.ia-hint`,
`.ia-btn(.primary|.small)`, `.ia-choices`, `.ia-tile`, `.ia-bin`, `.ia-bin-label`, `.ia-slot`,
`.ia-ten-frame` + `.ia-dot(.blue)`, `.ia-speak(.big)`, `.ia-input`.

When printed, pages show only a "this is an on-screen activity" note.
