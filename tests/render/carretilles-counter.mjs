import assert from 'node:assert/strict';

// Exercise the real input, window and lane owners in render-quality's game harness.
export function verifyCarretillesCounter(run) {
  run('var counterText = [], counterOriginalText = text; text = value => counterText.push(String(value));');
  try {
    for (const figure of ['DRAC', 'MULASSA']) for (const diff of [0, 1, 2]) {
      run(`setFigureSong(${figure}); startGame(${diff}); G.state = 'play'; G.paused = false; offsetMs = 0;`);
      for (const ix of [0, 1]) {
        run(`var counterRoll = G.balloons[${ix}]; G.next = G.chart.indexOf(counterRoll); songNow = counterRoll.t;
          var counterNeed = counterRoll.need;`);
        const need = run('counterNeed');
        for (const count of [0, 1, need - 1, need, need + 1, need * 2, Math.max(101, need * 3 + 1)]) {
          run(`while (counterRoll.count < ${count}) press(counterRoll.count % 2 ? 'L' : 'R');
            counterText = []; drawLane(songNow);`);
          const words = JSON.parse(run('JSON.stringify(counterText)'));
          assert(words.includes(String(count)), `${figure}/${diff}/${ix}: total taps ${count}`);
          if (figure === 'DRAC') {
            assert.equal(words.filter(w => w === String(count)).length, 1, 'one cumulative tap total');
            assert(words.includes('TOCS'), `DRAC/${diff}/${ix}/${count}: taps labelled, got ${words}`);
            assert(words.join(' ').includes('PICA RÀPID!'), 'keep tapping throughout the roll');
            if (count) assert(run('SPRAY.some(q => clock - q.t0 < q.life)'), 'a tap throws the hanging carretilla’s sparks');
            assert(!words.some(w => /^x\d+$/.test(w) || ['CARRETILLES', 'TRO', 'A PUNT', 'PEL TRO FINAL'].includes(w)), 'no group, countdown or target-ready indicator');
          } else {
            const reached = count >= need;
            const value = reached ? `x${Math.floor(count / need)}` : String(need - count);
            const label = reached ? 'GLOBUS' : 'PER PETAR';
            assert(words.includes(value) && words.includes(label), `MULASSA/${diff}/${ix}/${count}: ${value} ${label}, got ${words}`);
          }
        }
        run(`var counterBefore = counterRoll.count; G.paused = true; press('L'); G.paused = false;
          songNow = counterRoll.end - HANDOFF; press('R');
          counterText = []; drawLane(songNow);`);
        assert.equal(run('counterRoll.count'), run('counterBefore'), 'pause and handoff do not add taps');
        assert.equal(run('counterText.includes("TOCS")'), false, 'tap indicator ends with the active input window');
        run(`var counterBuzz = []; navigator.vibrate = p => counterBuzz.push(p);
          songNow = counterRoll.end; advance(songNow); advance(songNow + 0.01); press('L'); delete navigator.vibrate;`);
        assert.equal(run('counterBuzz.filter(Array.isArray).length'), figure === 'DRAC' ? 1 : 0, `${figure}/${diff}/${ix}: the TRO (Drac only) vibrates once`);
        assert.equal(run('counterRoll.count'), run('counterBefore'), 'closed window ignores more taps');
        assert.equal(run('counterRoll.hit'), 'perfect', 'repeated groups still produce one end judgement');
      }
      run(`startGame(${diff}); G.state = 'play';`);
      assert(run('G.balloons.every(n => n.count === 0 && !n.hit)'), 'retry resets both windows');
    }
  } finally {
    run('text = counterOriginalText; setFigureSong(MULASSA);');
  }
  console.log('carretilles: cumulative labelled taps, no countdown, repeated groups, windows, pause, retry and Mulassa HUD ok');
}
