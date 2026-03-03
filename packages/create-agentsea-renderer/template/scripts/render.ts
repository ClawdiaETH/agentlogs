import { renderImage } from '../src/index';
import fs from 'fs';

const dayLog = JSON.parse(fs.readFileSync('example-daylog.json', 'utf-8'));

fs.mkdirSync('output', { recursive: true });
fs.writeFileSync('output/test.png', renderImage(dayLog));
console.log('Rendered to output/test.png');
