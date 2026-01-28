const context = cast.framework.CastReceiverContext.getInstance();
const playerManager = context.getPlayerManager();

/**
 * Sends a log message to any connected CaC Tool instances.
 * @param {string} message - The message to log.
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
    // Fail silently if CaC logging has an issue.
  }
}

// MediaPlaybackInfoHandler: INTENTIONALLY BUGGY
// Applies Widevine DRM settings to ALL content requests, including clear ads.
playerManager.setMediaPlaybackInfoHandler((loadRequestData, playbackConfig) => {
  const contentId = loadRequestData.media && loadRequestData.media.contentId ? loadRequestData.media.contentId : 'UNKNOWN';
  sendCacLog('setMediaPlaybackInfoHandler for: ' + contentId);

  // BUG: Apply Widevine to everything.
  playbackConfig.protectionSystem = cast.framework.ContentProtection.WIDEVINE;
  playbackConfig.licenseUrl = 'https://cwip-shaka-proxy.appspot.com/no_auth';
  // No custom licenseRequestHandler needed for this license server.

  sendCacLog('Applied Widevine DRM config to: ' + contentId);
  return playbackConfig;
});

// Intercept LOAD to force the test scenario.
playerManager.setMessageInterceptor(
  cast.framework.messages.MessageType.LOAD,
  (request) => {
    sendCacLog('LOAD interceptor: Injecting DRM content with VMAP ads and stitching.');

    const media = new cast.framework.messages.MediaInformation();
    media.contentId = 'https://storage.googleapis.com/shaka-demo-assets/angel-one-widevine/dash.mpd';
    media.streamType = cast.framework.messages.StreamType.BUFFERED;
    media.contentType = 'application/dash+xml';

    // VMAP Pre-roll Ad Request
    media.vmapAdsRequest = new cast.framework.messages.VmapAdsRequest();
    media.vmapAdsRequest.adTagUrl = 'https://pubads.g.doubleclick.net/gampad/ads?sz=640x480&iu=/124319096/external/ad_rule_samples&ciu_szs=300x250&ad_rule=1&impl=s&gdfp_req=1&env=vp&output=vmap&unviewed_position_start=1&cust_params=deployment%3Ddevsite%26sample_ar%3Dpreonly&cmsid=496&vid=short_onecue&correlator=';

    // Enable Stitched Timeline - key part of the problem scenario
    media.stitchedContentTimeline = true;

    request.media = media;
    return request;
  }
);

// Start the receiver
context.start({ disableIdleTimeout: true }); // Disable idle timeout for testing
sendCacLog('Cast Receiver Context Started');

