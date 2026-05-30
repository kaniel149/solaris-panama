(function () {
  var WHATSAPP_NUMBER = '50765831822';
  var GOOGLE_SEND_TO = 'AW-18049688013/-DbRCLOi55EcEM3D4Z5D';
  var API_URL = '/api/leads/intake';

  function uuid() {
    if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
  }

  function getCookie(name) {
    var match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : null;
  }

  function getAttribution() {
    var params = new URLSearchParams(window.location.search);
    var out = {};
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid', 'fbclid'].forEach(function (key) {
      var value = params.get(key);
      if (value) out[key] = value;
    });
    out.fbp = getCookie('_fbp');
    out.fbc = getCookie('_fbc');
    if (!out.fbc && out.fbclid) out.fbc = 'fb.1.' + Date.now() + '.' + out.fbclid;
    return out;
  }

  function cleanPhone(phone) {
    var digits = String(phone || '').replace(/\D/g, '');
    if (digits.length === 8) return '507' + digits;
    if (digits.startsWith('507') && digits.length === 11) return digits;
    return digits;
  }

  function normalizeBill(value) {
    if (!value) return null;
    var map = {
      'menos-80': 80,
      '80-150': 150,
      '150-250': 250,
      '250-400': 400,
      'mas-400': 500,
      '500-1000': 1000,
      '1000-2000': 2000,
      '2000-5000': 5000,
      '5000-10000': 10000,
      'mas-10000': 12000,
    };
    if (map[value]) return map[value];
    var match = String(value).match(/\d+(?:\.\d+)?/);
    return match ? Number(match[0]) : null;
  }

  function trackBrowserLead(eventId, value) {
    try {
      if (typeof window.gtag === 'function') {
        window.gtag('event', 'conversion', {
          send_to: GOOGLE_SEND_TO,
          value: value || 1,
          currency: 'USD',
          transaction_id: eventId,
        });
      }
    } catch (e) {}

    try {
      if (typeof window.fbq === 'function') {
        window.fbq('track', 'Lead', { value: value || 1, currency: 'USD' }, { eventID: eventId });
      }
    } catch (e) {}
  }

  function buildWhatsAppMessage(data, options) {
    if (options && typeof options.messageBuilder === 'function') return options.messageBuilder(data);
    var lines = [
      'Hola Solaris! Quiero una cotizacion de paneles solares.',
      'Nombre: ' + (data.name || ''),
      'Telefono: ' + (data.phone || ''),
    ];
    if (data.email) lines.push('Email: ' + data.email);
    if (data.business || data.company) lines.push('Negocio: ' + (data.business || data.company));
    if (data.location) lines.push('Zona: ' + data.location);
    if (data.bill) lines.push('Factura: ' + data.bill);
    if (data.roof_size) lines.push('Techo: ' + data.roof_size + ' m2');
    if (data.message) lines.push('Mensaje: ' + data.message);
    return lines.join('\n');
  }

  async function submitForm(form, options) {
    var data = Object.fromEntries(new FormData(form));
    var eventId = uuid();
    var phone = cleanPhone(data.phone);
    var monthlyBill = normalizeBill(data.bill || data.monthly_bill || data.factura);
    var source = (options && options.source) || data.source || 'website';
    var leadValue = monthlyBill ? Math.max(800, monthlyBill * 18) : 2500;
    var attribution = getAttribution();
    var waText = buildWhatsAppMessage(data, options || {});
    var waUrl = 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(waText);
    var popup = null;

    try {
      popup = window.open('about:blank', '_blank');
    } catch (e) {}

    trackBrowserLead(eventId, leadValue);

    var payload = Object.assign({}, attribution, {
      name: data.name || data.nombre || '',
      phone: phone || data.phone || '',
      email: data.email || null,
      monthly_bill: monthlyBill,
      monthly_bill_estimate_usd: monthlyBill,
      location: data.location || null,
      installation_type: (options && options.installation_type) || data.type || data.sector || null,
      timeframe: data.timeframe || null,
      message: [
        data.message || '',
        data.business ? 'Business: ' + data.business : '',
        data.company ? 'Company: ' + data.company : '',
        data.roof_size ? 'Roof m2: ' + data.roof_size : '',
        data.sector ? 'Sector: ' + data.sector : '',
      ].filter(Boolean).join(' | ') || null,
      source: source,
      campaign: attribution.utm_campaign || source,
      lead_value: leadValue,
      event_id: eventId,
      fbc: attribution.fbc || null,
      fbp: attribution.fbp || null,
    });

    try {
      await Promise.race([
        fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          keepalive: true,
        }),
        new Promise(function (resolve) { setTimeout(resolve, 1200); }),
      ]);
    } catch (e) {}

    if (options && options.successElementId) {
      form.style.display = 'none';
      var success = document.getElementById(options.successElementId);
      if (success) {
        success.classList.add('show');
        success.style.display = 'block';
      }
    }

    if (popup) popup.location.href = waUrl;
    else window.location.href = waUrl;
  }

  function trackWhatsAppClick(link) {
    var eventId = uuid();
    try {
      if (typeof window.gtag === 'function') {
        window.gtag('event', 'conversion', {
          send_to: GOOGLE_SEND_TO,
          value: 1,
          currency: 'USD',
          transaction_id: eventId,
        });
      }
    } catch (e) {}
    try {
      if (typeof window.fbq === 'function') {
        window.fbq('track', 'Contact', { channel: 'whatsapp' }, { eventID: eventId });
      }
    } catch (e) {}
  }

  document.addEventListener('click', function (event) {
    var link = event.target && event.target.closest ? event.target.closest('a[href*="wa.me/"]') : null;
    if (link) trackWhatsAppClick(link);
  }, true);

  window.SolarisLeadTracking = {
    submitForm: submitForm,
    trackWhatsAppClick: trackWhatsAppClick,
  };
})();
