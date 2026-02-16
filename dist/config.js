
var RM = window.RM = window.RM || {};

// Dynamic root detection for GitHub Pages vs Localhost
var path = window.location.pathname;
// If we are serving a file directly or stripped, ensure we have the base dir
if (path.length > 1 && !path.endsWith('/')) {
  path = path.substring(0, path.lastIndexOf('/') + 1);
}
// Ensure root is at least "/"
if (!path) path = "/";

// HOSTING FIX: Set base tag to root to fix relative asset loading on subpages
var base = document.querySelector('base');
if (!base) {
  base = document.createElement('base');
  document.head.appendChild(base);
}
base.href = path;

window.RM.config = {
  root: path,
  pushState: true
}

window.chunkURL = "dist/";
