const footerEl = document.createElement('footer');
footerEl.className = 'site-footer';
footerEl.innerHTML = `
  <div class="footer-inner">
    <div class="footer-brand">
      <a href="/" class="nav-logo">⬡ EcchiZone</a>
      <p class="footer-desc">Your ultimate hentai streaming destination.</p>
    </div>
    <div class="footer-links">
      <div class="footer-col">
        <div class="footer-col-title">Browse</div>
        <a href="/recent-episodes/">Recent Episodes</a>
        <a href="/recent-series/">Recent Series</a>
        <a href="/monthly/">Monthly</a>
        <a href="/uncensored/">Uncensored</a>
      </div>
      <div class="footer-col">
        <div class="footer-col-title">Categories</div>
        <a href="/genres/">Genres</a>
        <a href="/series/">Series</a>
        <a href="/hentai-list/">Hentai List</a>
      </div>
    </div>
  </div>
  <div class="footer-bottom">
    <span>© ${new Date().getFullYear()} EcchiZone. All rights reserved.</span>
    <span>This site does not store any files on its server.</span>
  </div>
`;
document.body.appendChild(footerEl);
