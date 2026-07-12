package com.theabmmohi.waqt;

import android.Manifest;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.media.MediaScannerConnection;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;

// Saves a file already sitting in app storage into the device's public
// Downloads folder, so it's visible/openable from the stock Files app or any
// file manager — a more familiar, more trusted place than the app's private
// cache dir for people who aren't comfortable with an in-app installer prompt.
//
// Android 10+ (API 29+): written via MediaStore.Downloads, no permission needed.
// Android 9 and older: written directly to the public Downloads dir, which
// requires the WRITE_EXTERNAL_STORAGE runtime permission on API 23-28.
@CapacitorPlugin(
  name = "SaveToDownloads",
  permissions = {
    @Permission(alias = "storage", strings = { Manifest.permission.WRITE_EXTERNAL_STORAGE })
  }
)
public class SaveToDownloadsPlugin extends Plugin {

  @PluginMethod()
  public void save(PluginCall call) {
    if (!call.getData().has("path") || !call.getData().has("filename")) {
      call.reject("path and filename are required");
      return;
    }
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q && getPermissionState("storage") != PermissionState.GRANTED) {
      requestPermissionForAlias("storage", call, "storagePermsCallback");
      return;
    }
    performSave(call);
  }

  @PermissionCallback
  private void storagePermsCallback(PluginCall call) {
    if (getPermissionState("storage") != PermissionState.GRANTED) {
      call.reject("Storage permission is required to save to Downloads");
      return;
    }
    performSave(call);
  }

  private void performSave(PluginCall call) {
    String path = call.getString("path");
    String filename = call.getString("filename");
    String mimeType = call.getString("mimeType", "application/octet-stream");
    try {
      String rawPath = path.startsWith("file:") ? Uri.parse(path).getPath() : path;
      File source = rawPath != null ? new File(rawPath) : null;
      if (source == null || !source.exists()) {
        call.reject("Source file does not exist");
        return;
      }
      Uri savedUri = Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q
        ? saveViaMediaStore(source, filename, mimeType)
        : saveViaLegacyFile(source, filename);
      JSObject ret = new JSObject();
      ret.put("uri", savedUri.toString());
      call.resolve(ret);
    } catch (IOException e) {
      call.reject(e.getMessage() != null ? e.getMessage() : "Failed to save file", e);
    }
  }

  private Uri saveViaMediaStore(File source, String filename, String mimeType) throws IOException {
    ContentResolver resolver = getContext().getContentResolver();
    ContentValues values = new ContentValues();
    values.put(MediaStore.Downloads.DISPLAY_NAME, filename);
    values.put(MediaStore.Downloads.MIME_TYPE, mimeType);
    values.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);
    values.put(MediaStore.Downloads.IS_PENDING, 1);
    Uri item = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
    if (item == null) throw new IOException("Unable to create entry in Downloads");
    try (InputStream in = new FileInputStream(source); OutputStream out = resolver.openOutputStream(item)) {
      if (out == null) throw new IOException("Unable to open output stream");
      copy(in, out);
    }
    ContentValues done = new ContentValues();
    done.put(MediaStore.Downloads.IS_PENDING, 0);
    resolver.update(item, done, null, null);
    return item;
  }

  private Uri saveViaLegacyFile(File source, String filename) throws IOException {
    File downloads = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
    if (!downloads.exists()) downloads.mkdirs();
    File dest = new File(downloads, filename);
    try (InputStream in = new FileInputStream(source); OutputStream out = new FileOutputStream(dest)) {
      copy(in, out);
    }
    // Without this, older Android's media scanner won't index the file until a reboot
    // or manual rescan, so it may not show up in some file managers right away.
    MediaScannerConnection.scanFile(getContext(), new String[]{ dest.getAbsolutePath() }, null, null);
    return Uri.fromFile(dest);
  }

  private void copy(InputStream in, OutputStream out) throws IOException {
    byte[] buf = new byte[8192];
    int len;
    while ((len = in.read(buf)) > 0) out.write(buf, 0, len);
  }
}
