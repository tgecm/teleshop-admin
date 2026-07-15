package com.crossmartmm.shop;

import android.annotation.SuppressLint;
import android.app.DownloadManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.database.Cursor;
import android.media.MediaScannerConnection;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.webkit.CookieManager;
import android.webkit.DownloadListener;
import android.webkit.JavascriptInterface;
import android.webkit.URLUtil;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;
import androidx.core.content.FileProvider;
import androidx.webkit.WebViewAssetLoader;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;

public class MainActivity extends AppCompatActivity {

    private static final String APP_URL = "https://www.crossmart.shop/dashboard";
    private WebView webView;
    private String pendingFcmToken = "";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        webView = findViewById(R.id.webview);

        SharedPreferences prefs = getSharedPreferences("fcm", MODE_PRIVATE);
        pendingFcmToken = prefs.getString("fcm_token", "");

        setupWebView();
        loadAppUrl();
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void setupWebView() {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        settings.setUserAgentString(settings.getUserAgentString() + " CrossMartWebApp/1.0");
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);

        webView.addJavascriptInterface(new BlobDownloadBridge(), "BlobDownloadBridge");
        webView.addJavascriptInterface(new FCMBridge(), "AndroidFCM");
    }

    private void loadAppUrl() {
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                if (url.startsWith(APP_URL) || url.startsWith("https://www.crossmart.shop")) {
                    return false;
                }
                Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                startActivity(intent);
                return true;
            }
        });

        webView.setWebChromeClient(new WebChromeClient());

        webView.setDownloadListener(new DownloadListener() {
            @Override
            public void onDownloadStart(String url, String userAgent, String contentDisposition, String mimeType, long contentLength) {
                if (url.startsWith("blob:")) {
                    handleBlobDownload(url, contentDisposition);
                } else {
                    handleRegularDownload(url, userAgent, contentDisposition, mimeType);
                }
            }
        });

        webView.loadUrl(APP_URL);
    }

    private void handleRegularDownload(String url, String userAgent, String contentDisposition, String mimeType) {
        try {
            DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
            request.setMimeType(mimeType);
            request.addRequestHeader("Cookie", CookieManager.getInstance().getCookie(url));
            request.addRequestHeader("User-Agent", userAgent);
            request.setDescription("Downloading file...");
            request.setTitle(URLUtil.guessFileName(url, contentDisposition, mimeType));
            request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
            request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS,
                URLUtil.guessFileName(url, contentDisposition, mimeType));

            DownloadManager dm = (DownloadManager) getSystemService(DOWNLOAD_SERVICE);
            if (dm != null) {
                dm.enqueue(request);
                Toast.makeText(this, "Download started", Toast.LENGTH_SHORT).show();
            }
        } catch (Exception e) {
            Toast.makeText(this, "Download failed: " + e.getMessage(), Toast.LENGTH_LONG).show();
        }
    }

    private void handleBlobDownload(String url, String contentDisposition) {
        String js = "(function() {" +
            "var xhr = new XMLHttpRequest();" +
            "xhr.open('GET', '" + url + "', true);" +
            "xhr.responseType = 'blob';" +
            "xhr.onload = function() {" +
            "  var blob = xhr.response;" +
            "  var reader = new FileReader();" +
            "  reader.onloadend = function() {" +
            "    var base64 = reader.result.split(',')[1];" +
            "    var cd = '" + (contentDisposition != null ? contentDisposition.replaceAll("'", "\\'") : "") + "';" +
            "    BlobDownloadBridge.downloadBase64(base64, blob.type, cd);" +
            "  };" +
            "  reader.readAsDataURL(blob);" +
            "};" +
            "xhr.send();" +
            "})();";
        webView.evaluateJavascript(js, null);
    }

    private class BlobDownloadBridge {
        @JavascriptInterface
        public void downloadBase64(String base64, String mimeType, String contentDisposition) {
            try {
                byte[] data = android.util.Base64.decode(base64, android.util.Base64.DEFAULT);
                String fileName = getFileName(contentDisposition, mimeType);
                saveFile(data, fileName, mimeType);
            } catch (Exception e) {
                runOnUiThread(() ->
                    Toast.makeText(MainActivity.this, "Download failed: " + e.getMessage(), Toast.LENGTH_LONG).show());
            }
        }

        private String getFileName(String contentDisposition, String mimeType) {
            if (contentDisposition != null && !contentDisposition.isEmpty()) {
                for (String part : contentDisposition.split(";")) {
                    if (part.trim().startsWith("filename=")) {
                        return part.trim().substring(9).replaceAll("^\"|\"$", "");
                    }
                }
            }
            return "download_" + System.currentTimeMillis() + getExtension(mimeType);
        }

        private String getExtension(String mimeType) {
            if (mimeType == null) return ".bin";
            switch (mimeType) {
                case "image/jpeg": return ".jpg";
                case "image/png": return ".png";
                case "image/gif": return ".gif";
                case "image/webp": return ".webp";
                case "video/mp4": return ".mp4";
                case "video/webm": return ".webm";
                case "audio/mpeg": return ".mp3";
                case "audio/wav": return ".wav";
                case "application/pdf": return ".pdf";
                case "application/msword": return ".doc";
                case "application/vnd.openxmlformats-officedocument.wordprocessingml.document": return ".docx";
                case "application/vnd.ms-excel": return ".xls";
                case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": return ".xlsx";
                case "text/plain": return ".txt";
                case "text/csv": return ".csv";
                case "application/json": return ".json";
                case "application/zip": return ".zip";
                default: return ".bin";
            }
        }

        private void saveFile(byte[] data, String fileName, String mimeType) throws IOException {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                android.content.ContentValues values = new android.content.ContentValues();
                values.put(MediaStore.Downloads.DISPLAY_NAME, fileName);
                values.put(MediaStore.Downloads.MIME_TYPE, mimeType);
                values.put(MediaStore.Downloads.IS_PENDING, 1);

                Uri uri = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                if (uri != null) {
                    try (java.io.OutputStream out = getContentResolver().openOutputStream(uri)) {
                        if (out != null) {
                            out.write(data);
                        }
                    }
                    values.clear();
                    values.put(MediaStore.Downloads.IS_PENDING, 0);
                    getContentResolver().update(uri, values, null, null);

                    runOnUiThread(() ->
                        Toast.makeText(MainActivity.this, "Downloaded: " + fileName, Toast.LENGTH_SHORT).show());
                }
            } else {
                File dir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
                if (!dir.exists()) dir.mkdirs();
                File file = new File(dir, fileName);
                try (FileOutputStream out = new FileOutputStream(file)) {
                    out.write(data);
                }
                MediaScannerConnection.scanFile(MainActivity.this,
                    new String[]{file.getAbsolutePath()}, null, null);
                runOnUiThread(() ->
                    Toast.makeText(MainActivity.this, "Downloaded: " + fileName, Toast.LENGTH_SHORT).show());
            }
        }
    }

    private class FCMBridge {
        @JavascriptInterface
        public String getToken() {
            return pendingFcmToken;
        }
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
