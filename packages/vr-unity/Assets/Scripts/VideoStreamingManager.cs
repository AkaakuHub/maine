using System.Collections;
using System.IO;
using UnityEngine;
using UnityEngine.Networking;
using UnityEngine.UI;
using UnityEngine.Video;

// このスクリプトがアタッチされたGameObjectにVideoPlayerコンポーネントを必須にする

public class VideoStreamingManager : MonoBehaviour
{
    [Header("Configuration")]
    public string videoUrl = "YOUR_VIDEO_URL_HERE"; // インスペクターで設定

    public string videoInfoUrl = "YOUR_VIDEO_INFO_URL_HERE"; // インスペクターで設定

    public long initialBufferSize = 1 * 1024 * 1024; // 1MB

    public long continuousBufferSize = 5 * 1024 * 1024; // 5MB

    public long chunkSize = 512 * 1024; // 512KB

    public Slider timeSlider;

    public Button playPauseButton;

    public Text playPauseButtonText;

    public Text statusText;

    private VideoPlayer _videoPlayer;
    private string _tempFilePath;
    private FileStream _fileStream;
    private long _fileSize = -1;
    private long _downloadedBytes = 0;
    private bool _isSeeking = false;
    private Coroutine _downloadCoroutine;

    void Awake()
    {
        _videoPlayer = GetComponent<VideoPlayer>();
        _tempFilePath = Path.Combine(Application.temporaryCachePath, "streaming_video.mp4");

        if (File.Exists(_tempFilePath))
            File.Delete(_tempFilePath);
        _fileStream = new FileStream(_tempFilePath, FileMode.Create, FileAccess.Write);
    }

    void Start()
    {
        if (playPauseButton)
            playPauseButton.onClick.AddListener(TogglePlayPause);
        if (timeSlider)
        {
            timeSlider.onValueChanged.AddListener(OnSliderValueChanged);
        }

        _videoPlayer.errorReceived += (source, message) =>
            Debug.LogError($"VideoPlayer Error: {message}");
        _videoPlayer.prepareCompleted += (source) =>
        {
            if (statusText)
                statusText.text = "Ready to play";
            if (timeSlider)
                timeSlider.maxValue = (float)_videoPlayer.length;
            source.Play();
            UpdatePlayPauseButton();
        };

        StartCoroutine(StreamVideo());
    }

    void Update()
    {
        if (_videoPlayer.isPlaying && !_isSeeking && timeSlider)
        {
            timeSlider.value = (float)_videoPlayer.time;
        }
    }

    private void OnSliderValueChanged(float value)
    {
        if (Mathf.Abs((float)_videoPlayer.time - value) > 0.5f && !_isSeeking)
        {
            StartCoroutine(Seek(value));
        }
    }

    private void TogglePlayPause()
    {
        if (_videoPlayer.isPrepared)
        {
            if (_videoPlayer.isPlaying)
                _videoPlayer.Pause();
            else
                _videoPlayer.Play();
            UpdatePlayPauseButton();
        }
    }

    private void UpdatePlayPauseButton()
    {
        if (playPauseButtonText)
            playPauseButtonText.text = _videoPlayer.isPlaying ? "Pause" : "Play";
    }

    private IEnumerator StreamVideo()
    {
        if (statusText)
            statusText.text = "Getting video info...";
        yield return GetFileSize();

        if (_fileSize > 0)
        {
            _videoPlayer.source = VideoSource.Url;
            _videoPlayer.url = "file://" + _tempFilePath;

            if (statusText)
                statusText.text = "Downloading metadata...";

            // メタデータ優先でダウンロード
            yield return DownloadMetadataFirst();

            if (statusText)
                statusText.text = "Preparing player...";

            _videoPlayer.Prepare();
        }
    }

    // VideoInfoの型を定義
    [System.Serializable]
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

    [System.Serializable]
    private class VideoInfoAPIType
    {
        public bool success;
        public VideoInfo video;
    }

    private IEnumerator GetFileSize()
    {
        // videoInfoUrlから、.video.fileSizeでファイルサイズを取得する
        using (UnityWebRequest uwr = UnityWebRequest.Get(videoInfoUrl))
        {
            yield return uwr.SendWebRequest();
            if (uwr.result == UnityWebRequest.Result.Success)
            {
                // レスポンス例: {"success":true,"video":{"fileSize":239007770,...}}
                string jsonResponse = uwr.downloadHandler.text;
                Debug.Log($"Video info JSON: {jsonResponse}");
                try
                {
                    var responseObj = JsonUtility.FromJson<VideoInfoAPIType>(jsonResponse);
                    if (responseObj.success && responseObj.video != null)
                    {
                        _fileSize = responseObj.video.fileSize;
                        Debug.Log($"File size: {_fileSize} bytes");
                    }
                    else
                    {
                        Debug.LogError("Invalid response format or missing video data.");
                    }
                }
                catch (System.Exception e)
                {
                    Debug.LogError($"Failed to parse video info JSON: {e.Message}");
                }
            }
            else
            {
                Debug.LogError($"Error getting video info: {uwr.error}");
            }
        }
    }

    private IEnumerator DownloadVideo()
    {
        while (_downloadedBytes < _fileSize)
        {
            long start = _downloadedBytes;
            long end = (long)Mathf.Min(start + chunkSize - 1, _fileSize - 1);

            using (UnityWebRequest uwr = UnityWebRequest.Get(videoUrl))
            {
                uwr.SetRequestHeader("Range", $"bytes={start}-{end}");
                Debug.Log($"Requesting bytes {start}-{end}");
                yield return uwr.SendWebRequest();

                if (uwr.result == UnityWebRequest.Result.Success)
                {
                    byte[] data = uwr.downloadHandler.data;
                    _fileStream.Seek(start, SeekOrigin.Begin);
                    _fileStream.Write(data, 0, data.Length);
                    _downloadedBytes += data.Length;
                    _fileStream.Flush();
                }
                else
                {
                    Debug.LogError($"Error downloading range {start}-{end}: {uwr.error}");
                    yield break;
                }
            }

            if (_videoPlayer.isPlaying)
            {
                double bufferedTime = ((double)_downloadedBytes / _fileSize) * _videoPlayer.length;
                if (
                    bufferedTime
                    < _videoPlayer.time
                        + (continuousBufferSize / (double)_fileSize) * _videoPlayer.length
                )
                {
                    // Continue downloading
                }
                else
                {
                    yield return new WaitForSeconds(1f);
                }
            }
        }
    }

    private IEnumerator Seek(float time)
    {
        if (!_videoPlayer.isPrepared)
            yield break;

        _isSeeking = true;
        if (_downloadCoroutine != null)
            StopCoroutine(_downloadCoroutine);
        _videoPlayer.Pause();

        long seekByte = (long)((time / _videoPlayer.length) * _fileSize);
        _downloadedBytes = seekByte;

        if (statusText)
            statusText.text = $"Seeking to {time:F1}s...";
        _downloadCoroutine = StartCoroutine(DownloadVideo());

        while (_downloadedBytes < seekByte + initialBufferSize && _downloadedBytes < _fileSize)
        {
            yield return null;
        }

        _videoPlayer.time = time;
        _videoPlayer.Play();
        if (statusText)
            statusText.text = "Playing";
        _isSeeking = false;
    }

    void OnDestroy()
    {
        _fileStream?.Close();
        if (File.Exists(_tempFilePath))
            File.Delete(_tempFilePath);
    }

    private IEnumerator DownloadMetadataFirst()
    {
        long metadataSize = (long)Mathf.Min(5 * 1024 * 1024, _fileSize); // 5MBまたはファイルサイズの小さい方
        long initialDataSize = (long)Mathf.Min(2 * 1024 * 1024, _fileSize - metadataSize); // 2MB

        // 1. まずメタデータ（ファイル末尾）をダウンロード
        long metadataStart = _fileSize - metadataSize;
        yield return DownloadRange(metadataStart, _fileSize - 1, metadataStart);

        // 2. 先頭データをダウンロード
        yield return DownloadRange(0, initialDataSize - 1, 0);

        // 3. 残りをバックグラウンドでダウンロード
        _downloadCoroutine = StartCoroutine(DownloadRemainingData(initialDataSize, metadataStart));

        // 初期バッファが揃うまで待機
        while (_downloadedBytes < initialDataSize)
        {
            yield return null;
        }
    }

    private IEnumerator DownloadRange(long start, long end, long filePosition)
    {
        using (UnityWebRequest uwr = UnityWebRequest.Get(videoUrl))
        {
            uwr.SetRequestHeader("Range", $"bytes={start}-{end}");
            Debug.Log($"Downloading metadata bytes {start}-{end}");
            yield return uwr.SendWebRequest();

            if (uwr.result == UnityWebRequest.Result.Success)
            {
                byte[] data = uwr.downloadHandler.data;
                _fileStream.Seek(filePosition, SeekOrigin.Begin);
                _fileStream.Write(data, 0, data.Length);
                _downloadedBytes += data.Length;
                _fileStream.Flush();
                Debug.Log($"Downloaded {data.Length} bytes at position {filePosition}");
            }
            else
            {
                Debug.LogError($"Error downloading range {start}-{end}: {uwr.error}");
                if (uwr.responseCode == 416)
                {
                    Debug.LogWarning($"Range {start}-{end} not satisfiable, adjusting...");
                    // 範囲を調整して再試行
                    long adjustedEnd = (long)Mathf.Min(end, _fileSize - 1);
                    if (adjustedEnd > start)
                    {
                        yield return DownloadRange(start, adjustedEnd, filePosition);
                    }
                }
            }
        }
    }

    private IEnumerator DownloadRemainingData(long skipStart, long skipEnd)
    {
        long currentPos = skipStart;

        // 先頭からskipStartまでをダウンロード
        currentPos = skipStart;
        while (currentPos < skipEnd)
        {
            long chunkEnd = (long)Mathf.Min(currentPos + chunkSize - 1, skipEnd - 1);
            yield return DownloadRange(currentPos, chunkEnd, currentPos);
            currentPos += chunkSize;

            // 再生中でない場合は少し待機
            if (!_videoPlayer.isPlaying)
            {
                yield return new WaitForSeconds(0.1f);
            }
        }
    }
}
