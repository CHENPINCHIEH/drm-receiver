const context = cast.framework.CastReceiverContext.getInstance();
const playerManager = context.getPlayerManager();

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
  } catch (e) {
    console.error("sendCacLog failed:", e);
  }
}

sendCacLog('Receiver: Script Loaded (Simple DRM Test).');

try {
  sendCacLog('Receiver: Setting up MediaPlaybackInfoHandler...');

  // --- Simplified MediaPlaybackInfoHandler for DRM ---
  playerManager.setMediaPlaybackInfoHandler((loadRequestData, playbackConfig) => {
    sendCacLog('Receiver: setMediaPlaybackInfoHandler START');
    try {
      const media = loadRequestData ? loadRequestData.media : null;
      if (!media) {
        sendCacLog('Receiver: Handler WARN - No media object.');
        return playbackConfig;
      }
      const contentId = media.contentId || 'UNKNOWN';
      sendCacLog('Receiver: Handler - Content ID: ' + contentId);

      // ALWAYS apply DRM for this simple test
      sendCacLog('Receiver: Handler - APPLYING Widevine DRM.');
      playbackConfig.protectionSystem = cast.framework.ContentProtection.WIDEVINE;
      // License URL from customData or fallback to default test server
      playbackConfig.licenseUrl = (media.customData && media.customData.licenseUrl) || 'https://cwip-shaka-proxy.appspot.com/no_auth';
      sendCacLog('Receiver: Handler - License URL: ' + playbackConfig.licenseUrl);

      // Basic Shaka config for the license server
      playbackConfig.shakaPlayerConfig = playbackConfig.shakaPlayerConfig || {};
      playbackConfig.shakaPlayerConfig.drm = playbackConfig.shakaPlayerConfig.drm || {};
      playbackConfig.shakaPlayerConfig.drm.servers = {
        'com.widevine.alpha': playbackConfig.licenseUrl
      };

    } catch (e) {
      sendCacLog('Receiver: Handler ERROR: ' + e.message);
      console.error('Handler ERROR:', e);
    }
    sendCacLog('Receiver: setMediaPlaybackInfoHandler END');
    return playbackConfig;
  });
  sendCacLog('Receiver: MediaPlaybackInfoHandler Set.');

  // NO MESSAGE INTERCEPTOR - We expect the sender to provide the full MediaInformation

  // --- Player Event Listeners for Debugging ---
  const eventTypes = cast.framework.events.EventType;
  const eventsToLog = [eventTypes.ERROR, eventTypes.PLAYING, eventTypes.PAUSE, eventTypes.ENDED, eventTypes.DRM_ERROR];
  eventsToLog.forEach(eventType => {
     playerManager.addEventListener(eventType, (event) => {
      sendCacLog('Receiver: Player Event - ' + eventType + ' | ' + JSON.stringify(event));
    });
  });
  sendCacLog('Receiver: Key player event listeners added.');

  // --- Start Receiver ---
  sendCacLog('Receiver: Calling context.start()...');
  context.start({ disableIdleTimeout: true });
  sendCacLog('Receiver: Context Started.');

} catch (err) {
  const errorMsg = 'Receiver: FATAL ERROR during setup: ' + err.message;
  sendCacLog(errorMsg);
  console.error(errorMsg, err);
}
