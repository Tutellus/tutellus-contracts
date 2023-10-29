const fs = require('fs');
const path = require('path');
const { create: ipfsHttpClient, globSource } = require('ipfs-http-client');
const axios = require('axios');
const PROJECT_ID = process.env.INFURA_IPFS_PROJECT_ID
const PROJECT_SECRET  = process.env.INFURA_IPFS_PROJECT_SECRET

const RETRIES = 3;

async function downloadJSON(cid) {
  let response = null;
  for (let i = 0; i < RETRIES; i++) {
    try {
      response = await axios({
        url: 'https://gateway.pinata.cloud/ipfs/'.concat(cid),
        method: 'GET',
      });
      break;
    } catch (error) {
      if (i === RETRIES - 1) {
        throw error;
      }
      // delay
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  return response?.data;
}

async function uploadJSON({
  json,
  merkleRoot,
  projectId = PROJECT_ID,
  projectSecret = PROJECT_SECRET,
}) {
  const tmpFile = path.join(__dirname, `${merkleRoot}.json`);
  try {
    const auth = 'Basic ' + Buffer.from(projectId + ':' + projectSecret).toString('base64');
    const ipfs = ipfsHttpClient({
        host: 'ipfs.infura.io',
        port: 5001,
        protocol: 'https',
        headers: {
        authorization: auth
        }
    });
    fs.writeFileSync(tmpFile, JSON.stringify(json, null, 4));
    const gs = globSource(tmpFile, { recursive: true });
    const file = await ipfs.add(gs);
    const cid = file.cid.toString();
    const uri = `ipfs://${cid}`;
    fs.unlinkSync(tmpFile);
    return {
      uri,
      cid,
    };
  } catch (error) {
    throw error;
  }
}


module.exports = {
  downloadJSON,
  uploadJSON,
};
