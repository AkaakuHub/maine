using System;

/// <summary>
/// Data models for video streaming API responses
/// </summary>
[Serializable]
public class VideoInfo
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
    public double watchProgress;
    public double watchTime;
    public bool isLiked;
    public string lastWatched;
    public bool isInWatchlist;
}

[Serializable]
public class VideoInfoAPIType
{
    public bool success;
    public VideoInfo video;
}
