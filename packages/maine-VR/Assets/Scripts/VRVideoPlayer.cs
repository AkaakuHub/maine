using UnityEngine;
using UnityEngine.Video;
using UnityEngine.Networking;
using System.Collections;
using System.Collections.Generic;

public class VRVideoPlayer : MonoBehaviour
{
    [Header("Video Settings")]
    [SerializeField] private string filePath = "";
    [SerializeField] private string apiBaseUrl = "http://localhost:3001";
    [SerializeField] private Renderer screenRenderer;
    [SerializeField] private bool autoPlay = true;
    [SerializeField] private bool loop = true;

    [Header("Audio Settings")]
    [SerializeField] [Range(0, 1)] private float volume = 1f;

    [Header("Video Quality")]
    [SerializeField] private int renderTextureWidth = 1920;
    [SerializeField] private int renderTextureHeight = 1080;

    [Header("Network Settings")]
    [SerializeField] private float connectionTimeout = 30f;
    [SerializeField] private bool useExactMatch = true;

    private VideoPlayer videoPlayer;
    private RenderTexture renderTexture;
    public AudioSource audioSource;
    private string videoUrl = "";

    public static VRVideoPlayer Instance { get; private set; }

    public bool IsPlaying { get; private set; }
    public bool IsBuffering { get; private set; }
    public bool IsPrepared { get; private set; }
    public bool IsLoading { get; private set; }
    public double CurrentTime => videoPlayer != null && videoPlayer.isPrepared ? videoPlayer.time : 0;
    public double Duration => videoPlayer != null && videoPlayer.isPrepared ? videoPlayer.length : 0;
    public float Progress => Duration > 0 ? (float)(CurrentTime / Duration) : 0;

    public event System.Action OnVideoStarted;
    public event System.Action OnVideoPaused;
    public event System.Action OnVideoStopped;
    public event System.Action OnVideoEnded;
    public event System.Action<double> OnTimeUpdated;
    public event System.Action<string> OnError;
    public event System.Action OnLoadingStart;
    public event System.Action OnLoadingComplete;

    // Video data structure matching frontend
    [System.Serializable]
    public class VideoData
    {
        public string id;
        public string filePath;
        public string title;
        public string fileName;
        public long fileSize;
        public int episode;
        public float duration;
        public string year;
        public string genre;
        public bool isLiked;
        public float watchTime;
        public float watchProgress;
    }

    [System.Serializable]
    public class VideoSearchResponse
    {
        public VideoData[] videos;
        public bool success;
        public string message;
    }

    private VideoData currentVideoData;

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
            return;
        }
    }

    private void Start()
    {
        InitializeVideoPlayer();
    }

    private string CreateApiUrl(string path)
    {
        string cleanPath = path.StartsWith("/") ? path.Substring(1) : path;
        return $"{apiBaseUrl}/api/{cleanPath}";
    }

    public void SetVideoPath(string path)
    {
        if (string.IsNullOrEmpty(path)) return;

        filePath = path;
        Debug.Log($"[VRVideoPlayer] Video path set: {path}");

        if (string.IsNullOrEmpty(videoUrl))
        {
            InitializeVideoPlayer();
        }
    }

    private void InitializeVideoPlayer()
    {
        if (string.IsNullOrEmpty(filePath))
        {
            Debug.LogWarning("[VRVideoPlayer] No file path specified");
            return;
        }

        StartCoroutine(LoadVideoData());
    }

    private IEnumerator LoadVideoData()
    {
        IsLoading = true;
        OnLoadingStart?.Invoke();

        Debug.Log($"[VRVideoPlayer] Starting video data load for: {filePath}");

        string encodedPath = System.Uri.EscapeDataString(filePath);
        string searchUrl;
        
        if (useExactMatch)
        {
            searchUrl = CreateApiUrl($"videos?search={encodedPath}&exactMatch=true");
        }
        else
        {
            searchUrl = CreateApiUrl($"videos?search={encodedPath}");
        }

        Debug.Log($"[VRVideoPlayer] API URL: {searchUrl}");

        using (UnityWebRequest request = UnityWebRequest.Get(searchUrl))
        {
            request.timeout = (int)connectionTimeout;

            Debug.Log($"[VRVideoPlayer] Sending API request...");
            yield return request.SendWebRequest();

            Debug.Log($"[VRVideoPlayer] API response result: {request.result}");
            Debug.Log($"[VRVideoPlayer] API response code: {request.responseCode}");
            Debug.Log($"[VRVideoPlayer] API response text: {request.downloadHandler.text}");

            if (request.result == UnityWebRequest.Result.Success)
            {
                VideoSearchResponse response = JsonUtility.FromJson<VideoSearchResponse>(request.downloadHandler.text);
                Debug.Log($"[VRVideoPlayer] API response success: {response.success}");
                Debug.Log($"[VRVideoPlayer] Video count: {response.videos?.Length ?? 0}");

                if (response.success && response.videos != null && response.videos.Length > 0)
                {
                    currentVideoData = response.videos[0];
                    Debug.Log($"[VRVideoPlayer] Video data loaded: {currentVideoData.title}");
                    Debug.Log($"[VRVideoPlayer] Video ID: {currentVideoData.id}");

                    // Set up video streaming URL
                    videoUrl = CreateApiUrl($"video/{encodedPath}");
                    Debug.Log($"[VRVideoPlayer] Streaming URL: {videoUrl}");
                    SetupVideoPlayer();
                }
                else
                {
                    Debug.LogError($"[VRVideoPlayer] Video not found in database: {filePath}");
                    Debug.LogError($"[VRVideoPlayer] Response success: {response.success}");
                    Debug.LogError($"[VRVideoPlayer] Videos array: {(response.videos != null ? response.videos.Length : 0)}");
                    OnError?.Invoke($"Video not found: {filePath}");
                    yield break;
                }
            }
            else
            {
                Debug.LogError($"[VRVideoPlayer] API request failed: {request.error}");
                Debug.LogError($"[VRVideoPlayer] HTTP Status: {request.responseCode}");
                Debug.LogError($"[VRVideoPlayer] Response: {request.downloadHandler.text}");
                OnError?.Invoke($"API request failed: {request.error}");
            }
        }

        IsLoading = false;
        OnLoadingComplete?.Invoke();
        Debug.Log($"[VRVideoPlayer] Video data loading completed. Loading: {IsLoading}");
    }

    
    private void SetupVideoPlayer()
    {
        try
        {
            // Create RenderTexture
            renderTexture = new RenderTexture(renderTextureWidth, renderTextureHeight, 0);
            renderTexture.name = "VideoRenderTexture";
            renderTexture.Create();

            // Setup VideoPlayer
            videoPlayer = gameObject.AddComponent<VideoPlayer>();
            videoPlayer.playOnAwake = false;
            videoPlayer.source = VideoSource.Url;
            videoPlayer.url = videoUrl;
            videoPlayer.renderMode = VideoRenderMode.RenderTexture;
            videoPlayer.targetTexture = renderTexture;
            videoPlayer.isLooping = loop;
            videoPlayer.playbackSpeed = 1f;

            // Optimize for 40Mbps streaming
            videoPlayer.controlledAudioTrackCount = 1;

            // Setup audio
            videoPlayer.audioOutputMode = VideoAudioOutputMode.AudioSource;
            audioSource = gameObject.AddComponent<AudioSource>();
            audioSource.playOnAwake = false;
            audioSource.volume = volume;
            audioSource.spatialBlend = 0f;
            videoPlayer.SetTargetAudioSource(0, audioSource);

            // Register event listeners
            videoPlayer.prepareCompleted += OnVideoPrepared;
            videoPlayer.started += OnVideoStartedInternal;
            videoPlayer.loopPointReached += OnVideoLoopPointReached;
            videoPlayer.errorReceived += OnVideoError;

            // Set texture to screen
            if (screenRenderer != null)
            {
                Material material = screenRenderer.material;
                if (material == null)
                {
                    material = new Material(Shader.Find("Standard"));
                    screenRenderer.material = material;
                }
                material.mainTexture = renderTexture;
            }

            Debug.Log($"[VRVideoPlayer] Video player setup complete: {videoUrl}");
            Debug.Log($"[VRVideoPlayer] VideoPlayer created: {videoPlayer != null}");
            Debug.Log($"[VRVideoPlayer] RenderTexture created: {renderTexture != null}");
            Debug.Log($"[VRVideoPlayer] AudioSource created: {audioSource != null}");
        }
        catch (System.Exception e)
        {
            Debug.LogError($"[VRVideoPlayer] Failed to setup video player: {e.Message}");
            OnError?.Invoke($"Setup failed: {e.Message}");
        }
    }

    public void Play()
    {
        if (videoPlayer == null)
        {
            Debug.LogWarning("[VRVideoPlayer] Video player not initialized");
            return;
        }

        try
        {
            if (!videoPlayer.isPrepared)
            {
                IsBuffering = true;
                videoPlayer.Prepare();
            }
            else
            {
                videoPlayer.Play();
                IsPlaying = true;
                IsBuffering = false;
                Debug.Log("[VRVideoPlayer] Playback started");
            }
        }
        catch (System.Exception e)
        {
            Debug.LogError($"[VRVideoPlayer] Failed to play: {e.Message}");
            OnError?.Invoke($"Play failed: {e.Message}");
        }
    }

    public void Pause()
    {
        if (videoPlayer == null || !IsPlaying) return;

        try
        {
            videoPlayer.Pause();
            IsPlaying = false;
            Debug.Log("[VRVideoPlayer] Playback paused");
            OnVideoPaused?.Invoke();
        }
        catch (System.Exception e)
        {
            Debug.LogError($"[VRVideoPlayer] Failed to pause: {e.Message}");
            OnError?.Invoke($"Pause failed: {e.Message}");
        }
    }

    public void Stop()
    {
        if (videoPlayer == null) return;

        try
        {
            videoPlayer.Stop();
            IsPlaying = false;
            IsBuffering = false;
            Debug.Log("[VRVideoPlayer] Playback stopped");
            OnVideoStopped?.Invoke();
        }
        catch (System.Exception e)
        {
            Debug.LogError($"[VRVideoPlayer] Failed to stop: {e.Message}");
            OnError?.Invoke($"Stop failed: {e.Message}");
        }
    }

    public void SeekTo(double time)
    {
        if (videoPlayer == null || !videoPlayer.canSetTime) return;

        try
        {
            videoPlayer.time = Mathf.Max(0, Mathf.Min((float)time, (float)Duration));
            Debug.Log($"[VRVideoPlayer] Seeked to {time:F2} seconds");
        }
        catch (System.Exception e)
        {
            Debug.LogError($"[VRVideoPlayer] Failed to seek: {e.Message}");
            OnError?.Invoke($"Seek failed: {e.Message}");
        }
    }

    public void SeekToProgress(float progress)
    {
        SeekTo(progress * Duration);
    }

    public void SetExactMatch(bool value)
    {
        useExactMatch = value;
        Debug.Log($"[VRVideoPlayer] Exact match set to: {value}");
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
        IsPrepared = true;
        IsBuffering = false;
        Debug.Log($"[VRVideoPlayer] Video prepared: {source.length:F2} seconds");
        Debug.Log($"[VRVideoPlayer] Video width: {source.width}");
        Debug.Log($"[VRVideoPlayer] Video height: {source.height}");
        Debug.Log($"[VRVideoPlayer] Video frameRate: {source.frameRate}");
        Debug.Log($"[VRVideoPlayer] Video hasAudio: {source.audioTrackCount > 0}");

        if (autoPlay)
        {
            Debug.Log("[VRVideoPlayer] Auto-play enabled, starting playback...");
            Play();
        }
    }

    private void OnVideoStartedInternal(VideoPlayer source)
    {
        IsPlaying = true;
        IsBuffering = false;
        Debug.Log("[VRVideoPlayer] Video started");
        OnVideoStarted?.Invoke();
    }

    private void OnVideoLoopPointReached(VideoPlayer source)
    {
        Debug.Log("[VRVideoPlayer] Video ended (loop point reached)");
        if (!loop)
        {
            IsPlaying = false;
            OnVideoEnded?.Invoke();
        }
    }

    private void OnVideoError(VideoPlayer source, string message)
    {
        Debug.LogError($"[VRVideoPlayer] Video error: {message}");
        Debug.LogError($"[VRVideoPlayer] VideoPlayer isPlaying: {source.isPlaying}");
        Debug.LogError($"[VRVideoPlayer] VideoPlayer isPrepared: {source.isPrepared}");
        Debug.LogError($"[VRVideoPlayer] Current video URL: {source.url}");
        IsPlaying = false;
        IsBuffering = false;
        OnError?.Invoke($"Video error: {message}");
    }

    private void Update()
    {
        if (videoPlayer != null && IsPlaying && IsPrepared)
        {
            OnTimeUpdated?.Invoke(CurrentTime);

            // 毎秒デバッグ情報を表示
            if (Time.frameCount % 60 == 0) // 1秒に1回
            {
                Debug.Log($"[VRVideoPlayer] Status: Playing, Time: {CurrentTime:F1}s/{Duration:F1}s, Progress: {Progress:P1}");
            }
        }
    }

    private void OnDestroy()
    {
        if (videoPlayer != null)
        {
            videoPlayer.prepareCompleted -= OnVideoPrepared;
            videoPlayer.started -= OnVideoStartedInternal;
            videoPlayer.loopPointReached -= OnVideoLoopPointReached;
            videoPlayer.errorReceived -= OnVideoError;
            videoPlayer.Stop();
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

    // Public data access methods
    public string GetVideoTitle() => currentVideoData?.title ?? "Unknown";
    public string GetVideoFilePath() => currentVideoData?.filePath ?? "";
    public float GetVideoDuration() => currentVideoData?.duration ?? 0f;
    public bool IsVideoLiked() => currentVideoData?.isLiked ?? false;

    // Debug information
    public string GetDebugInfo()
    {
        if (videoPlayer == null)
        {
            return "VideoPlayer: Not initialized";
        }

        return $"VideoPlayer:\n" +
               $"  URL: {videoPlayer.url}\n" +
               $"  Prepared: {videoPlayer.isPrepared}\n" +
               $"  Playing: {videoPlayer.isPlaying}\n" +
               $"  Duration: {videoPlayer.length:F2}s\n" +
               $"  Current Time: {videoPlayer.time:F2}s\n" +
               $"  Loop: {videoPlayer.isLooping}\n" +
               $"  File Path: {filePath}\n" +
               $"  Title: {GetVideoTitle()}";
    }
}