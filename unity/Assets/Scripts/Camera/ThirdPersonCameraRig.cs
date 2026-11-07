using UnityEngine;

namespace BurritoChichero
{
    public sealed class ThirdPersonCameraRig : MonoBehaviour
    {
        [SerializeField] private Transform target;
        [SerializeField] private Vector3 followOffset = new Vector3(0f, 2.8f, -5.3f);
        [SerializeField, Range(1f, 30f)] private float followSharpness = 14f;
        [SerializeField, Range(1f, 30f)] private float rotationSharpness = 18f;
        [SerializeField] private float lookSensitivity = 0.16f;
        [SerializeField] private float minPitch = -12f;
        [SerializeField] private float maxPitch = 58f;
        [SerializeField] private float yaw;
        [SerializeField] private float pitch = 15f;

        public Transform Target
        {
            get => target;
            set => target = value;
        }

        public void AddLookInput(Vector2 delta)
        {
            yaw += delta.x * lookSensitivity;
            pitch = Mathf.Clamp(pitch - delta.y * lookSensitivity, minPitch, maxPitch);
        }

        private void LateUpdate()
        {
            if (target == null)
                return;

            Quaternion desiredRotation = Quaternion.Euler(pitch, yaw, 0f);
            Vector3 desiredPosition = target.position + desiredRotation * followOffset;
            float positionBlend = 1f - Mathf.Exp(-followSharpness * Time.deltaTime);
            float rotationBlend = 1f - Mathf.Exp(-rotationSharpness * Time.deltaTime);

            transform.position = Vector3.Lerp(transform.position, desiredPosition, positionBlend);

            Vector3 lookDirection = target.position + Vector3.up * 1.1f - transform.position;
            if (lookDirection.sqrMagnitude > 0.001f)
            {
                Quaternion lookRotation = Quaternion.LookRotation(lookDirection.normalized, Vector3.up);
                transform.rotation = Quaternion.Slerp(transform.rotation, lookRotation, rotationBlend);
            }
        }
    }
}
