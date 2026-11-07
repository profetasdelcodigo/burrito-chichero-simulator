using UnityEngine;

namespace BurritoChichero
{
    [RequireComponent(typeof(CharacterController))]
    public sealed class BurritoMotor : MonoBehaviour
    {
        [Header("References")]
        [SerializeField] private Transform cameraTransform;
        [SerializeField] private CharacterController controller;

        [Header("Movement")]
        [SerializeField, Min(0.1f)] private float walkSpeed = 6.4f;
        [SerializeField, Min(0.1f)] private float sprintSpeed = 9.2f;
        [SerializeField, Min(0.1f)] private float groundAcceleration = 22f;
        [SerializeField, Min(0.1f)] private float airAcceleration = 10f;
        [SerializeField, Min(0.1f)] private float stoppingAcceleration = 8f;
        [SerializeField, Min(0f)] private float jumpHeight = 1.85f;
        [SerializeField, Min(0.1f)] private float gravity = 21f;
        [SerializeField, Min(0f)] private float turnSharpness = 14f;

        private Vector2 moveInput;
        private Vector3 planarVelocity;
        private float verticalVelocity;
        private bool sprintHeld;
        private bool jumpQueued;

        public float PlanarSpeed => new Vector3(planarVelocity.x, 0f, planarVelocity.z).magnitude;
        public bool IsGrounded { get; private set; }

        private void Reset()
        {
            controller = GetComponent<CharacterController>();
        }

        private void Awake()
        {
            if (controller == null)
                controller = GetComponent<CharacterController>();

            IsGrounded = controller != null && controller.isGrounded;
        }

        /// <summary>Input is camera-relative and can be supplied by touch, gamepad or keyboard adapters.</summary>
        public void SetMoveInput(Vector2 value)
        {
            moveInput = Vector2.ClampMagnitude(value, 1f);
        }

        public void SetSprint(bool held)
        {
            sprintHeld = held;
        }

        public void QueueJump()
        {
            jumpQueued = true;
        }

        public void SetCamera(Transform cameraReference)
        {
            cameraTransform = cameraReference;
        }

        private void Update()
        {
            if (controller == null || !controller.enabled)
                return;

            float deltaTime = Time.deltaTime;
            IsGrounded = controller.isGrounded;

            Vector3 forward = cameraTransform != null ? cameraTransform.forward : transform.forward;
            forward.y = 0f;
            forward = forward.sqrMagnitude > 0.001f ? forward.normalized : Vector3.forward;
            Vector3 right = Vector3.Cross(Vector3.up, forward).normalized;

            Vector3 desiredDirection = right * moveInput.x + forward * moveInput.y;
            desiredDirection = Vector3.ClampMagnitude(desiredDirection, 1f);

            float maxSpeed = sprintHeld ? sprintSpeed : walkSpeed;
            Vector3 desiredVelocity = desiredDirection * maxSpeed;
            float acceleration = IsGrounded ? groundAcceleration : airAcceleration;

            if (desiredDirection.sqrMagnitude > 0.0025f)
            {
                planarVelocity = Vector3.MoveTowards(
                    planarVelocity,
                    desiredVelocity,
                    acceleration * deltaTime
                );

                Quaternion targetRotation = Quaternion.LookRotation(desiredDirection, Vector3.up);
                transform.rotation = Quaternion.Slerp(
                    transform.rotation,
                    targetRotation,
                    1f - Mathf.Exp(-turnSharpness * deltaTime)
                );
            }
            else
            {
                planarVelocity = Vector3.MoveTowards(
                    planarVelocity,
                    Vector3.zero,
                    stoppingAcceleration * deltaTime
                );
            }

            if (IsGrounded && verticalVelocity < 0f)
                verticalVelocity = -2f;

            if (jumpQueued && IsGrounded)
            {
                verticalVelocity = Mathf.Sqrt(2f * gravity * jumpHeight);
                IsGrounded = false;
            }

            jumpQueued = false;
            verticalVelocity -= gravity * deltaTime;

            Vector3 frameVelocity = planarVelocity + Vector3.up * verticalVelocity;
            controller.Move(frameVelocity * deltaTime);
            IsGrounded = controller.isGrounded;

            if (IsGrounded && verticalVelocity < 0f)
                verticalVelocity = -2f;
        }

        public void Teleport(Vector3 position, Quaternion rotation)
        {
            if (controller == null)
                return;

            controller.enabled = false;
            transform.SetPositionAndRotation(position, rotation);
            planarVelocity = Vector3.zero;
            verticalVelocity = 0f;
            jumpQueued = false;
            controller.enabled = true;
        }
    }
}
