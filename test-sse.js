const http = require('http');

http.get('http://localhost:3001/api/scan/stream?url=stripe.com&formAnswers=%7B%22securityAudit%22%3A%22Yes%22%7D', (res) => {
  let buffer = '';
  res.on('data', (chunk) => {
    buffer += chunk.toString();
    if (buffer.includes('"type":"done"')) {
      const lines = buffer.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.substring(6));
            if (data.type === 'done') {
              console.log('--- DONE EVENT ---');
              console.log('Scores:', data.scores);
              console.log('Confidence:', data.confidence);
              console.log('Risk DNA:', Object.entries(data.riskDNA).map(([k,v]) => `${k}=${v}`).join(', '));
              console.log('Mismatches:', data.mismatches);
              console.log('Correlations:', data.correlations);
              process.exit(0);
            }
          } catch (e) {}
        }
      }
    }
  });
});
