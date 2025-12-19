/* global require, requirejs */

requirejs.onError = function (err) {
  // Facilita debug quando faltar módulo / 404 / erro AMD
  // (sem isso, às vezes parece que "não roda nada")
  console.error('RequireJS error:', err);
};

require.config({
  baseUrl: '/static',
  paths: {
    // TinyBone (servido por Express em /vendor/tinybone)
    tinybone: '/vendor/tinybone/base',

    // deps (TinyBone tende a depender disso em alguns builds)
    jquery: 'https://cdnjs.cloudflare.com/ajax/libs/jquery/3.7.1/jquery.min',
    lodash: 'https://cdnjs.cloudflare.com/ajax/libs/lodash.js/4.17.21/lodash.min',
    'dust.core': 'https://cdnjs.cloudflare.com/ajax/libs/dustjs-linkedin/2.7.5/dust-core.min',
    md5: 'https://cdnjs.cloudflare.com/ajax/libs/blueimp-md5/2.19.0/js/md5.min',
    'jquery-cookie': 'https://cdnjs.cloudflare.com/ajax/libs/jquery-cookie/1.4.1/jquery.cookie.min',

    // shim local requerido pelo TinyBone
    safe: 'amd/safe'
  },
  shim: {
    md5: { exports: 'md5' },
    'dust.core': { exports: 'dust' },
    'jquery-cookie': { deps: ['jquery'] }
  }
});

require(['tinybone', 'jquery'], function (tb, $) {
  var router = new tb.Router({ prefix: '' });

  function escapeHtml(str) {
    return String(str ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function currentUrl() {
    return window.location.pathname + window.location.search;
  }

  function buildUrl(params) {
    var sp = new URLSearchParams(window.location.search);

    // aplica updates
    Object.keys(params).forEach(function (k) {
      var v = params[k];
      if (v === null || v === undefined || v === '') sp.delete(k);
      else sp.set(k, String(v));
    });

    var qs = sp.toString();
    return window.location.pathname + (qs ? '?' + qs : '');
  }

  function navigate(params, opts) {
    var url = buildUrl(params);
    // navigateTo deve disparar o handler da rota atual (/dashboard ou /)
    router.navigateTo(url, opts || {});
  }

  function setActiveFilter(filter) {
    $('[data-filter]').removeClass('active');
    $('[data-filter="' + filter + '"]').addClass('active');
  }

  function applyFilterAndSearch(filter, q) {
    var query = (q || '').toLowerCase().trim();

    $('.sensor-card').each(function () {
      var $card = $(this);
      var active = $card.data('active') === 1 || $card.data('active') === '1';
      var text = (
        ($card.data('sensor-id') || '') + ' ' +
        ($card.data('name') || '') + ' ' +
        ($card.data('location') || '')
      ).toLowerCase();

      var okFilter =
        filter === 'all' ||
        (filter === 'active' && active) ||
        (filter === 'inactive' && !active);

      var okSearch = !query || text.includes(query);

      $card.toggle(okFilter && okSearch);
    });
  }

  function openDrawer(html) {
    $('#sensor-drawer').html(html).addClass('open').attr('aria-hidden', 'false');
    $('#drawer-backdrop').addClass('open');
  }

  function closeDrawer() {
    $('#sensor-drawer').removeClass('open').attr('aria-hidden', 'true').html('');
    $('#drawer-backdrop').removeClass('open');
  }

  function refreshStats() {
    return fetch('/api/stats')
      .then(function (r) { return r.json(); })
      .then(function (payload) {
        if (!payload || !payload.success) return;

        var data = payload.data;
        $('#stat-total-sensors').text(String(data.total_sensors));
        $('#stat-recent-alerts').text(String(data.recent_alerts));
        $('.timestamp').text('Last updated: ' + new Date().toISOString());
      })
      .catch(function (e) {
        console.error('refreshStats failed', e);
      });
  }

  // Atualiza temperatura/umidade de cada card sem re-render da página inteira
  function refreshLatestReadings() {
    var ids = $('.sensor-card').map(function () { return $(this).data('sensor-id'); }).get();

    // para poucos sensores, dá pra fazer simples. Se crescer, a gente coloca limite de concorrência.
    return Promise.all(ids.map(function (id) {
      return fetch('/api/sensors/' + encodeURIComponent(id) + '/readings?limit=1')
        .then(function (r) { return r.json(); })
        .then(function (payload) {
          if (!payload || !payload.success) return;
          var arr = payload.data || [];
          var reading = arr[0];
          var $card = $('.sensor-card[data-sensor-id="' + id + '"]');

          if (!reading) {
            // se quiser: marcar "No readings"
            return;
          }

          // atualiza valores dentro do card (se existirem)
          $card.find('.temp-value').contents().first()[0].textContent = String(reading.temperature);
          $card.find('.humidity-value').contents().first()[0].textContent = String(reading.humidity);
        })
        .catch(function () {});
    }));
  }

  function loadSensorDetail(sensorId) {
    // detalhes + últimas leituras/alertas (meaningful: drill-down sem reload + URL share)
    var sensorUrl = '/api/sensors/' + encodeURIComponent(sensorId);
    var readingsUrl = sensorUrl + '/readings?limit=10';
    var alertsUrl = sensorUrl + '/alerts?limit=10';

    openDrawer('<div class="muted">Loading sensor <strong>' + escapeHtml(sensorId) + '</strong>...</div>');

    return Promise.all([
      fetch(sensorUrl).then(function (r) { return r.json(); }).catch(function () { return null; }),
      fetch(readingsUrl).then(function (r) { return r.json(); }).catch(function () { return null; }),
      fetch(alertsUrl).then(function (r) { return r.json(); }).catch(function () { return null; })
    ]).then(function (results) {
      var sensorPayload = results[0];
      var readingsPayload = results[1];
      var alertsPayload = results[2];

      if (!sensorPayload || !sensorPayload.success) {
        openDrawer(
          '<a class="close" href="' + escapeHtml(buildUrl({ sensor: null })) + '" data-tb-nav>Close</a>' +
          '<div class="muted">Sensor not found.</div>'
        );
        return;
      }

      var sensor = sensorPayload.data;
      var readings = (readingsPayload && readingsPayload.success ? readingsPayload.data : []) || [];
      var alerts = (alertsPayload && alertsPayload.success ? alertsPayload.data : []) || [];

      var html =
        '<a class="close" href="' + escapeHtml(buildUrl({ sensor: null })) + '" data-tb-nav>Close</a>' +
        '<h3>' + escapeHtml(sensor.name) + '</h3>' +
        '<div class="muted">ID: ' + escapeHtml(sensor.sensor_id) + (sensor.location ? (' · 📍 ' + escapeHtml(sensor.location)) : '') + '</div>' +
        '<div class="muted"><strong>Limits</strong>: ' +
          '🌡️ ' + escapeHtml(sensor.min_temperature) + '°C - ' + escapeHtml(sensor.max_temperature) + '°C · ' +
          '💧 ' + escapeHtml(sensor.min_humidity) + '% - ' + escapeHtml(sensor.max_humidity) + '%</div>' +
        '<h4>Last readings</h4>' +
        '<pre>' + escapeHtml(JSON.stringify(readings, null, 2)) + '</pre>' +
        '<h4>Recent alerts</h4>' +
        '<pre>' + escapeHtml(JSON.stringify(alerts, null, 2)) + '</pre>';

      openDrawer(html);
    });
  }

  // --- TinyBone Router: estado do dashboard controlado pela URL ---
  function handleDashboardRoute(req, res, next) {
    var filter = (req.query && req.query.filter) ? String(req.query.filter) : 'all';
    var q = (req.query && req.query.q) ? String(req.query.q) : '';
    var sensorId = (req.query && req.query.sensor) ? String(req.query.sensor) : '';

    if (!['all', 'active', 'inactive'].includes(filter)) filter = 'all';

    setActiveFilter(filter);
    $('#sensor-search').val(q);
    applyFilterAndSearch(filter, q);

    // refresh “live”
    Promise.resolve()
      .then(refreshStats)
      .then(refreshLatestReadings)
      .then(function () {
        if (sensorId) return loadSensorDetail(sensorId);
        closeDrawer();
      })
      .catch(function () {});

    next();
  }

  // cobre /dashboard e também / caso esteja montado assim
  router.get('/dashboard', handleDashboardRoute);
  router.get('/', handleDashboardRoute);

  // --- Interações ---
  // navegação client-side: usa TinyBone em vez de reload
  $(document).on('click', '[data-tb-nav]', function (e) {
    var href = $(this).attr('href');
    if (!href) return;
    e.preventDefault();
    router.navigateTo(href);
  });

  // fechar drawer clicando no backdrop
  $('#drawer-backdrop').on('click', function () {
    router.navigateTo(buildUrl({ sensor: null }), { replace: true });
  });

  // busca: atualiza querystring e roteia (replace pra não poluir history)
  var searchTimer = null;
  $('#sensor-search').on('input', function () {
    var val = $(this).val();
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(function () {
      router.navigateTo(buildUrl({ q: val || null }), { replace: true });
    }, 250);
  });

  // refresh periódico SEM mudar a URL (significado: reexecuta rota/state machine)
  function reloadRoute() {
    if (typeof router.reload === 'function') router.reload();
    else router.navigateTo(currentUrl(), { replace: true });
  }

  reloadRoute();
  setInterval(reloadRoute, 30000);
});
