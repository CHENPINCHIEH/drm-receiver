const context = cast.framework.CastReceiverContext.getInstance();
const playerManager = context.getPlayerManager();

// --- Configuration ---
// URL of the main DRM-protected content. MUST match the one in the interceptor.
const MAIN_DRM_CONTENT_ID = 'https://storage.googleapis.com/shaka-demo-assets/angel-one-widevine/dash.mpd';
const WIDEVINE_LICENSE_SERVER = 'https://cwip-shaka-proxy.appspot.com/no_auth';

// --- Logging for CaC Tool ---
function sendCacLog(message) {
  try {
    const logPayload = {
      timestamp: new Date().toLocaleTimeString(),
      level: 'LOG',
      message: message,
    };
    const senders = context.getSenders();
    if (senders && senders.length > 0) {
      senders.forEach(sender => {
        context.sendCustomMessage('urn:x-cast:com.google.cast.cac', sender.id, logPayload);
      });
    }
  } catch (e) { /* Ignore */ }
}

sendCacLog('Receiver: Script Loaded.');

try {
  // --- FIXED MediaPlaybackInfoHandler ---
  playerManager.setMediaPlaybackInfoHandler((loadRequestData, playbackConfig) => {
    const media = loadRequestData ? loadRequestData.media : null;
    const contentId = media && media.contentId ? media.contentId : 'UNKNOWN';
    sendCacLog('Receiver: setMediaPlaybackInfoHandler for: ' + contentId);

    if (!media) {
      sendCacLog('Receiver: Handler Warning - No media object.');
      return playbackConfig;
    }

    // THE FIX: Only apply DRM if the contentId is the main DRM content.
    if (contentId === MAIN_DRM_CONTENT_ID) {
      sendCacLog('Receiver: Handler - Applying Widevine for MAIN Content.');
      playbackConfig.protectionSystem = cast.framework.ContentProtection.WIDEVINE;
      playbackConfig.licenseUrl = WIDEVINE_LICENSE_SERVER;
    } else {
      // Otherwise, assume it's an ad or other clear content.
      sendCacLog('Receiver: Handler - Skipping DRM for: ' + contentId + ' (Assuming Ad)');
      // Explicitly ensure no DRM is configured for this segment.
      playbackConfig.protectionSystem = undefined;
      playbackConfig.licenseUrl = undefined;
    }
    return playbackConfig;
  });
  sendCacLog('Receiver: MediaPlaybackInfoHandler Set (FIXED).');

  // --- Interceptor to force the test case ---
  playerManager.setMessageInterceptor(
    cast.framework.messages.MessageType.LOAD,
    (request) => {
      sendCacLog('Receiver: LOAD Interceptor - Modifying request for test setup.');
      const media = request.media || new cast.framework.messages.MediaInformation();

      media.contentId = MAIN_DRM_CONTENT_ID;
      media.streamType = cast.framework.messages.StreamType.BUFFERED;
      media.contentType = 'application/dash+xml';

      // VMAP Ad Request
      media.vmapAdsRequest = new cast.framework.messages.VmapAdsRequest();
      media.vmapAdsRequest.adTagUrl = 'https://pubads.g.doubleclick.net/gampad/ads?sz=640x480&iu=/124319096/external/ad_rule_samples&ciu_szs=300x250&ad_rule=1&impl=s&gdfp_req=1&env=vp&output=vmap&unviewed_position_start=1&cust_params=deployment%3Ddevsite%26sample_ar%3Dpreonly&cmsid=496&vid=short_onecue&correlator=';

      // Enable Stitched Timeline
      media.stitchedContentTimeline = true;
      media.customData = {};
      request.media = media;

      sendCacLog('Receiver: LOAD Interceptor - Modified request: ' + JSON.stringify(request.media, null, 2));
      return request;
    }
  );
  sendCacLog('Receiver: LOAD Message Interceptor Set.');

  // --- Start Receiver ---
  context.start({ disableIdleTimeout: true });
  sendCacLog('Receiver: Context Started.');

} catch (err) {
  const errorMsg = 'Receiver: ERROR during setup: ' + err.message;
  sendCacLog(errorMsg);
  console.error(errorMsg, err);
}
