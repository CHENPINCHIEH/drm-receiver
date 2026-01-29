const context = cast.framework.CastReceiverContext.getInstance();
const playerManager = context.getPlayerManager();
const CAC_LOG_NAMESPACE = 'urn:x-cast:com.google.cast.cac';
window.queuedCacLogs = window.queuedCacLogs || [];

// --- Config ---
const MAIN_DRM_CONTENT_ID = 'https://storage.googleapis.com/shaka-demo-assets/angel-one-widevine/dash.mpd';
const WIDEVINE_LICENSE_SERVER = 'https://cwip-shaka-proxy.appspot.com/no_auth';
// 使用您剛剛測試成功、確定可播放的 MP4 連結
const WORKING_AD_MP4 = 'https://storage.googleapis.com/interactive-media-ads/media/android.mp4';

// --- 建構自定義 VMAP XML (指向會動的 MP4) ---
// 這樣可以繞過外部廣告伺服器的不穩定因素
const CUSTOM_VMAP_XML = `
<vmap:VMAP xmlns:vmap="http://www.iab.net/videosuite/vmap" version="1.0">
  <vmap:AdBreak timeOffset="start" breakType="linear" breakId="preroll">
    <vmap:AdSource id="preroll-ad-source" allowMultipleAds="false" followRedirects="true">
      <vmap:VASTAdData>
        <VAST version="3.0">
          <Ad id="1">
            <InLine>
              <AdSystem>Test</AdSystem>
              <AdTitle>Working MP4 Ad</AdTitle>
              <Creatives>
                <Creative>
                  <Linear>
                    <Duration>00:00:10</Duration>
                    <MediaFiles>
                      <MediaFile delivery="progressive" type="video/mp4" width="640" height="360">
                        <![CDATA[${WORKING_AD_MP4}]]>
                      </MediaFile>
                    </MediaFiles>
                  </Linear>
                </Creative>
              </Creatives>
            </InLine>
          </Ad>
        </VAST>
      </vmap:VASTAdData>
    </vmap:AdSource>
  </vmap:AdBreak>
</vmap:VMAP>
`.trim();

// 將 XML 轉換為 Data URI，讓 Receiver 把它當作一個網址讀取
const VMAP_DATA_URI = 'data:text/xml;charset=utf-8,' + encodeURIComponent(CUSTOM_VMAP_XML);


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
          adTagUrl: VMAP_DATA_URI // <--- 關鍵：使用 Data URI
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
