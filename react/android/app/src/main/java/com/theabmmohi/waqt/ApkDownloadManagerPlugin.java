package com.theabmmohi.waqt;

import android.app.DownloadManager;
import android.content.Context;
import android.database.Cursor;
import android.net.Uri;
import android.os.Environment;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "ApkDownloadManager")
public class ApkDownloadManagerPlugin extends Plugin {
  @PluginMethod()
  public void enqueue(PluginCall call) {
    String url = call.getString("url");
    String filename = call.getString("filename");
    if (url == null || filename == null) {
      call.reject("url and filename are required");
      return;
    }
    try {
      DownloadManager dm = (DownloadManager) getContext().getSystemService(Context.DOWNLOAD_SERVICE);
      DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
      request.setTitle(filename);
      request.setDescription("Downloading update");
      request.setMimeType("application/vnd.android.package-archive");
      request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
      request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, filename);
      request.setAllowedOverMetered(true);
      request.setAllowedOverRoaming(true);
      long id = dm.enqueue(request);
      JSObject ret = new JSObject();
      ret.put("id", String.valueOf(id));
      call.resolve(ret);
    } catch (Exception e) {
      call.reject(e.getMessage() != null ? e.getMessage() : "Failed to start download", e);
    }
  }
  @PluginMethod()
  public void getStatus(PluginCall call) {
    Long id = parseId(call);
    if (id == null) return;
    DownloadManager dm = (DownloadManager) getContext().getSystemService(Context.DOWNLOAD_SERVICE);
    DownloadManager.Query query = new DownloadManager.Query().setFilterById(id);
    try (Cursor cursor = dm.query(query)) {
      if (cursor == null || !cursor.moveToFirst()) {
        call.reject("Download not found");
        return;
      }
      int statusCode = cursor.getInt(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS));
      long bytesDownloaded = cursor.getLong(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR));
      long totalBytes = cursor.getLong(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_TOTAL_SIZE_BYTES));
      String status;
      switch (statusCode) {
        case DownloadManager.STATUS_SUCCESSFUL: status = "successful"; break;
        case DownloadManager.STATUS_FAILED: status = "failed"; break;
        case DownloadManager.STATUS_PAUSED: status = "paused"; break;
        case DownloadManager.STATUS_PENDING: status = "pending"; break;
        case DownloadManager.STATUS_RUNNING: status = "running"; break;
        default: status = "unknown";
      }
      JSObject ret = new JSObject();
      ret.put("status", status);
      ret.put("bytesDownloaded", bytesDownloaded);
      ret.put("totalBytes", totalBytes);
      call.resolve(ret);
    }
  }
  @PluginMethod()
  public void remove(PluginCall call) {
    Long id = parseId(call);
    if (id == null) return;
    DownloadManager dm = (DownloadManager) getContext().getSystemService(Context.DOWNLOAD_SERVICE);
    dm.remove(id);
    call.resolve();
  }
  @PluginMethod()
  public void cleanupStale(PluginCall call) {
    DownloadManager dm = (DownloadManager) getContext().getSystemService(Context.DOWNLOAD_SERVICE);
    try (Cursor cursor = dm.query(new DownloadManager.Query())) {
      if (cursor != null) {
        int titleIdx = cursor.getColumnIndex(DownloadManager.COLUMN_TITLE);
        int idIdx = cursor.getColumnIndex(DownloadManager.COLUMN_ID);
        while (cursor.moveToNext()) {
          String title = titleIdx >= 0 ? cursor.getString(titleIdx) : null;
          if (title != null && title.matches("waqt-.*\\.apk")) {
            dm.remove(cursor.getLong(idIdx));
          }
        }
      }
    }
    call.resolve();
  }
  private Long parseId(PluginCall call) {
    String idStr = call.getString("id");
    if (idStr == null) {
      call.reject("id is required");
      return null;
    }
    try {
      return Long.parseLong(idStr);
    } catch (NumberFormatException e) {
      call.reject("Invalid id");
      return null;
    }
  }
}