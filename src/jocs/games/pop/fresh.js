// A draw from a list that never repeats the one before: the blast's look and its sound change every time.
export function fresh(list) {
  let last = Math.floor(Math.random() * list.length); // the first draw leaves out a random one: every item as likely
  return () => list[last = (last + 1 + Math.floor(Math.random() * (list.length - 1))) % list.length];
}
