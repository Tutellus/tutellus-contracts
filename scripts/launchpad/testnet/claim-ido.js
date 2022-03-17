const bre = require("hardhat");
const ethers = bre.ethers;
const { readFile } = require("fs/promises");
const path = require("path");
const { getIdoTree } = require("../../../utils/idoTree");
const IDO = "0x14092dCA812377a4Be8ADbfA19A164564b1508F5";
const jsonPath =
    "../../../examples/testnet/launchpad/" + IDO.toLowerCase() + ".json";

const MNEMONICS = [
    "broom text recall ahead cover sniff wolf provide expire wire hover keep", //sokar
    "express eyebrow type fluid light that phone choose search solve lazy fringe", //mcaballero
    "vehicle entry throw calm pistol menu acquire tray car reform hamster process", //victor
    "shell people change apology speak poverty moment first recycle board excuse abstract", //chema
    "input fire discover wild desk wrestle repair sand same begin actress truly", //dani
    "arrive alarm reopen fancy large hedgehog wine ceiling sail want buzz outside", //jordi
    "already wide brown churn dentist accuse spice bean wild bar scrap iron" //guille
];

const PATHS = ["m/44'/60'/0'/0/0", "m/44'/60'/0'/0/1", "m/44'/60'/0'/0/2"];

async function main() {
    const wallet = ethers.Wallet.fromMnemonic(MNEMONICS[6], PATHS[0]).connect(
        ethers.provider
    );
    const file = await readFile(path.join(__dirname, jsonPath), "utf8");
    const json = JSON.parse(file);
    const tree = getIdoTree(json);
    const ido = await ethers.getContractAt("TutellusIDO", IDO);
    const claims = tree.toJSON().claims[wallet.address.toLowerCase()];
    console.log("Allocation: ", ethers.utils.formatEther(claims.allocation))
    console.log("Withdraw: ", ethers.utils.formatEther(claims.withdraw))
    const idoTokenAddr = await ido.idoToken()
    const idoToken = await ethers.getContractAt("Token", idoTokenAddr);
    const balance = await idoToken.balanceOf(wallet.address)
    console.log("[PRE] Balance (idoToken): ", ethers.utils.formatEther(balance))
    const prefundTokenAddr = await ido.prefundToken()
    const prefundToken = await ethers.getContractAt("Token", prefundTokenAddr);
    const balance2 = await prefundToken.balanceOf(wallet.address)
    console.log("[PRE] Balance (prefundToken): ", ethers.utils.formatEther(balance2))
    const response = await ido
        .connect(wallet)
        .claim(
            claims.index,
            wallet.address,
            claims.allocation,
            claims.withdraw,
            claims.energy,
            claims.proof
        );
    await response.wait();
    console.log("Success...");
    const balance3 = await idoToken.balanceOf(wallet.address)
    console.log("[POST] Balance (idoToken): ", ethers.utils.formatEther(balance3))
    const balance4 = await prefundToken.balanceOf(wallet.address)
    console.log("[POST] Balance (prefundToken): ", ethers.utils.formatEther(balance4))
}
// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
