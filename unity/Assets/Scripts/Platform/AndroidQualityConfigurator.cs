using UnityEngine;

namespace BurritoChichero
{
    public enum AndroidQualityTier
    {
        Low,
        Medium,
        High
    }

    public static class AndroidQualityConfigurator
    {
        public static AndroidQualityTier RecommendForDevice()
        {
            int ramMb = SystemInfo.systemMemorySize;
            int gpuMb = SystemInfo.graphicsMemorySize;

            if (ramMb >= 8000 && gpuMb >= 2048)
                return AndroidQualityTier.High;

            if (ramMb >= 5000 && gpuMb >= 1024)
                return AndroidQualityTier.Medium;

            return AndroidQualityTier.Low;
        }

        public static void Apply(AndroidQualityTier tier)
        {
            QualitySettings.vSyncCount = 0;
            QualitySettings.maxQueuedFrames = 2;
            QualitySettings.anisotropicFiltering = AnisotropicFiltering.Enable;

            switch (tier)
            {
                case AndroidQualityTier.High:
                    Application.targetFrameRate = 60;
                    QualitySettings.SetQualityLevel(Mathf.Min(4, QualitySettings.names.Length - 1), true);
                    QualitySettings.shadows = ShadowQuality.All;
                    QualitySettings.shadowResolution = ShadowResolution.Medium;
                    QualitySettings.shadowDistance = 55f;
                    QualitySettings.antiAliasing = 2;
                    QualitySettings.masterTextureLimit = 0;
                    break;

                case AndroidQualityTier.Medium:
                    Application.targetFrameRate = 45;
                    QualitySettings.SetQualityLevel(Mathf.Min(2, QualitySettings.names.Length - 1), true);
                    QualitySettings.shadows = ShadowQuality.HardOnly;
                    QualitySettings.shadowResolution = ShadowResolution.Low;
                    QualitySettings.shadowDistance = 30f;
                    QualitySettings.antiAliasing = 2;
                    QualitySettings.masterTextureLimit = 0;
                    break;

                default:
                    Application.targetFrameRate = 30;
                    QualitySettings.SetQualityLevel(0, true);
                    QualitySettings.shadows = ShadowQuality.HardOnly;
                    QualitySettings.shadowResolution = ShadowResolution.Low;
                    QualitySettings.shadowDistance = 16f;
                    QualitySettings.antiAliasing = 0;
                    QualitySettings.masterTextureLimit = 1;
                    break;
            }
        }
    }
}
