package com.ecommercemyanmar.shop;

import android.app.DownloadManager;
import android.content.ContentValues;
import android.content.Context;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.webkit.DownloadListener;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.widget.Toast;
import com.getcapacitor.BridgeActivity;
import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import android.util.Base64;
import java.util.HashMap;
import java.util.Map;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        WebView webView = getBridge().getWebView();
        webView.getSettings().setJavaScriptEnabled(true);
        webView.getSettings().setDomStorageEnabled(true);
        webView.getSettings().setAllowFileAccessFromFileURLs(false);
        webView.getSettings().setAllowUniversalAccessFromFileURLs(false);
        webView.getSettings().setMixedContentMode(android.webkit.WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        webView.addJavascriptInterface(new BlobDownloadInterface(), "AndroidBridge");

        webView.setDownloadListener(new DownloadListener() {
            @Override
            public void onDownloadStart(String url, String userAgent,
                    String contentDisposition, String mimetype, long contentLength) {
                try {
                    if (url.startsWith("blob:")) {
                        // Inject JS to convert blob to base64
                        String js = "javascript:(function() {" +
                            "fetch('" + url + "')" +
                            ".then(r => r.blob())" +
                            ".then(blob => {" +
                            "  const reader = new FileReader();" +
                            "  reader.onloadend = function() {" +
                            "    const base64 = reader.result.split(',')[1];" +
                            "    const mime = blob.type;" +
                            "    window.AndroidBridge.downloadBase64(base64, mime, '" + contentDisposition + "');" +
                            "  };" +
                            "  reader.readAsDataURL(blob);" +
                            "})" +
                            ".catch(e => window.AndroidBridge.showError(e.toString()));" +
                            "})()";
                        webView.evaluateJavascript(js, null);
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
        if (contentDisposition != null && contentDisposition.contains("filename=")) {
            String name = contentDisposition.substring(contentDisposition.indexOf("filename=") + 9);
            name = name.replace("\"", "").trim();
            if (!name.isEmpty()) return name;
        }
        String name = url.substring(url.lastIndexOf("/") + 1);
        if (name.contains("?")) name = name.substring(0, name.indexOf("?"));
        if (!name.isEmpty() && name.contains(".")) return name;
        return "download_" + System.currentTimeMillis() + getExtFromMime(mime);
    }

    private String getExtFromMime(String mime) {
        if (mime == null) return ".bin";
        Map<String, String> map = new HashMap<>();
        map.put("image/jpeg", ".jpg");
        map.put("image/png", ".png");
        map.put("image/gif", ".gif");
        map.put("image/webp", ".webp");
        map.put("video/mp4", ".mp4");
        map.put("video/3gpp", ".3gp");
        map.put("video/webm", ".webm");
        map.put("audio/mpeg", ".mp3");
        map.put("audio/wav", ".wav");
        map.put("application/pdf", ".pdf");
        map.put("application/msword", ".doc");
        map.put("application/vnd.openxmlformats-officedocument.wordprocessingml.document", ".docx");
        map.put("application/vnd.ms-excel", ".xls");
        map.put("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ".xlsx");
        map.put("text/plain", ".txt");
        map.put("text/csv", ".csv");
        map.put("application/json", ".json");
        map.put("application/zip", ".zip");
        return map.getOrDefault(mime, ".bin");
    }

    class BlobDownloadInterface {
        @JavascriptInterface
        public void downloadBase64(String base64, String mime, String contentDisposition) {
            final byte[] data = Base64.decode(base64, Base64.DEFAULT);
            final String name = getFileNameFromContentDisposition(contentDisposition);
            final String fileName = name != null ? name :
                "download_" + System.currentTimeMillis() + getExtFromMime(mime);

            // ContentResolver operations must run on UI thread
            runOnUiThread(() -> {
                try {
                    boolean saved = false;

                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                        saved = saveViaMediaStore(data, fileName, mime);
                    }

                    if (!saved) {
                        saved = saveViaAppDir(data, fileName, mime);
                    }

                    if (saved) {
                        Toast.makeText(getApplicationContext(),
                            "Saved: " + fileName, Toast.LENGTH_SHORT).show();
                    } else {
                        Toast.makeText(getApplicationContext(),
                            "Save failed: could not write file", Toast.LENGTH_LONG).show();
                    }
                } catch (Exception e) {
                    Toast.makeText(getApplicationContext(),
                        "Save failed: " + e.getMessage(), Toast.LENGTH_LONG).show();
                }
            });
        }

        private boolean saveViaMediaStore(byte[] data, String fileName, String mime) {
            try {
                ContentValues values = new ContentValues();
                values.put(MediaStore.Downloads.DISPLAY_NAME, fileName);
                values.put(MediaStore.Downloads.MIME_TYPE, mime != null ? mime : "application/octet-stream");
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    values.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);
                }
                Uri uri = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                if (uri == null) return false;

                OutputStream os = getContentResolver().openOutputStream(uri);
                if (os == null) return false;
                os.write(data);
                os.close();
                return true;
            } catch (Exception ignored) {
                return false;
            }
        }

        private boolean saveViaAppDir(byte[] data, String fileName, String mime) {
            try {
                File dir = getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
                if (dir == null) dir = getFilesDir();
                dir.mkdirs();
                File file = new File(dir, fileName);
                FileOutputStream fos = new FileOutputStream(file);
                fos.write(data);
                fos.close();

                android.media.MediaScannerConnection.scanFile(
                    getApplicationContext(),
                    new String[]{file.getAbsolutePath()},
                    mime != null ? new String[]{mime} : null, null);
                return true;
            } catch (Exception ignored) {
                return false;
            }
        }

        private String getFileNameFromContentDisposition(String contentDisposition) {
            if (contentDisposition != null && contentDisposition.contains("filename=")) {
                String name = contentDisposition.substring(contentDisposition.indexOf("filename=") + 9);
                name = name.replace("\"", "").trim();
                if (!name.isEmpty()) return name;
            }
            return null;
        }

        @JavascriptInterface
        public void showError(String error) {
            runOnUiThread(() -> Toast.makeText(getApplicationContext(),
                "JS Error: " + error, Toast.LENGTH_LONG).show());
        }
    }
}
