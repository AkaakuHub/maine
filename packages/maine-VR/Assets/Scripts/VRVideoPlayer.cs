using System.Collections;
using UnityEngine;
using UnityEngine.Video;

public class VRVideoPlayer : MonoBehaviour
{
    [Header("Video Settings")]
    [SerializeField] private readonly string videoUrl = "https://example.com/video.mp4";
    [SerializeField] private Renderer screenRenderer;
    [SerializeField] private bool autoPlay = true;
    [SerializeField] private bool loop = true;

    [Header("Audio Settings")]
    [SerializeField] private float volume = 1.0f;
    [SerializeField] private readonly float spatialBlend = 0.0f;

    [Header("Video Quality")]
    [SerializeField] private readonly int renderTextureWidth = 1920;
    [SerializeField] private readonly int renderTextureHeight = 1080;

    [Header("Debug")]
    [SerializeField] private bool enableDebugLogs = true;

    private VideoPlayer videoPlayer;
    private RenderTexture renderTexture;
    public AudioSource audioSource;

    public static VRVideoPlayer Instance { get; private set; }

    public bool IsPlaying { get; private set; }
    public bool IsBuffering { get; private set; }
    public double CurrentTime => videoPlayer?.time ?? 0;
    public double Duration => videoPlayer?.length ?? 0;
    public float Progress => Duration > 0 ? (float)(CurrentTime / Duration) : 0;

    public event System.Action OnVideoStarted;
    public event System.Action OnVideoPaused;
    public event System.Action OnVideoEnded;
    public event System.Action<double> OnTimeUpdated;

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
        InitializeVideoPlayer();
        if (autoPlay)
        {
            PrepareAndPlay();
        }
    }

    private void Update()
    {
        if (videoPlayer != null && IsPlaying)
        {
            OnTimeUpdated?.Invoke(CurrentTime);
        }
    }

    private void InitializeVideoPlayer()
    {
        if (enableDebugLogs)
            Debug.Log("[VRVideoPlayer] Initializing video player...");

        videoPlayer = gameObject.AddComponent<VideoPlayer>();

        videoPlayer.playOnAwake = false;
        videoPlayer.source = VideoSource.Url;
        videoPlayer.url = videoUrl;
        videoPlayer.renderMode = VideoRenderMode.RenderTexture;
        videoPlayer.isLooping = loop;

        videoPlayer.audioOutputMode = VideoAudioOutputMode.AudioSource;

        audioSource = gameObject.AddComponent<AudioSource>();
        audioSource.playOnAwake = false;
        audioSource.volume = volume;
        audioSource.spatialBlend = spatialBlend;

        videoPlayer.SetTargetAudioSource(0, audioSource);

        renderTexture = new RenderTexture(renderTextureWidth, renderTextureHeight, 0);
        renderTexture.name = "VideoRenderTexture";
        videoPlayer.targetTexture = renderTexture;

        if (screenRenderer != null)
        {
            Material screenMaterial = screenRenderer.material;
            if (screenMaterial == null)
            {
                screenMaterial = new Material(Shader.Find("Standard"));
                screenRenderer.material = screenMaterial;
            }
            screenMaterial.mainTexture = renderTexture;
        }
        else
        {
            Debug.LogWarning("[VRVideoPlayer] Screen renderer not assigned!");
        }

        videoPlayer.prepareCompleted += OnVideoPrepared;
        videoPlayer.started += OnVideoStartedCallback;
        videoPlayer.loopPointReached += OnVideoLoopPointReached;

        if (enableDebugLogs)
            Debug.Log("[VRVideoPlayer] Video player initialized with URL: " + videoUrl);
    }

    public void PrepareAndPlay()
    {
        if (videoPlayer != null && !videoPlayer.isPrepared)
        {
            if (enableDebugLogs)
                Debug.Log("[VRVideoPlayer] Preparing video...");

            IsBuffering = true;
            videoPlayer.Prepare();
        }
        else if (videoPlayer != null && videoPlayer.isPrepared)
        {
            Play();
        }
    }

    public void Play()
    {
        if (videoPlayer != null && videoPlayer.isPrepared)
        {
            if (enableDebugLogs)
                Debug.Log("[VRVideoPlayer] Starting playback...");

            videoPlayer.Play();
            IsPlaying = true;
            IsBuffering = false;
        }
        else
        {
            Debug.LogWarning("[VRVideoPlayer] Cannot play: Video not prepared");
            PrepareAndPlay();
        }
    }

    public void Pause()
    {
        if (videoPlayer != null && IsPlaying)
        {
            if (enableDebugLogs)
                Debug.Log("[VRVideoPlayer] Pausing playback...");

            videoPlayer.Pause();
            IsPlaying = false;
            OnVideoPaused?.Invoke();
        }
    }

    public void Stop()
    {
        if (videoPlayer != null)
        {
            if (enableDebugLogs)
                Debug.Log("[VRVideoPlayer] Stopping playback...");

            videoPlayer.Stop();
            IsPlaying = false;
            IsBuffering = false;
        }
    }

    public void SeekTo(double time)
    {
        if (videoPlayer != null && videoPlayer.canSetTime)
        {
            if (enableDebugLogs)
                Debug.Log($"[VRVideoPlayer] Seeking to {time:F2} seconds");

            videoPlayer.time = Mathf.Max(0, Mathf.Min((float)time, (float)Duration));
        }
        else
        {
            Debug.LogWarning("[VRVideoPlayer] Cannot seek: VideoPlayer cannot set time");
        }
    }

    public void SetVideoUrl(string url)
    {
        if (!string.IsNullOrEmpty(url) && url != videoUrl)
        {
            if (videoPlayer != null)
            {
                Stop();
                videoPlayer.url = url;
                PrepareAndPlay();
            }
        }
    }

    public void SetVolume(float newVolume)
    {
        volume = Mathf.Clamp01(newVolume);
        if (audioSource != null)
        {
            audioSource.volume = volume;
        }
    }

    public void SetScreenRenderer(Renderer renderer)
    {
        screenRenderer = renderer;
        if (renderTexture != null && screenRenderer != null)
        {
            Material material = screenRenderer.material;
            if (material == null)
            {
                material = new Material(Shader.Find("Standard"));
                screenRenderer.material = material;
            }
            material.mainTexture = renderTexture;
        }
    }

    private void OnVideoPrepared(VideoPlayer source)
    {
        if (enableDebugLogs)
            Debug.Log($"[VRVideoPlayer] Video prepared. Duration: {source.length:F2} seconds");

        IsBuffering = false;

        if (autoPlay)
        {
            Play();
        }
    }

    private void OnVideoStartedCallback(VideoPlayer source)
    {
        if (enableDebugLogs)
            Debug.Log("[VRVideoPlayer] Video started playing");

        IsPlaying = true;
        OnVideoStarted?.Invoke();
    }

    private void OnVideoLoopPointReached(VideoPlayer source)
    {
        if (enableDebugLogs)
            Debug.Log("[VRVideoPlayer] Video loop point reached");

        if (!loop)
        {
            IsPlaying = false;
            OnVideoEnded?.Invoke();
        }
    }

    private void OnDestroy()
    {
        if (videoPlayer != null)
        {
            videoPlayer.prepareCompleted -= OnVideoPrepared;
            videoPlayer.started -= OnVideoStartedCallback;
            videoPlayer.loopPointReached -= OnVideoLoopPointReached;
        }

        if (renderTexture != null)
        {
            renderTexture.Release();
            Destroy(renderTexture);
        }
    }

    private void OnApplicationPause(bool pauseStatus)
    {
        if (pauseStatus && IsPlaying)
        {
            Pause();
        }
    }

    private void OnApplicationFocus(bool hasFocus)
    {
        if (!hasFocus && IsPlaying)
        {
            Pause();
        }
    }
}