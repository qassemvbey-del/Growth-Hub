# Growth Hub — screen-building spec (Material 3 Expressive, Arabic RTL, dark default)

You are writing artboards for a Design canvas. Each artboard is ONE self-contained `.dc.html` file in the
canvas `project/` folder. The approved screens ship as `m3-screens-source.zip` (folder `project/`, 10 boards +
`canvas.json`). `support.js` is NOT in the zip: the canvas provides it. Keep the `<script src="./support.js">`
line anyway. Write each file directly (never a script that generates files). Do NOT publish anything.
Do NOT use the old "Calm & warm" design-system artifact (apricot, lucide icons): it is retired.
Study these finished examples first and match their look exactly:
`project/Main.dc.html` (mobile home, has a theme prop), `project/Goal.dc.html`, `project/VideoSheet.dc.html`,
`project/TaskSheet.dc.html`, `project/Theme.dc.html`, `project/Wins.dc.html`, `project/GoalDone.dc.html`,
`project/WebHome.dc.html`, `project/WebGoal.dc.html`. (`project/HomeLight.dc.html` only imports Main with
`theme="light"`.)

## Known fixes in the approved screens (apply when that screen is redrawn)
- Main: done (redrawn 2 Oct: lesson 14, 4 templates, 5 tabs, overdue line, weekly board, focus bar, 390×1320).
- WebHome: 3 template chips → the 4 templates below.
- Goal and WebGoal: "13 من 32" → "13 من 32 درس" (always say the noun).
- Goal, WebGoal, VideoSheet, TaskSheet: the attachments button (`attach_file` + count) is missing.
- WebHome and WebGoal: the rail is missing الملاحظات `sticky_note_2`.
- Wins: the bottom nav has 4 tabs → 5 tabs (add الملاحظات).
- Theme: 6 colours → 8 (add كراون and إيس, see "Rank colours"), grid of 2 rows × 4.

## File skeleton (copy exactly; change title, root size and content)

```html
<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<title>اسم الشاشة</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600&family=Readex+Pro:wght@400;500;600;700&family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..24,400,0..1,0&display=swap">
<style>
body{margin:0}
.ms{font-family:'Material Symbols Rounded';font-weight:normal;font-style:normal;font-size:24px;line-height:1;letter-spacing:normal;white-space:nowrap;direction:ltr;font-feature-settings:'liga';-webkit-font-smoothing:antialiased;font-variation-settings:'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24}
.ms.f{font-variation-settings:'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 24}
button{font:inherit;cursor:pointer}
</style>
</helmet>
<div dir="rtl" style="width: 390px; height: 844px; box-sizing: border-box; position: relative; overflow: hidden; background: #0f1511; color: #dee4de; font-family: 'IBM Plex Sans Arabic', sans-serif; display: flex; flex-direction: column">
  ... content ...
</div>
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{"$preview":{"width":390,"height":844}}'>
class Component extends DCLogic {
  renderVals() { return {}; }
}
</script>
</body>
</html>
```

Hard rules (each fails silently if broken): keep the support.js line exactly; close every non-void element;
quote every attribute; all styling inline `style="…"` (only the helmet block above may hold CSS); no `{{ }}`
except values returned by renderVals; no `<iframe>`, no emoji, no images (draw with shapes + Material Symbols);
real `<button>`, `<a href>`, `<input>` + `<label>`; `aria-label` on icon-only buttons; root size fixed.
Sizes: phone 390×844 (a long scrolling phone page may be 390 × up to 2400), web 1280×800 (a long web page may
be 1280 × up to 3000). Icons: `<span class="ms">name</span>` (Material Symbols Rounded ligature names),
filled variant `class="ms f"`. Arrows are mirrored for RTL: back = `arrow_forward`, "go/next" = `arrow_back`,
chevron to open = `chevron_left`.
Links between screens: `<a href="OtherScreen.dc.html">` (style the `<a>` itself as the button).

## Colour tokens (dark theme = default; use these hexes only)

| token | hex | use |
|---|---|---|
| bg | #0f1511 | page ground |
| scLow | #171d19 | bottom sheets, web main panel |
| sc | #1b211d | list items, cards |
| scHigh | #262b28 | nav bar, inactive segments, tonal fills on cards |
| scHighest | #303632 | progress tracks, thumbnails |
| on | #dee4de | primary text |
| onSV | #c0c9c1 | secondary text, inactive icons |
| outline | #8a938c | unchecked check circle, outlined buttons |
| outlineV | #404943 | hairlines, chip borders |
| primary | #8ed5b0 | filled buttons, selected, checks, progress |
| onPrimary | #003824 | text on primary |
| pc (primaryContainer) | #005236 | hero cards, FAB, big shapes |
| onPc | #aaf2cb | text on pc; chip border on pc = #3f8a68 |
| secC | #364b3f | tonal buttons, active nav pill, selected chips |
| onSecC | #d0e8d8 | text on secC |
| tc (tertiaryContainer) | #244c5a | course / YouTube goal cards, info hints |
| onTc | #c0e9fa | text on tc; progress track on tc #3d6878 |
| xp | #f6be41 | XP numbers, streak, cup gold |
| xpC | #5c4200 | XP/streak containers |
| onXpC | #ffdea3 | text on xpC |
| error | #ffb4ab | overdue text, destructive |
| errC | #93000a | destructive filled button bg (text #ffdad6) |
| ytChip | #3a1d1a | YouTube chip bg (text #ffb4ab) |
| inverse | #dee4de bg / #2c322e text | coach-mark tooltips & snackbars |
| scrim | rgba(0,0,0,0.6) | behind sheets/dialogs |
| cup bronze | #f0bb8f (icon #3d2209) | silver #c9c3b8 (icon #2f2c26) | gold #f6be41 (icon #402d00) |

Light theme only where a task says so: bg #f5fbf5, sc #eaefe9, scHigh #e4eae4, on #171d19, onSV #404943,
outline #707973, primary #226a4c, onPrimary #fff, pc #aaf2cb, onPc #005236, secC #d0e8d8, onSecC #364b3f,
tc #c0e9fa, onTc #244c5a, xp #7a5900, xpC #ffdea3, onXpC #261900.

## Type
- Headings, numbers, labels that matter: `font-family: 'Readex Pro'`. Body: IBM Plex Sans Arabic (root default).
- Display 30–36/38–44 600 (one per screen max) · Headline 22–28 600 · Title 16–20 500 · Body 15/22–24 ·
  Body-sm 13/18–20 · Label 12–14 600 · Never below 12px.
- XP and numbers with Latin: wrap in `dir="ltr"` (e.g. `<span dir="ltr">+20 XP</span>`).

## Shape & components (copy from the examples)
- Radii: chips 8 · list group items 20 outer / 4 inner (first item `20px 20px 4px 4px`, middle `4px`, last
  `4px 4px 20px 20px`, single `20px`), 2px gap between items · cards 24–28 · sheets & dialogs 28 · hero shapes 40–44 ·
  buttons fully round (height 40/48/56, radius half).
- Buttons: filled (primary/onPrimary) for the ONE main action; tonal (secC/onSecC); outlined (1px outline, on);
  text button (primary text, no bg). Disabled: bg scHigh, text outline, `lock` icon if gated.
- Connected button group (segmented): `display:flex; gap:2px`; selected item is a full pill in primary; others
  scHigh with 8px radius, outer ends 20px (RTL: rightmost item `border-radius: 8px 20px 20px 8px`, leftmost
  `20px 8px 8px 20px`; when selected it becomes `20px`).
- Chips: height 32, radius 8, 1px border outlineV (or #3f8a68 on pc), icon 18px.
- Check circle: 24px, 2px border outline; done = filled primary circle with `check` icon 18px in onPrimary.
- Mobile nav bar (bottom, 80px, scHigh), 5 tabs: الرئيسية `home` · أهدافي `flag` · الملاحظات `sticky_note_2` ·
  الكاسات `trophy` · أنا `person`; active item = 56×32 pill secC with filled icon, label 12/600 on. Links:
  Main.dc.html, Goals.dc.html, Notes.dc.html, Wins.dc.html, Profile.dc.html.
- Focus mini bar (only while a focus timer runs): 56px high, radius 16, bg pc / text onPc, 8px above the nav bar
  with 16px side margins; `timer` icon + task title (1 line) + time left in Readex `dir="ltr"` + pause icon button.
  Tap opens the Focus screen. On web it sits at the bottom of the content panel. Focus is started from a task.
- Focus screen: full screen, no nav bar / rail / header / FAB (it replaces the removed Zen mode). No click sounds anywhere.
- FAB: 56×56 radius 16, pc/onPc, `add`, bottom-left (left:16px; bottom:96px above nav).
- Web: navigation rail 96px on the RIGHT (first child in RTL flex): FAB on top, then الرئيسية · أهدافي ·
  الملاحظات `sticky_note_2` · الكاسات · أنا. Content sits in a `scLow` panel with radius 28 and 16px margin
  (see WebHome). Web links: WebHome.dc.html, WebGoals.dc.html, WebNotes.dc.html, WebWins.dc.html, WebSettings.dc.html.
- Bottom sheet: absolute, bottom 0, radius `28px 28px 0 0`, bg scLow, 32×4 drag handle (outline) 16px from top,
  scrim behind; dim a simplified version of the screen underneath (see TaskSheet).
- Web dialog: centered, width 560, radius 28, bg #262b28 (scHigh), padding 24, scrim behind.
- Wavy progress (M3 Expressive): see Main.dc.html — `q-5.5 -6 -11 0 t-11 0 …` path in primary, stroke 4,
  round caps, then a straight track in scHighest; fill grows from the RIGHT (RTL).
- Shape set (Landing and Login use all five, from one `<defs>` block reused with `<use href>`): cookie (9 lobes),
  sunny (8 points), clover (4 lobes), flower (6 petals, used for cups), burst (12 points). Landing/Login motion:
  shapes rotate slowly (36–48s) and app cards float (7s); helmet CSS classes `gh-spin`, `gh-rev`, `gh-float`,
  always off under `prefers-reduced-motion`. Motion lives on Landing and Login only; inside the app shapes are still.
- Google sign-in: the design shows a placeholder "G" circle; the build must use Google's official sign-in mark.
- Expressive shapes: cookie (9 lobes) path in Goal.dc.html, sunny (8 points) path in Main.dc.html — reuse them
  (scale with width/height on the svg) for hero numbers, streak, cups, avatars of ranks.
- Coach-mark hint (in-app tip that keeps appearing after onboarding until dismissed): inverse tooltip bg #dee4de,
  text #2c322e 14/20, radius 12, padding 12 14, max-width 260, a 10px rotated square as arrow, and a text button
  "فهمت" (#226a4c, 600). Inline hint card: tc bg, onTc text, `lightbulb` icon, radius 20, close button.
- Snackbar/toast: inverse bg, radius 12, at bottom above nav, icon + one line + optional action in #226a4c.
- Text field (M3 outlined): height 56, radius 12, 1px outline border, floating label 12px above inside border gap
  (simulate with a small label span positioned on the border with bg same as surface), focus = 2px primary border.
- Switch (M3): track 52×32 radius 16; on = primary track + 24px onPrimary thumb with `check` 16px; off = scHighest
  track, 2px outline border, 16px outline thumb.

## Product facts (use these, don't invent other rules)
- Every goal starts Solo; Share → "اعرض تقدّمك" (view-only link, stays solo) or "اشتغل مع ناس" (becomes Squad).
- Squad roles: صاحب الهدف (owner), أدمن (admin), عضو (member), مشاهد (viewer). Guest links expire after 7 days.
- Squad rules: ممنوع تغيير المواعيد للأعضاء · الأعضاء ميقدروش يمسحوا مهام. (No XP-penalty rule — it was removed.)
- In a shared goal, finishing a task finishes it for everyone. Assignee avatar on tasks in squads only.
- XP = difficulty (1–6) × 10; +20% if done by the deadline; no late penalty; video tasks need 60% watched;
  max 15 XP tasks per day; 3rd completion inside a minute = 0; finishing a goal = +100 XP for every member, once.
- Streak: daily; 2 freeze days, +1 every 7 days (max 2); broken streak can be restored within 48h by finishing
  2 tasks in one day. Ranks (cosmetic only): سيلفر 0 · جولد 300 · بلاتينيوم 1000 · دايموند 2500 · كراون 5000 ·
  إيس 10000 · كونكرر 20000 XP. Each rank unlocks an app colour (Theme.dc.html); Conqueror also gets an animated frame.
- Cups: every finished goal = a cup in الكاسات. Bronze < 10 tasks, silver 10–30, gold > 30.
- Home templates (4, under the big input): ذاكر لامتحان `school` · اتعلم من يوتيوب `smart_display` ·
  مشروع مع فريق `group` · خلّص حاجات متأجلة `event_repeat`.
- YouTube playlist question (sheet on mobile, dialog on web): "هذاكرها ككورس" (60% rule + XP) or
  "هحفظها وأكتب عليها ملاحظات". English: "Study it as a course" / "Save it and take notes".
- Web course page: like YouTube — big video, note points under it, lesson list on the side.
- Weekly leaderboard only inside a squad, resets Saturday. No global leaderboard. Everything is free (no pricing).
- Existing features to redesign (they exist in the code, keep them): المدرب، تخصصات الـ AI، Command Palette،
  guest links expiring after 7 days. Any feature in the code stays unless AGENTS.md removes it.
- Rank colours (swatch bg / icon colour, dark theme; each is a full M3 scheme from its seed):
  أخضر #88d6af (selected circle) · أزرق #b1c5ff · جولد #523198 / #d0bcff · بلاتينيوم #831e49 / #ffb1c7 ·
  دايموند #783200 / #ffb690 · كراون (blue-leaning cyan, kept away from the green) #004d66 / #7fd0f2,
  primary #7fd0f2, onPrimary #003547, onPc #c0e8ff · إيس (graphite) #45464a / #c6c6cb, primary #c6c6cb,
  onPrimary #2f3034, onPc #e2e2e7 · كونكرر #5d4200 / #f7bd48.
- AI (open to all ranks, daily quota e.g. "باقي 18 من 20 النهارده"; the real number is not decided): اشرحلي · اسأل الـ AI · اعمل checklist ·
  تخصصك (المبرمج / الشبكات / المحاسب / المذاكر) gives 3 extra skills each, e.g. المبرمج: صلّح الإيرور، راجع
  الكود، حسّن الكود · الشبكات: صلّح المشكلة، حلّل اللوج، تتبّع الباكت · المحاسب: اعمل معادلة، حلّل الأرقام،
  راجع الحسابات · المذاكر: بسّطلي الفكرة، ساعدني أذاكر، اشرح بعمق.
- Coach (المدرب): 3 times a day: واجهني بالحقيقة · أهم 3 حاجات · حاجة سريعة أبدأ بيها.
- Task fields: title, description, difficulty 1–6, start/end date, assignee (squad), checklist, comments with
  @mentions and reactions, attachments (Drive file, link, PDF, image, doc, YouTube), video + watch progress,
  focus time, status (board: لسه / شغال فيها / خلصت).
- Goal page toolbar: تثبيت في الرئيسية · مرفقات (count) · ملاحظات · مشاركة · أضف لـ Google Calendar ·
  استيراد (بلاي ليست / من نص) · ترتيب العناوين بالـ AI · الفريق (squad). Views: قائمة / بورد / خريطة.
  Filters: الكل · النهارده · الأسبوع ده · متأخرة.
- Goal header shows progress as "13 من 32 درس خلصوا" (for courses) or "8 من 12 مهمة خلصت" — always say the noun.
- Goal card variants: course (tc colour, YouTube chip, lesson count, next lesson), text goal (sc colour, next task),
  squad (avatars, "مع 3"). Finished goals show their cup.

## Copy
Egyptian Arabic, short, friendly, verbs on buttons, sentence case for English. Realistic sample data (the same
people and goals everywhere): user محمد; friends سارة، عمر، نور، يوسف. Goals: "كورس React كامل" (YouTube, 32
lessons, 13 done, 40%), "مذاكرة الإحصاء" (12 tasks, exam 15 أكتوبر), "مشروع التخرج" (squad with سارة وعمر ونور,
72%), "تنضيف وترتيب الأوضة" (finished, silver cup), "تسليم موقع العميل" (solo work project, 9 tasks, deadline 20 أكتوبر, next: "اربط صفحة الدفع"). Streak 12 days, 1 freeze left, XP 186, rank سيلفر, 7 cups. 3 tasks past their date. Weekly board in "مشروع التخرج": سارة 1st, محمد 2nd (20 XP behind her), عمر 3rd.
No lorem ipsum, no fake stats beyond these. The numbers are sample data: they don't have to add up
(e.g. 7 cups with 186 XP is fine). Keep them identical across screens.

## Report back
List every file you wrote as: `filename | width×height | Arabic title | group` — nothing else long.
