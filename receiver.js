const context = cast.framework.CastReceiverContext.getInstance();
const playerManager = context.getPlayerManager();
const CAC_LOG_NAMESPACE = 'urn:x-cast:com.google.cast.cac';
window.queuedCacLogs = window.queuedCacLogs || [];

// --- Logging for CaC Tool ---
function sendCacLog(message) {
  const logPayload = {
    timestamp: new Date().toLocaleTimeString(),
    level: 'LOG',
    message: message,
  };
  const senders = context.getSenders();
  if (senders && senders.length > 0) {
    while (window.queuedCacLogs.length > 0) {
      const queuedPayload = window.queuedCacLogs.shift();
      senders.forEach(sender => {
        try { context.sendCustomMessage(CAC_LOG_NAMESPACE, sender.id, queuedPayload); } catch (e) { }
      });
    }
    senders.forEach(sender => {
      try { context.sendCustomMessage(CAC_LOG_NAMESPACE, sender.id, logPayload); } catch (e) { }
    });
  } else {
    window.queuedCacLogs.push(logPayload);
    console.log('Queued CAC Log:', message);
  }
}

sendCacLog('Receiver: CLEAR MP4 Test Loaded.');

try {
  context.onSenderConnected = (event) => {
    sendCacLog('Receiver: Event - Sender Connected.');
  };

  // --- INTERCEPT ALL LOAD REQUESTS TO FORCE A CLEAR MP4 ---
  playerManager.setMessageInterceptor(
    cast.framework.messages.MessageType.LOAD,
    (request) => {
      sendCacLog('Receiver: LOAD Interceptor - Forcing Clear MP4');
      request.media = {
        contentId: 'https://storage.googleapis.com/testtopbox-public/video_content/bbb/BigBuckBunny.mp4', // Public Clear MP4
        contentType: 'video/mp4',
        streamType: 'BUFFERED',
        title: 'Big Buck Bunny'
      };
      return request;
    }
  );
  sendCacLog('Receiver: LOAD Interceptor Set.');

  // NO setMediaPlaybackInfoHandler needed for clear content

  // --- Basic Player Event Listeners ---
  playerManager.addEventListener(cast.framework.events.EventType.ERROR, (event) => {
    sendCacLog('Receiver: Player Event - ERROR: ' + JSON.stringify(event));
  });
  playerManager.addEventListener(cast.framework.events.EventType.PLAYING, (event) => {
    sendCacLog('Receiver: Player Event - PLAYING');
  });
  playerManager.addEventListener(cast.framework.events.EventType.LOAD_START, (event) => {
    sendCacLog('Receiver: Player Event - LOAD_START');
  });
  sendCacLog('Receiver: Basic event listeners added.');

  // --- Start Receiver ---
  sendCacLog('Receiver: Calling context.start()...');
  context.start({ disableIdleTimeout: true });
  sendCacLog('Receiver: Context Started.');

} catch (err) {
  const errorMsg = 'Receiver: FATAL ERROR during setup: ' + err.message;
  sendCacLog(errorMsg);
  console.error(errorMsg, err);
}
