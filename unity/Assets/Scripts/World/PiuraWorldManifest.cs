using System;
using System.Collections.Generic;
using UnityEngine;

namespace BurritoChichero
{
    [CreateAssetMenu(
        fileName = "PiuraWorldManifest",
        menuName = "Burrito Chichero/World Content Manifest"
    )]
    public sealed class PiuraWorldManifest : ScriptableObject
    {
        [Serializable]
        public sealed class PrefabEntry
        {
            [Tooltip("Stable content key, for example environment.algarrobo.large.")]
            public string key;

            [Tooltip("An authored and reviewed Unity prefab. Do not use placeholder primitives in production.")]
            public GameObject prefab;
        }

        [SerializeField] private List<PrefabEntry> prefabs = new List<PrefabEntry>();

        public bool TryGetPrefab(string key, out GameObject prefab)
        {
            for (int i = 0; i < prefabs.Count; i++)
            {
                PrefabEntry entry = prefabs[i];
                if (entry != null && string.Equals(entry.key, key, StringComparison.Ordinal))
                {
                    prefab = entry.prefab;
                    return prefab != null;
                }
            }

            prefab = null;
            return false;
        }
    }
}
