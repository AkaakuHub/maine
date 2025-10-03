using UnityEngine;
using UnityEngine.XR;

public class VRTheaterManager : MonoBehaviour
{
    [Header("Scene Setup")]
    [SerializeField]
    private readonly GameObject theaterEnvironment;

    [SerializeField]
    private Transform screenTransform;

    [SerializeField]
    private Transform userSpawnPoint;

    [Header("Screen Settings")]
    [SerializeField]
    private readonly Vector3 screenPosition = new Vector3(0, 1.6f, -4);

    [SerializeField]
    private readonly Vector3 screenScale = new Vector3(3.2f, 1.8f, 0.01f);

    [SerializeField]
    private Material screenMaterial;

    [Header("Environment Settings")]
    [SerializeField]
    private bool createDarkEnvironment = true;

    [SerializeField]
    private readonly float sphereRadius = 10f;

    [SerializeField]
    private readonly Color environmentColor = Color.black;

    [Header("VR Settings")]
    [SerializeField]
    private bool enableVR = true;

    private GameObject screenObject;
    private GameObject environmentSphere;
    private GameObject vrRig;

    public static VRTheaterManager Instance { get; private set; }

    public Transform ScreenTransform => screenTransform;

    private void Awake()
    {
        if (Instance == null)
        {
            Instance = this;
            DontDestroyOnLoad(gameObject);
        }
        else
        {
            Destroy(gameObject);
        }
    }

    private void Start()
    {
        if (createDarkEnvironment)
        {
            InitializeEnvironment();
        }
        InitializeVR();
        CreateScreen();

        if (VRVideoPlayer.Instance != null)
        {
            var screenRenderer = screenObject?.GetComponent<Renderer>();
            VRVideoPlayer.Instance.SetScreenRenderer(screenRenderer);
        }
    }

    private void InitializeEnvironment()
    {
        if (createDarkEnvironment)
        {
            CreateDarkSphere();
        }

        if (userSpawnPoint == null)
        {
            var spawnPoint = new GameObject("UserSpawnPoint");
            userSpawnPoint = spawnPoint.transform;
            userSpawnPoint.position = Vector3.zero;
            userSpawnPoint.rotation = Quaternion.identity;
        }
    }

    private void CreateDarkSphere()
    {
        environmentSphere = GameObject.CreatePrimitive(PrimitiveType.Sphere);
        environmentSphere.name = "TheaterEnvironment";
        environmentSphere.transform.position = Vector3.zero;
        environmentSphere.transform.localScale = Vector3.one * sphereRadius;

        var renderer = environmentSphere.GetComponent<Renderer>();

        var material = new Material(Shader.Find("Standard"));
        material.color = environmentColor;
        material.SetFloat("_Metallic", 0f);
        material.SetFloat("_Glossiness", 0f);

        renderer.material = material;
        renderer.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
        renderer.receiveShadows = false;

        var collider = environmentSphere.GetComponent<Collider>();
        if (collider != null)
        {
            Destroy(collider);
        }

        var scale = environmentSphere.transform.localScale;
        scale.x *= -1;
        environmentSphere.transform.localScale = scale;
    }

    private void InitializeVR()
    {
        if (enableVR && XRSettings.isDeviceActive)
        {
            Debug.Log("[VRTheaterManager] VR device detected: " + XRSettings.loadedDeviceName);
        }
        else if (enableVR)
        {
            Debug.LogWarning(
                "[VRTheaterManager] VR enabled but no VR device detected. Falling back to non-VR mode."
            );
            enableVR = false;
        }
    }

    private void CreateScreen()
    {
        // 既存のVideoScreenを探す
        screenObject = GameObject.Find("VideoScreen");

        if (screenObject == null)
        {
            Debug.LogWarning(
                "[VRTheaterManager] VideoScreen not found in scene. Creating new one."
            );
            screenObject = GameObject.CreatePrimitive(PrimitiveType.Plane);
            screenObject.name = "VideoScreen";
            screenObject.transform.position = screenPosition;
            screenObject.transform.localScale = screenScale;
            screenObject.transform.rotation = Quaternion.LookRotation(Vector3.forward);

            var renderer = screenObject.GetComponent<Renderer>();

            if (screenMaterial == null)
            {
                screenMaterial = new Material(Shader.Find("Standard"));
                screenMaterial.color = Color.white;
            }

            renderer.material = screenMaterial;
            renderer.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            renderer.receiveShadows = true;

            var collider = screenObject.GetComponent<Collider>();
            if (collider != null)
            {
                Destroy(collider);
            }
        }
        else
        {
            Debug.Log("[VRTheaterManager] Found existing VideoScreen.");
        }

        screenTransform = screenObject.transform;

        if (userSpawnPoint != null)
        {
            var lookDirection = (screenTransform.position - userSpawnPoint.position).normalized;
            userSpawnPoint.rotation = Quaternion.LookRotation(lookDirection);
        }
    }

    public void SetVideoUrl(string url)
    {
        if (VRVideoPlayer.Instance != null)
        {
            VRVideoPlayer.Instance.SetVideoPath(url);
        }
        else
        {
            Debug.LogWarning("[VRTheaterManager] VRVideoPlayer instance not found");
        }
    }

    public void PlayVideo()
    {
        if (VRVideoPlayer.Instance != null)
        {
            VRVideoPlayer.Instance.Play();
        }
    }

    public void PauseVideo()
    {
        if (VRVideoPlayer.Instance != null)
        {
            VRVideoPlayer.Instance.Pause();
        }
    }

    public void StopVideo()
    {
        if (VRVideoPlayer.Instance != null)
        {
            VRVideoPlayer.Instance.Stop();
        }
    }

    public void SeekTo(float progress)
    {
        if (VRVideoPlayer.Instance != null)
        {
            VRVideoPlayer.Instance.SeekTo(progress * VRVideoPlayer.Instance.Duration);
        }
    }

    public void SetVolume(float volume)
    {
        if (VRVideoPlayer.Instance != null)
        {
            VRVideoPlayer.Instance.SetVolume(volume);
        }
    }

    private void Update()
    {
        HandleInput();
    }

    private void HandleInput()
    {
        if (Input.GetKeyDown(KeyCode.Space))
        {
            if (VRVideoPlayer.Instance != null && VRVideoPlayer.Instance.IsPlaying)
            {
                PauseVideo();
            }
            else
            {
                PlayVideo();
            }
        }

        if (Input.GetKeyDown(KeyCode.S))
        {
            StopVideo();
        }

        if (Input.GetKeyDown(KeyCode.LeftArrow))
        {
            SeekTo(Mathf.Max(0, VRVideoPlayer.Instance.Progress - 0.1f));
        }

        if (Input.GetKeyDown(KeyCode.RightArrow))
        {
            SeekTo(Mathf.Min(1, VRVideoPlayer.Instance.Progress + 0.1f));
        }
    }

    private void OnDestroy()
    {
        if (environmentSphere != null)
        {
            Destroy(environmentSphere);
        }

        if (screenObject != null)
        {
            Destroy(screenObject);
        }

        if (screenMaterial != null)
        {
            Destroy(screenMaterial);
        }
    }

    private void OnDrawGizmos()
    {
        if (screenTransform != null)
        {
            Gizmos.color = Color.green;
            Gizmos.DrawWireCube(screenTransform.position, screenTransform.localScale);
        }

        if (userSpawnPoint != null)
        {
            Gizmos.color = Color.blue;
            Gizmos.DrawWireSphere(userSpawnPoint.position, 0.5f);
            Gizmos.DrawLine(
                userSpawnPoint.position,
                userSpawnPoint.position + userSpawnPoint.forward * 2f
            );
        }
    }
}
