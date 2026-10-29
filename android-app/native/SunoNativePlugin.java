package com.sunosuraksha.app;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;
import android.telephony.SmsManager;

import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

import java.util.ArrayList;

@CapacitorPlugin(
    name = "SunoNative",
    permissions = {
        @Permission(strings = { Manifest.permission.RECORD_AUDIO }, alias = "mic"),
        @Permission(strings = { Manifest.permission.SEND_SMS }, alias = "sms"),
        @Permission(strings = { "android.permission.POST_NOTIFICATIONS" }, alias = "notif")
    }
)
public class SunoNativePlugin extends Plugin {

    private static final String ALERT_CH = "suno_alerts";

    /** Start the foreground service (microphone type) so Android keeps the app and mic alive in background. */
    @PluginMethod
    public void startMonitoring(PluginCall call) {
        try {
            Context c = getContext();
            ContextCompat.startForegroundService(c, new Intent(c, MonitorService.class));
            call.resolve();
        } catch (Exception e) {
            call.reject("startMonitoring failed: " + e.getMessage());
        }
    }

    @PluginMethod
    public void stopMonitoring(PluginCall call) {
        try {
            getContext().stopService(new Intent(getContext(), MonitorService.class));
        } catch (Exception ignored) { }
        call.resolve();
    }

    /** Send SMS directly from the SIM. Needs no internet, only mobile network + SMS balance. */
    @PluginMethod
    public void sendSms(PluginCall call) {
        if (getPermissionState("sms") != PermissionState.GRANTED) {
            call.reject("SEND_SMS permission not granted");
            return;
        }
        JSArray nums = call.getArray("numbers");
        String text = call.getString("text", "");
        if (nums == null || nums.length() == 0 || text == null || text.isEmpty()) {
            call.reject("numbers and text are required");
            return;
        }
        try {
            SmsManager sm = Build.VERSION.SDK_INT >= 31
                ? getContext().getSystemService(SmsManager.class)
                : SmsManager.getDefault();
            ArrayList<String> parts = sm.divideMessage(text);
            int queued = 0;
            for (int i = 0; i < nums.length(); i++) {
                String n = nums.optString(i, "").trim();
                if (n.isEmpty()) continue;
                sm.sendMultipartTextMessage(n, null, parts, null, null);
                queued++;
            }
            JSObject r = new JSObject();
            r.put("queued", queued);
            call.resolve(r);
        } catch (Exception e) {
            call.reject("SMS failed: " + e.getMessage());
        }
    }

    /** Native heads-up notification with alarm sound + vibration. Works offline and with screen off. */
    @PluginMethod
    public void showAlert(PluginCall call) {
        try {
            Context c = getContext();
            NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
            if (Build.VERSION.SDK_INT >= 26 && nm.getNotificationChannel(ALERT_CH) == null) {
                NotificationChannel ch = new NotificationChannel(ALERT_CH, "SunoSuraksha alerts", NotificationManager.IMPORTANCE_HIGH);
                Uri snd = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
                ch.setSound(snd, new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).build());
                ch.enableVibration(true);
                ch.setVibrationPattern(new long[] { 0, 300, 150, 300, 150, 600 });
                nm.createNotificationChannel(ch);
            }
            Intent open = c.getPackageManager().getLaunchIntentForPackage(c.getPackageName());
            PendingIntent pi = PendingIntent.getActivity(c, 0, open,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            NotificationCompat.Builder b = new NotificationCompat.Builder(c, ALERT_CH)
                .setSmallIcon(android.R.drawable.ic_dialog_alert)
                .setContentTitle(call.getString("title", "SunoSuraksha"))
                .setContentText(call.getString("body", ""))
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setAutoCancel(true)
                .setContentIntent(pi);
            nm.notify((int) (System.currentTimeMillis() & 0x7fffffff), b.build());
            call.resolve();
        } catch (Exception e) {
            call.reject("showAlert failed: " + e.getMessage());
        }
    }

    /** Ask Android not to battery-optimise this app (important on Xiaomi/Oppo/Vivo/Samsung). */
    @PluginMethod
    public void requestBatteryExemption(PluginCall call) {
        try {
            Context c = getContext();
            PowerManager pm = (PowerManager) c.getSystemService(Context.POWER_SERVICE);
            if (Build.VERSION.SDK_INT >= 23 && !pm.isIgnoringBatteryOptimizations(c.getPackageName())) {
                Intent i = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                i.setData(Uri.parse("package:" + c.getPackageName()));
                i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                c.startActivity(i);
            }
        } catch (Exception ignored) { }
        call.resolve();
    }
}
