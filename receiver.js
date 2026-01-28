const context = cast.framework.CastReceiverContext.getInstance();
const playerManager = context.getPlayerManager();

// --- Logging for CaC Tool (with Queuing) ---
const CAC_LOG_NAMESPACE = 'urn:x-cast:com.google.cast.cac';
window.queuedCacLogs = window.queuedCacLogs || [];
let contextInstance = context; // Hold context globally

function sendCacLog(message) {
  const logPayload = {
    timestamp: new Date().toLocaleTimeString(),
    level: 'LOG',
    message: message,
  };
  if (contextInstance) {
    const senders = contextInstance.getSenders();
    if (senders && senders.length > 0) {
      // Flush any queued logs first
      while (window.queuedCacLogs.length > 0) {
        const queuedPayload = window.queuedCacLogs.shift();
         senders.forEach(sender => {
          try {
            contextInstance.sendCustomMessage(CAC_LOG_NAMESPACE, sender.id, queuedPayload);
          } catch (e) { console.error('sendCustomMessage flush failed:', e); }
        });
      }
      // Send the current message
      senders.forEach(sender => {
        try {
          contextInstance.sendCustomMessage(CAC_LOG_NAMESPACE, sender.id, logPayload);
        } catch (e) { console.error('sendCustomMessage failed:', e); }
      });
      return;
    }
  }
  window.queuedCacLogs.push(logPayload);
  // console.log('Queued CAC Log:', message);
}

sendCacLog('Receiver: Script Loaded (Simple DRM Test w/ Logging).');

try {
  contextInstance.onSenderConnected = (event) => {
    sendCacLog('Receiver: Event - Sender Connected: ' + (event ? event.senderId : 'N/A'));
    // Attempt to flush logs when a sender connects
  };
  sendCacLog('Receiver: onSenderConnected handler set.');

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
      sendCacLog('Receiver: Handler - CustomData: ' + JSON.stringify(media.customData));

      const drmConfig = media.customData && media.customData.drm;
      if (drmConfig && drmConfig.protectionSystem === 'widevine' && drmConfig.licenseUrl) {
        sendCacLog('Receiver: Handler - APPLYING Widevine DRM.');
        playbackConfig.protectionSystem = cast.framework.ContentProtection.WIDEVINE;
        playbackConfig.licenseUrl = drmConfig.licenseUrl;
        sendCacLog('Receiver: Handler - License URL: ' + playbackConfig.licenseUrl);

        playbackConfig.shakaPlayerConfig = playbackConfig.shakaPlayerConfig || {};
        playbackConfig.shakaPlayerConfig.drm = playbackConfig.shakaPlayerConfig.drm || {};
        playbackConfig.shakaPlayerConfig.drm.servers = {
          'com.widevine.alpha': playbackConfig.licenseUrl
        };
      } else {
        sendCacLog('Receiver: Handler - NO/Invalid DRM config in customData.');
      }
    } catch (e) {
      sendCacLog('Receiver: Handler ERROR: ' + e.message);
    }
    sendCacLog('Receiver: setMediaPlaybackInfoHandler END');
    return playbackConfig;
  });
  sendCacLog('Receiver: MediaPlaybackInfoHandler Set.');

  // --- Player Event Listeners ---
  const eventTypes = cast.framework.events.EventType;
  const eventsToLog = [
    eventTypes.ERROR, eventTypes.PLAYING, eventTypes.PAUSE, eventTypes.ENDED,
    eventTypes.DRM_ERROR, eventTypes.LOAD_START, eventTypes.MEDIA_FINISHED,
    eventTypes.LOADING, eventTypes.READY
  ];
  eventsToLog.forEach(eventType => {
     playerManager.addEventListener(eventType, (event) => {
      sendCacLog('Receiver: Player Event - ' + eventType + ' | ' + JSON.stringify(event));
    });
  });
  sendCacLog('Receiver: Key player event listeners added.');

  // --- Start Receiver ---
  sendCacLog('Receiver: Calling context.start()...');
  contextInstance.start({ disableIdleTimeout: true });
  sendCacLog('Receiver: Context Started.');

} catch (err) {
  const errorMsg = 'Receiver: FATAL ERROR during setup: ' + err.message;
  sendCacLog(errorMsg);
  console.error(errorMsg, err);
}
