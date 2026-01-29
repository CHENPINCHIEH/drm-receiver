const context = cast.framework.CastReceiverContext.getInstance();
const playerManager = context.getPlayerManager();
const CAC_LOG_NAMESPACE = 'urn:x-cast:com.google.cast.cac';
window.queuedCacLogs = window.queuedCacLogs || [];

// --- Config ---
const MAIN_DRM_CONTENT_ID = 'https://storage.googleapis.com/shaka-demo-assets/angel-one-widevine/dash.mpd';
const WIDEVINE_LICENSE_SERVER = 'https://cwip-shaka-proxy.appspot.com/no_auth';
// 使用您剛剛測試成功、確定可播放的 MP4 連結
// const WORKING_AD_MP4 = 'https://storage.googleapis.com/interactive-media-ads/media/android.mp4';
const HOSTED_VMAP_URL = 'https://chenpinchieh.github.io/cast_sender_sample/custom_vmap.xml';




// --- Logging for CaC Tool ---
function sendCacLog(message) {
  const logPayload = { timestamp: new Date().toLocaleTimeString(), level: 'LOG', message: "[Receiver] " + message };
  const senders = context.getSenders();
  if (senders && senders.length > 0) {
    while (window.queuedCacLogs.length > 0) {
      const queuedPayload = window.queuedCacLogs.shift();
      senders.forEach(sender => { try { context.sendCustomMessage(CAC_LOG_NAMESPACE, sender.id, queuedPayload); } catch (e) {} });
    }
    senders.forEach(sender => { try { context.sendCustomMessage(CAC_LOG_NAMESPACE, sender.id, logPayload); } catch (e) {} });
  } else {
    window.queuedCacLogs.push(logPayload);
  }
}

sendCacLog('Script Loaded: Custom VMAP + DRM');

try {
  context.onSenderConnected = (event) => { sendCacLog('Sender Connected'); };

  // --- 1. Interceptor: 使用我們自製的 VMAP URI ---
  playerManager.setMessageInterceptor(
    cast.framework.messages.MessageType.LOAD,
    (request) => {
      sendCacLog('LOAD Interceptor: Injecting DRM + Custom VMAP');
      request.media = {
        contentId: MAIN_DRM_CONTENT_ID,
        contentType: 'application/dash+xml',
        streamType: 'BUFFERED',
        title: 'DRM + Custom VMAP Test',
        vmapAdsRequest: {
          adTagUrl: 'https://pubads.g.doubleclick.net/gampad/ads?sz=640x480&iu=/124319096/external/ad_rule_samples&ciu_szs=300x250&ad_rule=1&impl=s&gdfp_req=1&env=vp&output=vmap&unviewed_position_start=1&cust_params=deployment%3Ddevsite%26sample_ar%3Dpreonly&cmsid=496&vid=short_onecue&correlator='
        },
        stitchedContentTimeline: true
      };
      return request;
    }
  );
  sendCacLog('Interceptor Set.');

  // --- 2. Handler: 包含 Fix 的版本 ---
  playerManager.setMediaPlaybackInfoHandler((loadRequestData, playbackConfig) => {
    const media = loadRequestData.media;
    const contentId = media && media.contentId ? media.contentId : 'UNKNOWN';
    sendCacLog('Handler Content ID: ' + contentId);

    // *** THE FIX ***
    if (contentId === MAIN_DRM_CONTENT_ID) {
      sendCacLog('>> APPLYING Widevine for MAIN Content.');
      playbackConfig.protectionSystem = cast.framework.ContentProtection.WIDEVINE;
      playbackConfig.licenseUrl = WIDEVINE_LICENSE_SERVER;
      playbackConfig.shakaPlayerConfig = {
        drm: { servers: { 'com.widevine.alpha': WIDEVINE_LICENSE_SERVER } }
      };
    } else {
      // 這是廣告 (我們的 android.mp4)，不做 DRM 設定
      sendCacLog('>> SKIPPING DRM for Ad: ' + contentId);
      playbackConfig.protectionSystem = undefined;
      playbackConfig.licenseUrl = undefined;
    }
    return playbackConfig;
  });
  sendCacLog('Handler Set.');

  // --- Event Listeners ---
  const { EventType } = cast.framework.events;
  playerManager.addEventListener(EventType.ERROR, (e) => sendCacLog('ERROR: ' + JSON.stringify(e)));
  playerManager.addEventListener(EventType.PLAYING, () => sendCacLog('PLAYING'));
 
  
  context.start({ disableIdleTimeout: true });
  sendCacLog('Context Started.');

} catch (err) {
  sendCacLog('FATAL: ' + err.message);
}
