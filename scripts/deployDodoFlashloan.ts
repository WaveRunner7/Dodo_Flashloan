import { ethers } from "hardhat";
import { Flashloan, Flashloan__factory } from "../typechain-types";
import { DeployDODOFlashLoanParams } from "../types";
import { deployContract } from "../utils/deployContract";

export async function deployDodoFlashloan(params: DeployDODOFlashLoanParams) {
    const Flashloan: Flashloan = await deployContract(
        Flashloan__factory,
        [],
        params.wallet
    );

    const deployed = await Flashloan.waitForDeployment();

    console.log("contract deployed to:", deployed.target);

    return deployed;
}

const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
//const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!,provider);
const wallet = new ethers.Wallet("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", provider);
deployDodoFlashloan({wallet: wallet});