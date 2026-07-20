
var RM = window.RM = window.RM || {};

window.RM.config = {
  root: "/",
  pushState: true
}

window.chunkURL = "/dist/";

var cmsBridge = document.createElement('script');
cmsBridge.src = '/assets/readymag-bridge.js';
document.head.appendChild(cmsBridge);
