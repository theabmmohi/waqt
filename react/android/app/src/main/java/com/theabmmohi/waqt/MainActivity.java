package com.theabmmohi.waqt;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    registerPlugin(ApkDownloadManagerPlugin.class);
    super.onCreate(savedInstanceState);
  }
}
