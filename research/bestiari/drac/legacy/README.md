# Historical music trial sources

This archive preserves the earlier lab, the two music-candidate generators and their imported local dependencies.
`snapshot.json` records original hashes and the two external MP3 hashes. It is historical source material, not
a second public entrypoint: the HTML retains original absolute asset paths. Use the newer frozen comparison in
`../prototype/` for choreography review. The candidate MP3s are in the external Drac `music-candidates/` folder.

To reproduce candidate music, first make a working copy of this archive outside the repository (including a
package.json with `"type": "module"` for Node). Run from that external copy:

```
uv run --python 3.11 --with numpy --with scipy --with soundfile --with mido python tools/build_drac_trial.py
```

This regenerates only candidate outputs beneath that working copy. Keep those media outside Git. It has not
been rerun during preservation;
copied source/audio integrity has been checked instead. Original historical tests include assumptions about the
old repository and are evidence, not a promise that the archive alone supplies the full original test environment.
