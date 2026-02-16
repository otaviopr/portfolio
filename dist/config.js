
var RM = window.RM = window.RM || {};

// Dynamic root detection for GitHub Pages vs Localhost
var path = window.location.pathname;
// If we are serving a file directly or stripped, ensure we have the base dir
if (path.length > 1 && !path.endsWith('/')) {
  path = path.substring(0, path.lastIndexOf('/') + 1);
}
// Ensure root is at least "/"
if (!path) path = "/";

// Base tag is now handled in index.html for GitHub Pages compatibility

window.RM.config = {
  root: path,
  pushState: true
}

window.chunkURL = "dist/";
