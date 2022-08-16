const fs = require('fs');
const { create: ipfsHttpClient, globSource } = require('ipfs-http-client');
const axios = require('axios');
const projectId = process.env.INFURA_IPFS_PROJECT_ID
const projectSecret = process.env.INFURA_IPFS_PROJECT_SECRET

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
  const auth = 'Basic ' + Buffer.from(projectId + ':' + projectSecret).toString('base64');
  const ipfs = ipfsHttpClient({ 
    host: 'ipfs.infura.io',
    port: 5001,
    protocol: 'https',
    headers: {
      authorization: auth
    }
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