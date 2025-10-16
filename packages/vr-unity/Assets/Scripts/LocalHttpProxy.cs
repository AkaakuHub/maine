using System;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading;
using System.Threading.Tasks;
using UnityEngine;

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
