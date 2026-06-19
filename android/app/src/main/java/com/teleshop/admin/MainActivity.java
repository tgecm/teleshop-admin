package com.teleshop.admin;

import android.app.DownloadManager;
import android.content.Context;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.webkit.DownloadListener;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.widget.Toast;
import com.getcapacitor.BridgeActivity;
import java.io.File;
import java.io.FileOutputStream;
import android.util.Base64;
import java.util.HashMap;
import java.util.Map;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        WebView webView = getBridge().getWebView();
        webView.addJavascriptInterface(new BlobDownloadInterface(), "AndroidBridge");

        webView.setDownloadListener(new DownloadListener() {
            @Override
            public void onDownloadStart(String url, String userAgent,
                    String contentDisposition, String mimetype, long contentLength) {
                try {
                    if (url.startsWith("blob:")) {
                        String js = "javascript:(function() {"
                            + "var xhr = new XMLHttpRequest();"
                            + "xhr.open('GET', '" + url + "', true);"
                            + "xhr.responseType = 'blob';"
                            + "xhr.onload = function() {"
                            + "  var reader = new FileReader();"
                            + "  reader.onloadend = function() {"
                            + "    var base64 = reader.result.split(',')[1];"
                            + "    var mime = reader.result.split(',')[0].split(':')[1].split(';')[0];"
                            + "    AndroidBridge.downloadBase64(base64, mime, '" + contentDisposition + "');"
                            + "  };"
                            + "  reader.readAsDataURL(xhr.response);"
                            + "};"
                            + "xhr.send();"
                            + "})()";
                        webView.loadUrl(js);
                    } else {
                        String fileName = getFileNameFromUrl(url, contentDisposition, mimetype);
                        DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
                        request.setMimeType(mimetype);
                        request.addRequestHeader("User-Agent", userAgent);
                        request.addRequestHeader("Cookie", android.webkit.CookieManager.getInstance().getCookie(url));
                        request.setTitle(fileName);
                        request.setDescription("Downloading...");
                        request.setNotificationVisibility(
                            DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                        request.setDestinationInExternalPublicDir(
                            Environment.DIRECTORY_DOWNLOADS, fileName);
                        DownloadManager dm = (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
                        dm.enqueue(request);
                        Toast.makeText(getApplicationContext(),
                            "Downloading " + fileName, Toast.LENGTH_SHORT).show();
                    }
                } catch (Exception e) {
                    Toast.makeText(getApplicationContext(),
                        "Download error: " + e.getMessage(), Toast.LENGTH_LONG).show();
                }
            }
        });
    }

    private String getFileNameFromUrl(String url, String contentDisposition, String mime) {
        // Try from content disposition first
        if (contentDisposition != null && contentDisposition.contains("filename=")) {
            String name = contentDisposition.substring(contentDisposition.indexOf("filename=") + 9);
            name = name.replace("\"", "").trim();
            if (!name.isEmpty()) return name;
        }
        // Try from URL
        String name = url.substring(url.lastIndexOf("/") + 1);
        if (name.contains("?")) name = name.substring(0, name.indexOf("?"));
        if (!name.isEmpty() && name.contains(".")) return name;
        // Fallback with mime extension
        return "download_" + System.currentTimeMillis() + getExtFromMime(mime);
    }

    private String getExtFromMime(String mime) {
        if (mime == null) return ".bin";
        Map<String, String> map = new HashMap<>();
        // Images
        map.put("image/jpeg", ".jpg");
        map.put("image/png", ".png");
        map.put("image/gif", ".gif");
        map.put("image/webp", ".webp");
        map.put("image/svg+xml", ".svg");
        map.put("image/bmp", ".bmp");
        // Videos
        map.put("video/mp4", ".mp4");
        map.put("video/3gpp", ".3gp");
        map.put("video/x-matroska", ".mkv");
        map.put("video/webm", ".webm");
        map.put("video/quicktime", ".mov");
        map.put("video/x-msvideo", ".avi");
        // Audio
        map.put("audio/mpeg", ".mp3");
        map.put("audio/wav", ".wav");
        map.put("audio/ogg", ".ogg");
        map.put("audio/aac", ".aac");
        // Documents
        map.put("application/pdf", ".pdf");
        map.put("application/msword", ".doc");
        map.put("application/vnd.openxmlformats-officedocument.wordprocessingml.document", ".docx");
        map.put("application/vnd.ms-excel", ".xls");
        map.put("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ".xlsx");
        map.put("application/vnd.ms-powerpoint", ".ppt");
        map.put("application/vnd.openxmlformats-officedocument.presentationml.presentation", ".pptx");
        // Text
        map.put("text/plain", ".txt");
        map.put("text/csv", ".csv");
        map.put("text/html", ".html");
        map.put("application/json", ".json");
        // Archives
        map.put("application/zip", ".zip");
        map.put("application/x-rar-compressed", ".rar");
        map.put("application/x-7z-compressed", ".7z");
        // APK
        map.put("application/vnd.android.package-archive", ".apk");

        String ext = map.get(mime);
        return ext != null ? ext : ".bin";
    }

    class BlobDownloadInterface {
        @JavascriptInterface
        public void downloadBase64(String base64, String mime, String contentDisposition) {
            try {
                String fileName = "download_" + System.currentTimeMillis() + getExtFromMime(mime);

                byte[] data = Base64.decode(base64, Base64.DEFAULT);
                File downloadsDir = Environment.getExternalStoragePublicDirectory(
                    Environment.DIRECTORY_DOWNLOADS);
                if (!downloadsDir.exists()) downloadsDir.mkdirs();
                File file = new File(downloadsDir, fileName);
                FileOutputStream fos = new FileOutputStream(file);
                fos.write(data);
                fos.close();

                // Notify media scanner
                android.media.MediaScannerConnection.scanFile(
                    getApplicationContext(),
                    new String[]{file.getAbsolutePath()},
                    null, null);

                runOnUiThread(() -> Toast.makeText(getApplicationContext(),
                    "Saved to Downloads: " + fileName, Toast.LENGTH_SHORT).show());

            } catch (Exception e) {
                runOnUiThread(() -> Toast.makeText(getApplicationContext(),
                    "Save failed: " + e.getMessage(), Toast.LENGTH_LONG).show());
            }
        }
    }
}
