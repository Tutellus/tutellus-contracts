const bre = require("hardhat");
const { downloadJSON, uploadJSON } = require('../../../utils/ipfs');
const { getIdoTree } = require("../../../utils/idoTree");
const URI = "https://ipfs.io/ipfs/QmZJXT9ByQDNqrfUoFXwtjuRhbrEHgDV7AmGRqAs4REPTo"

const data = {
    host: "ipfs.infura.io",
    port: 5001,
    protocol: "https"
};

async function main() {
    const json = await downloadJSON(URI);
    const tree = getIdoTree(json);
    console.log("MerkleRoot: ", tree.toJSON().merkleRoot);
}
// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
