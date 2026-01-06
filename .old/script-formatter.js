import * as fs from 'node:fs';

let lines = fs
  .readFileSync("script.txt", { encoding: 'utf8' })
  .split('\n')
  .map(e => e.trim().replaceAll('(', '*').replaceAll(')', '*'))
  .filter(e => e !== '' && !e.startsWith('['))

let sentences = [];

for (let i = 0; i < lines.length; i++) {
  let person = lines[i].split(':')[0];
  let line = lines[i].slice(person.length + 1).trim();

  if (line.length === 0) {
    line = person;
    person = 'Unknown';
  }

  let splitIndices = [...line.matchAll(/[A-Za-z0-9\"](\* |\. |\? |\! )/gm)].map(e => e.index + 3);

  splitIndices.unshift(0);
  splitIndices.push(line.length);

  let parts = [];

  for (let i = 0; i < splitIndices.length - 1; i++) {
    parts.push(line.slice(splitIndices[i], splitIndices[i + 1]).trim())
  }

  for (let i = 0; i < parts.length; i++) {
    sentences.push({ person, type: parts[i].startsWith('*') ? 'action' : 'speech', text: parts[i] })
  }
}

fs.writeFileSync('./quotes.json', JSON.stringify(sentences))
