# Audio and music style

- Festive, warm, non-strident: no gralla, no pulse/square buzz; additive soft timbres.
- Part A: the don/ka taiko doubles the tune (the audio plays what the chart asks you to tap).
- No continuous applause during the song (only the results' 'ovation'): it hissed. The plaça's voice under it is deliberately
  small: the murmur (`amb`) swells up to 2.2x with the streak (`setCrowd`), a short «eeh!» (`'eh'`) on a GUAPA, and a few
  hands on beats 2 and 4 of section B (`clapBurst`, 0.04-0.09). All on the run's bus. GUAPA = a big taiko DON (`bigDon()`).
- Audio URLs in `song-mulassa.json` carry a `?v=` content hash (cache busting): always regenerate through the tool, never
  rename or hand-copy audio files.
- Menu loop (`mulassa-taiko-ambient.mp3`): light plucked-string polka, seamless loop; never leaks into play.
- Latency: `outputLatency` (`audio-clock.js` `latency`) is an estimate and omits some Bluetooth delay; the manual offset (the sync sheet) is the truth. Latch it once per run, never re-read it per frame. The calibration taps never play a sound; its metronome is its own context (`clicker.js`).
