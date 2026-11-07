# Unity scene assembly checklist

The migration deliberately does not create primitive scenery as final art. Build and review the following scenes in the Unity Editor using authored assets:

1. **Boot**: platform initialization, save loading, quality selection and content catalog.
2. **MainMenu**: 3D hero-character presentation, camera turntable, cinematic background, profile/customization panel, Play and Settings.
3. **Piura_LaLegua_01**: terrain, road network, authored buildings, algarrobo/cactus vegetation, chicha stall, lighting probes, occlusion and baked lightmaps.
4. **Loading**: asynchronous scene/content-pack transition with real download progress.
5. **Pause**: resume, audio, graphics, controls and leave options.

## Player prefab

- Root: CharacterController, BurritoMotor, BurritoInputBridge.
- Visual child: reviewed burrito model, Animator, BurritoAnimatorDriver, authored skinned mesh and materials.
- Accessory sockets: bandana, hat and future cosmetic attachment points.
- Animation Controller: idle, walk, run, jump, fall, land, interaction and emotes. Use a Blend Tree for locomotion.
- The visual model must use a clean production rig; the controller root must not be parented to a deforming bone.

## Camera prefab

- Camera with ThirdPersonCameraRig.
- Assign the burrito root as Target and its transform to the motor's camera reference.
- Add collision avoidance before shipping; the basic follow rig in this migration does not yet prevent clipping through walls.

## World prefab standards

Use authored mesh colliders or simplified collision proxies, LOD Groups, static batching where appropriate, light probes, reflection probes and occlusion settings. Avoid one enormous mesh for the entire environment. Split world content into addressable districts and test memory while travelling between them.

## UI wiring

- Use Unity UI Toolkit or UGUI, not HTML/CSS/DOM.
- Build the joystick and buttons as accessible, scalable touch controls with safe-area support.
- Route touch events to BurritoInputBridge.
- Keep HUD, main menu and customization data-driven; do not hard-code UI values into gameplay scripts.

These are setup instructions, not proof that scenes, prefabs or builds already exist.
