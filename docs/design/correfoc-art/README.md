# Correfoc: primera exploració d'art

Cinc conceptes estàtics generats amb l'eina integrada Imagegen des de Codex. No són captures d'un joc implementat ni sprites de producció.

## Direcció actual

Estètica esquemàtica inspirada en Mini Metro: fons infernal fosc, pocs detalls i personatges petits. Una plaça oberta, una rotllana de diables com a element principal, tabalers i suport al marge. Els primers nivells haurien de prioritzar aquest espai obert. Les primeres exploracions de carrers i textures RPG s'han descartat amb les correccions del propietari.

| ID | Direcció |
| --- | --- |
| C1 | Siluetes de brasa: siluetes planes vermelles i color os. |
| C2 | Petits diables: personatges arrodonits i expressius. |
| C3 | Pixel de cendra: sprites pixel art, paleta gòtica limitada. |
| C4 | Tinta vermella: formes de gravat simplificades. |
| C5 | Llums a l'infern: xarxa i espurnes lluminoses molt contingudes. |

## Base cultural i límits

La carretillada pot ser estàtica, amb els diables ballant al seu lloc, o contínua, girant en cercle, recarregant i continuant. No tots els balls ni totes les actuacions són iguals. Font: https://www.tarragona.cat/cultura/festes-i-cultura-popular/santa-tecla/fans-tecla/vocabulari-de-les-festes/c

Les imatges exploren art. La mecànica anterior de subministrament entre nodes encara no queda validada amb una sola rotllana: abans d'implementar cal definir què gestiona el jugador, preservant una base coneguda i evitant afegir sistemes arbitraris.

## Tecnologia proposada

PixiJS amb sprites 2D i formes per a xarxes i nodes. La simulació ha de ser independent del dibuix. No cal Three.js per a aquesta vista. PixiJS és un renderitzador i els sistemes de joc quedarien a càrrec del projecte: https://pixijs.com/faq

Phaser continua sent alternativa si es vol un marc amb més sistemes de joc integrats: https://github.com/phaserjs/phaser

No s'han instal·lat dependències ni implementat el joc. La generació d'imatges no demostra rendiment, interacció ni llegibilitat real en mòbil.

## Revisió

Obrir index.html per comparar els cinc conceptes. Prompts exactes a prompts.json. Worktree basat en main local 8163e34c; sense commit, push ni desplegament.
