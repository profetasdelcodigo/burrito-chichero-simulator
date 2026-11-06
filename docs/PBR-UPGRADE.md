# Mejora PBR de la Beta 0.4

La arena ahora usa materiales físicos de Three.js con mapas separados de color, rugosidad y normales. El terreno tiene 96 subdivisiones por lado, variación de altura y repetición de textura; los caminos, lotes y parkour tienen materiales PBR propios.

El puesto de chicha incorpora madera con microdetalle, adobe, techo, cerámicas con clearcoat y aros de los cántaros. Las casas usan adobe, revoque y vigas. La acequia tiene un canal de piedra y una superficie de agua con `MeshPhysicalMaterial`, transmisión, índice de refracción y clearcoat. Los algarrobos, cactus, banderines y marcador INICIO también usan materiales con roughness y normal maps.

La iluminación mantiene sombras reales del `DirectionalLight`, `ACESFilmicToneMapping`, bloom en calidad alta, niebla atmosférica y color space sRGB. No se añadió peso artificial al APK: los mapas se generan en runtime para mantener una beta móvil ligera.

## Próximo salto de calidad

Para alcanzar un aspecto realmente cercano a un juego AAA hay que sustituir estos props por GLB de alta poligonización con texturas 2K/4K, HDRI, LOD y captura fotogramétrica autorizada. Esa generación de modelos 3D es una operación de pago y no se lanzó automáticamente. Los assets se pueden incorporar por zonas sin rehacer el mapa completo.
