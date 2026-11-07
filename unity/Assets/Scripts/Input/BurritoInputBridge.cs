using UnityEngine;

namespace BurritoChichero
{
    /// <summary>
    /// Stable input surface for on-screen joystick/buttons and gamepad adapters.
    /// Hook UI pointer callbacks to these public methods from the Unity scene.
    /// </summary>
    public sealed class BurritoInputBridge : MonoBehaviour
    {
        [SerializeField] private BurritoMotor motor;
        [SerializeField] private ThirdPersonCameraRig cameraRig;

        private void Reset()
        {
            motor = GetComponentInParent<BurritoMotor>();
        }

        public void SetMovement(Vector2 axis)
        {
            if (motor != null)
                motor.SetMoveInput(axis);
        }

        public void SetSprint(bool held)
        {
            if (motor != null)
                motor.SetSprint(held);
        }

        public void PressJump()
        {
            if (motor != null)
                motor.QueueJump();
        }

        public void AddLookDelta(Vector2 delta)
        {
            if (cameraRig != null)
                cameraRig.AddLookInput(delta);
        }

        public void ReleaseAll()
        {
            if (motor == null)
                return;

            motor.SetMoveInput(Vector2.zero);
            motor.SetSprint(false);
        }
    }
}
