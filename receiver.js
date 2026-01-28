const context = cast.framework.CastReceiverContext.getInstance();
const playerManager = context.getPlayerManager();

// Define the URL of your main DRM content
const MAIN_DRM_CONTENT_ID = 'https://storage.googleapis.com/shaka-demo-assets/angel-one-widevine/dash.mpd';

/**
 * Sends a log message to any connected CaC Tool instances.
 */
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
  } catch (e) {
    // Ignore logging errors
  }
}

// ----------------------------------------------------------------------
// THE FIX: Conditional MediaPlaybackInfoHandler
// ----------------------------------------------------------------------
playerManager.setMediaPlaybackInfoHandler((loadRequestData, playbackConfig) => {
  const currentContentId = loadRequestData.media.contentId;
  sendCacLog('setMediaPlaybackInfoHandler called for: ' + currentContentId);

  // CHECK: Is this the main DRM content?
  if (currentContentId === MAIN_DRM_CONTENT_ID) {
    sendCacLog('>> MATCH: Applying Widevine DRM config for Main Content.');
    
    playbackConfig.protectionSystem = cast.framework.ContentProtection.WIDEVINE;
    playbackConfig.licenseUrl = 'https://cwip-shaka-proxy.appspot.com/no_auth';
  } else {
    // If it is NOT the main content (e.g., it is an Ad), do NOT apply DRM.
    sendCacLog('>> NO MATCH: Skipping DRM config (Likely an Ad).');
  }

  return playbackConfig;
});

// ----------------------------------------------------------------------
// Setup the Test Scenario (Ads + Stitched Timeline + DRM)
// ----------------------------------------------------------------------
playerManager.setMessageInterceptor(
  cast.framework.messages.MessageType.LOAD,
  (request) => {
    sendCacLog('LOAD interceptor: Setting up VMAP + Stitched Timeline + DRM scenario.');

    const media = new cast.framework.messages.MediaInformation();
    
    // 1. Set the Main Content ID (Must match the check in the handler above)
    media.contentId = MAIN_DRM_CONTENT_ID;
    media.streamType = cast.framework.messages.StreamType.BUFFERED;
    media.contentType = 'application/dash+xml';

    // 2. Inject VMAP Ad Request
    media.vmapAdsRequest = new cast.framework.messages.VmapAdsRequest();
    media.vmapAdsRequest.adTagUrl = 'https://pubads.g.doubleclick.net/gampad/ads?sz=640x480&iu=/124319096/external/ad_rule_samples&ciu_szs=300x250&ad_rule=1&impl=s&gdfp_req=1&env=vp&output=vmap&unviewed_position_start=1&cust_params=deployment%3Ddevsite%26sample_ar%3Dpreonly&cmsid=496&vid=short_onecue&correlator=';

    // 3. Enable Stitched Timeline
    media.stitchedContentTimeline = true;

    request.media = media;
    return request;
  }
);

// Start the receiver
context.start({ disableIdleTimeout: true });
sendCacLog('Receiver Started with FIXED Logic.');
