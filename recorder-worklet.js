// يمرّر عينات الميكروفون كما هي إلى offscreen.js، كتلة كل 128 عينة.
class CrtlRecorder extends AudioWorkletProcessor {
  process(inputs) {
    const ch = inputs[0]?.[0];
    if (ch?.length) this.port.postMessage(ch.slice(0));
    return true;
  }
}

registerProcessor("crtl-recorder", CrtlRecorder);
