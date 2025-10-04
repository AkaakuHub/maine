using System;
using System.Collections; // コルーチンを使うために必要
using UnityEngine;

public class NativeVideoController : MonoBehaviour
{
    // 再生したい動画のURL
    public string videoUrl =
        "http://localhost:3001/api/video/%2FUsers%2Fakaaku%2FMovies%2Fyt-dlp-data%2Fexample.mp4";

    private OVROverlay _overlay;
    private AndroidJavaObject _playerBridge;

    // StartをIEnumeratorに変更
    IEnumerator Start()
    {
        // 同じGameObjectにアタッチされているOVROverlayコンポーネントを取得
        _overlay = GetComponent<OVROverlay>();
        if (_overlay == null)
        {
            Debug.LogError("OVROverlay component not found on this GameObject.");
            yield break; // 処理を中断
        }

        // 1フレーム待機して、OVROverlayの初期化を待つ
        yield return null;

        // isExternalSurfaceが有効なOVROverlayからネイティブのSurfaceオブジェクトを取得
        IntPtr androidSurface = _overlay.externalSurfaceObject;

        if (androidSurface != IntPtr.Zero)
        {
            Debug.Log("Successfully got external surface object. Initializing player...");
            InitializePlayer(androidSurface);
            PrepareAndPlay();
        }
        else
        {
            // このエラーはUnityエディタ上では必ず表示されます
            Debug.LogError(
                "Failed to get external surface object. This is expected in the Unity Editor. Please test on a Quest 3 device."
            );
        }
    }

    private void InitializePlayer(IntPtr surface)
    {
        // UnityのメインActivityを取得
        AndroidJavaClass unityPlayer = new AndroidJavaClass("com.unity3d.player.UnityPlayer");
        AndroidJavaObject currentActivity = unityPlayer.GetStatic<AndroidJavaObject>(
            "currentActivity"
        );

        // AAR内のPlayerBridgeクラスをインスタンス化
        // コンストラクタにActivityとSurfaceのIntPtrを渡す
        _playerBridge = new AndroidJavaObject(
            "com.yourcompany.player.PlayerBridge",
            currentActivity,
            surface
        );
    }

    private void PrepareAndPlay()
    {
        if (_playerBridge != null)
        {
            _playerBridge.Call("prepare", videoUrl);
            _playerBridge.Call("play");
            Debug.Log("Play command sent to native player.");
        }
    }

    void OnDestroy()
    {
        // アプリケーション終了時にネイティブプレーヤーを解放
        if (_playerBridge != null)
        {
            _playerBridge.Call("release");
            _playerBridge.Dispose();
        }
    }
}
