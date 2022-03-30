const fs = require('fs');
const { create: ipfsHttpClient, globSource } = require('ipfs-http-client');
const axios = require('axios');

async function downloadJSON(uri) {
  try {
    return await axios({
      url: uri,
      method: 'GET',
    }).then((response) => response.data);
  } catch (error) {
    return {};
  }
}

async function uploadJSON(json, merkleRoot) {
  const ipfs = ipfsHttpClient({ 
    host: 'ipfs.infura.io',
    port: 5001,
    protocol: 'https'
  });
  fs.writeFileSync(merkleRoot, JSON.stringify(json, null, 4));
  const gs = globSource(merkleRoot, { recursive: true });
  const file = await ipfs.add(gs);
  fs.unlinkSync(merkleRoot);
  const cid = file.cid.toString();
  const result = `https://ipfs.io/ipfs/${cid}`;
  return result;
}

module.exports = {
  downloadJSON,
  uploadJSON,
};
