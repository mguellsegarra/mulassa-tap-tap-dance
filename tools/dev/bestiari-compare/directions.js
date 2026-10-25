// Rehearsal compass approved by the owner: W is the opening-facing direction.
// These labels belong to the floor, independently of camera and moving figure.
export function makeDirections(opening) {
  const wX = Math.sin(opening.yaw), wZ = Math.cos(opening.yaw);
  const sX = Math.cos(opening.yaw), sZ = -Math.sin(opening.yaw);
  const names = ['W', 'S', 'E', 'N'];
  const markers = names.map((name, i) => {
    const yaw = opening.yaw + i * Math.PI / 2;
    return { name, x: Math.sin(yaw), z: Math.cos(yaw) };
  });
  return {
    markers,
    east: (x, z) => -(x - opening.x) * wX - (z - opening.z) * wZ,
    south: (x, z) => (x - opening.x) * sX + (z - opening.z) * sZ,
    heading(yaw) { return names[((Math.round((yaw - opening.yaw) / (Math.PI / 2)) % 4) + 4) % 4]; },
    angle(yaw) { return yaw - opening.yaw - Math.PI / 2; },
    origin: { x: opening.x, z: opening.z },
  };
}

export function addDirectionMarkers(THREE, scene, directions) {
  const group = new THREE.Group(); scene.add(group);
  const resources = [];
  for (const marker of directions.markers) {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 96;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#f3cb40'; ctx.beginPath(); ctx.arc(48, 48, 42, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#403922'; ctx.font = 'bold 56px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(marker.name, 48, 49);
    const texture = new THREE.CanvasTexture(canvas), material = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(material); sprite.scale.set(.42, .42, 1);
    sprite.position.set(directions.origin.x + marker.x * 4.8, .24, directions.origin.z + marker.z * 4.8); group.add(sprite);
    resources.push(texture, material);
  }
  return { group, dispose() { for (const resource of resources) resource.dispose(); } };
}
