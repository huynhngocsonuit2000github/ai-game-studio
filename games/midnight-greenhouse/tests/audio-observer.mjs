/* global AudioBufferSourceNode, AudioContext, AudioDestinationNode, AudioNode, Response, window */

export function observeWebAudio() {
  const urls = new WeakMap();
  const buffers = new WeakMap();
  const starts = [];
  window.greenhouseAudio = { starts, master: null };

  const read = Response.prototype.arrayBuffer;
  Response.prototype.arrayBuffer = async function () {
    const bytes = await read.call(this);
    urls.set(bytes, this.url);
    return bytes;
  };
  const decode = AudioContext.prototype.decodeAudioData;
  AudioContext.prototype.decodeAudioData = async function (bytes) {
    const audio = await decode.call(this, bytes);
    buffers.set(audio, urls.get(bytes));
    return audio;
  };
  const connect = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function (destination, ...ports) {
    if (destination instanceof AudioDestinationNode) window.greenhouseAudio.master = this;
    return connect.call(this, destination, ...ports);
  };
  const start = AudioBufferSourceNode.prototype.start;
  AudioBufferSourceNode.prototype.start = function (...times) {
    start.apply(this, times);
    starts.push({ url: buffers.get(this.buffer), context: this.context, time: this.context.currentTime });
  };
}
