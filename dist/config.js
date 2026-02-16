
var RM = window.RM = window.RM || {};

// Dynamic root detection for GitHub Pages vs Localhost
var path = window.location.pathname;

// GitHub Pages fix: if on github.io, root should be the repo name /repo/
if (window.location.hostname.indexOf('github.io') !== -1) {
  var parts = path.split('/').filter(function (p) { return p.length > 0; });
  if (parts.length > 0) {
    path = '/' + parts[0] + '/';
  } else {
    path = '/';
  }
} else {
  // Localhost logic
  if (path.length > 1 && !path.endsWith('/')) {
    path = path.substring(0, path.lastIndexOf('/') + 1);
  }
  if (!path) path = "/";
}

// Base tag is now handled in index.html for GitHub Pages compatibility

window.RM.config = {
  root: path,
  pushState: true
}

window.chunkURL = "dist/";
