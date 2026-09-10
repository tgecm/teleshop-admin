package com.crossmartmm.shop;

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
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;
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

        webView.setWebViewClient(new BridgeWebViewClient(getBridge()) {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if (request != null && request.getUrl() != null) {
                    String urlStr = request.getUrl().toString();
                    if (urlStr.contains("crosssmart.shop") || urlStr.contains("telegramecommerce.shop")) {
                        return false; // Force navigation inside WebView
                    }
                }
                return super.shouldOverrideUrlLoading(view, request);
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                super.onReceivedError(view, request, error);
                if (request != null && request.isForMainFrame()) {
                    int errorCode = Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? error.getErrorCode() : -1;
                    if (errorCode == ERROR_HOST_LOOKUP || errorCode == ERROR_CONNECT || errorCode == ERROR_TIMEOUT || errorCode == ERROR_FAILED_SSL_HANDSHAKE || errorCode == ERROR_DISCONNECTED) {
                        showOfflineCustomErrorPage(view);
                    }
                }
            }

            @Override
            public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
                super.onReceivedError(view, errorCode, description, failingUrl);
                if (errorCode == ERROR_HOST_LOOKUP || errorCode == ERROR_CONNECT || errorCode == ERROR_TIMEOUT || errorCode == ERROR_FAILED_SSL_HANDSHAKE || errorCode == ERROR_DISCONNECTED) {
                    showOfflineCustomErrorPage(view);
                }
            }
        });

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

    private void showOfflineCustomErrorPage(final WebView view) {
        if (view == null) return;
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                String targetUrl = "https://crosssmart.shop/dashboard";
                String customHtml = "<!DOCTYPE html><html>" +
                    "<head>" +
                    "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no\">" +
                    "<style>" +
                    "  * { box-sizing: border-box; margin: 0; padding: 0; }" +
                    "  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; " +
                    "         background-color: #f8fafc; color: #1e293b; display: flex; flex-direction: column; " +
                    "         align-items: center; justify-content: center; min-height: 100vh; padding: 24px; text-align: center; }" +
                    "  .card { background: #ffffff; border-radius: 24px; padding: 32px 24px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05); max-width: 340px; width: 100%; display: flex; flex-direction: column; align-items: center; }" +
                    "  .icon-wrapper { width: 72px; height: 72px; background: #eef2ff; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 20px; color: #6366f1; }" +
                    "  .icon-wrapper svg { width: 36px; height: 36px; stroke-width: 2; fill: none; stroke: currentColor; stroke-linecap: round; stroke-linejoin: round; }" +
                    "  h2 { font-size: 20px; font-weight: 700; color: #0f172a; margin-bottom: 8px; }" +
                    "  p { font-size: 14px; color: #64748b; line-height: 1.5; margin-bottom: 24px; }" +
                    "  .btn { background: #4f46e5; color: #ffffff; border: none; border-radius: 14px; padding: 14px 28px; font-size: 15px; font-weight: 600; width: 100%; cursor: pointer; outline: none; transition: background 0.2s; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.25); }" +
                    "  .btn:active { background: #4338ca; transform: scale(0.98); }" +
                    "</style>" +
                    "</head>" +
                    "<body>" +
                    "  <div class=\"card\">" +
                    "    <div class=\"icon-wrapper\">" +
                    "      <svg viewBox=\"0 0 24 24\"><line x1=\"1\" y1=\"1\" x2=\"23\" y2=\"23\"></line><path d=\"M16.72 11.06A10.94 10.94 0 0 1 19 12.55\"></path><path d=\"M5 12.55a10.94 10.94 0 0 1 5.17-2.39\"></path><path d=\"M10.71 5.05A16 16 0 0 1 22.58 9\"></path><path d=\"M1.42 9a15.91 15.91 0 0 1 4.7-2.88\"></path><path d=\"M8.53 16.11a6 6 0 0 1 6.95 0\"></path><line x1=\"12\" y1=\"20\" x2=\"12.01\" y2=\"20\"></line></svg>" +
                    "    </div>" +
                    "    <h2>No Internet Connection</h2>" +
                    "    <p>Unable to connect to server. Please check your internet connection and try again.</p>" +
                    "    <button class=\"btn\" onclick=\"window.location.href='" + targetUrl + "'\">Try Again</button>" +
                    "  </div>" +
                    "</body>" +
                    "</html>";
                view.loadDataWithBaseURL(targetUrl, customHtml, "text/html", "UTF-8", targetUrl);
            }
        });
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
