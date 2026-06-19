package com.teleshop.admin;

import android.app.DownloadManager;
import android.content.Context;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.webkit.DownloadListener;
import android.webkit.WebView;
import android.widget.Toast;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        WebView webView = getBridge().getWebView();
        webView.setDownloadListener(new DownloadListener() {
            @Override
            public void onDownloadStart(String url, String userAgent,
                    String contentDisposition, String mimetype, long contentLength) {
                try {
                    String fileName = url.substring(url.lastIndexOf("/") + 1);
                    if (fileName.isEmpty() || !fileName.contains(".")) {
                        fileName = "download_" + System.currentTimeMillis();
                    }

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

                } catch (Exception e) {
                    Toast.makeText(getApplicationContext(),
                        "Download failed: " + e.getMessage(), Toast.LENGTH_LONG).show();
                }
            }
        });
    }
}
