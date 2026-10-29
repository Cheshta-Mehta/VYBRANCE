"""Run after `npx cap add android`: copies native sources and adds permissions + service to the manifest."""
import glob
import os
import re
import sys

root = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
manifest = os.path.join(root, "android/app/src/main/AndroidManifest.xml")
mains = glob.glob(os.path.join(root, "android/app/src/main/java/**/MainActivity.java"), recursive=True)
if not os.path.exists(manifest) or not mains:
    sys.exit("android/ project not found: run `npx cap add android` first")

jdir = os.path.dirname(mains[0])
pkg = re.search(r"^package\s+([\w.]+);", open(mains[0], encoding="utf-8").read(), re.M).group(1)
for f in ("MainActivity.java", "SunoNativePlugin.java", "MonitorService.java"):
    t = open(os.path.join(root, "native", f), encoding="utf-8").read()
    t = re.sub(r"^package\s+[\w.]+;", "package %s;" % pkg, t, count=1, flags=re.M)
    open(os.path.join(jdir, f), "w", encoding="utf-8").write(t)

m = open(manifest, encoding="utf-8").read()
perms = ["RECORD_AUDIO", "MODIFY_AUDIO_SETTINGS", "SEND_SMS", "POST_NOTIFICATIONS", "FOREGROUND_SERVICE",
         "FOREGROUND_SERVICE_MICROPHONE", "WAKE_LOCK", "VIBRATE", "REQUEST_IGNORE_BATTERY_OPTIMIZATIONS"]
add = ""
for p in perms:
    if ('android.permission.%s"' % p) not in m:
        add += '    <uses-permission android:name="android.permission.%s" />\n' % p
if "android.hardware.telephony" not in m:
    add += '    <uses-feature android:name="android.hardware.telephony" android:required="false" />\n'
if add:
    m = m.replace("<application", add + "\n    <application", 1)
if "MonitorService" not in m:
    svc = ('        <service android:name=".MonitorService" android:exported="false" '
           'android:foregroundServiceType="microphone" />\n')
    m = m.replace("</application>", svc + "    </application>", 1)
open(manifest, "w", encoding="utf-8").write(m)
print("patched:", jdir, "package", pkg)
