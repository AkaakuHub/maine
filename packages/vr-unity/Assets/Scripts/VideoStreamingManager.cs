using System;
using System.IO;
using System.Linq;
using System.Net;
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
    public string videoUrl = "http://localhost:3001/api/video/VIDEO_ID_HERE";

    [Tooltip("動画情報取得APIのURL")]
    public string videoInfoUrl = "http://localhost:3001/api/videos/by-video-id/VIDEO_ID_HERE";

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

        // ローカルプロキシを起動
        _proxy = new LocalHttpProxy(videoUrl, _fileSize);
        _proxy.Start(localProxyPort);
        UpdateStatus("Proxy Started");

        SetupUIListeners();
        SetupVideoPlayerCallbacks();

        // VideoPlayerのURLをローカルプロキシに設定
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
            // スライダーが押された瞬間と離された瞬間のイベントを取得
            var trigger = timeSlider.gameObject.AddComponent<EventTrigger>();
            var pointerDown = new EventTrigger.Entry { eventID = EventTriggerType.PointerDown };
            pointerDown.callback.AddListener((_) => _isSeeking = true);
            trigger.triggers.Add(pointerDown);

            var pointerUp = new EventTrigger.Entry { eventID = EventTriggerType.PointerUp };
            pointerUp.callback.AddListener(
                (_) =>
                {
                    _videoPlayer.time = timeSlider.value;
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

    #region Helper Classes
    [Serializable]
    private class VideoInfo
    {
        public string id;
        public string title;
        public string fileName;
        public string filePath;
        public long fileSize;
        public string lastModified;
        public int? episode;
        public int? year;
        public int duration;
        public string scannedAt;
        public string thumbnailPath;
        public string metadataExtractedAt;
        public string videoId;
        public double watchProgress;
        public double watchTime;
        public bool isLiked;
        public string lastWatched;
        public bool isInWatchlist;
    }

    [Serializable]
    private class VideoInfoAPIType
    {
        public bool success;
        public VideoInfo video;
    }
    #endregion
}

/// <summary>
/// VideoPlayerからのHTTPリクエストを中継するローカルプロキシサーバー
/// </summary>
public class LocalHttpProxy
{
    private readonly HttpListener _listener = new HttpListener();
    private readonly string _remoteUrl;
    private readonly long _fileSize;
    private CancellationTokenSource _cancellationTokenSource;

    public LocalHttpProxy(string remoteUrl, long fileSize)
    {
        _remoteUrl = remoteUrl;
        _fileSize = fileSize;
    }

    public string GetProxyUrl() =>
        $"http://127.0.0.1:{(_listener.Prefixes.FirstOrDefault()?.Contains(":") ?? false ? new Uri(_listener.Prefixes.First()).Port : 80)}/video.mp4";

    public void Start(int port)
    {
        if (_listener.IsListening)
            return;

        _listener.Prefixes.Add($"http://127.0.0.1:{port}/");
        _listener.Start();

        _cancellationTokenSource = new CancellationTokenSource();
        Task.Run(() => ListenLoop(_cancellationTokenSource.Token));

        Debug.Log($"Proxy listening on port {port}");
    }

    public void Stop()
    {
        _cancellationTokenSource?.Cancel();
        _listener.Stop();
        _listener.Close();
    }

    private async Task ListenLoop(CancellationToken token)
    {
        while (_listener.IsListening && !token.IsCancellationRequested)
        {
            try
            {
                var context = await _listener.GetContextAsync();
                if (token.IsCancellationRequested)
                    return;

                // 新しいリクエストを別スレッドで処理
                _ = Task.Run(() => ProcessRequest(context), token);
            }
            catch (HttpListenerException) when (token.IsCancellationRequested)
            {
                // リスナー停止時の例外は無視
                break;
            }
            catch (Exception ex)
            {
                Debug.LogError($"[Proxy Listen Error] {ex.Message}");
            }
        }
    }

    private async Task ProcessRequest(HttpListenerContext context)
    {
        var request = context.Request;
        var response = context.Response;

        try
        {
            string rangeHeader = request.Headers["Range"];
            Debug.Log($"[Proxy] Received request with Range: {rangeHeader ?? "None"}");

            var httpRequest = (HttpWebRequest)WebRequest.Create(_remoteUrl);
            httpRequest.Method = "GET";

            if (!string.IsNullOrEmpty(rangeHeader))
            {
                // Range: bytes=start-end 形式を解析
                var rangeParts = rangeHeader.Replace("bytes=", "").Split('-');
                if (rangeParts.Length == 2)
                {
                    if (
                        int.TryParse(rangeParts[0], out int start)
                        && int.TryParse(rangeParts[1], out int end)
                    )
                    {
                        httpRequest.AddRange(start, end);
                    }
                    else if (int.TryParse(rangeParts[0], out start))
                    {
                        // Range: bytes=start- の場合
                        httpRequest.AddRange(start);
                    }
                }
            }

            using (var httpResponse = await httpRequest.GetResponseAsync() as HttpWebResponse)
            using (var responseStream = httpResponse.GetResponseStream())
            using (var memoryStream = new MemoryStream())
            {
                // レスポンスヘッダーをクライアントに転送
                response.StatusCode = (int)httpResponse.StatusCode;
                response.ContentType = httpResponse.ContentType ?? "video/mp4";
                response.AddHeader("Accept-Ranges", "bytes");

                var contentRange = httpResponse.Headers["Content-Range"];
                if (!string.IsNullOrEmpty(contentRange))
                {
                    response.AddHeader("Content-Range", contentRange);
                }

                // データをストリームで転送
                await responseStream.CopyToAsync(memoryStream);
                byte[] data = memoryStream.ToArray();

                response.ContentLength64 = data.Length;
                await response.OutputStream.WriteAsync(data, 0, data.Length);
            }
        }
        catch (WebException webEx)
        {
            Debug.LogError($"[Proxy WebException] {webEx.Message}");
            try
            {
                response.StatusCode = 500;
            }
            catch
            {
                // ヘッダーが既に送信されている場合は無視
            }
        }
        catch (Exception ex)
        {
            Debug.LogError($"[Proxy ProcessRequest Error] {ex.Message}");
            try
            {
                response.StatusCode = 500;
            }
            catch
            {
                // ヘッダーが既に送信されている場合は無視
            }
        }
        finally
        {
            response.Close();
        }
    }
}
