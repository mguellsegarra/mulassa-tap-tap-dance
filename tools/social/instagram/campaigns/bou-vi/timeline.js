(async () => {
  const query = new URLSearchParams(location.search);
  const figures = [...document.querySelectorAll('figure')];
  const stories = [...document.querySelectorAll('.story')];
  const score = document.querySelector('#score');
  const range = document.querySelector('#time');
  const clock = document.querySelector('#clock');
  const starts = [0, 4, 8, 12], duration = 20;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let current = 0, playing = false, raf = 0;
  await Promise.all([...document.images].map(img => img.decode()));
  function paint(time, overview = false) {
    current = Math.max(0, Math.min(duration, time));
    const index = current >= 12 ? 3 : Math.floor(current / 4);
    figures.forEach((figure, i) => figure.classList.toggle('active', i === index));
    stories.forEach((story, i) => {
      const local = overview ? 2 : Math.max(0, current - starts[i]);
      const progress = Math.min(1, local / (i === 3 ? 8 : 4));
      story.querySelector('.tower').style.transform = reduced ? '' : `translateY(${-progress * 1.5}%) scale(${1 + progress * .025})`;
      story.querySelector('.clouds').style.transform = reduced ? '' : `translateX(${progress * 2}%)`;
      [...story.querySelectorAll('.line')].forEach((line, n) => {
        const entry = reduced ? 1 : Math.min(1, Math.max(0, (local - n * .1) / .32));
        line.style.opacity = entry;
        line.style.transform = `translateY(${(1-entry)*12}px) scale(${.975 + entry*.025})`;
      });
    });
    range.value = current;
    clock.textContent = `${current.toFixed(1).replace('.', ',')} / 20 s`;
  }
  function pause() { playing = false; cancelAnimationFrame(raf); score.pause(); }
  function seek(time) { pause(); score.currentTime = Math.max(0, Math.min(duration, time)); paint(time); }
  function frame() {
    if (!playing) return;
    paint(score.currentTime);
    if (score.ended || current >= duration) { pause(); paint(duration); }
    else raf = requestAnimationFrame(frame);
  }
  async function play() {
    pause(); document.body.classList.add('film');
    if (current >= duration) seek(0);
    score.currentTime = current;
    try { await score.play(); playing = true; frame(); }
    catch (error) { document.querySelector('#error').textContent = `No s'ha pogut reproduir el so: ${error.message}`; }
  }
  document.querySelector('#play').onclick = play;
  document.querySelector('#pause').onclick = pause;
  document.querySelector('#overview').onclick = () => { pause(); document.body.classList.remove('film'); paint(current, true); };
  document.querySelector('#guides').onclick = () => document.body.classList.toggle('guides');
  range.oninput = () => { document.body.classList.add('film'); seek(Number(range.value)); };
  if (query.has('export')) document.body.classList.add('export');
  if (query.has('guides')) document.body.classList.add('guides');
  window.storyTimeline = { ready: true, duration, starts, seek, play, pause, get time() { return current; } };
  const slide = Number(query.get('slide'));
  if (slide >= 1 && slide <= 4) {
    document.body.classList.add('export'); seek(starts[slide-1] + Number(query.get('t') ?? 2));
  } else if (query.has('export')) seek(Number(query.get('t') ?? 0));
  else paint(0, true);
})().catch(error => {
  document.querySelector('#error').textContent = `No s'han pogut carregar les capes: ${error.message}`;
  console.error(error);
});
