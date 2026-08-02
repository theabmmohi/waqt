package com.theabmmohi.waqt;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;
import java.util.Map;
public class CustomFirebaseMessagingService extends FirebaseMessagingService {
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
    String prayer = data.get("prayer");
    String waqtEnd = data.get("waqtEnd");
    int notifId;
    try {
      notifId = Integer.parseInt(data.get("notifId"));
    } catch (Exception e) {
      notifId = (int) (System.currentTimeMillis() % Integer.MAX_VALUE);
    }
    NotificationHelper.showNotification(this, notifId, title, body, url, actionsJson, prayer, waqtEnd);
  }
}
