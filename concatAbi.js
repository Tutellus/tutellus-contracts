const fs = require('fs')
const path = require('path')
const { concatMinimalAbi, concatAbi } = require('./utils/abi/abi')

const walk = (dir) => {
  return fs.readdirSync(dir).reduce((acc, fileName) => {
    const filePath = path.join(dir, fileName)
    var stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      return acc.concat(...walk(filePath));
    } else {
      return acc.concat(filePath);
    }
  }, []);
};

const clean = (filenames) => filenames.filter((filename) =>
  filename.endsWith('.json')
  && !filename.endsWith('dbg.json')
  && !filename.includes('.sol/I'));

const removeDuplicates = (arr) => {
  return arr.filter((item, index) => arr.indexOf(item) === index);
};

async function main () {
  const args = process.argv.slice(2)
  const options = {}
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=')
      options[key] = value
    }
  }
  const { root, minimal: minimalText } = options

  const minimal = Boolean(minimalText)

  if (!root) {
    throw new Error('No root directory specified. Use --root=...')
  }
  const dir = path.join(__dirname, root)
  const files = walk(dir);
  const filenames = clean(files)

  const abis = filenames.map((filename) => {
    const abi = minimal ? require(filename) : require(filename).abi
    return abi
  })
  const result1 = removeDuplicates(abis.reduce((acc, abi) => {
    return minimal ? concatMinimalAbi(acc, abi) : concatAbi(acc, abi)
  }, []))

  const result2 = minimal ? result1.sort((a, b) => a.localeCompare(b)) : result1;

  const filename = minimal ? 'abi.minimal.json' : 'abi.json'

  fs.writeFileSync(path.join(dir, filename), JSON.stringify(result2, null, 2))

  console.log('Concatenation of ABIs saved at', path.join(dir, filename))
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
