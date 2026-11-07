# Burrito Chichero Simulator · Unity Android

This folder is the native-game migration track. The current Vite/Three.js/Capacitor beta remains untouched until the Unity version reaches feature parity and passes device tests.

## Engine decision

- Engine: Unity 6.3 LTS
- Gameplay language: C#
- Android renderer: Universal Render Pipeline (URP), with scalable mobile quality profiles
- Input: Unity Input System, with a shared input adapter for touch UI and game controllers
- Camera: third-person follow/orbit rig (Cinemachine can replace the adapter later)
- Content delivery: Addressables / Google Play Asset Delivery for large world and optional content packs
- Backend: preserve Supabase identity/data and Cloudflare room service behind C# interfaces; do not couple gameplay to the network.

Unity recommends LTS for projects locking production to a stable release. Unity 6.3 LTS is supported through December 2027. See https://unity.com/releases/unity-6/support.

## Current migration status

This is a migration foundation, not a finished game or a verified Unity build. It contains gameplay-domain scripts ported from the existing beta's movement, profile and first mission. Scenes, prefabs, production character assets, environment art, animation retargeting, shaders, audio and Android builds still need to be authored/imported and validated in the Unity Editor.

## Create/open the project

1. Install Unity 6.3 LTS using Unity Hub, including Android Build Support, Android SDK & NDK Tools, and OpenJDK.
2. Open this `unity/` directory as a Unity project. Let the Editor create its generated project metadata.
3. Add the Universal Render Pipeline through Package Manager and create a URP asset tuned for Android. Do not use HDRP for the Android target.
4. Add the Input System and Addressables packages through Package Manager.
5. Create the scenes and prefabs described below, then attach the scripts to their scene objects.
6. Build an Android Development APK and test on a physical phone before creating the release AAB.

## Gameplay systems in this migration

- `BurritoMotor`: camera-relative acceleration, sprint, jump, gravity and CharacterController movement.
- `BurritoProfile`: player identity, palette and accessory selection.
- `BurritoAnimatorDriver`: animation parameters for an authored humanoid/quadruped rig.
- `ThirdPersonCameraRig`: smoothed follow camera and touch/gamepad orbit input.
- `MissionProgress`: the original first objective chain, separated from the renderer and UI.
- `PiuraWorldManifest`: references to manually authored environment prefabs. It deliberately does not generate placeholder scenery.

## Art direction and asset policy

The visual target is grounded, handcrafted realism, not a collection of synthetic-looking assets:

- Model the burrito character, props, stalls, houses, roads, vegetation and landmarks as authored 3D assets. Retopologize and UV unwrap production meshes.
- Use physically based materials with coherent albedo, normal, roughness/smoothness and ambient-occlusion maps.
- Use real reference photography and measured proportions for the Piura environment. Do not reproduce private homes or identifiable people without permission.
- No AI-generated images, meshes, textures, logos, UI, animation or audio are accepted as final production assets. The existing GLB and cover art must be reviewed before reuse; their current provenance is not established by this migration.
- Keep a consistent art bible, scale guide, texel density, palette, lighting reference and naming convention.

## Proposed Android content budget

Target approximately 2 GB installed content, measured after compression and download, not 2 GB of empty files:

| Content group | Planning budget |
| --- | ---: |
| Base client, code, UI, shared shaders and common assets | 350 MB |
| Main Piura world: terrain, roads, architecture, vegetation and props | 850 MB |
| Character, outfits, rigs, animation and VFX | 300 MB |
| Audio, ambience, music and voice | 180 MB |
| High-resolution optional texture / cinematic pack | 320 MB |
| **Target total** | **2,000 MB** |

These are planning ceilings, not measured asset sizes. Keep the base install lean; deliver large content in separate packs. Google Play currently documents a 500 MB limit for the base module, up to 1.5 GB per asset pack, and larger cumulative limits for delivered packs. Exact limits are based on compressed download size and must be rechecked in Play Console before release: https://support.google.com/googleplay/android-developer/answer/9859372.

## Visual quality and performance targets

- Android baseline: stable 30 FPS on supported low tier; 60 FPS target on capable devices.
- URP, ASTC texture compression where device support permits, baked lighting for static architecture, selective realtime shadows, LOD groups, occlusion culling and GPU instancing.
- 1K/2K textures as the normal case; 4K only for hero assets where visible quality benefits justify memory use.
- Character animation uses authored clips and a clean rig; no procedural bobbing as a substitute for real animation.
- Provide Low / Medium / High quality profiles and a thermal/performance fallback.
- Profile on physical Android devices. Editor FPS is not an Android performance result.

## Exit criteria before deleting the web beta

Do not delete `src/`, `public/`, Vite, Three.js or Capacitor until all of these are true:

- Unity scenes and prefabs replace the title, customization, game HUD, world and pause/settings menus.
- Burrito locomotion, jump, interaction, mission progress, save/load and touch controls match or exceed the beta.
- The character and world assets are licensed, reviewed, optimized and imported into Unity.
- Android install, cold start, offline play, save persistence, audio, orientation, suspend/resume and thermal behavior pass device tests.
- Multiplayer is ported and tested separately; the old client-authoritative snapshots must not be treated as anti-cheat or server-authoritative gameplay.
- A signed release AAB and a sideloadable APK both build successfully.

Only then should the web runtime be removed in a dedicated cleanup pull request.
