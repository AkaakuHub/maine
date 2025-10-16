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
/// Unity VideoPlayerの間違ったRangeリクエストをVLCの正しいHTTP仕様に変換して中継するプロキシサーバー
/// Unity: bytes=262144-239007769 → 正しい仕様: bytes=262144-
/// </summary>
public class LocalHttpProxy
{
    private readonly HttpListener _listener = new HttpListener();
    private readonly string _remoteUrl;
    private readonly long _fileSize;
    private CancellationTokenSource _cancellationTokenSource;
    private static readonly HttpClient _httpClient = new HttpClient();

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
        Debug.Log($"[Proxy] Listening on port {port}");
    }

    public void Stop()
    {
        _cancellationTokenSource?.Cancel();
        if (_listener.IsListening)
        {
            _listener.Stop();
            _listener.Close();
        }
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
                _ = Task.Run(() => ProcessRequest(context, token), token);
            }
            catch (HttpListenerException) when (token.IsCancellationRequested)
            {
                break;
            }
            catch (ObjectDisposedException)
            {
                break;
            }
            catch (Exception ex)
            {
                Debug.LogError($"[Proxy Listen Error] {ex.Message}");
            }
        }
    }

    private async Task ProcessRequest(HttpListenerContext context, CancellationToken token)
    {
        var request = context.Request;
        var response = context.Response;
        string originalRangeHeader = request.Headers["Range"];

        try
        {
            // Unityの間違ったRangeリクエストをVLCの正しい仕様に変換
            string correctedRangeHeader = ConvertUnityRangeToStandard(originalRangeHeader);

            Debug.Log($"[Proxy] Unity's wrong request: {originalRangeHeader}");
            Debug.Log($"[Proxy] Corrected to VLC standard: {correctedRangeHeader}");

            var range = new RangeHeaderValue();
            if (TryParseRange(correctedRangeHeader, out long start, out long? end))
            {
                range.Ranges.Add(new RangeItemHeaderValue(start, end));
            }
            else
            {
                // Rangeヘッダーがない場合は全体をリクエスト
                Debug.Log($"[Proxy] No range header, requesting full file");
                range = null;
            }

            using (var httpRequest = new HttpRequestMessage(HttpMethod.Get, _remoteUrl))
            {
                if (range != null)
                {
                    httpRequest.Headers.Range = range;
                }

                using (
                    var httpResponse = await _httpClient.SendAsync(
                        httpRequest,
                        HttpCompletionOption.ResponseHeadersRead,
                        token
                    )
                )
                {
                    // レスポンスヘッダーをクライアントに設定
                    response.StatusCode = (int)httpResponse.StatusCode;
                    response.ContentType =
                        httpResponse.Content.Headers.ContentType?.ToString() ?? "video/mp4";
                    response.AddHeader("Accept-Ranges", "bytes");

                    if (httpResponse.Content.Headers.ContentRange != null)
                    {
                        response.AddHeader(
                            "Content-Range",
                            httpResponse.Content.Headers.ContentRange.ToString()
                        );
                    }

                    response.ContentLength64 = httpResponse.Content.Headers.ContentLength ?? 0;

                    // データをクライアントに直接ストリーミング転送
                    using (var responseStream = await httpResponse.Content.ReadAsStreamAsync())
                    {
                        // Rangeリクエストが正しく機能しているか確認のため断片サイズをログ出力
                        long totalBytesRead = 0;
                        byte[] buffer = new byte[81920];
                        int bytesRead;

                        try
                        {
                            while (
                                (
                                    bytesRead = await responseStream.ReadAsync(
                                        buffer,
                                        0,
                                        buffer.Length,
                                        token
                                    )
                                ) > 0
                            )
                            {
                                await response.OutputStream.WriteAsync(buffer, 0, bytesRead, token);
                                totalBytesRead += bytesRead;
                            }

                            // 最後まで正常に転送できた場合のみ表示
                            double totalMB = totalBytesRead / (1024.0 * 1024.0);
                            Debug.Log(
                                $"[Proxy] Streamed {totalMB:F2} MB ({totalBytesRead:N0} bytes) to Unity (Range: {correctedRangeHeader})"
                            );
                        }
                        catch (IOException)
                        {
                            // クライアント切断時も、転送されたデータ量を表示
                            if (totalBytesRead > 0)
                            {
                                double totalMB = totalBytesRead / (1024.0 * 1024.0);
                                Debug.Log(
                                    $"[Proxy] Streamed {totalMB:F2} MB ({totalBytesRead:N0} bytes) before client disconnect (Range: {correctedRangeHeader})"
                                );
                            }
                            throw; // 上位のcatch節で処理させる
                        }
                    }
                }
            }
        }
        catch (OperationCanceledException)
        {
            Debug.Log($"[Proxy] A task was canceled, likely due to client disconnect.");
        }
        catch (IOException ioEx)
        {
            // Unityがクライアント側で接続を切断した場合（これは正常な動作）
            Debug.Log($"[Proxy] Client disconnected normally: {ioEx.Message}");
        }
        catch (HttpListenerException httpEx)
        {
            // HTTPリスナー関連の例外（多くの場合はクライアント切断）
            Debug.Log(
                $"[Proxy] HTTP listener exception (likely client disconnect): {httpEx.Message}"
            );
        }
        catch (Exception ex)
        {
            // その他の予期せぬエラーのみを記録
            Debug.LogError($"[Proxy] Unexpected streaming error: {ex.Message}");
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
            try
            {
                response.Close();
            }
            catch { }
        }
    }

    /// <summary>
    /// Unityの間違ったRangeリクエストをVLCの正しいHTTP仕様に変換
    /// Unity: bytes=0-239007769 → 正しい仕様: bytes=0-
    /// Unity: bytes=262144-239007769 → 正しい仕様: bytes=262144-
    /// </summary>
    private string ConvertUnityRangeToStandard(string unityRangeHeader)
    {
        if (string.IsNullOrEmpty(unityRangeHeader) || !unityRangeHeader.StartsWith("bytes="))
        {
            return unityRangeHeader; // 変換不要
        }

        string rangePart = unityRangeHeader.Substring(6); // "bytes="を除去
        string[] parts = rangePart.Split('-');

        if (parts.Length < 2)
            return unityRangeHeader;

        string startPart = parts[0];
        string endPart = parts[1];

        // Unityの間違い: endがファイルサイズと同じ場合（つまり終端までの指定）
        if (!string.IsNullOrEmpty(startPart) && !string.IsNullOrEmpty(endPart))
        {
            if (long.TryParse(startPart, out long start) && long.TryParse(endPart, out long end))
            {
                // endがファイルサイズと同じ場合（つまり終端まで）、VLC仕様に変換
                if (end >= _fileSize - 1) // _fileSizeはコンストラクタで設定したファイルサイズ
                {
                    return $"bytes={start}-"; // VLCの正しい仕様：終端を指定しない
                }
            }
        }

        return unityRangeHeader; // 変換不要な場合はそのまま返す
    }

    private bool TryParseRange(string rangeHeader, out long start, out long? end)
    {
        start = 0;
        end = null;
        if (string.IsNullOrEmpty(rangeHeader) || !rangeHeader.StartsWith("bytes="))
            return false;
        string[] parts = rangeHeader.Substring(6).Split('-');
        if (parts.Length < 1)
            return false;
        if (!string.IsNullOrEmpty(parts[0]))
            long.TryParse(parts[0], out start);
        if (parts.Length > 1 && !string.IsNullOrEmpty(parts[1]))
            end = long.Parse(parts[1]);
        return true;
    }
}
