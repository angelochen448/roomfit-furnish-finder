import { Box3, Matrix4, Mesh, Vector3, type Group } from "three";

/** Bounds in group-local coordinates, independent of room placement/rotation. */
export function furnitureGeometryBounds(group: Group): Box3 {
  group.updateWorldMatrix(true, true);
  const inverse = group.matrixWorld.clone().invert();
  const bounds = new Box3();
  group.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    const positions = object.geometry.getAttribute("position");
    if (!positions) return;
    const local = new Matrix4().multiplyMatrices(inverse, object.matrixWorld);
    // Rotated rounded parts do not occupy every corner of their local AABB.
    // Measure actual vertices so tilted backs and legs still fit exactly.
    const vertex = new Vector3();
    for (let i = 0; i < positions.count; i++) {
      vertex.fromBufferAttribute(positions, i).applyMatrix4(local);
      bounds.expandByPoint(vertex);
    }
  });
  return bounds;
}

/** Fit complete visible geometry to confirmed dimensions and ground at y=0. */
export function fitFurnitureGeometry(group: Group, size: { w: number; d: number; h: number }): void {
  group.position.set(0, 0, 0);
  group.scale.set(1, 1, 1);
  const bounds = furnitureGeometryBounds(group);
  const extent = bounds.getSize(new Vector3());
  if (bounds.isEmpty() || extent.x <= 0 || extent.y <= 0 || extent.z <= 0) return;
  group.scale.set(size.w / extent.x, size.h / extent.y, size.d / extent.z);
  const center = bounds.getCenter(new Vector3());
  group.position.set(-center.x * group.scale.x, -bounds.min.y * group.scale.y, -center.z * group.scale.z);
  group.updateWorldMatrix(true, true);
}