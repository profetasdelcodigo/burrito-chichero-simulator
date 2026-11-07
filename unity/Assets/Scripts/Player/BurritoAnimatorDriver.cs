using UnityEngine;

namespace BurritoChichero
{
    [RequireComponent(typeof(Animator))]
    public sealed class BurritoAnimatorDriver : MonoBehaviour
    {
        private static readonly int SpeedHash = Animator.StringToHash("Speed");
        private static readonly int GroundedHash = Animator.StringToHash("Grounded");
        private static readonly int JumpHash = Animator.StringToHash("Jump");

        [SerializeField] private Animator animator;
        [SerializeField] private BurritoMotor motor;
        [SerializeField, Min(0.01f)] private float animationDamp = 0.12f;

        private void Reset()
        {
            animator = GetComponent<Animator>();
            motor = GetComponentInParent<BurritoMotor>();
        }

        private void Awake()
        {
            if (animator == null)
                animator = GetComponent<Animator>();

            if (motor == null)
                motor = GetComponentInParent<BurritoMotor>();
        }

        private void Update()
        {
            if (animator == null || motor == null)
                return;

            animator.SetFloat(SpeedHash, motor.PlanarSpeed, animationDamp, Time.deltaTime);
            animator.SetBool(GroundedHash, motor.IsGrounded);
            animator.SetBool(JumpHash, !motor.IsGrounded);
        }
    }
}
