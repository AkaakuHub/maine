using TMPro;
using UnityEngine;
using UnityEngine.UI;

public class VRUIController : MonoBehaviour
{
    [Header("UI References")]
    [SerializeField] private Canvas uiCanvas;
    [SerializeField] private Transform canvasTransform;
    [SerializeField] private readonly float uiDistance = 2.0f;
    [SerializeField] private readonly Vector3 uiOffset = new Vector3(0, 0.5f, 0);

    [Header("Control Buttons")]
    [SerializeField] private Button playPauseButton;
    [SerializeField] private Button stopButton;
    [SerializeField] private Button volumeUpButton;
    [SerializeField] private Button volumeDownButton;
    [SerializeField] private Button seekBackwardButton;
    [SerializeField] private Button seekForwardButton;

    [Header("Display Elements")]
    [SerializeField] private TextMeshProUGUI currentTimeText;
    [SerializeField] private TextMeshProUGUI durationText;
    [SerializeField] private TextMeshProUGUI statusText;
    [SerializeField] private Slider progressBar;
    [SerializeField] private Slider volumeSlider;

    [Header("Exact Match Settings")]
    [SerializeField] private Toggle exactMatchToggle;

    [Header("UI Settings")]
    [SerializeField] private bool autoShowOnStart = true;
    [SerializeField] private readonly float hideDelay = 5.0f;
    [SerializeField] private readonly Vector3 canvasScale = new Vector3(0.001f, 0.001f, 0.001f);

    private bool isVisible = true;
    private float hideTimer;
    private bool isDraggingProgressBar = false;
    private bool isDraggingVolumeSlider = false;

    public static VRUIController Instance { get; private set; }

    public bool IsVisible
    {
        get => isVisible;
        set
        {
            isVisible = value;
            UpdateVisibility();
        }
    }

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
        InitializeUI();
        SetupEventListeners();
        PositionUI();

        if (autoShowOnStart)
        {
            IsVisible = true;
        }

        ResetHideTimer();
    }

    private void InitializeUI()
    {
        if (uiCanvas == null)
        {
            uiCanvas = GetComponent<Canvas>();
            if (uiCanvas == null)
            {
                uiCanvas = gameObject.AddComponent<Canvas>();
                uiCanvas.renderMode = RenderMode.WorldSpace;
            }
        }

        canvasTransform = uiCanvas.transform;

        var canvasScaler = uiCanvas.GetComponent<UnityEngine.UI.CanvasScaler>();
        if (canvasScaler == null)
        {
            canvasScaler = uiCanvas.gameObject.AddComponent<UnityEngine.UI.CanvasScaler>();
            canvasScaler.dynamicPixelsPerUnit = 1000;
        }

        var graphicRaycaster = uiCanvas.GetComponent<GraphicRaycaster>();
        if (graphicRaycaster == null)
        {
            graphicRaycaster = uiCanvas.gameObject.AddComponent<GraphicRaycaster>();
        }

        FindUIComponents();
    }

    private void FindUIComponents()
    {
        playPauseButton = FindComponent<Button>("PlayPauseButton");
        stopButton = FindComponent<Button>("StopButton");
        volumeUpButton = FindComponent<Button>("VolumeUpButton");
        volumeDownButton = FindComponent<Button>("VolumeDownButton");
        seekBackwardButton = FindComponent<Button>("SeekBackwardButton");
        seekForwardButton = FindComponent<Button>("SeekForwardButton");

        currentTimeText = FindComponent<TextMeshProUGUI>("CurrentTimeText");
        durationText = FindComponent<TextMeshProUGUI>("DurationText");
        statusText = FindComponent<TextMeshProUGUI>("StatusText");

        progressBar = FindComponent<Slider>("ProgressBar");
        volumeSlider = FindComponent<Slider>("VolumeSlider");
        exactMatchToggle = FindComponent<Toggle>("ExactMatchToggle");

        if (progressBar != null)
        {
            var eventTrigger = progressBar.GetComponent<UnityEngine.EventSystems.EventTrigger>();
            if (eventTrigger == null)
            {
                eventTrigger = progressBar.gameObject.AddComponent<UnityEngine.EventSystems.EventTrigger>();
            }
        }

        if (volumeSlider != null)
        {
            var eventTrigger = volumeSlider.GetComponent<UnityEngine.EventSystems.EventTrigger>();
            if (eventTrigger == null)
            {
                eventTrigger = volumeSlider.gameObject.AddComponent<UnityEngine.EventSystems.EventTrigger>();
            }
        }
    }

    private T FindComponent<T>(string name)
        where T : Component
    {
        var transform = canvasTransform.Find(name);
        return transform != null ? transform.GetComponent<T>() : null;
    }

    private void SetupEventListeners()
    {
        if (playPauseButton != null)
        {
            playPauseButton.onClick.AddListener(OnPlayPauseClicked);
        }

        if (stopButton != null)
        {
            stopButton.onClick.AddListener(OnStopClicked);
        }

        if (volumeUpButton != null)
        {
            volumeUpButton.onClick.AddListener(OnVolumeUpClicked);
        }

        if (volumeDownButton != null)
        {
            volumeDownButton.onClick.AddListener(OnVolumeDownClicked);
        }

        if (seekBackwardButton != null)
        {
            seekBackwardButton.onClick.AddListener(OnSeekBackwardClicked);
        }

        if (seekForwardButton != null)
        {
            seekForwardButton.onClick.AddListener(OnSeekForwardClicked);
        }

        if (progressBar != null)
        {
            progressBar.onValueChanged.AddListener(OnProgressChanged);
        }

        if (volumeSlider != null)
        {
            volumeSlider.onValueChanged.AddListener(OnVolumeChanged);
        }

        if (exactMatchToggle != null)
        {
            exactMatchToggle.onValueChanged.AddListener(OnExactMatchChanged);
        }

        if (VRVideoPlayer.Instance != null)
        {
            VRVideoPlayer.Instance.OnVideoStarted += OnVideoStarted;
            VRVideoPlayer.Instance.OnVideoPaused += OnVideoPaused;
            VRVideoPlayer.Instance.OnVideoEnded += OnVideoEnded;
            VRVideoPlayer.Instance.OnTimeUpdated += OnTimeUpdated;
        }
    }

    private void PositionUI()
    {
        if (canvasTransform != null && Camera.main != null)
        {
            var cameraTransform = Camera.main.transform;
            var targetPosition =
                cameraTransform.position + cameraTransform.forward * uiDistance + uiOffset;

            canvasTransform.SetPositionAndRotation(targetPosition, cameraTransform.rotation);
            canvasTransform.localScale = canvasScale;
        }
    }

    private void Update()
    {
        UpdateUI();
        HandleVisibility();
        HandleKeyboardInput();

        if (isVisible && Camera.main != null)
        {
            canvasTransform.LookAt(Camera.main.transform);
            canvasTransform.Rotate(0, 180, 0);
        }
    }

    private void HandleKeyboardInput()
    {
        // Spaceで再生/一時停止
        if (Input.GetKeyDown(KeyCode.Space))
        {
            if (VRVideoPlayer.Instance != null)
            {
                if (VRVideoPlayer.Instance.IsPlaying)
                {
                    VRVideoPlayer.Instance.Pause();
                }
                else
                {
                    VRVideoPlayer.Instance.Play();
                }
            }
        }

        // 短縮シーク（左矢印キー）
        if (Input.GetKeyDown(KeyCode.LeftArrow))
        {
            if (VRVideoPlayer.Instance != null && VRVideoPlayer.Instance.IsPrepared)
            {
                float newProgress = Mathf.Max(0, VRVideoPlayer.Instance.Progress - 0.1f);
                VRVideoPlayer.Instance.SeekToProgress(newProgress);
            }
        }

        // 前進シーク（右矢印キー）
        if (Input.GetKeyDown(KeyCode.RightArrow))
        {
            if (VRVideoPlayer.Instance != null && VRVideoPlayer.Instance.IsPrepared)
            {
                float newProgress = Mathf.Min(1, VRVideoPlayer.Instance.Progress + 0.1f);
                VRVideoPlayer.Instance.SeekToProgress(newProgress);
            }
        }

        // Homeキーでホームに戻る（VR用に実装）
        if (Input.GetKeyDown(KeyCode.Home))
        {
            Debug.Log("[VRUIController] Home key pressed - returning to main menu");
            // TODO: メインメニュー画面に戻る処理
        }

        // 0-9で10秒シーク
        if (Input.anyKey)
        {
            foreach (KeyCode key in System.Enum.GetValues(typeof(KeyCode)))
            {
                if (Input.GetKeyDown(key) && key >= KeyCode.Alpha0 && key <= KeyCode.Alpha9)
                {
                    int number = key - KeyCode.Alpha0;
                    float seekTime = number * 10f; // 0-9 = 0-90秒シーク
                    if (VRVideoPlayer.Instance != null && VRVideoPlayer.Instance.IsPrepared)
                    {
                        VRVideoPlayer.Instance.SeekTo(seekTime);
                    }
                    break;
                }
            }
        }
    }

    private void UpdateUI()
    {
        if (VRVideoPlayer.Instance == null)
            return;

        var player = VRVideoPlayer.Instance;

        UpdateTimeDisplay(player.CurrentTime, player.Duration);
        UpdateProgressDisplay(player.Progress);
        UpdateStatusDisplay(player.IsPlaying, player.IsBuffering);
        UpdateVolumeDisplay();
    }

    private void UpdateTimeDisplay(double currentTime, double duration)
    {
        if (currentTimeText != null)
        {
            currentTimeText.text = FormatTime(currentTime);
        }

        if (durationText != null)
        {
            durationText.text = FormatTime(duration);
        }
    }

    private void UpdateProgressDisplay(float progress)
    {
        if (progressBar != null && !isDraggingProgressBar)
        {
            progressBar.value = progress;
        }
    }

    private void UpdateStatusDisplay(bool isPlaying, bool isBuffering)
    {
        if (statusText != null)
        {
            if (isBuffering)
            {
                statusText.text = "バッファリング中...";
            }
            else if (isPlaying)
            {
                statusText.text = "再生中";
            }
            else
            {
                statusText.text = "一時停止中";
            }
        }

        if (playPauseButton != null)
        {
            var buttonText = playPauseButton.GetComponentInChildren<TextMeshProUGUI>();
            if (buttonText != null)
            {
                buttonText.text = isPlaying ? "一時停止" : "再生";
            }
        }
    }

    private void UpdateVolumeDisplay()
    {
        if (volumeSlider != null)
        {
            var player = VRVideoPlayer.Instance;
            if (player != null && !isDraggingVolumeSlider)
            {
                var audioSource = player.audioSource;
                volumeSlider.value = audioSource != null ? audioSource.volume : 1f;
            }
        }
    }

    private void HandleVisibility()
    {
        if (Input.anyKeyDown || Input.GetMouseButtonDown(0))
        {
            ResetHideTimer();
            if (!isVisible)
            {
                IsVisible = true;
            }
        }

        if (isVisible)
        {
            hideTimer -= Time.deltaTime;
            if (hideTimer <= 0)
            {
                IsVisible = false;
            }
        }
    }

    private void ResetHideTimer()
    {
        hideTimer = hideDelay;
    }

    private void UpdateVisibility()
    {
        if (uiCanvas != null)
        {
            uiCanvas.enabled = isVisible;
        }
    }

    private void OnPlayPauseClicked()
    {
        ResetHideTimer();

        if (VRVideoPlayer.Instance != null)
        {
            if (VRVideoPlayer.Instance.IsPlaying)
            {
                VRVideoPlayer.Instance.Pause();
            }
            else
            {
                VRVideoPlayer.Instance.Play();
            }
        }
    }

    private void OnStopClicked()
    {
        ResetHideTimer();

        if (VRVideoPlayer.Instance != null)
        {
            VRVideoPlayer.Instance.Stop();
        }
    }

    private void OnVolumeUpClicked()
    {
        ResetHideTimer();

        if (VRVideoPlayer.Instance != null)
        {
            var currentVolume = VRVideoPlayer.Instance.audioSource != null ? VRVideoPlayer.Instance.audioSource.volume : 0f;
            VRVideoPlayer.Instance.SetVolume(Mathf.Min(1f, currentVolume + 0.1f));
        }
    }

    private void OnVolumeDownClicked()
    {
        ResetHideTimer();

        if (VRVideoPlayer.Instance != null)
        {
            var currentVolume = VRVideoPlayer.Instance.audioSource != null ? VRVideoPlayer.Instance.audioSource.volume : 0f;
            VRVideoPlayer.Instance.SetVolume(Mathf.Max(0f, currentVolume - 0.1f));
        }
    }

    private void OnSeekBackwardClicked()
    {
        ResetHideTimer();

        if (VRVideoPlayer.Instance != null)
        {
            var newProgress = Mathf.Max(0, VRVideoPlayer.Instance.Progress - 0.1f);
            VRVideoPlayer.Instance.SeekTo(newProgress * VRVideoPlayer.Instance.Duration);
        }
    }

    private void OnSeekForwardClicked()
    {
        ResetHideTimer();

        if (VRVideoPlayer.Instance != null)
        {
            var newProgress = Mathf.Min(1, VRVideoPlayer.Instance.Progress + 0.1f);
            VRVideoPlayer.Instance.SeekTo(newProgress * VRVideoPlayer.Instance.Duration);
        }
    }

    private void OnProgressChanged(float value)
    {
        ResetHideTimer();

        if (VRVideoPlayer.Instance != null)
        {
            VRVideoPlayer.Instance.SeekTo(value * VRVideoPlayer.Instance.Duration);
        }
    }

    private void OnVolumeChanged(float value)
    {
        ResetHideTimer();

        if (VRVideoPlayer.Instance != null)
        {
            VRVideoPlayer.Instance.SetVolume(value);
        }
    }

    private void OnExactMatchChanged(bool value)
    {
        ResetHideTimer();

        if (VRVideoPlayer.Instance != null)
        {
            VRVideoPlayer.Instance.SetExactMatch(value);
        }
    }

    private void OnVideoStarted()
    {
        ResetHideTimer();
    }

    private void OnVideoPaused()
    {
        ResetHideTimer();
    }

    private void OnVideoEnded()
    {
        ResetHideTimer();
    }

    private void OnTimeUpdated(double time) { }

    private string FormatTime(double timeInSeconds)
    {
        var time = System.TimeSpan.FromSeconds(timeInSeconds);
        if (time.TotalHours >= 1)
        {
            return $"{(int)time.TotalHours:D2}:{time.Minutes:D2}:{time.Seconds:D2}";
        }
        else
        {
            return $"{time.Minutes:D2}:{time.Seconds:D2}";
        }
    }

    private void OnDestroy()
    {
        if (VRVideoPlayer.Instance != null)
        {
            VRVideoPlayer.Instance.OnVideoStarted -= OnVideoStarted;
            VRVideoPlayer.Instance.OnVideoPaused -= OnVideoPaused;
            VRVideoPlayer.Instance.OnVideoEnded -= OnVideoEnded;
            VRVideoPlayer.Instance.OnTimeUpdated -= OnTimeUpdated;
        }
    }
}