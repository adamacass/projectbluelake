const ADJECTIVES = [
  'Shadow', 'Ghost', 'Silent', 'Phantom', 'Midnight', 'Iron',
  'Crimson', 'Arctic', 'Thunder', 'Rogue', 'Obsidian', 'Neon',
  'Stealth', 'Onyx', 'Venom', 'Cipher', 'Zero', 'Omega',
  'Frost', 'Ember', 'Apex', 'Void', 'Spectral', 'Razor',
  'Eclipse', 'Storm', 'Pulse', 'Drift', 'Wraith', 'Hex',
];

const NOUNS = [
  'Falcon', 'Protocol', 'Phoenix', 'Viper', 'Sentinel', 'Matrix',
  'Horizon', 'Cascade', 'Vector', 'Mantis', 'Cobra', 'Specter',
  'Lynx', 'Raptor', 'Vertex', 'Nexus', 'Mirage', 'Torrent',
  'Spark', 'Enigma', 'Flux', 'Prism', 'Aegis', 'Bolt',
  'Orbit', 'Cipher', 'Dagger', 'Raven', 'Titan', 'Nova',
];

function generateCodename() {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `${adj} ${noun}`;
}

module.exports = { generateCodename };
