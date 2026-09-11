import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

export type CreatureId =
  | "mushroom"
  | "cloud-sheep"
  | "lantern"
  | "potion"
  | "book-goblin"
  | "grim-reaper"
  | "knight"
  | "witch"
  | "kitsune"
  | "mermaid"
  | "dragon"
  | "moss-golem";
type Vec = [number, number, number];
type Material = THREE.Material | THREE.Material[];

function material(color: number, extra: THREE.MeshPhysicalMaterialParameters = {}) {
  return new THREE.MeshPhysicalMaterial({ color, roughness: 0.72, ...extra });
}
function mesh(
  parent: THREE.Object3D,
  geometry: THREE.BufferGeometry,
  mat: Material,
  pos: Vec = [0, 0, 0],
) {
  const object = new THREE.Mesh(geometry, mat);
  object.position.set(...pos);
  object.castShadow = true;
  object.receiveShadow = false;
  parent.add(object);
  return object;
}
function orb(parent: THREE.Object3D, mat: Material, pos: Vec, scale: Vec) {
  const object = mesh(parent, new THREE.SphereGeometry(1, 48, 32), mat, pos);
  object.scale.set(...scale);
  return object;
}
function roundBox(parent: THREE.Object3D, mat: Material, pos: Vec, scale: Vec, radius = 0.05) {
  return mesh(parent, new RoundedBoxGeometry(...scale, 4, radius), mat, pos);
}
function tube(parent: THREE.Object3D, mat: Material, points: Vec[], radius: number) {
  return mesh(
    parent,
    new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))),
      64,
      radius,
      12,
      false,
    ),
    mat,
  );
}

// Each ring has its own center and radius, allowing soft bent hats and curled tails.
function sculpt(
  parent: THREE.Object3D,
  mat: Material,
  rings: [number, number, number, number][],
  depth = 1,
) {
  const center = new THREE.CatmullRomCurve3(rings.map((r) => new THREE.Vector3(r[0], r[1], r[2])));
  const profile = new THREE.SplineCurve(
    rings.map((r, i) => new THREE.Vector2(i / (rings.length - 1), r[3])),
  );
  const vertices: number[] = [],
    indices: number[] = [];
  for (let j = 0; j <= 64; j++) {
    const p = center.getPoint(j / 64),
      radius = Math.max(0.001, profile.getPoint(j / 64).y);
    const tangent = center.getTangent(j / 64).normalize();
    const across = new THREE.Vector3()
      .crossVectors(tangent, new THREE.Vector3(0, 0, 1))
      .normalize();
    for (let i = 0; i <= 64; i++) {
      const angle = (i / 64) * Math.PI * 2;
      vertices.push(
        p.x + Math.cos(angle) * radius * across.x,
        p.y + Math.cos(angle) * radius * across.y,
        p.z + Math.sin(angle) * radius * depth,
      );
      if (j < 64 && i < 64) {
        const a = j * 65 + i;
        indices.push(a, a + 65, a + 1, a + 1, a + 65, a + 66);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return mesh(parent, geometry, mat);
}
function leaf(parent: THREE.Object3D, mat: Material, pos: Vec, scale: Vec, angle = 0) {
  const geometry = new THREE.SphereGeometry(1, 32, 24);
  const vertices = geometry.attributes.position;
  for (let i = 0; i < vertices.count; i++) {
    const y = vertices.getY(i);
    vertices.setX(i, vertices.getX(i) * (0.65 - y * 0.35));
  }
  geometry.computeVertexNormals();
  const object = mesh(parent, geometry, mat, pos);
  object.scale.set(...scale);
  object.rotation.z = angle;
  return object;
}
function face(parent: THREE.Object3D, y: number, z: number, spacing = 0.28) {
  const eyes: THREE.Mesh[] = [];
  const ink = material(0x35232d),
    blush = material(0xf1a69a);
  for (const sign of [-1, 1]) {
    eyes.push(orb(parent, ink, [sign * spacing, y, z], [0.067, 0.112, 0.035]));
    orb(parent, blush, [sign * (spacing + 0.17), y - 0.115, z - 0.035], [0.087, 0.06, 0.025]);
  }
  const happy = new THREE.Group();
  happy.name = "expression-happy";
  happy.visible = false;
  parent.add(happy);
  for (const sign of [-1, 1]) {
    const x = sign * spacing;
    tube(
      happy,
      ink,
      [
        [x - 0.064, y - 0.01, z + 0.015],
        [x, y + 0.045, z + 0.025],
        [x + 0.064, y - 0.01, z + 0.015],
      ],
      0.018,
    );
  }
  const smile = tube(
    happy,
    ink,
    [
      [-0.065, y - 0.15, z + 0.025],
      [0, y - 0.19, z + 0.035],
      [0.065, y - 0.15, z + 0.025],
    ],
    0.015,
  );
  smile.name = "happy-smile";
  const curious = new THREE.Group();
  curious.name = "expression-curious";
  curious.visible = false;
  parent.add(curious);
  orb(curious, ink, [0, y - 0.17, z + 0.025], [0.026, 0.038, 0.018]);
  tube(
    curious,
    ink,
    [
      [-spacing - 0.065, y + 0.17, z],
      [-spacing, y + 0.2, z + 0.01],
      [-spacing + 0.06, y + 0.18, z],
    ],
    0.013,
  );
  const thoughtful = new THREE.Group();
  thoughtful.name = "expression-thinking";
  thoughtful.visible = false;
  parent.add(thoughtful);
  tube(
    thoughtful,
    ink,
    [
      [-0.04, y - 0.17, z + 0.025],
      [0.015, y - 0.17, z + 0.03],
      [0.055, y - 0.145, z + 0.025],
    ],
    0.013,
  );
  for (const sign of [-1, 1])
    tube(
      thoughtful,
      ink,
      [
        [sign * spacing - 0.06, y + 0.16, z],
        [sign * spacing + 0.06, y + 0.19, z],
      ],
      0.012,
    );
  return eyes;
}
function star(parent: THREE.Object3D, mat: Material, pos: Vec, size: number) {
  const shape = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const angle = Math.PI / 2 + (i * Math.PI) / 5,
      radius = i % 2 ? size * 0.46 : size;
    const x = Math.cos(angle) * radius,
      y = Math.sin(angle) * radius;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return mesh(
    parent,
    new THREE.ExtrudeGeometry(shape, {
      depth: 0.045,
      bevelEnabled: true,
      bevelSize: 0.022,
      bevelThickness: 0.022,
      bevelSegments: 3,
    }),
    mat,
    pos,
  );
}
function hat(parent: THREE.Object3D, color: number, potion: boolean) {
  const cloth = material(color),
    band = material(potion ? 0x9d6746 : 0x8278bd);
  const brim = orb(parent, cloth, [0, 0.96, -0.05], [1.08, 0.105, 0.78]);
  brim.rotation.z = -0.09;
  const crown = sculpt(
    parent,
    cloth,
    [
      [0, 0.95, 0, 0.7],
      [0.02, 1.19, 0, 0.6],
      [0.13, 1.52, 0, 0.43],
      [0.26, 1.82, 0, 0.27],
      [0.48, 1.91, 0, 0.15],
      [0.69, 1.72, 0, 0.005],
    ],
    0.86,
  );
  crown.material = [cloth, band];
  for (let ring = 0; ring < 64; ring++)
    crown.geometry.addGroup(ring * 64 * 6, 64 * 6, ring >= 3 && ring <= 13 ? 1 : 0);
  if (potion) {
    const gold = material(0xe1b75f);
    roundBox(parent, gold, [0.24, 1.12, 0.56], [0.24, 0.2, 0.075]);
    roundBox(parent, band, [0.24, 1.12, 0.608], [0.12, 0.105, 0.018], 0.015);
    leaf(parent, material(0x89a94c), [0.6, 1.45, 0], [0.25, 0.4, 0.09], -0.7);
  } else {
    tube(
      parent,
      material(0xb58d55),
      [
        [0.69, 1.73, 0],
        [0.7, 1.59, 0],
        [0.7, 1.5, 0],
      ],
      0.018,
    );
    star(parent, material(0xffcc63), [0.7, 1.37, 0], 0.17);
  }
}

export function createCreature(id: CreatureId) {
  const root = new THREE.Group(),
    eyes: THREE.Mesh[] = [];
  const cream = material(0xf3dfbd),
    green = material(0x789346),
    gold = material(0xd6a04d);
  let prop: THREE.Object3D | undefined;
  if (id === "mushroom") {
    orb(root, cream, [0, -0.51, 0], [0.47, 0.55, 0.37]);
    for (const s of [-1, 1]) {
      orb(root, cream, [s * 0.27, -0.93, 0.12], [0.23, 0.2, 0.28]);
      orb(root, cream, [s * 0.49, -0.49, 0.08], [0.16, 0.23, 0.18]).rotation.z = s * -0.35;
    }
    orb(root, cream, [0, 0.1, 0.02], [0.64, 0.49, 0.48]);
    eyes.push(...face(root, 0.12, 0.484));
    for (const s of [-1, 1])
      leaf(root, green, [s * 0.2, -0.32, 0.36], [0.32, 0.29, 0.09], s * -0.5);
    const cap = material(0xe76562);
    const dome = sculpt(
      root,
      cap,
      [
        [0, 0.36, 0, 0.9],
        [0, 0.43, 0, 1.1],
        [0, 0.64, 0, 1.1],
        [0, 0.96, 0, 0.86],
        [0, 1.23, 0, 0.56],
        [0, 1.37, 0, 0.2],
        [0, 1.39, 0, 0.001],
      ],
      0.79,
    );
    orb(root, material(0xdcbf88), [0, 0.38, 0], [0.97, 0.08, 0.71]);
    // Project circular patches onto the actual dome so no spot intersects the cap.
    dome.updateMatrixWorld(true);
    const ray = new THREE.Raycaster();
    for (const [x, y, r] of [
      [0, 1.12, 0.16],
      [-0.52, 0.95, 0.14],
      [0.64, 0.77, 0.19],
      [-0.86, 0.62, 0.09],
      [0.39, 1.2, 0.065],
    ]) {
      const positions: number[] = [],
        triangles: number[] = [];
      for (let ring = 0; ring <= 8; ring++)
        for (let i = 0; i <= 48; i++) {
          const a = (i / 48) * Math.PI * 2,
            px = x + (Math.cos(a) * r * ring) / 8,
            py = y + (Math.sin(a) * r * ring) / 8;
          ray.set(new THREE.Vector3(px, py, 3), new THREE.Vector3(0, 0, -1));
          const hit = ray.intersectObject(dome)[0];
          const p = hit
            ? hit.point.clone().addScaledVector(hit.face!.normal, 0.006)
            : new THREE.Vector3(px, py, 0);
          positions.push(p.x, p.y, p.z);
          if (ring < 8 && i < 48) {
            const n = ring * 49 + i;
            triangles.push(n, n + 49, n + 1, n + 1, n + 49, n + 50);
          }
        }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
      geometry.setIndex(triangles);
      geometry.computeVertexNormals();
      mesh(root, geometry, cream);
    }
    leaf(root, green, [0.57, 1.37, -0.14], [0.24, 0.34, 0.09], -0.65);
    leaf(root, green, [0.39, 1.52, -0.16], [0.2, 0.33, 0.09], 0.1);
  } else if (id === "cloud-sheep") {
    const wool = material(0xffefdb),
      horn = material(0xdca84f);
    orb(root, wool, [0, -0.18, 0], [0.7, 0.76, 0.48]);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      orb(root, wool, [Math.cos(a) * 0.56, -0.12 + Math.sin(a) * 0.63, 0.12], [0.31, 0.32, 0.35]);
    }
    for (const s of [-1, 1])
      orb(root, material(0x624947), [s * 0.26, -1.0, 0.04], [0.17, 0.24, 0.22]);
    orb(root, cream, [0, 0.13, 0.47], [0.53, 0.4, 0.24]);
    eyes.push(...face(root, 0.13, 0.712, 0.25));
    for (const s of [-1, 1]) {
      const points: Vec[] = [];
      for (let i = 0; i <= 40; i++) {
        const t = i / 40,
          a = t * Math.PI * 1.8,
          r = 0.29 * (1 - t) + 0.06;
        points.push([s * (0.64 + Math.sin(a) * r), 0.43 + Math.cos(a) * r, 0.38 + t * 0.12]);
      }
      tube(root, horn, points, 0.125);
      orb(root, horn, points[40], [0.125, 0.125, 0.125]);
    }
    for (const [x, y, r] of [
      [-0.42, 0.76, 0.31],
      [-0.15, 0.86, 0.34],
      [0.18, 0.85, 0.32],
      [0.43, 0.72, 0.27],
      [0, 0.61, 0.27],
    ])
      orb(root, wool, [x, y, 0.43], [r, r, 0.29]);
    for (const x of [-0.43, -0.15, 0.16, 0.43])
      orb(root, wool, [x, -0.47, 0.43], [0.25, 0.31, 0.22]);
  } else if (id === "lantern" || id === "potion") {
    const isPotion = id === "potion";
    orb(root, cream, [0, -0.44, 0], [0.47, 0.58, 0.36]);
    orb(root, cream, [0, 0.4, 0], [0.66, 0.58, 0.48]);
    eyes.push(...face(root, 0.38, 0.474));
    hat(root, isPotion ? 0x65794a : 0x61558e, isPotion);
    if (isPotion) {
      for (const s of [-1, 1]) orb(root, cream, [s * 0.26, -0.93, 0.09], [0.21, 0.17, 0.24]);
      const leather = material(0x83533c);
      const strap = roundBox(root, leather, [0, -0.27, 0.36], [0.92, 0.16, 0.08]);
      strap.rotation.z = -0.35;
      roundBox(root, gold, [0.23, -0.34, 0.425], [0.19, 0.22, 0.07]);
      roundBox(root, leather, [0.23, -0.34, 0.47], [0.1, 0.13, 0.03]);
      roundBox(root, leather, [0.56, -0.51, 0.09], [0.4, 0.47, 0.33], 0.12);
      roundBox(root, material(0xa4704e), [0.56, -0.39, 0.29], [0.39, 0.22, 0.07], 0.065);
      orb(root, gold, [0.57, -0.45, 0.35], [0.035, 0.047, 0.023]);
      prop = new THREE.Group();
      prop.position.set(-0.63, -0.3, 0.4);
      prop.rotation.z = 0.18;
      root.add(prop);
      const glass = material(0xf9d9f7, {
        transparent: true,
        opacity: 0.25,
        depthWrite: false,
        roughness: 0.13,
        clearcoat: 1,
      });
      orb(
        prop,
        material(0xe55bd4, { roughness: 0.22, clearcoat: 0.8 }),
        [0, -0.07, 0],
        [0.27, 0.26, 0.23],
      );
      orb(prop, glass, [0, 0, 0], [0.32, 0.36, 0.28]);
      mesh(prop, new THREE.CylinderGeometry(0.12, 0.15, 0.31, 40), glass, [0, 0.34, 0]);
      mesh(
        prop,
        new THREE.CylinderGeometry(0.135, 0.12, 0.17, 40),
        material(0xc89a58),
        [0, 0.56, 0],
      );
      const rim = mesh(
        prop,
        new THREE.TorusGeometry(0.137, 0.024, 12, 48),
        material(0xfbe4fa),
        [0, 0.44, 0],
      );
      rim.rotation.x = Math.PI / 2;
      for (const [x, y] of [
        [-0.11, -0.1],
        [0.12, -0.16],
        [0.08, 0.04],
      ])
        orb(prop, material(0xf695ef), [x, y, 0.218], [0.047, 0.048, 0.02]);
      orb(prop, material(0xfff7ff), [-0.17, 0.08, 0.21], [0.038, 0.1, 0.018]).rotation.z = -0.3;
      orb(root, cream, [-0.84, -0.47, 0.44], [0.14, 0.18, 0.16]);
    } else {
      const cloak = material(0x61558e);
      orb(root, cloak, [0, -0.08, 0], [0.51, 0.18, 0.4]);
      leaf(root, cloak, [0.43, -0.25, 0.13], [0.4, 0.46, 0.15], 0.85);
      orb(root, gold, [0.13, -0.06, 0.415], [0.115, 0.115, 0.055]);
      sculpt(
        root,
        cream,
        [
          [0, -0.64, 0, 0.31],
          [0.13, -0.91, 0, 0.2],
          [0.32, -1.04, 0, 0.09],
          [0.35, -0.94, 0, 0.002],
        ],
        0.8,
      );
      orb(root, cream, [-0.55, 0.02, 0.3], [0.17, 0.15, 0.17]);
      prop = new THREE.Group();
      prop.position.set(-0.68, -0.49, 0.3);
      root.add(prop);
      const brass = material(0x956433, { roughness: 0.45 });
      const ring = mesh(prop, new THREE.TorusGeometry(0.105, 0.034, 16, 48), brass, [0, 0.35, 0]);
      ring.rotation.y = 0.1;
      orb(
        prop,
        material(0xffdc68, { emissive: 0xffb72f, emissiveIntensity: 1.8 }),
        [0, 0, 0],
        [0.2, 0.27, 0.17],
      );
      orb(prop, brass, [0, 0.245, 0], [0.28, 0.085, 0.23]);
      orb(prop, brass, [0, -0.245, 0], [0.25, 0.07, 0.21]);
      for (const s of [-1, 1])
        tube(
          prop,
          brass,
          [
            [s * 0.19, -0.22, 0.02],
            [s * 0.23, 0, 0.02],
            [s * 0.2, 0.23, 0.02],
          ],
          0.025,
        );
      const light = new THREE.PointLight(0xffc15a, 0.6, 2);
      prop.add(light);
    }
  } else if (id === "book-goblin") {
    const skin = material(0xa2b95c),
      inner = material(0x849846),
      cover = material(0x70472e),
      pages = material(0xf0d6a2);
    orb(root, skin, [0, -0.5, 0], [0.45, 0.53, 0.34]);
    orb(root, skin, [0, 0.22, 0], [0.67, 0.52, 0.46]);
    for (const s of [-1, 1]) {
      leaf(root, skin, [s * 0.77, 0.39, 0], [0.39, 0.58, 0.19], s * -1.0);
      leaf(root, inner, [s * 0.81, 0.41, 0.14], [0.24, 0.43, 0.025], s * -1.0);
      orb(root, skin, [s * 0.27, -0.97, 0.1], [0.22, 0.16, 0.26]);
      for (const offset of [-0.08, 0.02, 0.11])
        orb(root, skin, [s * 0.27 + offset, -1.0, 0.28], [0.055, 0.095, 0.09]);
    }
    eyes.push(...face(root, 0.22, 0.462));
    [0x49617e, 0xad5846, 0x765074].forEach((color, i) => {
      const book = new THREE.Group();
      root.add(book);
      book.position.set(i % 2 ? 0.06 : -0.04, 0.84 + i * 0.25, 0);
      book.rotation.y = (i - 1) * 0.1;
      book.rotation.z = i % 2 ? -0.05 : 0.045;
      const leather = material(color);
      roundBox(book, pages, [0, 0, 0], [1.03, 0.18, 0.56]);
      for (const y of [-0.115, 0.115])
        roundBox(book, leather, [0, y, 0], [1.14, 0.065, 0.63], 0.03);
      roundBox(book, leather, [-0.51, 0, 0], [0.15, 0.24, 0.62]);
      roundBox(book, gold, [-0.36, 0, 0.325], [0.09, 0.23, 0.028], 0.01);
      for (const y of [-0.045, 0.015, 0.065])
        roundBox(book, material(0xcbb58b), [0.12, y, 0.284], [0.8, 0.009, 0.008], 0.003);
    });
    prop = new THREE.Group();
    prop.position.set(0, -0.43, 0.56);
    root.add(prop);
    for (const s of [-1, 1]) {
      const half = new THREE.Group();
      half.position.x = s * 0.285;
      half.rotation.y = s * 0.22;
      prop.add(half);
      roundBox(half, pages, [0, 0, -0.055], [0.54, 0.61, 0.12]);
      roundBox(half, cover, [0, -0.02, 0.03], [0.59, 0.69, 0.075]);
      roundBox(half, material(0x8d5f3e), [0, -0.02, 0.073], [0.48, 0.55, 0.023], 0.04);
      orb(root, skin, [s * 0.58, -0.5, 0.64], [0.14, 0.19, 0.15]);
    }
    roundBox(prop, cover, [0, -0.01, 0.06], [0.1, 0.69, 0.12]);
    const moon = new THREE.Shape();
    moon.absarc(0, 0, 0.12, 0.7, Math.PI * 1.85, false);
    moon.quadraticCurveTo(-0.08, 0, 0.092, 0.077);
    mesh(
      prop,
      new THREE.ExtrudeGeometry(moon, { depth: 0.018, bevelEnabled: false }),
      gold,
      [0.28, -0.01, 0.17],
    );
  }
  if (id === "grim-reaper") {
    const robe = material(0x343140),
      lining = material(0x171822),
      trim = material(0x655a79),
      bone = material(0xeee3ca);
    sculpt(
      root,
      robe,
      [
        [0, -1.02, 0, 0.52],
        [0, -0.86, 0, 0.58],
        [0, -0.35, 0, 0.44],
        [0, -0.03, 0, 0.31],
      ],
      0.76,
    );
    orb(root, robe, [0, 0.47, 0], [0.77, 0.79, 0.5]);
    sculpt(
      root,
      robe,
      [
        [0, 0.83, -0.04, 0.5],
        [0.1, 1.13, -0.04, 0.32],
        [0.24, 1.37, -0.04, 0.13],
        [0.39, 1.32, -0.04, 0.003],
      ],
      0.77,
    );
    orb(root, trim, [0, 0.44, 0.38], [0.62, 0.62, 0.19]);
    orb(root, lining, [0, 0.44, 0.48], [0.56, 0.56, 0.14]);
    orb(root, bone, [0, 0.44, 0.57], [0.43, 0.4, 0.12]);
    for (const x of [-0.13, 0, 0.13])
      roundBox(root, bone, [x, 0.08, 0.585], [0.115, 0.12, 0.09], 0.035);
    orb(root, lining, [0, 0.3, 0.698], [0.025, 0.03, 0.012]);
    eyes.push(...face(root, 0.48, 0.694, 0.2));
    for (const s of [-1, 1]) {
      const sleeve = orb(root, robe, [s * 0.46, -0.36, 0.03], [0.22, 0.38, 0.23]);
      sleeve.rotation.z = s * 0.5;
      orb(root, bone, [s * 0.59, -0.49, 0.18], [0.11, 0.12, 0.1]);
      tube(
        root,
        trim,
        [
          [s * 0.22, -0.16, 0.29],
          [s * 0.31, -0.51, 0.32],
          [s * 0.36, -0.93, 0.34],
        ],
        0.018,
      );
    }
    star(root, material(0xc5b7e8), [0, -0.03, 0.38], 0.11);
    prop = new THREE.Group();
    prop.position.set(0.95, -0.22, 0.08);
    root.add(prop);
    tube(
      prop,
      material(0x69523e),
      [
        [0, -0.81, 0],
        [0, 0.2, 0],
        [0.02, 1.65, 0],
      ],
      0.047,
    );
    const blade = new THREE.Shape();
    blade.moveTo(0, 1.28);
    blade.bezierCurveTo(-0.39, 1.51, -0.88, 1.24, -1.08, 0.91);
    blade.bezierCurveTo(-0.65, 1.15, -0.26, 1.11, 0.02, 1.1);
    blade.closePath();
    mesh(
      prop,
      new THREE.ExtrudeGeometry(blade, {
        depth: 0.07,
        bevelEnabled: true,
        bevelSize: 0.025,
        bevelThickness: 0.025,
        bevelSegments: 3,
      }),
      material(0xbdc7cc, { metalness: 0.45, roughness: 0.35 }),
      [0, 0.36, 0],
    );
    for (const y of [0.19, 0.25, 0.31]) {
      const ring = mesh(prop, new THREE.TorusGeometry(0.052, 0.014, 10, 24), gold, [0, y, 0]);
      ring.rotation.x = Math.PI / 2;
    }
  }
  if (id === "moss-golem") {
    const stone = material(0x859899),
      moss = material(0x71934c),
      dark = material(0x587079);
    roundBox(root, stone, [0, -0.45, 0], [0.89, 0.81, 0.62], 0.22);
    roundBox(root, stone, [0, 0.35, 0], [1.24, 0.99, 0.84], 0.3);
    eyes.push(...face(root, 0.34, 0.431));
    for (const s of [-1, 1]) {
      roundBox(root, dark, [s * 0.28, -0.96, 0.05], [0.35, 0.25, 0.43], 0.09);
      const arm = roundBox(root, stone, [s * 0.61, -0.41, 0.04], [0.31, 0.58, 0.35], 0.14);
      arm.rotation.z = s * 0.15;
      orb(root, moss, [s * 0.46, 0.75, 0], [0.2, 0.11, 0.33]);
    }
    for (const [x, y, r] of [
      [-0.3, 0.82, 0.23],
      [0, 0.85, 0.26],
      [0.24, 0.8, 0.24],
    ])
      orb(root, moss, [x, y, 0], [r, 0.12, 0.35]);
    tube(
      root,
      dark,
      [
        [-0.47, 0.69, 0.42],
        [-0.39, 0.56, 0.43],
        [-0.43, 0.46, 0.43],
      ],
      0.014,
    );
    tube(
      root,
      dark,
      [
        [0.27, -0.16, 0.32],
        [0.2, -0.3, 0.33],
        [0.27, -0.43, 0.33],
      ],
      0.012,
    );
    const heart = new THREE.Shape();
    heart.moveTo(0, -0.1);
    heart.bezierCurveTo(-0.25, 0.05, -0.12, 0.2, 0, 0.09);
    heart.bezierCurveTo(0.12, 0.2, 0.25, 0.05, 0, -0.1);
    mesh(
      root,
      new THREE.ExtrudeGeometry(heart, {
        depth: 0.025,
        bevelEnabled: true,
        bevelSize: 0.015,
        bevelThickness: 0.01,
        bevelSegments: 3,
      }),
      material(0xb8d27d, { emissive: 0x416d24, emissiveIntensity: 0.25 }),
      [0, -0.4, 0.33],
    );
    prop = new THREE.Group();
    prop.position.set(0, 0.91, 0);
    root.add(prop);
    tube(
      prop,
      moss,
      [
        [0, 0, 0],
        [0.04, 0.24, 0],
        [0.02, 0.4, 0],
      ],
      0.027,
    );
    leaf(prop, moss, [-0.11, 0.29, 0], [0.18, 0.23, 0.065], 0.85);
    leaf(prop, material(0xa5bb61), [0.17, 0.42, 0], [0.2, 0.26, 0.065], -0.85);
    for (const s of [-1, 1]) {
      orb(root, material(0xd7a19b), [s * 0.41, 0.85, 0.19], [0.095, 0.045, 0.09]);
      orb(root, gold, [s * 0.41, 0.875, 0.19], [0.027, 0.026, 0.027]);
    }
  }
  if (id === "knight") {
    const steel = material(0xbcbab4, { metalness: 0.18, roughness: 0.5 }),
      red = material(0xca6260),
      dark = material(0x716e69);
    orb(root, red, [0, -0.46, -0.16], [0.59, 0.58, 0.18]);
    orb(root, steel, [0, -0.44, 0], [0.43, 0.45, 0.34]);
    for (const s of [-1, 1]) {
      orb(root, cream, [s * 0.25, -0.94, 0.1], [0.22, 0.19, 0.24]);
      orb(root, steel, [s * 0.47, -0.4, 0], [0.22, 0.25, 0.23]);
    }
    orb(root, steel, [0, 0.4, -0.04], [0.74, 0.69, 0.48]);
    orb(root, cream, [0, 0.26, 0.35], [0.61, 0.43, 0.25]);
    eyes.push(...face(root, 0.26, 0.591));
    tube(
      root,
      steel,
      [
        [-0.66, 0.25, 0.4],
        [-0.58, 0.53, 0.48],
        [0, 0.72, 0.49],
        [0.58, 0.53, 0.48],
        [0.66, 0.25, 0.4],
      ],
      0.066,
    );
    for (const x of [-0.43, -0.15, 0.15, 0.43])
      roundBox(root, dark, [x, 0.78 - Math.abs(x) * 0.18, 0.4], [0.072, 0.17, 0.055], 0.025);
    for (const s of [-1, 1]) orb(root, gold, [s * 0.73, 0.42, 0.01], [0.075, 0.2, 0.18]);
    sculpt(
      root,
      red,
      [
        [0, 1.0, -0.1, 0.16],
        [0, 1.24, -0.1, 0.25],
        [0.19, 1.43, -0.1, 0.27],
        [0.44, 1.29, -0.1, 0.18],
        [0.65, 1.17, -0.1, 0.003],
      ],
      0.55,
    );
    orb(root, steel, [0, 1.03, -0.05], [0.23, 0.1, 0.21]);
    orb(root, red, [0, -0.12, 0.04], [0.49, 0.12, 0.37]);
    orb(root, gold, [0, -0.15, 0.43], [0.105, 0.105, 0.035]);
    roundBox(root, cream, [0, -0.62, 0.3], [0.75, 0.1, 0.11], 0.04);
    roundBox(root, gold, [0, -0.62, 0.37], [0.2, 0.105, 0.03], 0.02);
    const shield = new THREE.Group();
    shield.position.set(0.47, -0.47, 0.48);
    root.add(shield);
    const shape = new THREE.Shape();
    shape.moveTo(0, 0.43);
    shape.quadraticCurveTo(0.19, 0.3, 0.35, 0.3);
    shape.quadraticCurveTo(0.36, -0.24, 0, -0.48);
    shape.quadraticCurveTo(-0.36, -0.24, -0.35, 0.3);
    shape.quadraticCurveTo(-0.19, 0.3, 0, 0.43);
    const shieldGeometry = new THREE.ExtrudeGeometry(shape, {
      depth: 0.09,
      bevelEnabled: true,
      bevelSize: 0.04,
      bevelThickness: 0.035,
      bevelSegments: 4,
    });
    mesh(shield, shieldGeometry, material(0xe0cda1));
    const inset = mesh(shield, shieldGeometry.clone(), material(0x91846b), [0, 0, 0.09]);
    inset.scale.set(0.79, 0.79, 0.35);
    star(shield, gold, [0, -0.01, 0.15], 0.18);
    prop = new THREE.Group();
    prop.position.set(-0.64, -0.37, 0.22);
    prop.rotation.z = 0.48;
    root.add(prop);
    roundBox(prop, dark, [0, -0.15, 0], [0.12, 0.35, 0.12]);
    orb(prop, red, [0, -0.35, 0], [0.095, 0.08, 0.08]);
    roundBox(prop, gold, [0, 0.05, 0], [0.48, 0.1, 0.13]);
    const sword = new THREE.Shape();
    sword.moveTo(-0.1, 0.1);
    sword.lineTo(-0.1, 0.77);
    sword.lineTo(0, 0.99);
    sword.lineTo(0.1, 0.77);
    sword.lineTo(0.1, 0.1);
    sword.closePath();
    mesh(
      prop,
      new THREE.ExtrudeGeometry(sword, {
        depth: 0.055,
        bevelEnabled: true,
        bevelSize: 0.022,
        bevelThickness: 0.02,
        bevelSegments: 2,
      }),
      material(0xe0deda, { metalness: 0.25, roughness: 0.4 }),
    );
    orb(root, cream, [-0.61, -0.44, 0.28], [0.12, 0.12, 0.12]);
  }
  if (id === "witch") {
    const cloth = material(0x73548f),
      hair = material(0xb39acb),
      staff = material(0x906650);
    for (const s of [-1, 1]) {
      tube(
        root,
        hair,
        [
          [s * 0.46, 0.7, -0.06],
          [s * 0.66, 0.35, -0.07],
          [s * 0.57, -0.03, -0.04],
          [s * 0.7, -0.25, 0],
          [s * 0.51, -0.42, 0],
        ],
        0.17,
      );
    }
    sculpt(
      root,
      cloth,
      [
        [0, -1.02, 0, 0.59],
        [0, -0.65, 0, 0.5],
        [0, -0.12, 0, 0.3],
      ],
      0.72,
    );
    orb(root, cream, [0, -0.63, 0.29], [0.26, 0.36, 0.1]);
    orb(root, cream, [0, 0.34, 0.08], [0.58, 0.54, 0.42]);
    eyes.push(...face(root, 0.34, 0.496));
    leaf(root, hair, [-0.35, 0.73, 0.24], [0.26, 0.33, 0.16], -0.43);
    leaf(root, hair, [0.37, 0.66, 0.24], [0.25, 0.38, 0.15], 0.55);
    hat(root, 0x73548f, false);
    orb(root, cloth, [0, -0.16, 0.08], [0.47, 0.12, 0.34]);
    for (const s of [-1, 1])
      leaf(root, cloth, [s * 0.27, -0.41, 0.25], [0.43, 0.38, 0.11], s * -0.65);
    orb(root, gold, [0, -0.17, 0.45], [0.1, 0.1, 0.04]);
    prop = new THREE.Group();
    prop.position.set(-0.62, -0.47, 0.28);
    prop.rotation.z = 0.18;
    root.add(prop);
    tube(
      prop,
      staff,
      [
        [0, -0.5, 0],
        [0, 0.2, 0],
        [-0.05, 0.55, 0],
      ],
      0.06,
    );
    mesh(prop, new THREE.TorusGeometry(0.2, 0.058, 16, 48), staff, [-0.05, 0.68, 0]);
    orb(
      prop,
      material(0xbd87e4, {
        clearcoat: 0.8,
        roughness: 0.23,
        emissive: 0x632a8e,
        emissiveIntensity: 0.25,
      }),
      [-0.05, 0.68, 0],
      [0.14, 0.14, 0.12],
    );
    orb(root, cream, [-0.5, -0.44, 0.4], [0.13, 0.14, 0.13]);
  }
  if (id === "kitsune") {
    const ivory = material(0xf5e9d9),
      coral = material(0xd66b69);
    const tipped = (parent: THREE.Object3D, pos: Vec, scale: Vec, angle: number) => {
      const object = leaf(parent, material(0xffffff, { vertexColors: true }), pos, scale, angle);
      const positions = object.geometry.attributes.position,
        colors: number[] = [];
      const base = new THREE.Color(0xf5e9d9),
        tip = new THREE.Color(0xd66b69);
      for (let i = 0; i < positions.count; i++) {
        const color = base
          .clone()
          .lerp(tip, THREE.MathUtils.smoothstep(positions.getY(i), 0.3, 0.88));
        colors.push(color.r, color.g, color.b);
      }
      object.geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
      return object;
    };
    prop = new THREE.Group();
    prop.position.set(0, -0.65, -0.23);
    root.add(prop);
    for (const s of [-1, 1]) {
      tipped(prop, [s * 0.69, 0.03, 0], [0.49, 0.65, 0.24], s * -0.98);
      tipped(prop, [s * 0.57, 0.39, -0.07], [0.37, 0.64, 0.21], s * -0.43);
    }
    tipped(prop, [0, 0.54, -0.12], [0.39, 0.67, 0.22], 0.05);
    orb(root, ivory, [0, -0.51, 0], [0.39, 0.43, 0.32]);
    orb(root, ivory, [0, 0.25, 0.06], [0.62, 0.49, 0.43]);
    eyes.push(...face(root, 0.27, 0.487));
    for (const s of [-1, 1]) {
      tipped(root, [s * 0.39, 0.85, -0.03], [0.38, 0.58, 0.21], s * -0.27);
      leaf(root, coral, [s * 0.41, 0.91, 0.15], [0.19, 0.37, 0.045], s * -0.27);
      orb(root, ivory, [s * 0.22, -0.91, 0.1], [0.17, 0.22, 0.2]);
      leaf(root, ivory, [s * 0.56, 0.09, 0.12], [0.16, 0.21, 0.12], s * -1.2);
      const bow = orb(root, coral, [s * 0.22, -0.24, 0.37], [0.22, 0.14, 0.09]);
      bow.rotation.z = s * 0.18;
    }
    leaf(root, coral, [-0.1, -0.47, 0.32], [0.12, 0.24, 0.05], -0.25);
    leaf(root, coral, [0, 0.56, 0.451], [0.08, 0.13, 0.028]);
    orb(root, material(0x775341), [0, 0.14, 0.495], [0.023, 0.016, 0.015]);
    orb(root, gold, [0, -0.27, 0.45], [0.145, 0.14, 0.09]);
    roundBox(root, material(0x775341), [0, -0.32, 0.54], [0.022, 0.055, 0.012], 0.005);
    orb(root, material(0x775341), [0, -0.285, 0.54], [0.028, 0.028, 0.01]);
  }
  if (id === "mermaid") {
    const teal = material(0x77b7bf),
      light = material(0xb5dee0),
      hair = material(0x7fbec5);
    orb(root, hair, [0, 0.22, -0.12], [0.7, 0.69, 0.32]);
    for (const s of [-1, 1])
      tube(
        root,
        hair,
        [
          [s * 0.48, 0.62, -0.06],
          [s * 0.66, 0.17, -0.05],
          [s * 0.52, -0.15, -0.05],
          [s * 0.66, -0.5, -0.01],
          [s * 0.48, -0.75, 0],
          [s * 0.56, -0.93, 0],
        ],
        0.16,
      );
    orb(root, cream, [0, -0.34, 0.1], [0.33, 0.4, 0.27]);
    orb(root, cream, [0, 0.27, 0.17], [0.5, 0.46, 0.32]);
    eyes.push(...face(root, 0.27, 0.493, 0.25));
    orb(root, hair, [-0.23, 0.67, 0.24], [0.36, 0.28, 0.25]).rotation.z = 0.5;
    tube(
      root,
      hair,
      [
        [0.1, 0.76, 0.22],
        [0.4, 0.56, 0.25],
        [0.5, 0.27, 0.28],
        [0.45, 0.1, 0.31],
      ],
      0.13,
    );
    star(root, gold, [0.41, 0.75, 0.46], 0.19);
    for (const y of [0.47, 0.0])
      orb(
        root,
        material(0xf6ede6, { roughness: 0.25, clearcoat: 0.7 }),
        [-0.62, y, 0.2],
        [0.073, 0.073, 0.067],
      );
    sculpt(
      root,
      teal,
      [
        [0, -0.55, 0.12, 0.31],
        [0.14, -0.8, 0.12, 0.34],
        [0.47, -0.85, 0.12, 0.28],
        [0.75, -0.69, 0.11, 0.14],
        [0.8, -0.53, 0.1, 0.055],
      ],
      0.8,
    );
    for (const s of [-1, 1])
      leaf(root, light, [s * 0.17, -0.55, 0.34], [0.22, 0.17, 0.065], s * -0.7);
    prop = new THREE.Group();
    prop.position.set(0.78, -0.53, 0.1);
    root.add(prop);
    leaf(prop, light, [-0.03, 0.27, 0], [0.24, 0.37, 0.09], 0.35);
    leaf(prop, light, [0.23, 0.15, 0], [0.25, 0.37, 0.09], -0.65);
    orb(
      root,
      material(0xe8d9e6, { roughness: 0.16, clearcoat: 1, metalness: 0.15 }),
      [0, -0.22, 0.47],
      [0.21, 0.21, 0.19],
    );
    for (const s of [-1, 1]) orb(root, cream, [s * 0.23, -0.31, 0.42], [0.13, 0.15, 0.12]);
  }
  if (id === "dragon") {
    const purple = material(0xa587c1),
      pale = material(0xead8ae),
      wingMat = material(0x8f70ae);
    orb(root, purple, [0, -0.42, 0], [0.47, 0.53, 0.36]);
    orb(root, pale, [0, -0.48, 0.32], [0.3, 0.38, 0.085]);
    for (const y of [-0.3, -0.49, -0.68])
      tube(
        root,
        material(0xd7c49e),
        [
          [-0.23, y, 0.373],
          [0, y - 0.02, 0.416],
          [0.23, y, 0.373],
        ],
        0.012,
      );
    orb(root, purple, [0, 0.36, 0], [0.61, 0.52, 0.43]);
    eyes.push(...face(root, 0.35, 0.435));
    for (const s of [-1, 1]) {
      sculpt(
        root,
        pale,
        [
          [s * 0.39, 0.7, -0.07, 0.19],
          [s * 0.53, 0.93, -0.07, 0.16],
          [s * 0.51, 1.18, -0.07, 0.1],
          [s * 0.39, 1.33, -0.07, 0.002],
        ],
        0.85,
      );
      leaf(root, purple, [s * 0.6, 0.45, 0], [0.19, 0.3, 0.12], s * -1.22);
      orb(root, purple, [s * 0.4, -0.25, 0.26], [0.18, 0.25, 0.17]).rotation.z = s * -0.45;
      orb(root, purple, [s * 0.31, -0.9, 0.1], [0.22, 0.23, 0.24]);
      for (const dx of [-0.07, 0.04])
        orb(root, pale, [s * 0.31 + dx, -1.02, 0.26], [0.04, 0.05, 0.065]);
      const shape = new THREE.Shape();
      shape.moveTo(0, 0);
      shape.bezierCurveTo(0.22, 0.47, 0.63, 0.41, 0.84, -0.16);
      shape.quadraticCurveTo(0.58, 0.03, 0.44, -0.24);
      shape.quadraticCurveTo(0.24, -0.02, 0.1, -0.24);
      shape.closePath();
      const wing = new THREE.Group();
      wing.position.set(s * 0.36, -0.12, -0.15);
      wing.scale.x = s;
      wing.name = `wing-${s}`;
      root.add(wing);
      const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: 0.045,
        bevelEnabled: true,
        bevelThickness: 0.02,
        bevelSize: 0.025,
        bevelSegments: 3,
      });
      mesh(wing, geometry, wingMat);
      const membrane = mesh(wing, geometry.clone(), pale, [0.025, 0.0, 0.085]);
      membrane.scale.set(0.88, 0.8, 0.2);
      tube(
        wing,
        wingMat,
        [
          [0.16, 0.16, 0.085],
          [0.35, 0.09, 0.085],
          [0.44, -0.2, 0.085],
        ],
        0.018,
      );
    }
    for (const [y, z, r] of [
      [0.88, 0.08, 0.08],
      [0.91, -0.12, 0.09],
    ])
      leaf(root, pale, [0, y, z], [r, 0.18, r]);
    prop = new THREE.Group();
    prop.position.set(0.32, -0.66, -0.2);
    root.add(prop);
    sculpt(
      prop,
      purple,
      [
        [0, 0, 0, 0.22],
        [0.32, -0.08, 0, 0.21],
        [0.63, -0.02, 0, 0.14],
        [0.85, 0.15, 0, 0.002],
      ],
      0.8,
    );
    for (const [x, y] of [
      [0.28, 0.12],
      [0.48, 0.12],
      [0.67, 0.19],
    ])
      leaf(prop, pale, [x, y, 0], [0.08, 0.12, 0.07], -0.2);
  }
  return { root, eyes, prop };
}
