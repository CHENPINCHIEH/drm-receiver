const context = cast.framework.CastReceiverContext.getInstance();

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
    } else {
      // Queue message if no senders yet
      if (!window.queuedCacLogs) window.queuedCacLogs = [];
      window.queuedCacLogs.push(logPayload);
    }
  } catch (e) { console.error("sendCacLog failed:", e); }
}

function flushQueuedLogs() {
    if (window.queuedCacLogs && window.queuedCacLogs.length > 0) {
        const senders = context.getSenders();
        if (senders && senders.length > 0) {
            sendCacLog('Receiver: Flushing ' + window.queuedCacLogs.length + ' queued logs.');
            window.queuedCacLogs.forEach(logPayload => {
                senders.forEach(sender => {
                    context.sendCustomMessage('urn:x-cast:com.google.cast.cac', sender.id, logPayload);
                });
            });
            window.queuedCacLogs = [];
        }
    }
}

sendCacLog('Receiver: MINIMAL - Script Loaded.');
console.log('Receiver: MINIMAL - Script Loaded.');

try {
  context.onReady = (event) => {
    sendCacLog('Receiver: MINIMAL - Context Ready.');
    console.log('Receiver: MINIMAL - Context Ready.', event);
    flushQueuedLogs();
  };

  context.onSenderConnected = (event) => {
    sendCacLog('Receiver: MINIMAL - Sender Connected: ' + event.senderId);
    console.log('Receiver: MINIMAL - Sender Connected:', event);
    flushQueuedLogs();
  };

  context.start({ disableIdleTimeout: true });
  sendCacLog('Receiver: MINIMAL - Context Start Called.');
  console.log('Receiver: MINIMAL - Context Start Called.');

} catch (err) {
  sendCacLog('Receiver: MINIMAL - ERROR: ' + err.message);
  console.error('Receiver: MINIMAL - ERROR:', err);
}
