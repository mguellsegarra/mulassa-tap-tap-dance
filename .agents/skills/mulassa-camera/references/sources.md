# Research already done

## Filming dance (showreel, 2026-10-23)

- Fred Astaire: long takes, full body, few cuts: https://mentalfloss.com/article/76966/14-toe-tapping-facts-about-fred-astaire
- Astaire by Numbers (Oxford Academic): https://academic.oup.com/book/44740/chapter/379558041
- Roger Ebert on That's Dancing!: https://www.rogerebert.com/reviews/thats-dancing-1985
- Shooting dance (No Film School): https://nofilmschool.com/2017/04/practical-tips-shooting-dance-performances
- 10 tips for dance films (Paolo Rudelli, PDF): https://iam.pl/sites/default/files/press/10_tips_on_how_to_master_the_cinematic_tools_and_enhance_your_dance-v.1.1-with-logos_1.pdf
- Is there a "language of music-video clips"? (arXiv): https://arxiv.org/abs/2108.00970
- Shot length in music videos (Doxa Comunicación): https://repositorioinstitucional.ceu.es/handle/10637/8769
- K-pop practice videos, one take: https://www.koreatimes.co.kr/www/art/2024/11/398_302847.html
- Xbox Accessibility Guideline 117 (automatic camera motion and motion sickness): https://devdocs.xbox.com/gaming/accessibility/xbox-accessibility-guidelines/117
- Cut on movement: https://www.animationapprentice.org/blog/why-animators-should-cut-on-movement.html

No installed skill covered real-time 3D cameras; the AI-video skills were not useful.

## Third-person camera (free play, 2026-10-18)

- WoW right-button turn (TURNORACTION): https://new.wowprogramming.com/docs/api/TurnOrActionStart.html, https://wowinterface.com/forums/showthread.php?p=280712, `cameraSmoothStyle`: https://warcraft.wiki.gg/wiki/CVar_cameraSmoothStyle
- Unreal `bUseControllerDesiredRotation` / `RotationRate`: https://docs.unrealengine.com/4.26/en-US/API/Runtime/Engine/GameFramework/UCharacterMovementComponent/RotationRate/index.html; Spring Arm lag: https://docs.unrealengine.com/4.27/en-US/API/Runtime/Engine/GameFramework/USpringArmComponent/
- Cinemachine recentering (wait, then time) and Deoccluder (pull in fast, ease out slow): https://docs.unity3d.com/Packages/com.unity.cinemachine@3.1/manual/CinemachinePanTilt.html, https://docs.unity3d.com/Packages/com.unity.cinemachine@3.1/manual/CinemachineDeoccluder.html
- John Nesky, 50 Game Camera Mistakes (GDC 2014): https://gdcvault.com/play/1021262/50-Camera (read through a secondhand summary)
- Engine default turn rates (360/500/540°/s) were quoted from memory, not verified.

## Touch controls (2026-10-20)

- nipplejs (behaviour copied, not installed): https://github.com/yoannmoinet/nipplejs
- Virtual joystick feel: https://bugnet.io/blog/how-to-fix-mobile-virtual-joystick-feeling-bad
- Skills read, not installed: `build-mobile-threejs-games`, `gamedev-skills` (game-feel, input-systems, camera-systems): generic, used for floating stick, rescaled radial dead zone, frame-rate independent smoothing, clamped pitch.
- Handcam videos of Genshin Impact, Fortnite and Roblox on iPhone: layout and behaviour compared, camera response not measured numerically.

## Pointer Lock (2026-10-20)

MDN and browser support data: promise support and `unadjustedMovement` differ between Chrome, Firefox and Safari (no `unadjustedMovement` on Chrome for Linux). Evidence and compatibility summary: `/Users/marc/.t3/artifacts/mulassa-free-mode-pointer-lock-20261020/RESUM.md`.
