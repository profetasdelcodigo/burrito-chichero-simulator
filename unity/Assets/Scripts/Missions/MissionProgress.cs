using System;
using UnityEngine;

namespace BurritoChichero
{
    public enum MissionPhase
    {
        ReachStart,
        FindChichaStall,
        Completed
    }

    public sealed class MissionProgress : MonoBehaviour
    {
        [SerializeField] private MissionPhase phase = MissionPhase.ReachStart;

        public MissionPhase Phase => phase;
        public event Action<MissionPhase> PhaseChanged;

        public string ObjectiveText => phase switch
        {
            MissionPhase.ReachStart => "Llega al punto INICIO",
            MissionPhase.FindChichaStall => "Busca la mesa de CHICHA",
            MissionPhase.Completed => "¡Actividad completada! La jarra está lista",
            _ => string.Empty
        };

        public string ProgressText => phase switch
        {
            MissionPhase.ReachStart => "0/2",
            MissionPhase.FindChichaStall => "1/2",
            MissionPhase.Completed => "2/2",
            _ => "0/2"
        };

        public void ReachStartPoint()
        {
            if (phase != MissionPhase.ReachStart)
                return;

            SetPhase(MissionPhase.FindChichaStall);
        }

        public bool InteractWithChichaStall()
        {
            if (phase != MissionPhase.FindChichaStall)
                return false;

            SetPhase(MissionPhase.Completed);
            return true;
        }

        public void ResetMission()
        {
            SetPhase(MissionPhase.ReachStart);
        }

        private void SetPhase(MissionPhase next)
        {
            if (phase == next)
                return;

            phase = next;
            PhaseChanged?.Invoke(phase);
        }
    }
}
