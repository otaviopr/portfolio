
var RM = window.RM = window.RM || {};

// Dynamic root detection for GitHub Pages vs Localhost
var path = window.location.pathname;

// GitHub Pages fix: if on github.io, root should be the repo name /repo/
if (window.location.hostname === 'otaviopr.github.io') {
  // Standard GitHub Pages: /repo-name/
  var repoName = window.location.pathname.split('/')[1];
  if (repoName) {
    path = '/' + repoName + '/';
  } else {
    path = '/'; // Fallback if no repo name found
  }
} else if (window.location.hostname === 'otaviopr.com' || window.location.hostname === 'www.otaviopr.com') {
  // Custom Domain: Root is /
  path = '/';
} else {
  path = path.substring(0, path.lastIndexOf('/') + 1);
}
if (!path) path = "/";


// Base tag is now handled in index.html for GitHub Pages compatibility

window.RM.config = {
  root: path,
  pushState: true
}

window.chunkURL = "dist/";
