const context = cast.framework.CastReceiverContext.getInstance();
const playerManager = context.getPlayerManager();

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

sendCacLog('Receiver script parsing.');

try {
  playerManager.setMediaPlaybackInfoHandler((loadRequestData, playbackConfig) => {
    const media = loadRequestData ? loadRequestData.media : null;
    const contentId = media && media.contentId ? media.contentId : 'UNKNOWN';
    sendCacLog('setMediaPlaybackInfoHandler for: ' + contentId);

    if (!media) {
      sendCacLog('MediaPlaybackInfoHandler: No media object in request.');
      return playbackConfig; // Or return an error
    }

    // BUGGY PART: Apply Widevine to everything.
    playbackConfig.protectionSystem = cast.framework.ContentProtection.WIDEVINE;
    playbackConfig.licenseUrl = 'https://cwip-shaka-proxy.appspot.com/no_auth';
    sendCacLog('Applied Widevine DRM config to: ' + contentId);
    return playbackConfig;
  });
  sendCacLog('MediaPlaybackInfoHandler set.');

  playerManager.setMessageInterceptor(
    cast.framework.messages.MessageType.LOAD,
    (request) => {
      sendCacLog('LOAD interceptor entry. Request: ' + JSON.stringify(request));

      // Ensure request.media exists, though we are about to overwrite it.
      if (!request.media) {
          request.media = new cast.framework.messages.MediaInformation();
      }

      sendCacLog('LOAD interceptor: Injecting DRM content with VMAP ads and stitching.');
      const media = request.media;
      media.contentId = 'https://storage.googleapis.com/shaka-demo-assets/angel-one-widevine/dash.mpd';
      media.streamType = cast.framework.messages.StreamType.BUFFERED;
      media.contentType = 'application/dash+xml';
      media.vmapAdsRequest = new cast.framework.messages.VmapAdsRequest();
      media.vmapAdsRequest.adTagUrl = 'https://pubads.g.doubleclick.net/gampad/ads?sz=640x480&iu=/124319096/external/ad_rule_samples&ciu_szs=300x250&ad_rule=1&impl=s&gdfp_req=1&env=vp&output=vmap&unviewed_position_start=1&cust_params=deployment%3Ddevsite%26sample_ar%3Dpreonly&cmsid=496&vid=short_onecue&correlator=';
      media.stitchedContentTimeline = true;
      // Clear customData to avoid confusion in this buggy version
      media.customData = {};

      sendCacLog('LOAD interceptor: Modified request: ' + JSON.stringify(request));
      return request;
    }
  );
  sendCacLog('LOAD message interceptor set.');

  const options = new cast.framework.CastReceiverOptions();
  options.disableIdleTimeout = true;
  context.start(options);
  sendCacLog('Cast Receiver Context Started.');

} catch (err) {
  sendCacLog('ERROR during receiver setup: ' + err.message + ' | ' + err.stack);
  // Also log to console for chrome://inspect
  console.error('ERROR during receiver setup:', err);
}
