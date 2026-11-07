using System;
using UnityEngine;

namespace BurritoChichero
{
    public enum BurritoAccessory
    {
        None,
        Bandana,
        Hat
    }

    [Serializable]
    public sealed class BurritoProfile
    {
        [SerializeField] private string displayName = "Chicherito";
        [SerializeField] private Color color = new Color32(0xD9, 0x7D, 0x4F, 0xFF);
        [SerializeField] private BurritoAccessory accessory = BurritoAccessory.Bandana;

        public string DisplayName => displayName;
        public Color Color => color;
        public BurritoAccessory Accessory => accessory;

        public BurritoProfile()
        {
        }

        public BurritoProfile(string name, Color playerColor, BurritoAccessory playerAccessory)
        {
            Set(name, playerColor, playerAccessory);
        }

        public void Set(string name, Color playerColor, BurritoAccessory playerAccessory)
        {
            displayName = string.IsNullOrWhiteSpace(name)
                ? "Chicherito"
                : name.Trim().Substring(0, Math.Min(name.Trim().Length, 18));

            color = playerColor;
            accessory = playerAccessory;
        }
    }
}
