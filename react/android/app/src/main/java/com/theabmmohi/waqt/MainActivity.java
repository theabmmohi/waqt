package com.theabmmohi.waqt;
import android.os.Bundle;
import android.webkit.WebSettings;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;
public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    registerPlugin(ApkDownloadManagerPlugin.class);
    super.onCreate(savedInstanceState);
    this.bridge.getWebView().setBackgroundColor(ContextCompat.getColor(this, R.color.webview_background));
    WebSettings settings = this.bridge.getWebView().getSettings();
    settings.setSupportZoom(false);
    settings.setBuiltInZoomControls(false);
    settings.setDisplayZoomControls(false);
  }
}