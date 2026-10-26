// Mobile menu toggle (in WordPress the theme's own navigation block provides this; this only mimics it for the concept)
(function () {
  var toggle = document.querySelector('.menu-toggle');
  var nav = document.getElementById('main-nav');
  if (!toggle || !nav) return;
  var BREAK = 1080;

  function setOpen(open) {
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.querySelector('.label').textContent = open ? 'Close' : 'Menu';
    nav.classList.toggle('is-open', open);
  }

  toggle.addEventListener('click', function () {
    setOpen(toggle.getAttribute('aria-expanded') !== 'true');
  });

  nav.addEventListener('click', function (e) {
    if (e.target.closest('a') && window.innerWidth <= BREAK) setOpen(false);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
      setOpen(false);
      toggle.focus();
    }
  });

  window.addEventListener('resize', function () {
    if (window.innerWidth > BREAK) setOpen(false);
  });
})();

// "Other amount" donation button: in the live build this is a link to a Stripe "customers choose what to pay" payment link.
// In the concept it reveals a note explaining that, rather than linking to a page that does not exist yet.
(function () {
  document.querySelectorAll('.amount-other').forEach(function (btn) {
    var panel = document.getElementById(btn.getAttribute('data-panel'));
    if (!panel) return;
    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') !== 'true';
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      panel.hidden = !open;
    });
  });
})();
