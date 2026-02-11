using System;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading;
using System.Threading.Tasks;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.Networking;
using UnityEngine.UI;
using UnityEngine.Video;

[RequireComponent(typeof(VideoPlayer))]
public class VideoStreamingManager : MonoBehaviour
{
    [Header("Video URLs")]
    [Tooltip("実際の動画ファイルURL（バックエンドサーバー）")]
    public string videoUrl = "http://localhost:3001/api/video/ID_HERE";

    [Tooltip("動画情報取得APIのURL")]
    public string videoInfoUrl = "http://localhost:3001/api/videos/by-id/ID_HERE";

    [Header("Proxy Settings")]
    [Tooltip("ローカルプロキシが使用するポート")]
    public int localProxyPort = 8080;

    [Header("UI")]
    public Slider timeSlider;
    public Button playPauseButton;
    public Text playPauseButtonText;
    public Text statusText;

    private VideoPlayer _videoPlayer;
    private LocalHttpProxy _proxy;
    private long _fileSize = -1;
    private bool _isSeeking = false;

    void Awake()
    {
        _videoPlayer = GetComponent<VideoPlayer>();
    }

    async void Start()
    {
        UpdateStatus("Getting video info...");
        await GetFileSizeFromServer();

        if (_fileSize <= 0)
        {
            UpdateStatus("Error: Could not get file size.");
            return;
        }

        // VLCと同じ動きをするインテリジェントプロキシを起動
        _proxy = new LocalHttpProxy(videoUrl, _fileSize);
        _proxy.Start(localProxyPort);
        UpdateStatus("Proxy Started");

        SetupUIListeners();
        SetupVideoPlayerCallbacks();

        _videoPlayer.source = VideoSource.Url;
        _videoPlayer.url = _proxy.GetProxyUrl();
        _videoPlayer.Prepare();
        UpdateStatus("Preparing Player...");
    }

    void Update()
    {
        if (_videoPlayer.isPrepared && _videoPlayer.isPlaying && !_isSeeking && timeSlider != null)
        {
            timeSlider.value = (float)_videoPlayer.time;
        }
        UpdatePlayPauseButton();
    }

    void OnDestroy()
    {
        _proxy?.Stop();
    }

    #region Setup & Callbacks
    private void SetupUIListeners()
    {
        if (playPauseButton != null)
            playPauseButton.onClick.AddListener(TogglePlayPause);

        if (timeSlider != null)
        {
            var trigger = timeSlider.gameObject.AddComponent<EventTrigger>();
            var pointerDown = new EventTrigger.Entry { eventID = EventTriggerType.PointerDown };
            pointerDown.callback.AddListener((_) => _isSeeking = true);
            trigger.triggers.Add(pointerDown);

            var pointerUp = new EventTrigger.Entry { eventID = EventTriggerType.PointerUp };
            pointerUp.callback.AddListener(
                (_) =>
                {
                    if (_videoPlayer.isPrepared)
                    {
                        _videoPlayer.time = timeSlider.value;
                    }
                    _isSeeking = false;
                }
            );
            trigger.triggers.Add(pointerUp);
        }
    }

    private void SetupVideoPlayerCallbacks()
    {
        _videoPlayer.errorReceived += (source, message) =>
        {
            Debug.LogError($"[VideoPlayer Error] {message}");
            UpdateStatus("Error");
        };
        _videoPlayer.prepareCompleted += (source) =>
        {
            if (timeSlider != null)
                timeSlider.maxValue = (float)source.length;
            source.Play();
            UpdateStatus("Playing");
        };
    }
    #endregion

    #region UI Control
    private void TogglePlayPause()
    {
        if (!_videoPlayer.isPrepared)
            return;
        if (_videoPlayer.isPlaying)
            _videoPlayer.Pause();
        else
            _videoPlayer.Play();
    }

    private void UpdatePlayPauseButton()
    {
        if (playPauseButtonText != null)
            playPauseButtonText.text = _videoPlayer.isPlaying ? "Pause" : "Play";
    }

    private void UpdateStatus(string message)
    {
        if (statusText != null)
            statusText.text = message;
        Debug.Log($"[Status] {message}");
    }
    #endregion

    #region Networking
    private async Task GetFileSizeFromServer()
    {
        using (var uwr = UnityWebRequest.Get(videoInfoUrl))
        {
            var asyncOp = uwr.SendWebRequest();
            while (!asyncOp.isDone)
                await Task.Yield();

            if (uwr.result == UnityWebRequest.Result.Success)
            {
                var response = JsonUtility.FromJson<VideoInfoAPIType>(uwr.downloadHandler.text);
                _fileSize = response.video.fileSize;
            }
            else
            {
                Debug.LogError($"Error getting video info: {uwr.error}");
                _fileSize = -1;
            }
        }
    }
    #endregion
}
