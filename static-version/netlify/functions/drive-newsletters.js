const https = require('https');

exports.handler = async function(event, context) {
  const folderId = event.queryStringParameters && event.queryStringParameters.folderId;
  
  if (!folderId) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Missing folderId parameter' })
    };
  }

  const targetUrl = `https://drive.google.com/embeddedfolderview?id=${folderId}`;

  try {
    const html = await new Promise((resolve, reject) => {
      const req = https.get(targetUrl, { timeout: 8000 }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(data));
      });
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    });

    const entries = [];
    const entryStartRegex = /class="flip-entry" id="entry-([a-zA-Z0-9\-_]+)"/g;
    let match;
    const entryStarts = [];

    while ((match = entryStartRegex.exec(html)) !== null) {
      entryStarts.push({ id: match[1], index: match.index });
    }

    for (let i = 0; i < entryStarts.length; i++) {
      const fileId = entryStarts[i].id;
      const startPos = entryStarts[i].index;
      const endPos = (i + 1 < entryStarts.length) ? entryStarts[i + 1].index : html.length;
      const subHtml = html.substring(startPos, endPos);

      const titleMatch = subHtml.match(/class="flip-entry-title">([^<]+)<\/div>/);
      const title = titleMatch ? titleMatch[1].trim() : '';

      const dateMatch = subHtml.match(/class="flip-entry-last-modified"><div>([^<]+)<\/div>/);
      const dateStr = dateMatch ? dateMatch[1].trim() : '';

      const imageUrl = `https://lh3.googleusercontent.com/d/${fileId}=w800`;

      entries.push({ id: fileId, title, image: imageUrl, date: dateStr });
    }

    // Sort by date descending
    entries.sort((a, b) => {
      function parseDate(d) {
        const parts = d.split('/');
        if (parts.length === 3) {
          const m = parseInt(parts[0], 10) - 1;
          const dd = parseInt(parts[1], 10);
          let y = parseInt(parts[2], 10);
          if (y < 100) y += 2000;
          return new Date(y, m, dd).getTime();
        }
        const p = Date.parse(d);
        return isNaN(p) ? 0 : p;
      }
      const da = parseDate(a.date), db = parseDate(b.date);
      if (db !== da) return db - da;
      return b.title.localeCompare(a.title, undefined, { numeric: true, sensitivity: 'base' });
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(entries.slice(0, 10))
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: err.message })
    };
  }
};
