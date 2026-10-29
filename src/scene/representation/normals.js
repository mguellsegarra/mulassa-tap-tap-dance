// Each vertex belongs to one rigid bone. Unlike three's default skin normal transform,
// this also handles the skirt's shear and nonuniform scales. Zero-scale hidden bones stay finite.
export const skinNormalChunk = `
#ifdef USE_SKINNING
  mat4 skinMatrix = bindMatrixInverse * (
    skinWeight.x * boneMatX + skinWeight.y * boneMatY +
    skinWeight.z * boneMatZ + skinWeight.w * boneMatW) * bindMatrix;
  mat3 a = mat3(skinMatrix);
  mat3 cofactor = mat3(cross(a[1], a[2]), cross(a[2], a[0]), cross(a[0], a[1]));
  float determinant = dot(a[0], cross(a[1], a[2]));
  objectNormal = abs(determinant) > 1e-12 ? cofactor * objectNormal / determinant : objectNormal;
  #ifdef USE_TANGENT
    objectTangent = a * objectTangent;
  #endif
#endif
`;
export function correctSkinNormals(material) {
  material.onBeforeCompile = shader => {
    shader.vertexShader = shader.vertexShader.replace('#include <skinnormal_vertex>', skinNormalChunk);
  };
  material.customProgramCacheKey = () => 'representation-rigid-inverse-transpose-v1';
  return material;
}
