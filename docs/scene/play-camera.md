# The play camera

Current rules, moved out of AGENTS.md so they load only when the task needs them. The reasons and history are in the `mulassacat-camera` skill (`references/play-camera.md`).

- **Play camera** (`framePlayCamera`, v3): defined by what you SEE, not by fitting her turn/jump envelope. From `?cam` sessions on a desktop: fov 54, a slice of world 8.25 m tall at her (a narrow screen instead needs 8.4 m across: the greater distance wins), her focus point 42% of the way down the stage (lane → pad), ~81° round and 26° above (`CAM_AZ`/`CAM_EL`, `CAMV`). It never sits still: a slow sway (`DRIFT`, unrelated 13–29 s periods) and a very slow follow of her heading (a sine, so no wrap-around step; 2.8 s spring). Springs are constant and slow (position 1.5 s) on purpose: a spring whose stiffness changes while far from its target whiplashes. Tune with `?cam` (auto = this camera).
  `FRONT` = her dance's front, 20° off `CAM_AZ` so every pose reads three-quarter. The musicians (models.js `placeBand`/`poseBand`: the banda, `BAND`, 6/8/10 by quality;
  the Drac's mitja cobla, `COBLA`, always its 2; nobody in free play) stand across the plaça from the camera (`BAND_AZ`), behind her, playing on the song's beat. `insidePlaza` remains the last resort.
  Shake during play is a small additive accent (GUAPA, finale), never fed back into the springs; misses/pops don't shake.
  With the Drac (`DRAC_CAM`) it follows half its travel across the shot (90% in depth) and not its heading: its long
  walks and twelve spins slid and swung the plaça under the note lane; `?camdrac=segueix` = the Mulassa's follow (A/B).
  The Mulassa's travelling dance uses the same calm follow (`MULA_CAM`: all of her travel across, and towards the lens only
  as far as the square lets the camera back away); `?camdrac=segueix` restores the heading follow for both. The Bou's festa (`FESTA_CAM`, the carried lap came within 4 m of a desktop's lens): while its colla carries it (`BOU_FESTA.k`, bou-stage.js, eased from `bouFestaAt`) the camera lets 60% of its follow go (towards the plaça's centre; all of it cropped it on a phone), stands at least 13 m off and rises 0.25 rad (the snake in view), so the whole rotllana stays in the shot; a phone's camera is already further and stays.
