import * as THREE from 'three'

type PbrMaterial = THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial

function canvasTexture(draw: (g: CanvasRenderingContext2D, size: number) => void, size = 1024, color = true): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const g = canvas.getContext('2d')!
  draw(g, size)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.anisotropy = 8
  texture.needsUpdate = true
  return texture
}

function noiseTexture(base: string, accent: string, density = 1500, size = 1024): THREE.CanvasTexture {
  return canvasTexture((g, s) => {
    g.fillStyle = base
    g.fillRect(0, 0, s, s)
    for (let i = 0; i < density; i += 1) {
      const alpha = 0.04 + Math.random() * 0.16
      g.fillStyle = accent
      g.globalAlpha = alpha
      const r = 1 + Math.random() * 7
      g.fillRect(Math.random() * s, Math.random() * s, r, r)
    }
    g.globalAlpha = 1
  }, size)
}

function grayscaleTexture(base: number, variation = 22, size = 1024): THREE.CanvasTexture {
  return canvasTexture((g, s) => {
    g.fillStyle = `rgb(${base},${base},${base})`
    g.fillRect(0, 0, s, s)
    for (let i = 0; i < 1200; i += 1) {
      const value = Math.max(0, Math.min(255, base + (Math.random() - 0.5) * variation))
      g.fillStyle = `rgb(${value},${value},${value})`
      g.globalAlpha = 0.22
      g.fillRect(Math.random() * s, Math.random() * s, 3 + Math.random() * 9, 3 + Math.random() * 9)
    }
    g.globalAlpha = 1
  }, size, false)
}

function normalTexture(size = 1024): THREE.CanvasTexture {
  return canvasTexture((g, s) => {
    g.fillStyle = '#8080ff'
    g.fillRect(0, 0, s, s)
    g.strokeStyle = 'rgba(150,150,255,.28)'
    g.lineWidth = 3
    for (let i = 0; i < 120; i += 1) {
      const y = Math.random() * s
      g.beginPath()
      g.moveTo(0, y)
      g.quadraticCurveTo(s * 0.45, y + (Math.random() - 0.5) * 30, s, y + (Math.random() - 0.5) * 30)
      g.stroke()
    }
  }, size, false)
}

const materialCache = new Map<string, PbrMaterial>()
function pbrMaterial(key: string, base: string, accent: string, roughness: number, repeat = 1, physical = false): PbrMaterial {
  const cached = materialCache.get(key)
  if (cached) return cached
  const map = noiseTexture(base, accent)
  const roughnessMap = grayscaleTexture(Math.round(roughness * 255), 30)
  const normalMap = normalTexture()
  map.repeat.set(repeat, repeat)
  roughnessMap.repeat.set(repeat, repeat)
  normalMap.repeat.set(repeat, repeat)
  const options: THREE.MeshStandardMaterialParameters = {
    map,
    roughness,
    metalness: 0,
    roughnessMap,
    normalMap,
    normalScale: new THREE.Vector2(0.32, 0.32),
  }
  const material = physical
    ? new THREE.MeshPhysicalMaterial({ ...options, clearcoat: 0.05, clearcoatRoughness: 0.5 })
    : new THREE.MeshStandardMaterial(options)
  materialCache.set(key, material)
  return material
}

function skyTexture(): THREE.CanvasTexture {
  return canvasTexture((g, size) => {
    const gradient = g.createLinearGradient(0, 0, 0, size)
    gradient.addColorStop(0, '#102c58')
    gradient.addColorStop(0.38, '#3f79ad')
    gradient.addColorStop(0.7, '#f4b66f')
    gradient.addColorStop(1, '#d95f43')
    g.fillStyle = gradient
    g.fillRect(0, 0, size, size)
    g.globalAlpha = 0.28
    g.fillStyle = '#fff1d0'
    for (let i = 0; i < 13; i += 1) {
      const x = (i * 179) % size
      const y = 120 + ((i * 107) % 360)
      g.beginPath()
      g.ellipse(x, y, 140 + (i % 4) * 50, 24 + (i % 3) * 16, 0, 0, Math.PI * 2)
      g.fill()
    }
    g.globalAlpha = 1
  }, 2048)
}

function signTexture(title: string, subtitle: string): THREE.CanvasTexture {
  return canvasTexture((g, size) => {
    g.fillStyle = '#143a42'
    g.fillRect(0, 0, size, size * 0.52)
    g.fillStyle = '#edc36c'
    g.fillRect(0, size * 0.52, size, size * 0.48)
    g.fillStyle = '#fff2cc'
    g.font = '700 112px Arial'
    g.textAlign = 'center'
    g.fillText(title, size / 2, 178)
    g.fillStyle = '#143a42'
    g.font = '700 52px Arial'
    g.fillText(subtitle, size / 2, 690)
  }, 768)
}

function meshBox(size: THREE.Vector3, material: THREE.Material, position: THREE.Vector3, cast = true): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z, 2, 2, 2), material)
  mesh.position.copy(position)
  mesh.castShadow = cast
  mesh.receiveShadow = true
  return mesh
}

function createTree(x: number, z: number, scale = 1): THREE.Group {
  const tree = new THREE.Group()
  tree.position.set(x, 0, z)
  tree.scale.setScalar(scale)
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.44, 4.3, 16), pbrMaterial('algarrobo-bark', '#5a3928', '#2a1810', 0.92, 1.8))
  trunk.position.y = 2.15
  trunk.castShadow = true
  const crownMaterial = pbrMaterial('algarrobo-leaves', '#2f623d', '#0d2516', 0.86, 2.4)
  for (const [px, py, pz, sx, sy, sz] of [[0, 4.4, 0, 1.8, 0.9, 1.5], [-1, 4.9, 0.3, 1.1, 0.7, 1], [1.1, 4.8, -0.2, 1.2, 0.75, 1.1]] as const) {
    const crown = new THREE.Mesh(new THREE.SphereGeometry(1.25, 24, 16), crownMaterial)
    crown.position.set(px, py, pz)
    crown.scale.set(sx, sy, sz)
    crown.castShadow = true
    crown.receiveShadow = true
    tree.add(crown)
  }
  tree.add(trunk)
  return tree
}

function createCactus(x: number, z: number, scale = 1): THREE.Group {
  const cactus = new THREE.Group()
  cactus.position.set(x, 0, z)
  cactus.scale.setScalar(scale)
  const mat = pbrMaterial('cactus-skin', '#367956', '#153c29', 0.78, 3)
  const stem = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 2.25, 8, 16), mat)
  stem.position.y = 1.2
  stem.castShadow = true
  const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 1.1, 8, 12), mat)
  arm.position.set(0.64, 1.35, 0)
  arm.rotation.z = -Math.PI / 2
  arm.castShadow = true
  const armUp = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.72, 8, 12), mat)
  armUp.position.set(1.12, 1.68, 0)
  armUp.castShadow = true
  cactus.add(stem, arm, armUp)
  return cactus
}

function createFlags(): THREE.Group {
  const group = new THREE.Group()
  const fabric = ['#db584f', '#edc36c', '#1a7d78', '#e59a44']
  for (let i = -5; i <= 5; i += 1) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.04, 4.4, 12), pbrMaterial('flag-pole', '#694631', '#2a170e', 0.94, 1))
    pole.position.set(i * 2.6, 2.2, -8 + Math.sin(i * 0.65) * 0.5)
    const cloth = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 0.58, 4, 2), new THREE.MeshStandardMaterial({ color: fabric[(i + 20) % fabric.length], roughness: 0.94, side: THREE.DoubleSide, normalMap: normalTexture(256), normalScale: new THREE.Vector2(0.18, 0.18) }))
    cloth.position.set(i * 2.6 + 0.58, 3.55, -8 + Math.sin(i * 0.65) * 0.5)
    cloth.rotation.y = -0.07
    cloth.castShadow = true
    group.add(pole, cloth)
  }
  return group
}

function createStartMarker(): THREE.Group {
  const group = new THREE.Group()
  const base = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.4, 0.22, 64), pbrMaterial('start-stone', '#d7a458', '#714421', 0.58, 2, true))
  base.position.y = 0.12
  base.receiveShadow = true
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.65, 0.08, 14, 96), new THREE.MeshBasicMaterial({ color: '#fff0a6', toneMapped: false }))
  ring.rotation.x = Math.PI / 2
  ring.position.y = 0.25
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 1.25), new THREE.MeshStandardMaterial({ map: signTexture('INICIO', 'LA LEGUA'), roughness: 0.8, side: THREE.DoubleSide }))
  sign.position.set(0, 1.55, 0)
  sign.rotation.y = Math.PI
  sign.castShadow = true
  group.add(base, ring, sign)
  group.position.set(-17, 0, 15)
  return group
}

function createChichaStall(): THREE.Group {
  const stall = new THREE.Group()
  const wood = pbrMaterial('stall-wood', '#84502f', '#29150b', 0.82, 2.2)
  const adobe = pbrMaterial('stall-adobe', '#c58d58', '#653b21', 0.94, 2.8)
  const roof = pbrMaterial('stall-roof', '#dcae55', '#704219', 0.72, 3.2)
  stall.add(meshBox(new THREE.Vector3(5.2, 0.3, 3), roof, new THREE.Vector3(0, 3.35, 0)))
  stall.add(meshBox(new THREE.Vector3(4.5, 2.8, 0.18), adobe, new THREE.Vector3(0, 1.45, -1.18)))
  for (const x of [-2.15, 2.15]) stall.add(meshBox(new THREE.Vector3(0.3, 3.35, 0.3), wood, new THREE.Vector3(x, 1.68, 0)))
  stall.add(meshBox(new THREE.Vector3(4.35, 0.28, 0.45), wood, new THREE.Vector3(0, 1.5, 1.05)))
  const jarMat = pbrMaterial('chicha-ceramic', '#963d26', '#32140d', 0.22, 1.4, true)
  for (const x of [-1.25, 0, 1.25]) {
    const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.34, 0.78, 32), jarMat)
    jar.position.set(x, 1.98, 0.72)
    jar.castShadow = true
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.39, 0.06, 10, 32), jarMat)
    rim.position.set(x, 2.39, 0.72)
    rim.rotation.x = Math.PI / 2
    rim.castShadow = true
    stall.add(jar, rim)
  }
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.76), new THREE.MeshStandardMaterial({ map: signTexture('CHICHA', 'RECETA LOCAL'), roughness: 0.85, side: THREE.DoubleSide }))
  sign.position.set(0, 2.72, 1.06)
  sign.rotation.y = Math.PI
  stall.add(sign)
  stall.position.set(17, 0, -14)
  return stall
}

function createAdobeHomes(): THREE.Group {
  const group = new THREE.Group()
  const adobe = pbrMaterial('adobe-wall', '#b97849', '#56301b', 0.98, 4)
  const plaster = pbrMaterial('lime-plaster', '#d7b27a', '#775b3b', 0.88, 3)
  const wood = pbrMaterial('roof-beam', '#553521', '#1f120a', 0.9, 2)
  for (const [x, z, w, d, h] of [[-30, 22, 9, 6, 3.5], [28, -25, 10, 7, 3.1], [30, 8, 7, 5, 3.4]] as const) {
    const home = new THREE.Group()
    home.position.set(x, 0, z)
    home.add(meshBox(new THREE.Vector3(w, h, d), adobe, new THREE.Vector3(0, h / 2, 0)))
    home.add(meshBox(new THREE.Vector3(w + 0.25, 0.24, d + 0.25), plaster, new THREE.Vector3(0, h + 0.12, 0)))
    for (const beamX of [-w * 0.3, 0, w * 0.3]) home.add(meshBox(new THREE.Vector3(0.2, 0.22, d + 0.35), wood, new THREE.Vector3(beamX, h + 0.28, 0)))
    const door = meshBox(new THREE.Vector3(1.25, 2.05, 0.09), wood, new THREE.Vector3(0, 1.02, d / 2 + 0.05))
    home.add(door)
    group.add(home)
  }
  return group
}

function createAcequia(): THREE.Group {
  const group = new THREE.Group()
  const stone = pbrMaterial('acequia-stone', '#8a7862', '#332a20', 0.9, 3)
  const water = new THREE.MeshPhysicalMaterial({ color: '#4d9c9e', roughness: 0.1, metalness: 0.02, transmission: 0.35, thickness: 0.18, ior: 1.333, clearcoat: 0.65, clearcoatRoughness: 0.08, normalMap: normalTexture(512), normalScale: new THREE.Vector2(0.22, 0.22) })
  const channel = meshBox(new THREE.Vector3(38, 0.34, 2.8), stone, new THREE.Vector3(0, 0.2, 25))
  const waterMesh = new THREE.Mesh(new THREE.PlaneGeometry(37.2, 1.7, 48, 4), water)
  waterMesh.rotation.x = -Math.PI / 2
  waterMesh.position.set(0, 0.42, 25)
  waterMesh.receiveShadow = true
  group.add(channel, waterMesh)
  return group
}

export class Arena {
  readonly scene = new THREE.Scene()
  readonly sun: THREE.DirectionalLight
  readonly start = new THREE.Vector3(-17, 0, 15)
  readonly chicha = new THREE.Vector3(17, 0, -14)
  private readonly animated: THREE.Object3D[] = []

  constructor(shadowMapSize: number) {
    this.scene.background = new THREE.Color('#f4b56d')
    this.scene.fog = new THREE.Fog('#d88c5f', 82, 175)

    const sky = new THREE.Mesh(new THREE.SphereGeometry(145, 64, 32), new THREE.MeshBasicMaterial({ map: skyTexture(), side: THREE.BackSide, depthWrite: false }))
    this.scene.add(sky)
    this.scene.add(new THREE.HemisphereLight('#ffe2bd', '#6c4836', 1.55))
    this.sun = new THREE.DirectionalLight('#fff0d0', 3.25)
    this.sun.position.set(-35, 42, 18)
    this.sun.castShadow = true
    this.sun.shadow.mapSize.set(shadowMapSize, shadowMapSize)
    this.sun.shadow.camera.left = -62
    this.sun.shadow.camera.right = 62
    this.sun.shadow.camera.top = 62
    this.sun.shadow.camera.bottom = -62
    this.sun.shadow.camera.near = 1
    this.sun.shadow.camera.far = 145
    this.sun.shadow.bias = -0.00015
    this.scene.add(this.sun, this.sun.target)

    this.scene.add(this.createTerrain())
    this.createRoads()
    this.scene.add(createStartMarker(), createChichaStall(), createFlags(), createAdobeHomes(), createAcequia())
    for (const tree of [createTree(-33, -19, 1.3), createTree(-27, 32, 0.9), createTree(34, 22, 1.1), createTree(35, -3, 0.82), createTree(-4, -29, 1.35)]) this.scene.add(tree)
    for (const cactus of [createCactus(-38, 15, 1.1), createCactus(-30, -8, 0.9), createCactus(28, 30, 1.1), createCactus(38, -25, 0.8), createCactus(4, 35, 0.75)]) this.scene.add(cactus)
    this.createParkour().forEach(object => this.scene.add(object))
  }

  private createTerrain(): THREE.Mesh {
    const size = 112
    const segments = 96
    const geometry = new THREE.PlaneGeometry(size, size, segments, segments)
    geometry.rotateX(-Math.PI / 2)
    const positions = geometry.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < positions.count; i += 1) {
      const x = positions.getX(i)
      const z = positions.getZ(i)
      positions.setY(i, Math.sin(x * 0.13) * 0.15 + Math.cos(z * 0.16) * 0.1 + Math.sin((x + z) * 0.07) * 0.08)
    }
    positions.needsUpdate = true
    geometry.computeVertexNormals()
    const material = pbrMaterial('piura-ground', '#b87b48', '#4e2e1b', 0.96, 8)
    material.normalScale = new THREE.Vector2(0.48, 0.48)
    const mesh = new THREE.Mesh(geometry, material)
    mesh.receiveShadow = true
    return mesh
  }

  private createRoads(): void {
    const road = pbrMaterial('dust-road', '#9f6945', '#482b1b', 0.99, 7)
    const dust = pbrMaterial('dry-lot', '#c18d57', '#684020', 0.98, 5)
    for (const [x, z, sx, sz] of [[0, 0, 9, 112], [0, 0, 112, 8], [-18, 15, 31, 3.2], [18, -14, 3.2, 31]] as const) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, 0.045, sz, 4, 1, 12), road)
      mesh.position.set(x, 0.02, z)
      mesh.receiveShadow = true
      this.scene.add(mesh)
    }
    for (const [x, z, sx, sz] of [[-27, 10, 12, 7], [25, -21, 13, 8], [27, 13, 10, 7]] as const) {
      const lot = new THREE.Mesh(new THREE.BoxGeometry(sx, 0.05, sz, 5, 1, 5), dust)
      lot.position.set(x, 0.025, z)
      lot.receiveShadow = true
      this.scene.add(lot)
    }
  }

  private createParkour(): THREE.Object3D[] {
    const result: THREE.Object3D[] = []
    const material = pbrMaterial('parkour-clay', '#bd7547', '#5a2b1c', 0.9, 2.2)
    for (let i = 0; i < 5; i += 1) {
      const step = meshBox(new THREE.Vector3(2.4, 0.5 + i * 0.18, 2.4), material, new THREE.Vector3(-4 + i * 2.8, 0.25 + i * 0.09, 10 - i * 1.5))
      result.push(step)
    }
    const ramp = new THREE.Mesh(new THREE.BoxGeometry(7, 0.45, 2.8, 4, 2, 4), material)
    ramp.position.set(8, 0.25, 9)
    ramp.rotation.z = -0.13
    ramp.castShadow = true
    ramp.receiveShadow = true
    result.push(ramp)
    const archMat = pbrMaterial('arch-sandstone', '#d0a45f', '#714820', 0.86, 2.5)
    result.push(meshBox(new THREE.Vector3(0.8, 3.2, 0.8), archMat, new THREE.Vector3(4, 1.6, 5)), meshBox(new THREE.Vector3(0.8, 3.2, 0.8), archMat, new THREE.Vector3(10, 1.6, 5)), meshBox(new THREE.Vector3(6.8, 0.55, 0.8), archMat, new THREE.Vector3(7, 3.2, 5)))
    return result
  }

  update(time: number): void {
    for (const object of this.animated) object.rotation.z = Math.sin(time * 1.5 + object.position.x) * 0.03
  }
}
