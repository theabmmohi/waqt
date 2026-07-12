package com.theabmmohi.waqt;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.UnsupportedEncodingException;
import java.net.URLEncoder;
import java.util.Map;
public class CustomFirebaseMessagingService extends FirebaseMessagingService {
  private static final String CHANNEL_ID = "waqt_push";
  private static final String SCHEME = "com.theabmmohi.waqt";
  @Override
  public void onNewToken(String token) {
    super.onNewToken(token);
  }
  @Override
  public void onMessageReceived(RemoteMessage remoteMessage) {
    super.onMessageReceived(remoteMessage);
    Map<String, String> data = remoteMessage.getData();
    if (data.isEmpty()) return;
    String title = data.get("title");
    String body = data.get("body");
    String url = data.get("url");
    String actionsJson = data.get("actions");
    int notifId;
    try {
      notifId = Integer.parseInt(data.get("notifId"));
    } catch (Exception e) {
      notifId = (int) (System.currentTimeMillis() % Integer.MAX_VALUE);
    }
    showNotification(notifId, title, body, url, actionsJson);
  }
  private void showNotification(int notifId, String title, String body, String url, String actionsJson) {
    NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
    if (nm == null) return;
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      if (nm.getNotificationChannel(CHANNEL_ID) == null) {
        NotificationChannel channel = new NotificationChannel(
          CHANNEL_ID,
          "Prayer & app notifications",
          NotificationManager.IMPORTANCE_HIGH
        );
        channel.setLightColor(Color.parseColor("#F57C00"));
        nm.createNotificationChannel(channel);
      }
    }
    int piFlags = PendingIntent.FLAG_UPDATE_CURRENT
      | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0);
    PendingIntent contentPI = PendingIntent.getActivity(
      this, notifId, buildDeepLinkIntent(url), piFlags
    );
    NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
      .setSmallIcon(R.drawable.ic_stat_waqt)
      .setColor(Color.parseColor("#F57C00"))
      .setContentTitle(title != null ? title : "Waqt")
      .setContentText(body != null ? body : "")
      .setAutoCancel(true)
      .setPriority(NotificationCompat.PRIORITY_HIGH)
      .setContentIntent(contentPI);
    if (actionsJson != null) {
      try {
        JSONArray actions = new JSONArray(actionsJson);
        for (int i = 0; i < Math.min(actions.length(), 2); i++) {
          JSONObject action = actions.getJSONObject(i);
          String actionUrl = action.has("url") ? action.optString("url") : url;
          PendingIntent actionPI = PendingIntent.getActivity(
            this, notifId + i + 1, buildDeepLinkIntent(actionUrl), piFlags
          );
          builder.addAction(0, action.optString("title", "Open"), actionPI);
        }
      } catch (Exception ignored) {
      }
    }
    nm.notify(notifId, builder.build());
  }
  private Intent buildDeepLinkIntent(String url) {
    String encoded = "";
    if (url != null) {
      try {
        encoded = URLEncoder.encode(url, "UTF-8");
      } catch (UnsupportedEncodingException e) {
        encoded = url;
      }
    }
    Uri uri = Uri.parse(SCHEME + "://push?url=" + encoded);
    Intent intent = new Intent(Intent.ACTION_VIEW, uri);
    intent.setPackage(getPackageName());
    intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
    return intent;
  }
}