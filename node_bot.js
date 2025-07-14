import fs from 'fs';
const data = fs.readFileSync('Script/serviceAccountKey.json');
console.log(Buffer.from(data).toString('base64'));