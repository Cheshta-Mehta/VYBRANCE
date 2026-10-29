/* Runs only inside the Android app. Loaded AFTER hackfinal.html own script, so it can reuse its globals.
   1) SMS through the phone SIM (no internet).  2) Real Android notifications (work offline, screen off).
   3) Foreground service while any audio source is running (keeps monitoring alive in background). */
(function () {
  "use strict";
  var C = window.Capacitor;
  if (!C || !C.isNativePlatform || !C.isNativePlatform()) return;   // plain browser: do nothing
  var N = C.registerPlugin("SunoNative");
  var $ = function (s) { return document.querySelector(s); };

  /* ---- permissions (mic, SMS, notifications) ---- */
  function ensurePerms() {
  return N.requestPermissions().then(function (p) {
    var s = p && p.sms;
    var m = p && p.mic;

    if (s !== "granted" || m !== "granted") {
      throw new Error("Microphone aur SMS permissions allow karo");
    }
  });
}

  /* ---- SMS target is typed in the existing "SMS relay URL" box ----
     native:+919876543210,+911234567890   -> SMS from this phone SIM
     http://...                           -> old relay server behaviour (unchanged) */
  var box = $("#smsU");
  if (box && !box.value.trim()) {
    var v = prompt("SunoSuraksha: phone number(s) that should get alert SMS (with country code, comma separated), e.g. +919876543210. Leave empty to skip.", "");
    if (v && v.trim()) { box.value = "native:" + v.trim(); try { sv("ss_smsu", box.value); } catch (e) {} }
  }

  var origSms = window.sms;
  window.sms = async function (ev, force) {
    var u = (($("#smsU") && $("#smsU").value) || "").trim();
    if (!/^native/i.test(u)) return origSms.apply(this, arguments);
    if (!force && (ev.demo || ev.lv < 3)) return;                    // same rule as the app: real High Risk / Critical only
    var nums = u.replace(/^native:?/i, "").split(",").map(function (x) { return x.trim(); }).filter(Boolean);
    ev.sms = "sms sending";
    try {
      if (!nums.length) throw new Error("no number: type native:+91XXXXXXXXXX in the SMS relay URL box");
      await ensurePerms();
      var text = "SunoSuraksha " + ev.sev + ": " + ev.kind + " on " + ev.asset + " (score " + ev.score + ")" + (ev.demo ? " [DEMO]" : "");
      var r = await N.sendSms({ numbers: nums, text: text });
      ev.sms = "sms handed to SIM for " + r.queued + " number(s), no internet needed; delivery not confirmed";
    } catch (e) { ev.sms = "sms FAILED (" + (e.message || e) + ")"; }
    sv("ss_events", events); feed();
    $("#smsMsg").textContent = "Last SMS: " + ev.sms;
  };

  /* ---- Notification API -> native Android notification ---- */
  function Shim(title, opts) { N.showAlert({ title: String(title), body: (opts && opts.body) || "" }).catch(function () {}); }
  Shim.permission = "granted";
  Shim.requestPermission = function () { return ensurePerms().then(function () { return "granted"; }, function () { return "denied"; }); };
  try { Object.defineProperty(window, "Notification", { value: Shim, configurable: true, writable: true }); } catch (e) { window.Notification = Shim; }

  /* ---- foreground service while monitoring ---- */
  var svc = false;
  setInterval(function () {
    var on = (typeof srcKind !== "undefined") && srcKind !== "none";
    if (on && !svc) {
      svc = true;
      ensurePerms().then(function () { return N.startMonitoring(); }).catch(function (e) { svc = false; console.warn("startMonitoring", e); });
    } else if (!on && svc) {
      svc = false; N.stopMonitoring().catch(function () {});
    }
  }, 1000);

  /* ---- first launch: ask permissions + battery exemption ---- */
  setTimeout(function () {
    ensurePerms().catch(function () {}).then(function () {
      if (!localStorage.getItem("ss_batt_asked")) { localStorage.setItem("ss_batt_asked", "1"); N.requestBatteryExemption().catch(function () {}); }
    });
  }, 1500);
})();
