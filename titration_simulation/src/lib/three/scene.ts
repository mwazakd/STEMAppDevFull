import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { ChemistryEngine } from '../chemistry/engine'
import { getIndicatorColor } from '../chemistry/indicator'

export class TitrationScene {
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private container: HTMLElement
  private chemistryEngine: ChemistryEngine
  private liquidMesh?: THREE.Mesh
  // private beakerMesh?: THREE.Group
  // private buretteMesh?: THREE.Group
  private dropletMeshes: THREE.Mesh[] = []
  private animationId?: number
  private mouse = new THREE.Vector2()
  // private raycaster = new THREE.Raycaster()
  private isDropping = false
  // private dropletSpawnTimer = 0
  private dropletSpawnInterval = 100 // ms

  constructor(container: HTMLElement, chemistryEngine: ChemistryEngine) {
    this.container = container
    this.chemistryEngine = chemistryEngine
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0xf0f0f0) // Light gray background
    this.camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100)
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    
    // Expose scene globally for debugging
    ;(window as any).threeScene = this.scene
    ;(window as any).THREE = THREE
    
    this.setupScene()
    this.setupLighting()
    this.setupControls()
    this.animate()
  }

  private setupScene(): void {
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.0
    this.container.appendChild(this.renderer.domElement)

    this.camera.position.set(0, 2, 5)
    this.camera.lookAt(0, 0, 0)

    // Try to load GLB model first, fallback to primitives
    this.loadGLTFModel()
  }

  private setupLighting(): void {
    // Ambient light - increased intensity
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0)
    this.scene.add(ambientLight)

    // Directional light - increased intensity
    const directionalLight = new THREE.DirectionalLight(0xffffff, 2.0)
    directionalLight.position.set(5, 10, 7)
    directionalLight.castShadow = true
    directionalLight.shadow.mapSize.width = 2048
    directionalLight.shadow.mapSize.height = 2048
    directionalLight.shadow.camera.near = 0.5
    directionalLight.shadow.camera.far = 50
    directionalLight.shadow.camera.left = -10
    directionalLight.shadow.camera.right = 10
    directionalLight.shadow.camera.top = 10
    directionalLight.shadow.camera.bottom = -10
    this.scene.add(directionalLight)

    // Point light for better illumination
    const pointLight = new THREE.PointLight(0xffffff, 1.0, 100)
    pointLight.position.set(-5, 5, 5)
    this.scene.add(pointLight)

    // Additional rim light
    const rimLight = new THREE.DirectionalLight(0xffffff, 0.8)
    rimLight.position.set(-5, 5, -5)
    this.scene.add(rimLight)
  }

  private loadGLTFModel(): void {
    const loader = new GLTFLoader()
    
    loader.load(
      '/src/assets/beaker_burette.glb',
      (gltf: any) => {
        console.log('GLB model loaded successfully!')
        ;(window as any).glbLoaded = true
        const root = gltf.scene
        
        // Find and add specific objects
        const beakerOuter = root.getObjectByName('Beaker_Outer')
        const liquid = root.getObjectByName('Liquid_Mesh')
        const burette = root.getObjectByName('Burette_Root')
        
        if (beakerOuter) {
          this.scene.add(beakerOuter)
          console.log('Added Beaker_Outer')
        }
        if (burette) {
          this.scene.add(burette)
          console.log('Added Burette_Root')
        }
        if (liquid) {
          liquid.position.y = 0.02
          this.scene.add(liquid)
          this.liquidMesh = liquid as THREE.Mesh
          console.log('Added Liquid_Mesh')
        }
        
        // Enable shadows for all objects
        root.traverse((child: any) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true
            child.receiveShadow = true
          }
        })
      },
      (progress: any) => {
        console.log('Loading progress:', (progress.loaded / progress.total * 100) + '%')
      },
      (error: any) => {
        console.warn('GLB model failed to load, using fallback primitives:', error)
        this.createBeaker()
        this.createBurette()
        this.createLiquid()
      }
    )
  }

  private createBeaker(): void {
    // Outer beaker (glass)
    const outerGeometry = new THREE.CylinderGeometry(0.5, 0.5, 1.8, 32, 1, true)
    const glassMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.3,
      roughness: 0.1,
      metalness: 0.0,
      transmission: 0.7,
      thickness: 0.01
    })
    const outerBeaker = new THREE.Mesh(outerGeometry, glassMaterial)
    outerBeaker.position.y = 0.9
    outerBeaker.castShadow = true
    outerBeaker.receiveShadow = true
    this.scene.add(outerBeaker)

    // Inner beaker (for liquid containment)
    const innerGeometry = new THREE.CylinderGeometry(0.48, 0.48, 1.76, 32)
    const innerMaterial = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.0
    })
    const innerBeaker = new THREE.Mesh(innerGeometry, innerMaterial)
    innerBeaker.position.y = 0.9
    this.scene.add(innerBeaker)
  }

  private createBurette(): void {
    // Burette body
    const bodyGeometry = new THREE.CylinderGeometry(0.05, 0.05, 2.0, 16)
    const glassMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.1,
      roughness: 0.1,
      metalness: 0.0,
      transmission: 0.9
    })
    const buretteBody = new THREE.Mesh(bodyGeometry, glassMaterial)
    buretteBody.position.set(-0.8, 2.0, 0)
    buretteBody.castShadow = true
    this.scene.add(buretteBody)

    // Burette spout
    const spoutGeometry = new THREE.CylinderGeometry(0.01, 0.01, 0.2, 8)
    const spout = new THREE.Mesh(spoutGeometry, glassMaterial)
    spout.position.set(-0.8, 0.5, 0.3)
    spout.rotation.x = Math.PI / 4
    spout.castShadow = true
    this.scene.add(spout)

    // Stopcock
    const stopcockGeometry = new THREE.BoxGeometry(0.08, 0.08, 0.08)
    const stopcockMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 })
    const stopcock = new THREE.Mesh(stopcockGeometry, stopcockMaterial)
    stopcock.position.set(-0.8, 0.5, 0)
    stopcock.castShadow = true
    this.scene.add(stopcock)
  }

  private createLiquid(): void {
    const liquidGeometry = new THREE.CylinderGeometry(0.48, 0.48, 0.01, 32)
    const liquidMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffc0cb,
      transparent: true,
      opacity: 0.8,
      roughness: 0.1,
      metalness: 0.0
    })
    this.liquidMesh = new THREE.Mesh(liquidGeometry, liquidMaterial)
    this.liquidMesh.position.y = 0.1
    this.liquidMesh.receiveShadow = true
    this.scene.add(this.liquidMesh)
  }

  private setupControls(): void {
    // Mouse/touch controls
    this.container.addEventListener('click', this.onClick.bind(this))
    this.container.addEventListener('touchstart', this.onTouch.bind(this))
    this.container.addEventListener('mousemove', this.onMouseMove.bind(this))
    
    // Keyboard controls
    window.addEventListener('keydown', this.onKeyDown.bind(this))
  }

  private onClick(): void {
    this.startDropping()
  }

  private onTouch(event: TouchEvent): void {
    event.preventDefault()
    this.startDropping()
  }

  private onMouseMove(event: MouseEvent): void {
    const rect = this.container.getBoundingClientRect()
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
  }

  private onKeyDown(event: KeyboardEvent): void {
    if (event.code === 'Space') {
      event.preventDefault()
      this.startDropping()
    }
  }

  private startDropping(): void {
    if (!this.isDropping) {
      this.isDropping = true
      this.dropDroplet()
    }
  }

  private dropDroplet(): void {
    if (!this.isDropping) return

    // Create droplet
    const dropletGeometry = new THREE.SphereGeometry(0.02, 8, 8)
    const dropletMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x4a90e2,
      transparent: true,
      opacity: 0.8,
      roughness: 0.1,
      metalness: 0.0
    })
    const droplet = new THREE.Mesh(dropletGeometry, dropletMaterial)
    droplet.position.set(-0.8, 1.5, 0)
    droplet.castShadow = true
    this.scene.add(droplet)
    this.dropletMeshes.push(droplet)

    // Animate droplet falling
    this.animateDroplet(droplet)
  }

  private animateDroplet(droplet: THREE.Mesh): void {
    const startY = droplet.position.y
    const targetY = 0.1
    const duration = 1000 // ms
    const startTime = Date.now()

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      
      // Easing function for realistic fall
      const easeProgress = 1 - Math.pow(1 - progress, 3)
      droplet.position.y = startY - (startY - targetY) * easeProgress
      
      // Add slight horizontal movement
      droplet.position.x = -0.8 + (0.8 * progress * 0.1)
      
      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        // Droplet hits liquid
        this.onDropletHit()
        this.scene.remove(droplet)
        const index = this.dropletMeshes.indexOf(droplet)
        if (index > -1) {
          this.dropletMeshes.splice(index, 1)
        }
      }
    }
    
    animate()
  }

  private onDropletHit(): void {
    // Add droplet to chemistry engine
    this.chemistryEngine.addDroplet('NaOH', 0.1) // 0.1M NaOH
    
    // Update liquid appearance
    this.updateLiquidAppearance()
    
    // Continue dropping if still active
    if (this.isDropping) {
      setTimeout(() => {
        this.dropDroplet()
      }, this.dropletSpawnInterval)
    }
  }

  private updateLiquidAppearance(): void {
    if (!this.liquidMesh) return

    const pH = this.chemistryEngine.getCurrentPH()
    const color = getIndicatorColor(pH, 'phenolphthalein')
    
    // Update liquid color
    const material = this.liquidMesh.material as THREE.MeshPhysicalMaterial
    material.color.setRGB(color.r, color.g, color.b)
    material.opacity = color.a

    // Update liquid height
    const height = this.chemistryEngine.getVolumeHeight(0.48) // beaker radius
    this.liquidMesh.scale.y = Math.max(0.1, height * 10) // scale factor
  }

  public stopDropping(): void {
    this.isDropping = false
  }

  public reset(): void {
    this.chemistryEngine.reset()
    this.updateLiquidAppearance()
    
    // Remove all droplets
    this.dropletMeshes.forEach(droplet => {
      this.scene.remove(droplet)
    })
    this.dropletMeshes = []
  }

  public getChemistryEngine(): ChemistryEngine {
    return this.chemistryEngine
  }

  public resize(): void {
    const width = this.container.clientWidth
    const height = this.container.clientHeight
    
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height)
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(() => this.animate())
    
    // Rotate scene slightly for better view
    this.scene.rotation.y += 0.001
    
    this.renderer.render(this.scene, this.camera)
  }

  public dispose(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
    }
    
    this.renderer.dispose()
    this.container.removeChild(this.renderer.domElement)
  }
}
