# iPhones before iOS 18, quality steps and first draws: the investigations

The full record behind the rules in [graphics.md, "iPhones before iOS 18, and first draws"](../graphics.md#iphones-before-ios-18-and-first-draws):
the rented-phone sessions of 2026-11-14 and 15, the frame monitor's Low Power Mode fixes, the warm-up draws and the
first frames of every song. Moved here verbatim from graphics.md on 2026-11-15. How to run a rented phone:
[device-profiling.md, "A rented phone"](../device-profiling.md#a-rented-phone-aws-device-farm).

Found on rented iPhones (2026-11-14, AWS Device Farm: iPhone 8 iOS 16.7.11, iPhone 13 iOS 17.6.1 and 18.5, iPhone 15 Pro
iOS 18.1; Safari under Appium, 60 Hz, QA build) and an S10 over adb for contrast. How to run one, its plans, phases and
traps: `docs/agents/device-profiling.md` («A rented phone»). Every number below is from those sessions.

- **Safari before 18 composites HTML over the 3D badly; it is the browser, not the chip.** The same iPhone 13 held the
  selector at 30 fps on iOS 17.6 and at 60 on iOS 18.5; an iPhone 8 (iOS 16.7) at 12; an iPhone 15 Pro (iOS 18.1) and
  the S10 (Chrome 157, 58 fps) are fine. The 3D alone does 60 on all of them (`#select { display: none }`: 59), with
  3-4 ms of main thread a frame: nothing shows in a JavaScript profile.
- **Two owners on the selector.** Its endless CSS animations (iPhone 8: 12 → 44 fps without them) and the figures'
  carousel as a whole (44 → 60 without it: illustrations +4, labels +8, the scroller +10; no single part). The first is
  fixed: `@supports not (content-visibility: hidden)` in `styles/select-sizes.css` stops the «play» button's invite and
  glint, the new card's sweep, the entity badge's holo fade and the free-play button's glows (41-43 fps on the iPhone 8,
  50-52 on the iPhone 13 with iOS 17). The carousel is left as it is (the owner's call): a menu, and the song does 56.
- **`@supports not (content-visibility: hidden)` is the test for «Safari before 18»** (the one browser family in use
  without it). The idle screen relies on the same gap: `[data-reel-gone] { content-visibility: hidden }` did nothing
  there and the idle dance stayed at 12 fps under the faded selector; its `display: none` fallback gives 60.
- **One early frame put the 30 Hz cap off: the owner's iPhone 18 Pro lost quality and its crowd in Low Power Mode.**
  The frame monitor knows the cap from 12 frames in a row at ~33 ms; any frame under 24 ms ended it, and Safari under the
  cap gives an early frame now and then (a tap on the notes, its own jitter). One every 10 frames was enough: every 33 ms
  frame then read as slow, two steps down at once, and in Low Power Mode there is no way back up. Now a lone early frame
  (none in the 4 before it) neither ends the cap nor its run; closer ones do (a 60 Hz screen missing every second or third
  refresh). The same played Bou: 30 fps at `medium`, no step (2026-11-14, `tests/render/low-power.mjs`).
- **That rule held for one session and failed the next: a throttled browser is told by a step that buys nothing, not
  by one more frame pattern.** The same phone, the day after, ran the Bou at 25 fps (30 and 24 Hz in turns, frames of 50-79 ms
  between them, JavaScript 9 ms a frame) and lost two levels in 40 s; with the cap rule patched it still lost one at
  the song's 125th second, when a late pair's catch-up (96, 71, 16, 21 ms) took the cap off. Two changes: the cap now
  lifts only when 4 of the last 12 frames are under 24 ms (a screen back at 60 Hz), and under a cap with light JavaScript `adaptive-quality.js` takes its
  first step down as a probe: if the late share does not fall by the overload threshold the level is put back
  (`throttled`) and nothing more steps until the pace is fast again; the near people lag a level, so nobody leaves. A
  first version skipped the step outright on «capped and light JavaScript»: two reviews showed a 60 Hz phone whose
  GPU cannot keep up (33 and 50 ms frames in turns) reads exactly the same and never stepped down again. JavaScript
  time says nothing about the GPU; only the step does. The owner's two sessions and that phone are the test
  (`tests/render/fixtures/low-power-bou.json`, `tests/render/adaptive-quality.mjs`). On the owner's phone the probe
  cost 6 s at `low` once (the song's 15th second), then `medium` to the end. The first try thinned the far crowd on
  that one step and the owner saw it: the armless backdrop and mid band now lag a level with the near people
  (`sessionProfile`), so a first step takes sharpness, shadows and effects only.
- **In Low Power Mode it is the finger, not the HUD.** The same phone, song and server: on `?autoplay&mute` Safari
  sat at 24 Hz (86-89% of frames at 42 ms, 1-2% late, no verdict at all); played by hand with sound it jumped between 30
  and 24 Hz (48% at 33 ms, 36% at 42) with 12% late, the game's work the same 9-10 ms. The late frames are those
  switches. Held notes looked worse in an earlier table (5.9% of frames over 70 ms against 2.9%) because a finger is
  down, not for what they draw. Touch and sound were not told apart.
- **The page cover stays up until the splash runs at the device's pace** (20 frames in a row under 45 ms, at most 6 s
  after the first): it lifted on frames of 41-55 ms, Safari still compiling the splash's dances (the Mulassa and Drac pair:
  30 ms of JavaScript a frame in Low Power Mode, 15 a few seconds later; the Bou alone, 9), and the monitor judged that.
  A boot step also needs two slow 2 s windows in a row now (`render-quality.js` EARLY).
- **A slow menu is not a slow phone.** The selector's 12 fps walked the iPhone 8 down to `minimal`, and its song (60 fps
  at `medium`) was then played at `minimal`. Out of a song, a step down that changes nothing is undone and that menu's
  share of late frames becomes its floor (`adaptive-quality.js`, `menuFloor`). An even 30 on iOS 17 reads as Low Power
  (`lowPower` in `?perf`): no step down, by luck.
- **A first draw is the GPU's work even with its program linked.** `precompile()` links every program, yet on a phone
  that never drew them (a clean Safari; it keeps them afterwards, so a second load shows nothing) the Bou's rave was a
  121-181 ms frame where it starts and its banknotes 199-365 ms at the bombo. Fixed by really drawing them once, unseen,
  in the page's first frames: `bouFrame`'s warm-up (`bouRave(…, warm)` at zero light, `bouBillsWarm`: one note of no
  size) and `renderer.initTexture` when the banknote's image arrives. After (four clean sessions): no frame over 50 ms
  at the rave; the bombo still varies, 63 to 266 ms (not only a first draw, then: its owner is open). A new effect that first shows mid-song needs the same: hidden-but-compiled is
  not drawn.
- **The whole scene is drawn once at boot, under the page's cover** (`scene/precompile.js` `warmDraw`: hidden objects
  shown, empty instanced meshes given one instance, nothing culled, then all put back). Four clean iPhone 8 sessions, two
  with it and two without: the bombo's frame 87 and 89 ms without, none over 50 with; the frame as the splash gives way
  487 and 494 ms without, 306 and 287 with; the cover gone by 12.4-12.6 s without, 11.7-12.7 with (no longer). A new
  effect needs nothing more than being in the scene at boot. The Bou's own warm-up (below) is older and was in both.
- **Where a warm-up runs matters as much as having one.** As each run's first frame it only moved the hitch to the
  count-in (a 200 ms frame). Now in the page's first frames, once a page: on the iPhone 8 it falls with the banknote's
  upload as the splash gives way (515 + 214 ms, where 463 + 220 already were).
- **The selector still steps quality on an iPhone 8** (35-42 fps with the animations stopped): a 287-320 ms frame some
  6 s in and one of 1.4 s later are those switches, not a first draw, and the song then started at `low`.
- **JavaScript per frame still counts on a 120 Hz iPhone.** The lasers' hit test walked every triangle of the Bou per
  beam per frame (the owner's iPhone 15 Pro hitched at the final); a grid per mesh, built one mesh a frame beforehand,
  fixed it, and the CO2's 800 points are drawn only while a burst shows.


## Before the rules: the summary of 2026-11-14

What not to do:

- Do not add an endless CSS animation to the selector (or to anything left over the 3D) without stopping it in that
  `@supports` block, and do not judge it on a Mac, an iOS 18 iPhone or the S10: none of them show the cost.
- Do not hide a screen that stays over the 3D with `content-visibility` alone, nor trust `opacity: 0` to make it free
  on those iPhones: invisible layers are still composited.
- Do not chase `box-shadow`, `text-shadow`, `filter` or `mask` there: removing all four changed nothing (iPhone 8).
- Do not let a menu's frame rate set the song's quality, and do not read an even 30 fps as overload before ruling out
  a refresh cap.
- Do not count on `precompile()` for a first appearance mid-song, and do not put the warm-up draw where the player is
  looking or tapping.
- Do not conclude from one session or one phase: the same iPhone 8 opened the selector at 12 fps in most sessions and at
  50 in two, and the iPhone 13 left its 30 fps at the first injected style whatever it was (I named the wrong owner
  once from that). Alternate the variants and repeat (`device-profiling.md`).
- Do not make the menus exempt from quality steps: tried on 2026-11-14 (to keep a slow selector from setting the song's
  level) and reverted, because weak phones find their level there before the first song (six tests say so); `menuFloor`
  is what stayed.
- Do not skip a quality step because the JavaScript is light: a busy GPU has light JavaScript too.
- Do not take anyone out of the plaça on a first step, far figures included: the owner sees them go. People are the
  second step's (`PROFILE_PEOPLE`).
- Do not give several people of a procession the same spot to walk back to: they wait on it for ever, still counted
  as in it, and the next song's has nobody (the Bou's snake, three abreast, 2026-11-15; `PARADE_K.patience` is the net).
- Do not draw the warm-up before `linkPrograms` nor once the cover is down (`main.js`): one render then pays every
  program's first use at once, or lands on the selector.
- Do not answer a Low Power complaint with one more frame pattern in `frameMonitor`, nor call it fixed after one good
  session: replay the owner's recorded sessions (`tests/render/fixtures/low-power-bou.json`) and add the one that fails.
- Do not let one odd frame decide a cadence: a cap, a group or a hitch is read from a run of frames, never from the last one.
- Do not start judging frames while the page is still warming up (compiling its JavaScript, first draws): keep it under
  the cover, and give the monitor frames at the device's own pace.
- Do not take Device Farm for the owner's phone: no 120 Hz, no Low Power Mode, no thermal state, no finger, no audio.

A whole Bou song after all this (autoplay, muted): iPhone 15 Pro (iOS 18.1) 59.6 fps at `medium`, one frame over 50 ms
(55, at 53.3 s); iPhone 8 (iOS 16.7) 59.5 fps at `low`, 70 ms at 53.3 s, 266 at the bombo, 102 at the end. An iPhone 7 on
iOS 15.8.4 boots and reaches the selector.

The first frames of every song (left as they are, the owner's call, 2026-11-14): 2-3 frames of 50-84 ms in a song's first
quarter second on the S10 (three starts in one session, twice: not a first-time cost; 87-144 ms on the iPhones), 3 s
before its first note and inside the change of screen. The first is one main-thread task (65 ms on the S10): the
selector's ~450 elements restyled as it hides (24-31 ms: `hidden` and `inert` each walk its subtree), the run's start
(17 ms), paint and layout; the others are its 0.2 s fade and its `display: none` landing. Not the game's JavaScript, not
a first draw (the boot's warm-up does nothing for it). Measured to nothing: reading the strips' scroll before the
writes; the corner row's custom properties moved off `body` (587 -> 451 elements restyled, 2 ms); the `:has()` rules
deleted (only the three corner buttons' 6 ms at 4x). The cost is the selector's size, not one rule: a smaller selector
DOM is the lever. On the S10 the day's boot changes cost nothing: the cover gone by 5.3 s before and 5.7 after (4 cold
starts each, 4.3-6.4 s), the opening's lost time 218-385 ms before, 151-285 after.

Still open: why iOS 17 enters the selector at an even 30 fps; the carousel's cost on iOS 16-17; quality steps taken on a slow selector (their hitches, and the level the song then starts at).

## What Device Farm found on the selector (from device-profiling.md)

What it found on the selector: iOS 16 and 17 composite its endless CSS animations and its carousel over the 3D badly
(iPhone 8: 12 fps, 44 without the animations, 60 without the carousel too; the same iPhone 13 does 30 on iOS 17.6 and
60 on iOS 18.5). An Android S10 and iOS 18 are not affected.
